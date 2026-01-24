'use client'

export type MainTab = 'places' | 'itinerary'

interface MainTabNavigationProps {
  activeTab: MainTab
  onTabChange: (tab: MainTab) => void
}

export function MainTabNavigation({ activeTab, onTabChange }: MainTabNavigationProps) {
  return (
    <div className="flex border-b bg-white mb-4">
      <button
        className={`flex-1 sm:flex-none px-6 py-3 text-sm font-medium transition-colors ${
          activeTab === 'places'
            ? 'text-primary border-b-2 border-primary bg-primary/5'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        }`}
        onClick={() => onTabChange('places')}
      >
        📍 장소
      </button>
      <button
        className={`flex-1 sm:flex-none px-6 py-3 text-sm font-medium transition-colors ${
          activeTab === 'itinerary'
            ? 'text-primary border-b-2 border-primary bg-primary/5'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        }`}
        onClick={() => onTabChange('itinerary')}
      >
        📅 일정
      </button>
    </div>
  )
}
