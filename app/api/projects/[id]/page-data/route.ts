import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkProjectAccess } from '@/lib/project-auth'
import { API_ERRORS } from '@/lib/constants'

// GET /api/projects/[id]/page-data - BFF: 프로젝트 페이지 전체 데이터 단일 조회
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

    // 단일 쿼리로 프로젝트 + 이미지 + 장소 + 텍스트입력 모두 조회
    const { hasAccess, role, project } = await checkProjectAccess(id, session.user.id, {
      include: {
        images: {
          orderBy: { createdAt: 'desc' },
        },
        places: {
          include: {
            placeImages: {
              select: { imageId: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        textInputs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!hasAccess || !project) {
      return NextResponse.json(
        { error: API_ERRORS.PROJECT_ACCESS_DENIED },
        { status: 404 }
      )
    }

    // 프로젝트 데이터에서 관계 데이터 추출
    const { images, places, textInputs, ...projectBase } = project as {
      images?: Array<Record<string, unknown>>
      places?: Array<Record<string, unknown>>
      textInputs?: Array<Record<string, unknown>>
    } & Record<string, unknown>

    const imageList = (images ?? []) as Array<{ status: string } & Record<string, unknown>>
    const textInputList = (textInputs ?? []) as Array<{ status: string } & Record<string, unknown>>

    // 메타데이터 계산
    const meta = {
      pendingImageCount: imageList.filter((i) => i.status === 'pending').length,
      failedImageCount: imageList.filter((i) => i.status === 'failed').length,
      pendingTextCount: textInputList.filter((t) => t.status === 'pending').length,
      failedTextCount: textInputList.filter((t) => t.status === 'failed').length,
    }

    const data = {
      project: { ...projectBase, userRole: role },
      images: imageList,
      places: places ?? [],
      textInputs: textInputList,
      meta,
      cachedAt: new Date().toISOString(),
    }

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
      },
    })
  } catch (error) {
    console.error('Error fetching project page data:', error)
    return NextResponse.json({ error: API_ERRORS.INTERNAL_ERROR }, { status: 500 })
  }
}
