import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/share/[token] - 공유 페이지 데이터 조회 (인증 불필요)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    // 토큰으로 프로젝트 조회
    const project = await prisma.project.findUnique({
      where: { shareToken: token },
      select: {
        id: true,
        name: true,
        destination: true,
        country: true,
        shareEnabled: true,
        places: {
          select: {
            id: true,
            name: true,
            category: true,
            comment: true,
            latitude: true,
            longitude: true,
            formattedAddress: true,
            googleMapsUrl: true,
            rating: true,
            userRatingsTotal: true,
            priceLevel: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    // 프로젝트가 없거나 공유 비활성화 상태
    if (!project) {
      return NextResponse.json(
        { error: '공유 링크를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    if (!project.shareEnabled) {
      return NextResponse.json(
        { error: '이 프로젝트는 더 이상 공유되지 않습니다.' },
        { status: 403 }
      )
    }

    // 민감 정보 제외하고 반환
    return NextResponse.json({
      project: {
        name: project.name,
        destination: project.destination,
        country: project.country,
      },
      places: project.places,
    })
  } catch (error) {
    console.error('[Share Data Error]', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
