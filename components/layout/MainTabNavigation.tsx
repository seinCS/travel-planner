'use client'

import { Location, TabCalendar, Users } from '@/components/icons'

export type MainTab = 'places' | 'itinerary' | 'members'

interface MainTabNavigationProps {
  activeTab: MainTab
  onTabChange: (tab: MainTab) => void
}

export function MainTabNavigation({ activeTab, onTabChange }: MainTabNavigationProps) {
  return (
    <div className="flex gap-2 mb-4 p-1.5 bg-white/50 backdrop-blur-sm rounded-2xl border border-white/30 shadow-[0_2px_8px_oklch(0_0_0/5%)]">
      <button
        className={`flex-1 sm:flex-none px-6 py-2.5 text-sm font-medium transition-all duration-200 rounded-xl ${
          activeTab === 'places'
            ? 'text-gray-900 bg-white shadow-[0_2px_4px_oklch(0_0_0/8%)]'
            : 'text-muted-foreground hover:text-foreground hover:bg-white/60'
        }`}
        onClick={() => onTabChange('places')}
      >
        <Location className="w-4 h-4 inline" /> 장소
      </button>
      <button
        className={`flex-1 sm:flex-none px-6 py-2.5 text-sm font-medium transition-all duration-200 rounded-xl ${
          activeTab === 'itinerary'
            ? 'text-gray-900 bg-white shadow-[0_2px_4px_oklch(0_0_0/8%)]'
            : 'text-muted-foreground hover:text-foreground hover:bg-white/60'
        }`}
        onClick={() => onTabChange('itinerary')}
      >
        <TabCalendar className="w-4 h-4 inline" /> 일정
      </button>
      <button
        className={`flex-1 sm:flex-none px-6 py-2.5 text-sm font-medium transition-all duration-200 rounded-xl ${
          activeTab === 'members'
            ? 'text-gray-900 bg-white shadow-[0_2px_4px_oklch(0_0_0/8%)]'
            : 'text-muted-foreground hover:text-foreground hover:bg-white/60'
        }`}
        onClick={() => onTabChange('members')}
      >
        <Users className="w-4 h-4 inline" /> 멤버
      </button>
    </div>
  )
}
