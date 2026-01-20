import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { crawlUrl } from '@/lib/crawler'
import { z } from 'zod'

// 요청 검증 스키마
const createTextInputSchema = z
  .object({
    type: z.enum(['text', 'url']),
    content: z.string().min(1),
  })
  .refine(
    (data) => {
      if (data.type === 'text') {
        return data.content.length >= 10 && data.content.length <= 5000
      }
      if (data.type === 'url') {
        try {
          new URL(data.content)
          return true
        } catch {
          return false
        }
      }
      return false
    },
    {
      message: '텍스트는 10~5000자, URL은 유효한 형식이어야 합니다.',
    }
  )

// GET /api/projects/[id]/text-inputs - 텍스트 입력 목록 조회
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

    // 프로젝트 소유권 확인
    const project = await prisma.project.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // 텍스트 입력 목록 조회
    const textInputs = await prisma.textInput.findMany({
      where: { projectId: id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ textInputs })
  } catch (error) {
    console.error('Error fetching text inputs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/projects/[id]/text-inputs - 텍스트/URL 입력 생성
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

    // 프로젝트 소유권 확인
    const project = await prisma.project.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // 요청 검증
    const body = await request.json()
    const validationResult = createTextInputSchema.safeParse(body)

    if (!validationResult.success) {
      const issues = validationResult.error.issues
      return NextResponse.json(
        { error: issues[0]?.message || '입력값이 올바르지 않습니다.' },
        { status: 400 }
      )
    }

    const { type, content } = validationResult.data

    // URL 타입인 경우 크롤링 수행
    if (type === 'url') {
      console.log(`[TextInput API] Crawling URL: ${content}`)
      const crawlResult = await crawlUrl(content)

      if (!crawlResult.success) {
        // 크롤링 실패 시 failed 상태로 저장
        const textInput = await prisma.textInput.create({
          data: {
            projectId: id,
            type,
            content,
            sourceUrl: content,
            status: 'failed',
            errorMessage: crawlResult.error || '크롤링에 실패했습니다.',
          },
        })

        return NextResponse.json(textInput, { status: 201 })
      }

      // 크롤링 성공
      const textInput = await prisma.textInput.create({
        data: {
          projectId: id,
          type,
          content: crawlResult.title || content,
          sourceUrl: content,
          extractedText: crawlResult.text,
          status: 'pending',
        },
      })

      console.log(`[TextInput API] URL crawled successfully: ${textInput.id}`)
      return NextResponse.json(textInput, { status: 201 })
    }

    // 텍스트 타입인 경우
    const textInput = await prisma.textInput.create({
      data: {
        projectId: id,
        type,
        content,
        status: 'pending',
      },
    })

    console.log(`[TextInput API] Text input created: ${textInput.id}`)
    return NextResponse.json(textInput, { status: 201 })
  } catch (error) {
    console.error('Error creating text input:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
