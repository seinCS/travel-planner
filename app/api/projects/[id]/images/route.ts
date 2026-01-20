import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/projects/[id]/images - 이미지 목록 조회
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

    const images = await prisma.image.findMany({
      where: { projectId: id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(images)
  } catch (error) {
    console.error('Error fetching images:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/projects/[id]/images - 이미지 업로드
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

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (!files.length) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    const uploaded: { id: string; url: string; status: string }[] = []
    const failed: { name: string; error: string }[] = []

    console.log(`[Upload API] Processing ${files.length} files for project ${id}`)

    for (const file of files) {
      try {
        console.log(`[Upload API] Processing file: ${file.name}, type: "${file.type}", size: ${file.size}`)

        // 파일 검증 - type 또는 확장자로 이미지 확인
        const ext = file.name.split('.').pop()?.toLowerCase() || ''
        const validExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif']
        const isValidType = file.type.startsWith('image/') || validExtensions.includes(ext)

        if (!isValidType) {
          console.warn(`[Upload API] Invalid file type: "${file.type}", ext: "${ext}"`)
          failed.push({ name: file.name, error: 'Invalid file type' })
          continue
        }

        if (file.size > 10 * 1024 * 1024) {
          console.warn(`[Upload API] File too large: ${file.size}`)
          failed.push({ name: file.name, error: 'File too large (max 10MB)' })
          continue
        }

        // Supabase Storage에 업로드
        const fileExt = ext || 'jpg'
        const fileName = `${session.user.id}/${id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`

        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        console.log(`[Upload API] Uploading to Supabase: ${fileName}`)

        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
          .from('images')
          .upload(fileName, buffer, {
            contentType: file.type || 'image/jpeg',
            cacheControl: '3600',
          })

        if (uploadError) {
          console.error('[Upload API] Supabase upload error:', uploadError)
          failed.push({ name: file.name, error: `Upload failed: ${uploadError.message}` })
          continue
        }

        console.log(`[Upload API] Supabase upload success: ${uploadData.path}`)

        // Public URL 생성
        const { data: urlData } = supabaseAdmin.storage
          .from('images')
          .getPublicUrl(uploadData.path)

        console.log(`[Upload API] Public URL: ${urlData.publicUrl}`)

        // DB에 이미지 레코드 생성
        const image = await prisma.image.create({
          data: {
            projectId: id,
            url: urlData.publicUrl,
            status: 'pending',
          },
        })

        console.log(`[Upload API] DB record created: ${image.id}`)

        uploaded.push({
          id: image.id,
          url: image.url,
          status: image.status,
        })
      } catch (error) {
        console.error('[Upload API] Error processing file:', file.name, error)
        failed.push({ name: file.name, error: 'Processing failed' })
      }
    }

    console.log(`[Upload API] Complete - uploaded: ${uploaded.length}, failed: ${failed.length}`)

    return NextResponse.json({ uploaded, failed })
  } catch (error) {
    console.error('Error uploading images:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
