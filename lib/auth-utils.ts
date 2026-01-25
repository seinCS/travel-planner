import { prisma } from '@/lib/db'

/**
 * 사용자가 프로젝트에 대한 수정 권한이 있는지 확인
 * - 프로젝트 소유자이거나
 * - 프로젝트 멤버인 경우 true
 */
export async function canEditProject(
  projectId: string,
  userId: string
): Promise<boolean> {
  // 1. 소유자 체크
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { userId: true }
  })

  if (!project) return false
  if (project.userId === userId) return true

  // 2. 멤버 체크
  const member = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId, userId }
    }
  })

  return !!member
}

/**
 * 프로젝트 관리 권한 (소유자만)
 * - 멤버 초대/제거
 * - 프로젝트 삭제
 * - 소유권 이전
 */
export async function canManageProject(
  projectId: string,
  userId: string
): Promise<boolean> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { userId: true }
  })

  return project?.userId === userId
}

/**
 * 프로젝트 조회 권한
 * - 소유자이거나 멤버인 경우
 */
export async function canViewProject(
  projectId: string,
  userId: string
): Promise<boolean> {
  return canEditProject(projectId, userId)
}
