/**
 * Process Text Inputs API Route
 *
 * POST /api/projects/[id]/process-text
 * Processes pending text inputs to extract and geocode places.
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  createProcessTextInputsUseCase,
  createProcessingContext,
  createPlaceCreator,
  resetTextInputsToPending,
  toProcessableTextInputs,
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

    // Parse optional retry text input IDs
    let retryTextInputIds: string[] = []
    try {
      const body = await request.json()
      retryTextInputIds = body.retryTextInputIds || []
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

    // Reset retry text inputs to pending
    await resetTextInputsToPending(id, retryTextInputIds)

    // Fetch pending text inputs and existing places in parallel
    const [pendingTextInputs, existingPlaces] = await Promise.all([
      prisma.textInput.findMany({ where: { projectId: id, status: 'pending' } }),
      prisma.place.findMany({ where: { projectId: id } }),
    ])

    // Execute use case
    const useCase = createProcessTextInputsUseCase()
    const context = createProcessingContext(project, existingPlaces)
    const placeCreator = createPlaceCreator()

    const result = await useCase.execute(
      toProcessableTextInputs(pendingTextInputs),
      context,
      placeCreator
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in process-text endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
