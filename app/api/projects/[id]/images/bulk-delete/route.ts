import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { supabaseAdmin } from '@/lib/supabase'
import { z } from 'zod'

const bulkDeleteSchema = z.object({
  imageIds: z.array(z.string().min(1)).min(1, 'At least one image ID is required'),
})

// POST /api/projects/[id]/images/bulk-delete - 이미지 일괄 삭제
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      console.log('[Bulk Delete] Unauthorized - no session')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId } = await params
    console.log(`[Bulk Delete] Request from user ${session.user.id} for project ${projectId}`)

    // 프로젝트 조회 (소유권 필터 없이)
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, userId: true },
    })

    if (!project) {
      console.log(`[Bulk Delete] Project not found: ${projectId}`)
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // 소유자 또는 멤버인지 확인
    const isOwner = project.userId === session.user.id
    const isMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: session.user.id,
        },
      },
    })

    if (!isOwner && !isMember) {
      console.log(`[Bulk Delete] Forbidden - user ${session.user.id} is not owner or member`)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    console.log(`[Bulk Delete] Access granted - isOwner: ${isOwner}, isMember: ${!!isMember}`)

    const body = await request.json()
    console.log(`[Bulk Delete] Request body:`, JSON.stringify(body))

    const validated = bulkDeleteSchema.parse(body)
    const { imageIds } = validated
    console.log(`[Bulk Delete] Validated imageIds: ${imageIds.length} items`)

    // 삭제할 이미지 조회 (프로젝트 소속 확인)
    const images = await prisma.image.findMany({
      where: {
        id: { in: imageIds },
        projectId,
      },
    })

    console.log(`[Bulk Delete] Found ${images.length} images to delete`)

    if (images.length === 0) {
      console.log(`[Bulk Delete] No images found for IDs: ${imageIds.join(', ')}`)
      return NextResponse.json({ error: 'No images found to delete' }, { status: 404 })
    }

    const deletedIds: string[] = []
    const failedIds: { id: string; error: string }[] = []

    // 각 이미지 삭제 처리
    for (const image of images) {
      try {
        // Supabase Storage에서 이미지 삭제
        // URL에서 storage path 추출
        const url = new URL(image.url)
        const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/images\/(.+)/)

        if (pathMatch) {
          const storagePath = decodeURIComponent(pathMatch[1])
          const { error: storageError } = await supabaseAdmin.storage
            .from('images')
            .remove([storagePath])

          if (storageError) {
            console.warn(`[Bulk Delete] Storage delete warning for ${image.id}:`, storageError.message)
            // Storage 삭제 실패해도 DB 삭제는 진행
          }
        }

        // 관련된 PlaceImage 연결 삭제
        await prisma.placeImage.deleteMany({
          where: { imageId: image.id },
        })

        // DB에서 이미지 레코드 삭제
        await prisma.image.delete({
          where: { id: image.id },
        })

        deletedIds.push(image.id)
      } catch (err) {
        console.error(`[Bulk Delete] Error deleting image ${image.id}:`, err)
        failedIds.push({
          id: image.id,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    console.log(`[Bulk Delete] Completed - deleted: ${deletedIds.length}, failed: ${failedIds.length}`)

    return NextResponse.json({
      deleted: deletedIds,
      failed: failedIds,
      totalRequested: imageIds.length,
      totalDeleted: deletedIds.length,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.log(`[Bulk Delete] Validation error:`, JSON.stringify(error.issues))
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 })
    }
    console.error('[Bulk Delete] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
