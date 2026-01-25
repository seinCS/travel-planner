'use client'

import { cn } from '@/lib/utils'

interface ResponsiveSidebarProps {
  activeTab: 'list' | 'input'
  onTabChange: (tab: 'list' | 'input') => void
  children: React.ReactNode
  placeCount?: number
  pendingCount?: number
}

export function ResponsiveSidebar({
  activeTab,
  onTabChange,
  children,
  placeCount = 0,
  pendingCount = 0,
}: ResponsiveSidebarProps) {
  return (
    <div className="glass-card flex flex-col h-full overflow-hidden">
      {/* Tab Header */}
      <div className="flex border-b border-white/20 flex-shrink-0">
        <button
          className={cn(
            "flex-1 px-4 py-3 text-sm font-medium transition-all duration-200",
            "min-h-[44px]",
            activeTab === 'list'
              ? "text-blue-600 border-b-2 border-blue-500 bg-blue-50/50"
              : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
          )}
          onClick={() => onTabChange('list')}
        >
          📍 목록 {placeCount > 0 && `(${placeCount})`}
        </button>
        <button
          className={cn(
            "flex-1 px-4 py-3 text-sm font-medium transition-all duration-200",
            "min-h-[44px]",
            activeTab === 'input'
              ? "text-blue-600 border-b-2 border-blue-500 bg-blue-50/50"
              : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
          )}
          onClick={() => onTabChange('input')}
        >
          ➕ 입력 {pendingCount > 0 && `(${pendingCount})`}
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
        {children}
      </div>
    </div>
  )
}
