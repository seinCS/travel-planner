/**
 * Apply Itinerary API Route
 *
 * POST /api/projects/[id]/chat/apply-itinerary
 * Applies an AI-generated itinerary preview to the project.
 */

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkProjectAccess } from '@/lib/project-auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { z } from 'zod'

export const runtime = 'nodejs'

const applyItinerarySchema = z.object({
  preview: z.object({
    title: z.string(),
    days: z.array(z.object({
      dayNumber: z.number(),
      date: z.string(),
      items: z.array(z.object({
        order: z.number(),
        placeName: z.string(),
        placeNameEn: z.string().optional(),
        category: z.string(),
        startTime: z.string().optional(),
        duration: z.string().optional(),
        note: z.string().optional(),
        matched: z.boolean().optional(),
      })),
    })),
  }),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params

    // 1. Authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Project access check
    const accessResult = await checkProjectAccess(projectId, session.user.id)
    if (!accessResult.hasAccess) {
      return Response.json({ error: 'Access denied' }, { status: 403 })
    }

    // 3. Parse and validate body
    const body = await request.json()
    const parsed = applyItinerarySchema.safeParse(body)
    if (!parsed.success) {
      return Response.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { preview } = parsed.data
    const overwrite = request.nextUrl.searchParams.get('overwrite') === 'true'

    // 4. Check for existing itinerary
    const existing = await prisma.itinerary.findFirst({
      where: { projectId },
      select: { id: true },
    })

    if (existing && !overwrite) {
      return Response.json(
        { error: 'ITINERARY_EXISTS', existingId: existing.id },
        { status: 409 }
      )
    }

    // 5. Delete existing itinerary if overwriting
    if (existing && overwrite) {
      await prisma.itinerary.delete({ where: { id: existing.id } })
    }

    // 6. Calculate dates
    const startDate = new Date()
    startDate.setHours(0, 0, 0, 0)
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + Math.max(preview.days.length - 1, 0))

    // 7. Create itinerary with days and items
    const skippedPlaces: string[] = []

    const itinerary = await prisma.itinerary.create({
      data: {
        projectId,
        title: preview.title,
        startDate,
        endDate,
        days: {
          create: await Promise.all(preview.days.map(async (day) => {
            const dayDate = new Date(startDate)
            dayDate.setDate(dayDate.getDate() + day.dayNumber - 1)

            // Match places by name (normalize and trim for consistent matching)
            const itemsData = []
            for (const item of day.items) {
              const normalizedPlaceName = item.placeName.trim()
              const place = await prisma.place.findFirst({
                where: {
                  projectId,
                  name: { equals: normalizedPlaceName, mode: 'insensitive' },
                },
                select: { id: true },
              })

              if (place) {
                itemsData.push({
                  placeId: place.id,
                  order: item.order,
                  startTime: item.startTime || null,
                  duration: item.duration ? parseInt(item.duration, 10) || null : null,
                  note: item.note || null,
                })
              } else {
                skippedPlaces.push(item.placeName)
              }
            }

            return {
              dayNumber: day.dayNumber,
              date: dayDate,
              items: {
                create: itemsData,
              },
            }
          })),
        },
      },
      select: { id: true },
    })

    logger.info('Itinerary applied from chat', {
      projectId,
      itineraryId: itinerary.id,
      daysCount: preview.days.length,
      skippedCount: skippedPlaces.length,
    })

    return Response.json({
      success: true,
      itineraryId: itinerary.id,
      skippedPlaces,
    })
  } catch (error) {
    logger.error('Apply itinerary error', {
      error: error instanceof Error ? error.message : String(error),
    })
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
