/**
 * Prisma Member Repository
 *
 * Implements IMemberRepository using Prisma ORM.
 */

import { prisma } from '@/lib/db'
import type {
  IMemberRepository,
  ProjectMember,
  ProjectMemberWithUser,
  CreateMemberData,
  UpdateMemberData,
} from '@/domain/interfaces/IMemberRepository'

export class PrismaMemberRepository implements IMemberRepository {
  async findByProjectId(projectId: string): Promise<ProjectMemberWithUser[]> {
    const results = await prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: [
        { role: 'asc' }, // owner first
        { joinedAt: 'asc' },
      ],
    })
    return results as ProjectMemberWithUser[]
  }

  async findByProjectAndUser(projectId: string, userId: string): Promise<ProjectMember | null> {
    const result = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    })
    return result as ProjectMember | null
  }

  async findProjectIdsByUserId(userId: string): Promise<string[]> {
    const results = await prisma.projectMember.findMany({
      where: { userId },
      select: { projectId: true },
    })
    return results.map((r) => r.projectId)
  }

  async create(data: CreateMemberData): Promise<ProjectMemberWithUser> {
    const result = await prisma.projectMember.create({
      data: {
        projectId: data.projectId,
        userId: data.userId,
        role: data.role || 'member',
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
          },
        },
      },
    })
    return result as ProjectMemberWithUser
  }

  async update(id: string, data: UpdateMemberData): Promise<ProjectMember> {
    const result = await prisma.projectMember.update({
      where: { id },
      data: {
        role: data.role,
      },
    })
    return result as ProjectMember
  }

  async delete(id: string): Promise<void> {
    await prisma.projectMember.delete({
      where: { id },
    })
  }

  async deleteByProjectAndUser(projectId: string, userId: string): Promise<void> {
    await prisma.projectMember.delete({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    })
  }

  async isMember(projectId: string, userId: string): Promise<boolean> {
    const member = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    })
    return member !== null
  }

  async isOwner(projectId: string, userId: string): Promise<boolean> {
    const member = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
      select: { role: true },
    })
    return member?.role === 'owner'
  }

  async countByProjectId(projectId: string): Promise<number> {
    return await prisma.projectMember.count({
      where: { projectId },
    })
  }
}

/**
 * Default instance for convenience
 */
export const memberRepository = new PrismaMemberRepository()
