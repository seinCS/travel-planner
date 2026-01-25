/**
 * Members API Route
 *
 * GET  /api/projects/[id]/members - List all members of a project
 * POST /api/projects/[id]/members - Add a member directly (owner only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/projects/[id]/members
 * List all members of a project
 *
 * Optimized: 3단계 쿼리 → 단일 쿼리로 통합 (async-parallel 패턴)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId } = await params

    // 단일 쿼리로 프로젝트 + 멤버 정보 동시 조회 (워터폴 제거)
    const projectWithMembers = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        userId: true,
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
          orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
        },
      },
    })

    if (!projectWithMembers) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // 메모리 내에서 권한 확인 (추가 쿼리 불필요)
    const isOwner = projectWithMembers.userId === session.user.id
    const currentUserMember = projectWithMembers.members.find(
      (m) => m.userId === session.user.id
    )
    const isMember = !!currentUserMember

    if (!isOwner && !isMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Determine current user's role
    const currentUserRole = isOwner ? 'owner' : currentUserMember?.role || 'member'

    return NextResponse.json({
      members: projectWithMembers.members,
      currentUserRole,
    })
  } catch (error) {
    console.error('Error fetching members:', error)
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    )
  }
}
