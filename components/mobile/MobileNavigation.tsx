'use client'

import { Button } from '@/components/ui/button'

// 기본 4탭 모드 (메인 페이지용)
export type MobileTab = 'map' | 'list' | 'itinerary' | 'input'

// 공유 페이지용 2탭 모드
export type ShareMobileTab = 'map' | 'list'

// 기본 props (4탭 모드)
interface DefaultMobileNavigationProps {
  activeTab: MobileTab
  onTabChange: (tab: MobileTab) => void
  placeCount?: number
  variant?: 'default'
}

// 공유 페이지 props (2탭 모드)
interface ShareMobileNavigationProps {
  activeTab: ShareMobileTab
  onTabChange: (tab: ShareMobileTab) => void
  placeCount?: number
  variant: 'share'
}

type MobileNavigationProps = DefaultMobileNavigationProps | ShareMobileNavigationProps

const ALL_TABS: { id: MobileTab; label: string; icon: string }[] = [
  { id: 'map', label: '지도', icon: '🗺️' },
  { id: 'list', label: '목록', icon: '📍' },
  { id: 'itinerary', label: '일정', icon: '📅' },
  { id: 'input', label: '추가', icon: '➕' },
]

export function MobileNavigation(props: MobileNavigationProps) {
  const { activeTab, placeCount = 0, variant = 'default' } = props

  // share 모드에서는 input, itinerary 탭 제외
  const tabs = variant === 'share'
    ? ALL_TABS.filter(tab => tab.id !== 'input' && tab.id !== 'itinerary')
    : ALL_TABS

  const handleTabChange = (tabId: MobileTab) => {
    if (variant === 'share') {
      // share 모드에서는 ShareMobileTab으로 캐스팅
      ;(props as ShareMobileNavigationProps).onTabChange(tabId as ShareMobileTab)
    } else {
      ;(props as DefaultMobileNavigationProps).onTabChange(tabId)
    }
  }

  return (
    <nav
      data-testid="mobile-nav"
      className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50 sm:hidden pb-safe"
    >
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant="ghost"
            size="touch"
            onClick={() => handleTabChange(tab.id)}
            className={`
              flex-1 flex flex-col items-center justify-center gap-0.5 h-full rounded-none
              ${activeTab === tab.id
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900'
              }
            `}
          >
            <span className="text-xl">{tab.icon}</span>
            <span className="text-xs font-medium">
              {tab.label}
              {tab.id === 'list' && placeCount > 0 && ` (${placeCount})`}
            </span>
          </Button>
        ))}
      </div>
    </nav>
  )
}
