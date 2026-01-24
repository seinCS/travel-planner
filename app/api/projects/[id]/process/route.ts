/**
 * Process Images API Route
 *
 * POST /api/projects/[id]/process
 * Processes pending images to extract and geocode places.
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  createProcessImagesUseCase,
  createProcessingContext,
  createPlaceCreator,
  resetImagesToPending,
  toProcessableImages,
} from '@/infrastructure/container'

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

    // Parse optional retry image IDs
    let retryImageIds: string[] = []
    try {
      const body = await request.json()
      retryImageIds = body.retryImageIds || []
    } catch {
      // body is optional
    }

    // Get project
    const project = await prisma.project.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Reset retry images to pending
    await resetImagesToPending(id, retryImageIds)

    // Fetch pending images and existing places in parallel
    const [pendingImages, existingPlaces] = await Promise.all([
      prisma.image.findMany({ where: { projectId: id, status: 'pending' } }),
      prisma.place.findMany({ where: { projectId: id } }),
    ])

    // Execute use case
    const useCase = createProcessImagesUseCase()
    const context = createProcessingContext(project, existingPlaces)
    const placeCreator = createPlaceCreator()

    const result = await useCase.execute(
      toProcessableImages(pendingImages),
      context,
      placeCreator
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in process endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
