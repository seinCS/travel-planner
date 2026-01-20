import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// POST /api/share/[token]/clone - 공유 프로젝트 복제
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { token } = await params

    // 공유 프로젝트 조회
    const sourceProject = await prisma.project.findUnique({
      where: { shareToken: token },
      include: {
        places: {
          select: {
            name: true,
            category: true,
            comment: true,
            latitude: true,
            longitude: true,
            googlePlaceId: true,
            formattedAddress: true,
            googleMapsUrl: true,
            rating: true,
            userRatingsTotal: true,
            priceLevel: true,
          },
        },
      },
    })

    if (!sourceProject) {
      return NextResponse.json(
        { error: '공유 링크를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    if (!sourceProject.shareEnabled) {
      return NextResponse.json(
        { error: '이 프로젝트는 더 이상 공유되지 않습니다.' },
        { status: 403 }
      )
    }

    // 자기 자신의 프로젝트는 복제 불가
    if (sourceProject.userId === session.user.id) {
      return NextResponse.json(
        { error: '자신의 프로젝트는 복제할 수 없습니다.' },
        { status: 400 }
      )
    }

    // 새 프로젝트 생성 (장소 포함)
    const newProject = await prisma.project.create({
      data: {
        userId: session.user.id,
        name: `${sourceProject.name} (복사본)`,
        destination: sourceProject.destination,
        country: sourceProject.country,
        places: {
          create: sourceProject.places.map((place) => ({
            name: place.name,
            category: place.category,
            comment: place.comment,
            latitude: place.latitude,
            longitude: place.longitude,
            googlePlaceId: place.googlePlaceId,
            formattedAddress: place.formattedAddress,
            googleMapsUrl: place.googleMapsUrl,
            rating: place.rating,
            userRatingsTotal: place.userRatingsTotal,
            priceLevel: place.priceLevel,
            status: 'cloned',
          })),
        },
      },
      include: {
        _count: {
          select: { places: true },
        },
      },
    })

    return NextResponse.json({
      newProjectId: newProject.id,
      placesCount: newProject._count.places,
    })
  } catch (error) {
    console.error('[Clone Error]', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
