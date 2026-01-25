import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { checkOwnerAccess, checkProjectAccess } from '@/lib/project-auth'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { API_ERRORS } from '@/lib/constants'

const shareToggleSchema = z.object({
  enabled: z.boolean(),
})

// POST /api/projects/[id]/share - 공유 활성화/비활성화 토글 (Owner 전용)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: API_ERRORS.UNAUTHORIZED }, { status: 401 })
    }

    const { id: projectId } = await params
    const body = await request.json()
    const { enabled } = shareToggleSchema.parse(body)

    // Owner 전용 권한 확인 + shareToken 함께 조회 (중복 쿼리 방지)
    const { isOwner, project } = await checkOwnerAccess(projectId, session.user.id, {
      include: { shareToken: true },
    })

    if (!project) {
      return NextResponse.json({ error: API_ERRORS.PROJECT_NOT_FOUND }, { status: 404 })
    }

    if (!isOwner) {
      return NextResponse.json(
        { error: API_ERRORS.OWNER_ONLY_SHARE },
        { status: 403 }
      )
    }

    // 공유 토큰 생성 (처음 활성화 시 또는 토큰이 없는 경우)
    let shareToken = (project as { shareToken?: string | null }).shareToken ?? null
    if (enabled && !shareToken) {
      shareToken = randomUUID()
    }

    // 공유 상태 업데이트
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        shareEnabled: enabled,
        shareToken: shareToken,
      },
      select: {
        id: true,
        shareEnabled: true,
        shareToken: true,
      },
    })

    // 공유 URL 생성
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const shareUrl = updatedProject.shareEnabled && updatedProject.shareToken
      ? `${baseUrl}/s/${updatedProject.shareToken}`
      : null

    return NextResponse.json({
      shareEnabled: updatedProject.shareEnabled,
      shareToken: updatedProject.shareToken,
      shareUrl,
    })
  } catch (error) {
    console.error('[Share Toggle Error]', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: API_ERRORS.INVALID_REQUEST }, { status: 400 })
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Server error: ${errorMessage}` }, { status: 500 })
  }
}

// GET /api/projects/[id]/share - 공유 상태 조회
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: API_ERRORS.UNAUTHORIZED }, { status: 401 })
    }

    const { id: projectId } = await params

    // Owner 또는 Member 권한 확인 + share 정보 함께 조회 (중복 쿼리 방지)
    const { hasAccess, project } = await checkProjectAccess(projectId, session.user.id, {
      include: {
        shareEnabled: true,
        shareToken: true,
      },
    })

    if (!hasAccess || !project) {
      return NextResponse.json({ error: API_ERRORS.PROJECT_ACCESS_DENIED }, { status: 404 })
    }

    const projectWithShare = project as { shareEnabled?: boolean; shareToken?: string | null }
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const shareUrl = projectWithShare.shareEnabled && projectWithShare.shareToken
      ? `${baseUrl}/s/${projectWithShare.shareToken}`
      : null

    return NextResponse.json({
      shareEnabled: projectWithShare.shareEnabled ?? false,
      shareToken: projectWithShare.shareToken ?? null,
      shareUrl,
    })
  } catch (error) {
    console.error('[Share Status Error]', error)
    return NextResponse.json({ error: API_ERRORS.INTERNAL_ERROR }, { status: 500 })
  }
}
