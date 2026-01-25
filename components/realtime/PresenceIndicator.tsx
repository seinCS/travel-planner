'use client'

/**
 * PresenceIndicator Component
 *
 * Displays online collaborators for a project using real-time presence.
 * Shows avatar stack with tooltips showing user information.
 */

import { useMemo } from 'react'
import { usePresence } from '@/hooks/realtime'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface PresenceIndicatorProps {
  projectId: string
  maxVisible?: number
}

export function PresenceIndicator({
  projectId,
  maxVisible = 5,
}: PresenceIndicatorProps) {
  const { members, currentUserId, isConnected } = usePresence(projectId)

  // Memoize visible members with deduplication fallback
  // Primary deduplication happens in RealtimeClient, but this is defensive
  const visibleMembers = useMemo(() => {
    const seen = new Set<string>()
    return members.filter((member) => {
      if (seen.has(member.id)) return false
      seen.add(member.id)
      return true
    }).slice(0, maxVisible)
  }, [members, maxVisible])

  const remainingCount = members.length - maxVisible

  if (!isConnected || members.length === 0) {
    return null
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <div className="flex -space-x-2">
          {visibleMembers.map((member) => (
            <Tooltip key={member.id}>
              <TooltipTrigger asChild>
                <div className="relative">
                  <Avatar className="h-8 w-8 border-2 border-white">
                    <AvatarImage src={member.image || undefined} />
                    <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                      {member.name?.charAt(0).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  {/* Online indicator */}
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">
                  {member.name}
                  {member.id === currentUserId && ' (me)'}
                </p>
                <p className="text-xs text-muted-foreground">{member.email}</p>
              </TooltipContent>
            </Tooltip>
          ))}
          {remainingCount > 0 && (
            <div className="flex items-center justify-center w-8 h-8 bg-gray-100 border-2 border-white rounded-full text-xs font-medium text-gray-600">
              +{remainingCount}
            </div>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {members.length}명 접속 중
        </span>
      </div>
    </TooltipProvider>
  )
}
