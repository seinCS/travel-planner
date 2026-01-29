import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkProjectAccess } from '@/lib/project-auth'
import { API_ERRORS } from '@/lib/constants'
import { generateKML, type KMLPlace, type KMLDay } from '@/infrastructure/services/KMLExportService'

// GET /api/projects/[id]/export?format=kml&dayId=optional
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: API_ERRORS.UNAUTHORIZED }, { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'kml'
    const dayId = searchParams.get('dayId')

    // 현재는 KML 형식만 지원
    if (format !== 'kml') {
      return NextResponse.json({ error: '지원하지 않는 형식입니다. kml만 지원합니다.' }, { status: 400 })
    }

    // 프로젝트 접근 권한 확인
    const { hasAccess, project } = await checkProjectAccess(id, session.user.id, {
      include: {
        places: {
          select: {
            id: true,
            name: true,
            category: true,
            latitude: true,
            longitude: true,
            comment: true,
            rating: true,
            formattedAddress: true,
          },
        },
        itinerary: {
          include: {
            days: {
              include: {
                items: {
                  where: {
                    placeId: { not: null },
                  },
                  select: {
                    placeId: true,
                    order: true,
                  },
                  orderBy: {
                    order: 'asc',
                  },
                },
              },
              orderBy: {
                dayNumber: 'asc',
              },
            },
          },
        },
      },
    })

    if (!hasAccess || !project) {
      return NextResponse.json({ error: API_ERRORS.PROJECT_ACCESS_DENIED }, { status: 404 })
    }

    // 타입 안전하게 데이터 추출
    const projectData = project as {
      name: string
      places?: Array<{
        id: string
        name: string
        category: string
        latitude: number
        longitude: number
        comment: string | null
        rating: number | null
        formattedAddress: string | null
      }>
      itinerary?: {
        days: Array<{
          id: string
          dayNumber: number
          date: Date
          items: Array<{
            placeId: string | null
            order: number
          }>
        }>
      } | null
    }

    const places: KMLPlace[] = projectData.places || []
    let days: KMLDay[] | undefined

    // 일정 데이터가 있는 경우
    if (projectData.itinerary?.days && projectData.itinerary.days.length > 0) {
      // dayId가 지정된 경우 해당 날짜만 필터
      if (dayId) {
        const targetDay = projectData.itinerary.days.find(d => d.id === dayId)
        if (targetDay) {
          days = [{
            dayNumber: targetDay.dayNumber,
            date: targetDay.date.toISOString(),
            items: targetDay.items
              .filter((item): item is { placeId: string; order: number } => item.placeId !== null)
              .map(item => ({
                placeId: item.placeId,
                order: item.order,
              })),
          }]
        }
      } else {
        // 전체 일정
        days = projectData.itinerary.days.map(day => ({
          dayNumber: day.dayNumber,
          date: day.date.toISOString(),
          items: day.items
            .filter((item): item is { placeId: string; order: number } => item.placeId !== null)
            .map(item => ({
              placeId: item.placeId,
              order: item.order,
            })),
        }))
      }
    }

    // KML 생성
    const kmlContent = generateKML({
      projectName: projectData.name,
      places,
      days,
    })

    // 파일명 생성
    // ASCII 파일명 (폴백용 - 영문/숫자가 없으면 'travel-plan' 사용)
    const asciiOnly = projectData.name
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '_')
      .replace(/^_+|_+$/g, '') // 앞뒤 언더스코어 제거
    const hasAlphanumeric = /[a-zA-Z0-9]/.test(asciiOnly)
    const asciiFileName = hasAlphanumeric
      ? asciiOnly.substring(0, 50)
      : 'travel-plan'

    // UTF-8 파일명 (모던 브라우저용 - 한글 유지)
    const utf8Only = projectData.name
      .replace(/[^\w\s가-힣-]/g, '')
      .replace(/\s+/g, '_')
      .replace(/^_+|_+$/g, '') // 앞뒤 언더스코어 제거
    const hasContent = utf8Only.length > 0
    const utf8FileName = hasContent
      ? utf8Only.substring(0, 50)
      : 'travel-plan'

    // KML 파일 다운로드 응답 (한글 지원을 위해 UTF-8 인코딩)
    const encoder = new TextEncoder()
    const kmlBytes = encoder.encode(kmlContent)

    return new NextResponse(kmlBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.google-earth.kml+xml; charset=utf-8',
        'Content-Disposition': `attachment; filename="${asciiFileName}.kml"; filename*=UTF-8''${encodeURIComponent(utf8FileName)}.kml`,
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    console.error('Error exporting project:', error)
    return NextResponse.json({ error: API_ERRORS.INTERNAL_ERROR }, { status: 500 })
  }
}
