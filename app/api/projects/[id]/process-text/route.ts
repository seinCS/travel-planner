import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { analyzeText, ExtractedPlace } from '@/lib/claude'
import { geocodePlaceWithFallback, isDuplicatePlace, GeocodingResult } from '@/lib/google-maps'

// POST /api/projects/[id]/process-text - 텍스트 입력 처리
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // 재시도할 TextInput ID 목록 (옵션)
    let retryTextInputIds: string[] = []
    try {
      const body = await request.json()
      retryTextInputIds = body.retryTextInputIds || []
    } catch {
      // body가 없어도 OK
    }

    // 프로젝트 정보 조회
    const project = await prisma.project.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // 재시도 대상이 있으면 pending으로 변경
    if (retryTextInputIds.length > 0) {
      await prisma.textInput.updateMany({
        where: { id: { in: retryTextInputIds }, projectId: id },
        data: { status: 'pending', errorMessage: null },
      })
      console.log(`[Process Text API] Reset ${retryTextInputIds.length} text inputs to pending for retry`)
    }

    // 병렬로 pending 텍스트 입력과 기존 장소 조회 (async-parallel 패턴)
    const [pendingTextInputs, existingPlacesResult] = await Promise.all([
      prisma.textInput.findMany({
        where: { projectId: id, status: 'pending' },
      }),
      prisma.place.findMany({
        where: { projectId: id },
      }),
    ])

    if (pendingTextInputs.length === 0) {
      return NextResponse.json({ message: 'No pending text inputs', processed: 0 })
    }

    // 기존 장소 목록 (중복 체크용) - 새 장소 추가를 위해 mutable 배열로 복사
    const existingPlaces = [...existingPlacesResult]

    // Geocoding 캐시 (동일 장소명 재사용)
    const geocodingCache = new Map<string, GeocodingResult | null>()

    let processed = 0
    let failed = 0

    console.log(`[Process Text API] Starting analysis for ${pendingTextInputs.length} text inputs`)

    // 병렬로 Claude API 호출
    const analysisPromises = pendingTextInputs.map(async (textInput) => {
      try {
        // URL 타입인 경우 extractedText 사용, 텍스트 타입인 경우 content 사용
        const textToAnalyze = textInput.type === 'url'
          ? textInput.extractedText
          : textInput.content

        if (!textToAnalyze) {
          return { textInput, analysisResult: null, error: new Error('No text to analyze') }
        }

        console.log(`[Process Text API] Analyzing text input: ${textInput.id} (${textInput.type})`)
        const analysisResult = await analyzeText(
          textToAnalyze,
          project.destination,
          project.country || ''
        )
        console.log(`[Process Text API] Analysis result for ${textInput.id}:`, JSON.stringify(analysisResult, null, 2))
        return { textInput, analysisResult, error: null }
      } catch (error) {
        console.error('[Process Text API] Error analyzing text input:', textInput.id, error)
        return { textInput, analysisResult: null, error }
      }
    })

    // 병렬 처리 완료 대기
    const analysisResults = await Promise.all(analysisPromises)

    // 순차적으로 결과 처리 (중복 체크 위해)
    for (const { textInput, analysisResult, error } of analysisResults) {
      try {
        // 분석 오류 처리
        if (error || !analysisResult) {
          await prisma.textInput.update({
            where: { id: textInput.id },
            data: {
              status: 'failed',
              errorMessage: '텍스트 분석 중 오류가 발생했습니다.',
            },
          })
          failed++
          continue
        }

        // 장소 없음 처리
        if (!analysisResult.places || analysisResult.places.length === 0) {
          console.log(`[Process Text API] No places found for ${textInput.id}`)
          await prisma.textInput.update({
            where: { id: textInput.id },
            data: {
              status: 'failed',
              errorMessage: '장소를 인식할 수 없습니다.',
            },
          })
          failed++
          continue
        }

        console.log(`[Process Text API] Processing ${analysisResult.places.length} places for text input ${textInput.id}`)

        // 텍스트 입력 내 중복 체크용 Set
        const placesInThisInput = new Set<string>()
        let successCount = 0
        let errorMessage = ''

        // 각 장소 처리
        for (let i = 0; i < analysisResult.places.length; i++) {
          const place: ExtractedPlace = analysisResult.places[i]
          console.log(`[Process Text API] Processing place ${i + 1}/${analysisResult.places.length}: ${place.place_name}`)

          // 신뢰도 체크
          if (place.confidence < 0.5) {
            console.log(`[Process Text API] Low confidence for ${place.place_name}: ${place.confidence}`)
            continue
          }

          // 같은 텍스트 입력 내 중복 체크
          const placeNameLower = place.place_name.toLowerCase()
          if (placesInThisInput.has(placeNameLower)) {
            console.log(`[Process Text API] Duplicate within same text input: ${place.place_name}`)
            continue
          }

          // Geocoding with fallback (캐시 확인)
          let geoResult: GeocodingResult | null
          const cacheKey = `${place.place_name}|${place.place_name_en || ''}`
          if (geocodingCache.has(cacheKey)) {
            geoResult = geocodingCache.get(cacheKey) || null
            console.log(`[Process Text API] Using cached geocoding for: ${place.place_name}`)
          } else {
            console.log(`[Process Text API] Geocoding place: ${place.place_name} (EN: ${place.place_name_en || 'N/A'})`)
            geoResult = await geocodePlaceWithFallback(
              place.place_name,
              place.place_name_en,
              project.destination,
              project.country || undefined
            )
            geocodingCache.set(cacheKey, geoResult)
          }

          if (!geoResult) {
            console.log(`[Process Text API] Geocoding failed for: ${place.place_name}`)
            errorMessage = '일부 장소의 위치를 찾을 수 없습니다.'
            continue
          }

          console.log(`[Process Text API] Geocoding success: ${geoResult.latitude}, ${geoResult.longitude}`)

          // 프로젝트 내 중복 장소 확인 (Place ID 우선)
          const duplicate = existingPlaces.find(
            (p: { name: string; latitude: number; longitude: number; id: string; googlePlaceId?: string | null }) =>
              // 1순위: Google Place ID 일치
              (p.googlePlaceId && geoResult!.googlePlaceId && p.googlePlaceId === geoResult!.googlePlaceId) ||
              // 2순위: 이름 일치
              p.name.toLowerCase() === placeNameLower ||
              // 3순위: 좌표 근접 (100m 이내)
              isDuplicatePlace(p.latitude, p.longitude, geoResult!.latitude, geoResult!.longitude)
          )

          if (duplicate) {
            // 기존 장소에 텍스트 입력 연결 (이미 존재하면 무시)
            console.log(`[Process Text API] Duplicate found: ${duplicate.name}, linking text input`)
            await prisma.placeTextInput.upsert({
              where: {
                placeId_textInputId: {
                  placeId: duplicate.id,
                  textInputId: textInput.id,
                },
              },
              update: {},
              create: {
                placeId: duplicate.id,
                textInputId: textInput.id,
              },
            })
          } else {
            // 새 장소 생성
            console.log(`[Process Text API] Creating new place: ${place.place_name}`)
            const newPlace = await prisma.place.create({
              data: {
                projectId: id,
                name: place.place_name,
                category: place.category,
                comment: place.comment,
                latitude: geoResult.latitude,
                longitude: geoResult.longitude,
                status: 'auto',
                // Google Place 연동 정보
                googlePlaceId: geoResult.googlePlaceId,
                formattedAddress: geoResult.formattedAddress,
                googleMapsUrl: geoResult.googleMapsUrl,
                rating: geoResult.rating,
                userRatingsTotal: geoResult.userRatingsTotal,
                priceLevel: geoResult.priceLevel,
              },
            })

            console.log(`[Process Text API] Place created: ${newPlace.id}`)

            // 텍스트 입력 연결 (이미 존재하면 무시)
            await prisma.placeTextInput.upsert({
              where: {
                placeId_textInputId: {
                  placeId: newPlace.id,
                  textInputId: textInput.id,
                },
              },
              update: {},
              create: {
                placeId: newPlace.id,
                textInputId: textInput.id,
              },
            })

            // 새 장소를 기존 목록에 추가 (다음 텍스트 입력 중복 체크용)
            existingPlaces.push(newPlace)
          }

          // 텍스트 입력 내 중복 목록에 추가
          placesInThisInput.add(placeNameLower)
          successCount++
        }

        // TextInput 상태 업데이트
        if (successCount > 0) {
          await prisma.textInput.update({
            where: { id: textInput.id },
            data: { status: 'processed' },
          })
          console.log(`[Process Text API] Text input ${textInput.id} processed successfully with ${successCount} places`)
          processed++
        } else {
          await prisma.textInput.update({
            where: { id: textInput.id },
            data: {
              status: 'failed',
              errorMessage: errorMessage || '유효한 장소를 찾을 수 없습니다.',
            },
          })
          console.log(`[Process Text API] Text input ${textInput.id} failed - no valid places`)
          failed++
        }
      } catch (error) {
        console.error('Error processing text input:', textInput.id, error)
        await prisma.textInput.update({
          where: { id: textInput.id },
          data: {
            status: 'failed',
            errorMessage: '처리 중 오류가 발생했습니다.',
          },
        })
        failed++
      }
    }

    return NextResponse.json({
      message: 'Processing complete',
      total: pendingTextInputs.length,
      processed,
      failed,
    })
  } catch (error) {
    console.error('Error in process-text endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
