/**
 * API Utility Functions
 *
 * Common utilities for API route handlers including authentication
 * and authorization checks.
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// ============================================================================
// Types
// ============================================================================

export interface AuthResult {
  userId: string
}

export interface ProjectOwnershipResult {
  userId: string
  project: {
    id: string
    userId: string
    name: string
  }
}

export interface ItineraryOwnershipResult {
  userId: string
  itinerary: {
    id: string
    projectId: string
    project: {
      id: string
      userId: string
    }
  }
}

// Error response type
export type ApiErrorResponse = NextResponse<{ error: string }>

// ============================================================================
// Authentication
// ============================================================================

/**
 * Check if user is authenticated and return their user ID.
 * Returns a NextResponse error if not authenticated.
 */
export async function requireAuth(): Promise<AuthResult | ApiErrorResponse> {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return { userId: session.user.id }
}

/**
 * Type guard to check if result is an error response
 */
export function isErrorResponse(result: unknown): result is ApiErrorResponse {
  return result instanceof NextResponse
}

// ============================================================================
// Project Ownership
// ============================================================================

/**
 * Verify that the current user owns a project.
 * Returns the project if owned, or an error response.
 */
export async function verifyProjectOwnership(
  projectId: string
): Promise<ProjectOwnershipResult | ApiErrorResponse> {
  const authResult = await requireAuth()
  if (isErrorResponse(authResult)) {
    return authResult
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId: authResult.userId,
    },
    select: {
      id: true,
      userId: true,
      name: true,
    },
  })

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  return {
    userId: authResult.userId,
    project,
  }
}

// ============================================================================
// Itinerary Ownership
// ============================================================================

/**
 * Verify that the current user owns an itinerary (via its project).
 * Returns the itinerary if owned, or an error response.
 */
export async function verifyItineraryOwnership(
  itineraryId: string
): Promise<ItineraryOwnershipResult | ApiErrorResponse> {
  const authResult = await requireAuth()
  if (isErrorResponse(authResult)) {
    return authResult
  }

  const itinerary = await prisma.itinerary.findUnique({
    where: { id: itineraryId },
    include: {
      project: {
        select: {
          id: true,
          userId: true,
        },
      },
    },
  })

  if (!itinerary) {
    return NextResponse.json({ error: 'Itinerary not found' }, { status: 404 })
  }

  if (itinerary.project.userId !== authResult.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return {
    userId: authResult.userId,
    itinerary: {
      id: itinerary.id,
      projectId: itinerary.projectId,
      project: itinerary.project,
    },
  }
}

// ============================================================================
// Place Ownership
// ============================================================================

/**
 * Verify that the current user owns a place (via its project).
 * Returns the place if owned, or an error response.
 */
export async function verifyPlaceOwnership(placeId: string): Promise<
  | {
      userId: string
      place: {
        id: string
        projectId: string
        project: {
          id: string
          userId: string
        }
      }
    }
  | ApiErrorResponse
> {
  const authResult = await requireAuth()
  if (isErrorResponse(authResult)) {
    return authResult
  }

  const place = await prisma.place.findUnique({
    where: { id: placeId },
    include: {
      project: {
        select: {
          id: true,
          userId: true,
        },
      },
    },
  })

  if (!place) {
    return NextResponse.json({ error: 'Place not found' }, { status: 404 })
  }

  if (place.project.userId !== authResult.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return {
    userId: authResult.userId,
    place: {
      id: place.id,
      projectId: place.projectId,
      project: place.project,
    },
  }
}

// ============================================================================
// Flight Ownership
// ============================================================================

/**
 * Verify that the current user owns a flight (via its itinerary -> project).
 */
export async function verifyFlightOwnership(flightId: string): Promise<
  | {
      userId: string
      flight: {
        id: string
        itineraryId: string
        itinerary: {
          id: string
          project: {
            id: string
            userId: string
          }
        }
      }
    }
  | ApiErrorResponse
> {
  const authResult = await requireAuth()
  if (isErrorResponse(authResult)) {
    return authResult
  }

  const flight = await prisma.flight.findUnique({
    where: { id: flightId },
    include: {
      itinerary: {
        include: {
          project: {
            select: {
              id: true,
              userId: true,
            },
          },
        },
      },
    },
  })

  if (!flight) {
    return NextResponse.json({ error: 'Flight not found' }, { status: 404 })
  }

  if (flight.itinerary.project.userId !== authResult.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return {
    userId: authResult.userId,
    flight: {
      id: flight.id,
      itineraryId: flight.itineraryId,
      itinerary: flight.itinerary,
    },
  }
}

// ============================================================================
// Accommodation Ownership
// ============================================================================

/**
 * Verify that the current user owns an accommodation (via its itinerary -> project).
 */
export async function verifyAccommodationOwnership(accommodationId: string): Promise<
  | {
      userId: string
      accommodation: {
        id: string
        itineraryId: string
        itinerary: {
          id: string
          project: {
            id: string
            userId: string
          }
        }
      }
    }
  | ApiErrorResponse
> {
  const authResult = await requireAuth()
  if (isErrorResponse(authResult)) {
    return authResult
  }

  const accommodation = await prisma.accommodation.findUnique({
    where: { id: accommodationId },
    include: {
      itinerary: {
        include: {
          project: {
            select: {
              id: true,
              userId: true,
            },
          },
        },
      },
    },
  })

  if (!accommodation) {
    return NextResponse.json({ error: 'Accommodation not found' }, { status: 404 })
  }

  if (accommodation.itinerary.project.userId !== authResult.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return {
    userId: authResult.userId,
    accommodation: {
      id: accommodation.id,
      itineraryId: accommodation.itineraryId,
      itinerary: accommodation.itinerary,
    },
  }
}

// ============================================================================
// Itinerary Item Ownership
// ============================================================================

/**
 * Verify that the current user owns an itinerary item (via its day -> itinerary -> project).
 */
export async function verifyItineraryItemOwnership(itemId: string): Promise<
  | {
      userId: string
      item: {
        id: string
        dayId: string
        day: {
          id: string
          itineraryId: string
          itinerary: {
            id: string
            project: {
              id: string
              userId: string
            }
          }
        }
      }
    }
  | ApiErrorResponse
> {
  const authResult = await requireAuth()
  if (isErrorResponse(authResult)) {
    return authResult
  }

  const item = await prisma.itineraryItem.findUnique({
    where: { id: itemId },
    include: {
      day: {
        include: {
          itinerary: {
            include: {
              project: {
                select: {
                  id: true,
                  userId: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 })
  }

  if (item.day.itinerary.project.userId !== authResult.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return {
    userId: authResult.userId,
    item: {
      id: item.id,
      dayId: item.dayId,
      day: item.day,
    },
  }
}
