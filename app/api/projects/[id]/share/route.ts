import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { randomUUID } from 'crypto'

const shareToggleSchema = z.object({
  enabled: z.boolean(),
})

// POST /api/projects/[id]/share - 공유 활성화/비활성화 토글
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId } = await params
    const body = await request.json()
    const { enabled } = shareToggleSchema.parse(body)

    // 프로젝트 소유자 확인
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: session.user.id,
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // 공유 토큰 생성 (처음 활성화 시 또는 토큰이 없는 경우)
    let shareToken = project.shareToken
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
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId } = await params

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: session.user.id,
      },
      select: {
        shareEnabled: true,
        shareToken: true,
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const shareUrl = project.shareEnabled && project.shareToken
      ? `${baseUrl}/s/${project.shareToken}`
      : null

    return NextResponse.json({
      shareEnabled: project.shareEnabled,
      shareToken: project.shareToken,
      shareUrl,
    })
  } catch (error) {
    console.error('[Share Status Error]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
