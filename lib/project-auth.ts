import { prisma } from '@/lib/db'

export type ProjectRole = 'owner' | 'member' | null

// 기본 프로젝트 필드
type BaseProjectFields = {
  id: string
  userId: string
}

// 추가 필드 타입
type AdditionalProjectFields = Record<string, unknown>

interface ProjectAccessResult {
  hasAccess: boolean
  role: ProjectRole
  project: (BaseProjectFields & AdditionalProjectFields) | null
}

interface ProjectAccessOptions {
  /** 추가로 조회할 프로젝트 필드 (id, userId는 항상 포함) */
  include?: Record<string, boolean | object>
}

/**
 * 프로젝트 접근 권한 확인 (단일 쿼리 최적화)
 * - Owner: 프로젝트 생성자
 * - Member: 초대를 통해 참여한 멤버
 *
 * @param projectId 프로젝트 ID
 * @param userId 현재 사용자 ID
 * @param options.include 추가로 조회할 프로젝트 필드
 * @returns hasAccess, role, project 정보
 */
export async function checkProjectAccess(
  projectId: string,
  userId: string,
  options?: ProjectAccessOptions
): Promise<ProjectAccessResult> {
  // select 객체 동적 구성
  const selectFields: Record<string, boolean | object> = {
    id: true,
    userId: true,
    members: {
      where: { userId },
      select: { userId: true },
      take: 1,
    },
  }

  // 추가 필드 병합
  if (options?.include) {
    Object.assign(selectFields, options.include)
  }

  // 단일 쿼리로 프로젝트와 해당 유저의 멤버십 정보를 함께 조회
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: selectFields,
  })

  if (!project) {
    return { hasAccess: false, role: null, project: null }
  }

  // members 필드 제거 후 반환
  const { members, ...projectData } = project as {
    members?: { userId: string }[]
    id: string
    userId: string
    [key: string]: unknown
  }

  // Owner 확인
  if (projectData.userId === userId) {
    return {
      hasAccess: true,
      role: 'owner',
      project: projectData,
    }
  }

  // Member 확인
  if (members && members.length > 0) {
    return {
      hasAccess: true,
      role: 'member',
      project: projectData,
    }
  }

  return { hasAccess: false, role: null, project: null }
}

interface OwnerAccessResult {
  isOwner: boolean
  project: (BaseProjectFields & AdditionalProjectFields) | null
}

/**
 * Owner 전용 권한 확인
 * @param projectId 프로젝트 ID
 * @param userId 현재 사용자 ID
 * @param options.include 추가로 조회할 프로젝트 필드
 */
export async function checkOwnerAccess(
  projectId: string,
  userId: string,
  options?: ProjectAccessOptions
): Promise<OwnerAccessResult> {
  // select 객체 동적 구성
  const selectFields: Record<string, boolean | object> = {
    id: true,
    userId: true,
  }

  // 추가 필드 병합
  if (options?.include) {
    Object.assign(selectFields, options.include)
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: selectFields,
  })

  if (!project) {
    return { isOwner: false, project: null }
  }

  const projectData = project as BaseProjectFields & AdditionalProjectFields

  return {
    isOwner: projectData.userId === userId,
    project: projectData,
  }
}
