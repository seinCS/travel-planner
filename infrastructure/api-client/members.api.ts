/**
 * Members API Client
 * 프로젝트 멤버 및 초대 관리 API 호출
 */
import { apiClient } from './index'

// ============================================================================
// Types
// ============================================================================

export type MemberRole = 'owner' | 'editor' | 'viewer'

export interface ProjectMember {
  id: string
  projectId: string
  userId: string
  role: MemberRole
  joinedAt: Date
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
}

export interface ProjectInvite {
  id: string
  projectId: string
  token: string
  role: MemberRole
  expiresAt: Date
  maxUses: number | null
  useCount: number
  isActive: boolean
  createdBy: string
  createdAt: Date
}

export interface InviteInfo {
  projectName: string
  projectDestination: string
  inviterName: string | null
  role: MemberRole
  isValid: boolean
  expiresAt: Date
}

// ============================================================================
// Input Types
// ============================================================================

export interface CreateInviteInput {
  role: MemberRole
  expiresInDays?: number
  maxUses?: number
}

export interface TransferOwnershipInput {
  newOwnerId: string
}

// ============================================================================
// Response Types
// ============================================================================

export interface MembersListResponse {
  members: ProjectMember[]
  currentUserRole: MemberRole
}

export interface InviteResponse {
  invite: ProjectInvite
  inviteUrl: string
}

export interface InviteInfoResponse {
  invite: InviteInfo
}

export interface AcceptInviteResponse {
  member: ProjectMember
  projectId: string
}

export interface MemberResponse {
  member: ProjectMember
}

// ============================================================================
// API Client
// ============================================================================

export const membersApi = {
  // -------------------------------------------------------------------------
  // Member Management
  // -------------------------------------------------------------------------

  /**
   * 프로젝트 멤버 목록 조회
   */
  list: (projectId: string) =>
    apiClient.get<MembersListResponse>(`/projects/${projectId}/members`),

  /**
   * 멤버 제거 (owner만 가능)
   */
  removeMember: (projectId: string, memberId: string) =>
    apiClient.delete<void>(`/projects/${projectId}/members/${memberId}`),

  /**
   * 프로젝트 나가기 (owner 제외)
   */
  leave: (projectId: string) =>
    apiClient.post<void>(`/projects/${projectId}/members/leave`),

  /**
   * 소유권 이전 (owner만 가능)
   */
  transferOwnership: (projectId: string, data: TransferOwnershipInput) =>
    apiClient.post<MemberResponse>(`/projects/${projectId}/members/transfer`, data),

  // -------------------------------------------------------------------------
  // Invite Management
  // -------------------------------------------------------------------------

  /**
   * 초대 링크 생성
   */
  createInvite: (projectId: string, data: CreateInviteInput) =>
    apiClient.post<InviteResponse>(`/projects/${projectId}/invites`, data),

  /**
   * 초대 링크 비활성화
   */
  disableInvite: (projectId: string, inviteId: string) =>
    apiClient.delete<void>(`/projects/${projectId}/invites/${inviteId}`),

  /**
   * 초대 링크 정보 조회 (비로그인 상태에서도 호출 가능)
   */
  getInviteInfo: (token: string) =>
    apiClient.get<InviteInfoResponse>(`/invites/${token}`),

  /**
   * 초대 수락
   */
  acceptInvite: (token: string) =>
    apiClient.post<AcceptInviteResponse>(`/invites/${token}/accept`),
}

export default membersApi
