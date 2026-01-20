import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { analyzeImage, ExtractedPlace } from '@/lib/claude'
import { geocodePlaceWithFallback, isDuplicatePlace, GeocodingResult } from '@/lib/google-maps'

// POST /api/projects/[id]/process - 이미지 처리 시작
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

    // 재시도할 이미지 ID 목록 (옵션)
    let retryImageIds: string[] = []
    try {
      const body = await request.json()
      retryImageIds = body.retryImageIds || []
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

    // 재시도 이미지가 있으면 pending으로 변경
    if (retryImageIds.length > 0) {
      await prisma.image.updateMany({
        where: { id: { in: retryImageIds }, projectId: id },
        data: { status: 'pending', errorMessage: null },
      })
      console.log(`[Process API] Reset ${retryImageIds.length} images to pending for retry`)
    }

    // 병렬로 pending 이미지와 기존 장소 조회 (async-parallel 패턴)
    const [pendingImages, existingPlacesResult] = await Promise.all([
      prisma.image.findMany({
        where: { projectId: id, status: 'pending' },
      }),
      prisma.place.findMany({
        where: { projectId: id },
      }),
    ])

    if (pendingImages.length === 0) {
      return NextResponse.json({ message: 'No pending images', processed: 0 })
    }

    // 기존 장소 목록 (중복 체크용) - 새 장소 추가를 위해 mutable 배열로 복사
    const existingPlaces = [...existingPlacesResult]

    // Geocoding 캐시 (동일 장소명 재사용)
    const geocodingCache = new Map<string, GeocodingResult | null>()

    let processed = 0
    let failed = 0

    console.log(`[Process API] Starting analysis for ${pendingImages.length} images`)

    // Step 1: Parallel image analysis with Claude API using Promise.all()
    // Each analysis is wrapped to handle errors individually
    const analysisPromises = pendingImages.map(async (image) => {
      try {
        console.log(`[Process API] Analyzing image: ${image.id}`)
        const analysisResult = await analyzeImage(
          image.url,
          project.destination,
          project.country || ''
        )
        console.log(`[Process API] Analysis result for ${image.id}:`, JSON.stringify(analysisResult, null, 2))
        return { image, analysisResult, error: null }
      } catch (error) {
        console.error('[Process API] Error analyzing image:', image.id, error)
        return { image, analysisResult: null, error }
      }
    })

    // Wait for all Claude API calls to complete in parallel
    const analysisResults = await Promise.all(analysisPromises)

    // Step 2: Process results sequentially for proper duplicate handling
    for (const { image, analysisResult, error } of analysisResults) {
      try {
        // Handle analysis errors
        if (error || !analysisResult) {
          await prisma.image.update({
            where: { id: image.id },
            data: {
              status: 'failed',
              errorMessage: '이미지 분석 중 오류가 발생했습니다.',
            },
          })
          failed++
          continue
        }

        // 빈 배열이면 실패 처리
        if (!analysisResult.places || analysisResult.places.length === 0) {
          console.log(`[Process API] No places found for ${image.id}`)
          await prisma.image.update({
            where: { id: image.id },
            data: {
              status: 'failed',
              rawText: analysisResult.raw_text,
              errorMessage: '장소를 인식할 수 없습니다.',
            },
          })
          failed++
          continue
        }

        console.log(`[Process API] Processing ${analysisResult.places.length} places for image ${image.id}`)

        // 이미지 내 중복 체크를 위한 Set (같은 이미지에서 추출된 장소명)
        const placesInThisImage = new Set<string>()
        let successCount = 0
        let errorMessage = ''

        // 각 장소 처리
        for (let i = 0; i < analysisResult.places.length; i++) {
          const place: ExtractedPlace = analysisResult.places[i]
          console.log(`[Process API] Processing place ${i + 1}/${analysisResult.places.length}: ${place.place_name}`)

          // 신뢰도 체크
          if (place.confidence < 0.5) {
            console.log(`[Process API] Low confidence for ${place.place_name}: ${place.confidence}`)
            continue
          }

          // 같은 이미지 내 중복 체크
          const placeNameLower = place.place_name.toLowerCase()
          if (placesInThisImage.has(placeNameLower)) {
            console.log(`[Process API] Duplicate within same image: ${place.place_name}`)
            continue
          }

          // Geocoding with fallback (캐시 확인)
          let geoResult: GeocodingResult | null
          const cacheKey = `${place.place_name}|${place.place_name_en || ''}`
          if (geocodingCache.has(cacheKey)) {
            geoResult = geocodingCache.get(cacheKey) || null
            console.log(`[Process API] Using cached geocoding for: ${place.place_name}`)
          } else {
            console.log(`[Process API] Geocoding place: ${place.place_name} (EN: ${place.place_name_en || 'N/A'})`)
            geoResult = await geocodePlaceWithFallback(
              place.place_name,
              place.place_name_en,
              project.destination,
              project.country || undefined
            )
            geocodingCache.set(cacheKey, geoResult)
          }

          if (!geoResult) {
            console.log(`[Process API] Geocoding failed for: ${place.place_name}`)
            errorMessage = '일부 장소의 위치를 찾을 수 없습니다.'
            continue
          }

          console.log(`[Process API] Geocoding success: ${geoResult.latitude}, ${geoResult.longitude}`)

          // 프로젝트 내 중복 장소 확인 (Place ID 우선)
          const duplicate = existingPlaces.find(
            (p: { name: string; latitude: number; longitude: number; googlePlaceId?: string | null }) =>
              // 1순위: Google Place ID 일치
              (p.googlePlaceId && geoResult!.googlePlaceId && p.googlePlaceId === geoResult!.googlePlaceId) ||
              // 2순위: 이름 일치
              p.name.toLowerCase() === placeNameLower ||
              // 3순위: 좌표 근접 (100m 이내)
              isDuplicatePlace(p.latitude, p.longitude, geoResult!.latitude, geoResult!.longitude)
          )

          if (duplicate) {
            // 기존 장소에 이미지 연결 (이미 존재하면 무시)
            console.log(`[Process API] Duplicate found: ${duplicate.name}, linking image`)
            await prisma.placeImage.upsert({
              where: {
                placeId_imageId: {
                  placeId: duplicate.id,
                  imageId: image.id,
                },
              },
              update: {},
              create: {
                placeId: duplicate.id,
                imageId: image.id,
              },
            })
          } else {
            // 새 장소 생성
            console.log(`[Process API] Creating new place: ${place.place_name}`)
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

            console.log(`[Process API] Place created: ${newPlace.id}`)

            // 이미지 연결 (이미 존재하면 무시)
            await prisma.placeImage.upsert({
              where: {
                placeId_imageId: {
                  placeId: newPlace.id,
                  imageId: image.id,
                },
              },
              update: {},
              create: {
                placeId: newPlace.id,
                imageId: image.id,
              },
            })

            // 새 장소를 기존 목록에 추가 (다음 이미지 중복 체크용)
            existingPlaces.push(newPlace)
          }

          // 이미지 내 중복 목록에 추가
          placesInThisImage.add(placeNameLower)
          successCount++
        }

        // 이미지 상태 업데이트: 1개 이상 성공 시 processed, 모두 실패 시 failed
        if (successCount > 0) {
          await prisma.image.update({
            where: { id: image.id },
            data: {
              status: 'processed',
              rawText: analysisResult.raw_text,
            },
          })
          console.log(`[Process API] Image ${image.id} processed successfully with ${successCount} places`)
          processed++
        } else {
          await prisma.image.update({
            where: { id: image.id },
            data: {
              status: 'failed',
              rawText: analysisResult.raw_text,
              errorMessage: errorMessage || '유효한 장소를 찾을 수 없습니다.',
            },
          })
          console.log(`[Process API] Image ${image.id} failed - no valid places`)
          failed++
        }
      } catch (error) {
        console.error('Error processing image:', image.id, error)
        await prisma.image.update({
          where: { id: image.id },
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
      total: pendingImages.length,
      processed,
      failed,
    })
  } catch (error) {
    console.error('Error in process endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
