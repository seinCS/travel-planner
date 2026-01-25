import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  destination: z.string().min(1).max(100),
  country: z.string().max(100).optional(),
})

// GET /api/projects - 프로젝트 목록 조회 (소유 + 참여 프로젝트)
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // 소유한 프로젝트와 참여한 프로젝트 모두 조회
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { userId }, // 소유한 프로젝트
          {
            members: {
              some: {
                userId,
              },
            },
          }, // 참여한 프로젝트
        ],
      },
      include: {
        _count: {
          select: {
            places: true,
            images: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        members: {
          where: {
            userId,
          },
          select: {
            role: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    // 각 프로젝트에 현재 사용자의 역할(role) 추가
    const projectsWithRole = projects.map((project) => {
      const isOwner = project.userId === userId
      const memberRole = project.members[0]?.role

      return {
        ...project,
        role: isOwner ? 'owner' : (memberRole || 'member'),
        isOwner,
        members: undefined, // 클라이언트에 members 배열 불필요
      }
    })

    return NextResponse.json(projectsWithRole)
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/projects - 프로젝트 생성
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validated = createProjectSchema.parse(body)

    const project = await prisma.project.create({
      data: {
        ...validated,
        userId: session.user.id,
      },
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error('Error creating project:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
