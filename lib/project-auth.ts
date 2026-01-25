import { prisma } from '@/lib/db'

export type ProjectRole = 'owner' | 'member' | null

interface ProjectAccessResult {
  hasAccess: boolean
  role: ProjectRole
  project: { id: string; userId: string } | null
}

/**
 * 프로젝트 접근 권한 확인
 * - Owner: 프로젝트 생성자
 * - Member: 초대를 통해 참여한 멤버
 *
 * @param projectId 프로젝트 ID
 * @param userId 현재 사용자 ID
 * @returns hasAccess, role, project 정보
 */
export async function checkProjectAccess(
  projectId: string,
  userId: string
): Promise<ProjectAccessResult> {
  // 1. 프로젝트 존재 확인
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, userId: true },
  })

  if (!project) {
    return { hasAccess: false, role: null, project: null }
  }

  // 2. Owner 확인
  if (project.userId === userId) {
    return { hasAccess: true, role: 'owner', project }
  }

  // 3. Member 확인
  const membership = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId,
      },
    },
  })

  if (membership) {
    return { hasAccess: true, role: 'member', project }
  }

  return { hasAccess: false, role: null, project }
}

/**
 * Owner 전용 권한 확인
 */
export async function checkOwnerAccess(
  projectId: string,
  userId: string
): Promise<{ isOwner: boolean; project: { id: string; userId: string } | null }> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, userId: true },
  })

  if (!project) {
    return { isOwner: false, project: null }
  }

  return { isOwner: project.userId === userId, project }
}
