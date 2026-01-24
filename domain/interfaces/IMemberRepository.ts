/**
 * Member Repository Interface
 *
 * Abstract interface for ProjectMember persistence operations.
 * Manages project membership and collaboration.
 */

import type { User } from '@/types'

/**
 * Member role types
 */
export type MemberRole = 'owner' | 'member'

/**
 * Project member entity
 */
export interface ProjectMember {
  id: string
  projectId: string
  userId: string
  role: MemberRole
  joinedAt: Date
}

/**
 * Member with user details
 */
export interface ProjectMemberWithUser extends ProjectMember {
  user: User
}

/**
 * Data required to create a new member
 */
export interface CreateMemberData {
  projectId: string
  userId: string
  role?: MemberRole
}

/**
 * Data for updating member role
 */
export interface UpdateMemberData {
  role: MemberRole
}

/**
 * Repository interface for ProjectMember persistence operations
 */
export interface IMemberRepository {
  /**
   * Find all members of a project
   * @param projectId - The project ID
   * @returns Array of members with user details
   */
  findByProjectId(projectId: string): Promise<ProjectMemberWithUser[]>

  /**
   * Find a specific membership
   * @param projectId - The project ID
   * @param userId - The user ID
   * @returns Member or null if not found
   */
  findByProjectAndUser(projectId: string, userId: string): Promise<ProjectMember | null>

  /**
   * Find all projects a user is a member of
   * @param userId - The user ID
   * @returns Array of project IDs
   */
  findProjectIdsByUserId(userId: string): Promise<string[]>

  /**
   * Create a new member
   * @param data - Member creation data
   * @returns Created member with user details
   */
  create(data: CreateMemberData): Promise<ProjectMemberWithUser>

  /**
   * Update a member's role
   * @param id - The member ID
   * @param data - Update data
   * @returns Updated member
   */
  update(id: string, data: UpdateMemberData): Promise<ProjectMember>

  /**
   * Remove a member from a project
   * @param id - The member ID
   */
  delete(id: string): Promise<void>

  /**
   * Remove a member by project and user IDs
   * @param projectId - The project ID
   * @param userId - The user ID
   */
  deleteByProjectAndUser(projectId: string, userId: string): Promise<void>

  /**
   * Check if a user is a member of a project
   * @param projectId - The project ID
   * @param userId - The user ID
   * @returns True if user is a member
   */
  isMember(projectId: string, userId: string): Promise<boolean>

  /**
   * Check if a user is the owner of a project
   * @param projectId - The project ID
   * @param userId - The user ID
   * @returns True if user is the owner
   */
  isOwner(projectId: string, userId: string): Promise<boolean>

  /**
   * Count members in a project
   * @param projectId - The project ID
   * @returns Number of members
   */
  countByProjectId(projectId: string): Promise<number>
}
