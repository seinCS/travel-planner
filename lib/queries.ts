import { cache } from 'react'
import { prisma } from './db'

/**
 * Cached query functions using React.cache() for request-level deduplication.
 *
 * React.cache() memoizes the result of a function for the duration of a single
 * server request. If the same function is called multiple times with the same
 * arguments during a request, it will return the cached result instead of
 * making duplicate database queries.
 *
 * This is particularly useful in React Server Components where the same data
 * might be needed in multiple components during a single render.
 */

// ============================================================================
// User Queries
// ============================================================================

export const getUser = cache(async (userId: string) => {
  return prisma.user.findUnique({
    where: { id: userId },
  })
})

export const getUserByEmail = cache(async (email: string) => {
  return prisma.user.findUnique({
    where: { email },
  })
})

export const getUserWithProjects = cache(async (userId: string) => {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      projects: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })
})

// ============================================================================
// Project Queries
// ============================================================================

export const getProject = cache(async (id: string, userId: string) => {
  return prisma.project.findFirst({
    where: { id, userId },
    include: {
      places: {
        include: {
          placeImages: {
            include: {
              image: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      images: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })
})

export const getProjectBasic = cache(async (id: string, userId: string) => {
  return prisma.project.findFirst({
    where: { id, userId },
  })
})

export const getProjects = cache(async (userId: string) => {
  return prisma.project.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })
})

export const getProjectsWithCounts = cache(async (userId: string) => {
  return prisma.project.findMany({
    where: { userId },
    include: {
      _count: {
        select: {
          places: true,
          images: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
})

// ============================================================================
// Place Queries
// ============================================================================

export const getPlace = cache(async (id: string, userId: string) => {
  return prisma.place.findFirst({
    where: {
      id,
      project: { userId },
    },
    include: {
      placeImages: {
        include: {
          image: true,
        },
      },
      project: true,
    },
  })
})

export const getPlacesByProject = cache(async (projectId: string, userId: string) => {
  return prisma.place.findMany({
    where: {
      projectId,
      project: { userId },
    },
    include: {
      placeImages: {
        include: {
          image: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
})

export const getPlacesByCategory = cache(async (projectId: string, category: string, userId: string) => {
  return prisma.place.findMany({
    where: {
      projectId,
      category,
      project: { userId },
    },
    include: {
      placeImages: {
        include: {
          image: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
})

// ============================================================================
// Image Queries
// ============================================================================

export const getImage = cache(async (id: string, userId: string) => {
  return prisma.image.findFirst({
    where: {
      id,
      project: { userId },
    },
    include: {
      placeImages: {
        include: {
          place: true,
        },
      },
      project: true,
    },
  })
})

export const getImagesByProject = cache(async (projectId: string, userId: string) => {
  return prisma.image.findMany({
    where: {
      projectId,
      project: { userId },
    },
    include: {
      placeImages: {
        include: {
          place: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
})

export const getImagesByStatus = cache(async (projectId: string, status: string, userId: string) => {
  return prisma.image.findMany({
    where: {
      projectId,
      status,
      project: { userId },
    },
    orderBy: { createdAt: 'desc' },
  })
})

export const getPendingImages = cache(async (projectId: string, userId: string) => {
  return getImagesByStatus(projectId, 'pending', userId)
})

export const getProcessedImages = cache(async (projectId: string, userId: string) => {
  return getImagesByStatus(projectId, 'processed', userId)
})

// ============================================================================
// Aggregation Queries
// ============================================================================

export const getProjectStats = cache(async (projectId: string, userId: string) => {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    include: {
      _count: {
        select: {
          places: true,
          images: true,
        },
      },
    },
  })

  if (!project) return null

  const [pendingCount, processedCount, errorCount] = await Promise.all([
    prisma.image.count({
      where: { projectId, status: 'pending' },
    }),
    prisma.image.count({
      where: { projectId, status: 'processed' },
    }),
    prisma.image.count({
      where: { projectId, status: 'error' },
    }),
  ])

  return {
    ...project,
    imageStats: {
      total: project._count.images,
      pending: pendingCount,
      processed: processedCount,
      error: errorCount,
    },
  }
})

export const getCategoryCounts = cache(async (projectId: string, userId: string) => {
  const places = await prisma.place.groupBy({
    by: ['category'],
    where: {
      projectId,
      project: { userId },
    },
    _count: {
      category: true,
    },
  })

  return places.reduce((acc, item) => {
    acc[item.category] = item._count.category
    return acc
  }, {} as Record<string, number>)
})
