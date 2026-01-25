import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { checkProjectAccess, checkOwnerAccess } from '@/lib/project-auth'

// GET /api/projects/[id] - 프로젝트 상세 조회
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Owner 또는 Member 권한 확인
    const { hasAccess, role } = await checkProjectAccess(id, session.user.id)

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      )
    }

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        places: {
          include: {
            placeImages: {
              include: {
                image: true,
              },
            },
          },
        },
        images: true,
      },
    })

    // role 정보를 응답에 포함
    return NextResponse.json({ ...project, userRole: role })
  } catch (error) {
    console.error('Error fetching project:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/projects/[id] - 프로젝트 삭제 (Owner 전용)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Owner 전용 권한 확인
    const { isOwner, project } = await checkOwnerAccess(id, session.user.id)

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (!isOwner) {
      return NextResponse.json(
        { error: 'Only project owner can delete the project' },
        { status: 403 }
      )
    }

    // 삭제 (cascade로 관련 데이터 함께 삭제)
    await prisma.project.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
