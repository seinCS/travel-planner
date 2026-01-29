import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import { API_ERRORS } from '@/lib/constants'
import {
  calculateRouteDistancesWithTransit,
  calculateTotals,
  calculateTransitTotals,
} from '@/infrastructure/services/DistanceService'
import type { DistanceResponse } from '@/types/route'

const distanceRequestSchema = z.object({
  dayId: z.string().min(1),
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        placeId: z.string().optional(),
        accommodationId: z.string().optional(),
        itemType: z.enum(['place', 'accommodation']),
        latitude: z.number(),
        longitude: z.number(),
        order: z.number().int().min(0),
      })
    )
    .min(2, '거리 계산을 위해 최소 2개의 항목이 필요합니다'),
})

/**
 * POST /api/itinerary/distances
 *
 * 일정 항목들 간의 거리/시간 정보를 계산합니다.
 * Haversine 공식을 사용한 직선 거리 계산 (API 비용 절감)
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: API_ERRORS.UNAUTHORIZED }, { status: 401 })
    }

    const body = await request.json()
    const validated = distanceRequestSchema.parse(body)

    // 거리/시간 계산 (대중교통 시간 포함)
    const segments = calculateRouteDistancesWithTransit(validated.items)
    const totals = calculateTotals(segments)
    const transitTotals = calculateTransitTotals(segments)

    const response: DistanceResponse = {
      segments,
      totalDistance: totals.totalDistance,
      totalDuration: totals.totalDuration,
      totalTransitDuration: transitTotals.totalTransitDuration ?? undefined,
    }

    return NextResponse.json(response)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '잘못된 요청 형식입니다', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Error calculating distances:', error)
    return NextResponse.json({ error: API_ERRORS.INTERNAL_ERROR }, { status: 500 })
  }
}
