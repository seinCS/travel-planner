'use client'

import { useEffect, useState, use } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { CATEGORY_STYLES } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { MobileNavigation, ShareMobileTab } from '@/components/mobile/MobileNavigation'
import { useIsMobile } from '@/hooks/use-mobile'
import { toast } from 'sonner'
import { SharedItineraryView, SharedItinerary } from '@/components/share/SharedItineraryView'

const GoogleMap = dynamic(
  () => import('@/components/map/GoogleMap').then((mod) => mod.GoogleMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full bg-gray-100 animate-pulse rounded-lg flex items-center justify-center">
        <span className="text-muted-foreground">지도 로딩 중...</span>
      </div>
    ),
  }
)

const PlaceDetailsPanel = dynamic(
  () => import('@/components/place/PlaceDetailsPanel').then((mod) => mod.PlaceDetailsPanel),
  {
    ssr: false,
    loading: () => (
      <div className="p-4">
        <div className="h-6 bg-gray-200 rounded w-3/4 animate-pulse mb-4"></div>
        <div className="h-24 bg-gray-200 rounded animate-pulse"></div>
      </div>
    ),
  }
)

interface SharedPlace {
  id: string
  name: string
  category: string
  comment: string | null
  latitude: number
  longitude: number
  formattedAddress: string | null
  googleMapsUrl: string | null
  rating: number | null
  userRatingsTotal: number | null
  priceLevel: number | null
}

interface SharedProject {
  name: string
  destination: string
  country: string | null
}

interface SharePageData {
  project: SharedProject
  places: SharedPlace[]
  itinerary: SharedItinerary | null
}

interface SharePageProps {
  params: Promise<{ token: string }>
}

export default function SharePage({ params }: SharePageProps) {
  const { token } = use(params)
  const { data: session } = useSession()
  const router = useRouter()
  const isMobile = useIsMobile('sm') // 640px 기준

  const [data, setData] = useState<SharePageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [cloning, setCloning] = useState(false)
  const [detailPlaceId, setDetailPlaceId] = useState<string | null>(null)
  const [mobileTab, setMobileTab] = useState<ShareMobileTab>('map')
  const [desktopSidebarTab, setDesktopSidebarTab] = useState<'list' | 'itinerary'>('list')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/share/${token}`)
        if (res.ok) {
          const json = await res.json()
          setData(json)
        } else {
          const json = await res.json()
          setError(json.error || '공유 페이지를 불러올 수 없습니다.')
        }
      } catch (err) {
        console.error('Failed to fetch shared project:', err)
        setError('네트워크 오류가 발생했습니다.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [token])

  const handleClone = async () => {
    if (!session) {
      toast.error('로그인이 필요합니다.')
      router.push('/login')
      return
    }

    setCloning(true)
    try {
      const res = await fetch(`/api/share/${token}/clone`, {
        method: 'POST',
      })

      if (res.ok) {
        const json = await res.json()
        toast.success(`프로젝트가 복사되었습니다. (${json.placesCount}개 장소)`)
        router.push(`/projects/${json.newProjectId}`)
      } else {
        const json = await res.json()
        toast.error(json.error || '복사에 실패했습니다.')
      }
    } catch (err) {
      console.error('Failed to clone project:', err)
      toast.error('네트워크 오류가 발생했습니다.')
    } finally {
      setCloning(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-red-600"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" x2="12" y1="8" y2="12" />
              <line x1="12" x2="12.01" y1="16" y2="16" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            페이지를 찾을 수 없습니다
          </h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  if (!data) return null

  const { project, places } = data
  const filteredPlaces = categoryFilter
    ? places.filter((p) => p.category === categoryFilter)
    : places

  const categories = Object.entries(CATEGORY_STYLES)

  // 장소 목록 렌더링 함수 (DRY)
  const renderPlaceList = () => (
    <div data-testid="place-list" className="flex-1 overflow-y-auto space-y-2">
      {filteredPlaces.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {places.length === 0
            ? '아직 장소가 없습니다.'
            : '해당 카테고리에 장소가 없습니다.'}
        </div>
      ) : (
        filteredPlaces.map((place) => {
          const style =
            CATEGORY_STYLES[place.category as keyof typeof CATEGORY_STYLES] ||
            CATEGORY_STYLES.other
          const isSelected = place.id === selectedPlaceId

          return (
            <div
              key={place.id}
              className={`
                p-3 rounded-lg border cursor-pointer transition-all
                ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }
              `}
              onClick={() => setSelectedPlaceId(place.id)}
            >
              <div className="flex items-start gap-2">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                  style={{
                    backgroundColor: style.color + '20',
                    color: style.color,
                  }}
                >
                  {style.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-medium text-sm truncate">{place.name}</h3>
                    <Button
                      data-testid="place-detail-btn"
                      size="sm"
                      variant="ghost"
                      className="text-blue-500 hover:text-blue-700 h-6 px-2 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDetailPlaceId(place.id)
                      }}
                    >
                      상세
                    </Button>
                  </div>

                  {place.rating && (
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-yellow-500 text-xs">★</span>
                      <span className="text-xs">{place.rating.toFixed(1)}</span>
                      {place.userRatingsTotal && (
                        <span className="text-xs text-muted-foreground">
                          ({place.userRatingsTotal.toLocaleString()})
                        </span>
                      )}
                    </div>
                  )}

                  {place.comment && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {place.comment}
                    </p>
                  )}

                  {place.formattedAddress && (
                    <p className="text-xs text-gray-400 mt-1 truncate">
                      {place.formattedAddress}
                    </p>
                  )}

                  {place.googleMapsUrl && (
                    <a
                      href={place.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                    >
                      Google Maps에서 보기 →
                    </a>
                  )}
                </div>
              </div>
            </div>
          )
        })
      )}
    </div>
  )

  // 카테고리 필터 렌더링 함수 (DRY)
  const renderCategoryFilter = () => (
    <div className="mb-4 flex-shrink-0 -mx-4 px-4 overflow-x-auto scrollbar-hide">
      <div className="flex gap-2 min-w-max">
        <Button
          size="sm"
          className="h-9 whitespace-nowrap"
          variant={categoryFilter === null ? 'default' : 'outline'}
          onClick={() => setCategoryFilter(null)}
        >
          전체 ({places.length})
        </Button>
        {categories.map(([key, style]) => {
          const count = places.filter((p) => p.category === key).length
          if (count === 0) return null
          return (
            <Button
              key={key}
              size="sm"
              className="h-9 whitespace-nowrap"
              variant={categoryFilter === key ? 'default' : 'outline'}
              onClick={() => setCategoryFilter(key)}
              style={{
                borderColor: categoryFilter === key ? style.color : undefined,
                backgroundColor: categoryFilter === key ? style.color : undefined,
              }}
            >
              {style.icon} {style.label} ({count})
            </Button>
          )
        })}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 - Phase 4: 반응형 최적화 */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            {/* 프로젝트 정보 */}
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                {project.name}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                {project.destination}
                {project.country && `, ${project.country}`}
              </p>
            </div>

            {/* 액션 버튼들 */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* 공유 배지: 데스크톱만 */}
              <div className="hidden sm:block text-xs text-muted-foreground bg-gray-100 px-3 py-1 rounded-full">
                공유된 여행 계획
              </div>
              {/* 복사 버튼: 항상 표시 */}
              <Button
                size="sm"
                onClick={handleClone}
                disabled={cloning}
                className="whitespace-nowrap"
              >
                <span className="hidden sm:inline">{cloning ? '복사 중...' : '내 프로젝트로 복사'}</span>
                <span className="sm:hidden">{cloning ? '...' : '복사'}</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 - 하단 네비게이션 공간 확보 */}
      <main className="max-w-7xl mx-auto px-4 py-4 sm:py-6">
        <div className="h-[calc(100vh-140px)] sm:h-[calc(100vh-180px)] pb-16 sm:pb-0">
          {/* Mobile (<640px): 탭 기반 전체 화면 전환 */}
          <div className="sm:hidden h-full flex flex-col">
            {mobileTab === 'map' && (
              <div className="flex-1 bg-white rounded-lg shadow-sm border overflow-hidden">
                <GoogleMap
                  places={filteredPlaces}
                  selectedPlaceId={selectedPlaceId}
                  onPlaceSelect={setSelectedPlaceId}
                  onOpenDetails={setDetailPlaceId}
                />
              </div>
            )}
            {mobileTab === 'list' && (
              <div className="flex-1 bg-white rounded-lg shadow-sm border p-4 overflow-hidden flex flex-col">
                <h2 className="font-semibold mb-3 flex-shrink-0">
                  장소 목록 ({filteredPlaces.length}개)
                </h2>
                {renderCategoryFilter()}
                {renderPlaceList()}
              </div>
            )}
            {mobileTab === 'itinerary' && (
              <div className="flex-1 bg-white rounded-lg shadow-sm border overflow-hidden">
                <SharedItineraryView
                  itinerary={data.itinerary}
                  onPlaceClick={(placeId) => {
                    setSelectedPlaceId(placeId)
                    setDetailPlaceId(placeId)
                  }}
                />
              </div>
            )}
          </div>

          {/* Tablet/Desktop (>=640px): 2컬럼 그리드 */}
          <div className="hidden sm:grid grid-cols-[1fr_320px] lg:grid-cols-[2fr_1fr] gap-4 lg:gap-6 h-full">
            {/* 지도 */}
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <GoogleMap
                places={filteredPlaces}
                selectedPlaceId={selectedPlaceId}
                onPlaceSelect={setSelectedPlaceId}
                onOpenDetails={setDetailPlaceId}
              />
            </div>
            {/* 사이드바 - 목록/일정 탭 전환 */}
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden flex flex-col">
              {/* 탭 헤더 */}
              <div className="flex border-b flex-shrink-0">
                <button
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    desktopSidebarTab === 'list'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setDesktopSidebarTab('list')}
                >
                  장소 ({places.length})
                </button>
                <button
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    desktopSidebarTab === 'itinerary'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setDesktopSidebarTab('itinerary')}
                >
                  일정 {data.itinerary ? `(${data.itinerary.days.length}일)` : ''}
                </button>
              </div>
              {/* 탭 콘텐츠 */}
              {desktopSidebarTab === 'list' ? (
                <div className="flex-1 p-4 overflow-hidden flex flex-col">
                  {renderCategoryFilter()}
                  {renderPlaceList()}
                </div>
              ) : (
                <div className="flex-1 overflow-hidden">
                  <SharedItineraryView
                    itinerary={data.itinerary}
                    onPlaceClick={(placeId) => {
                      setSelectedPlaceId(placeId)
                      setDetailPlaceId(placeId)
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* 모바일 하단 네비게이션 */}
      <MobileNavigation
        variant="share"
        activeTab={mobileTab}
        onTabChange={setMobileTab}
        placeCount={filteredPlaces.length}
      />

      {/* 장소 상세 패널 - Phase 3: Bottom Sheet / Side Panel */}
      {detailPlaceId && (
        <>
          {/* Mobile: Bottom Sheet */}
          {isMobile && (
            <Sheet
              open={!!detailPlaceId}
              onOpenChange={(open) => !open && setDetailPlaceId(null)}
            >
              <SheetContent
                side="bottom"
                className="max-h-[90vh] h-auto min-h-[50vh] rounded-t-xl flex flex-col"
              >
                <SheetHeader className="flex-shrink-0 pb-2 border-b">
                  <SheetTitle>장소 상세</SheetTitle>
                </SheetHeader>
                <div className="flex-1 min-h-0 overflow-y-auto pb-safe">
                  <PlaceDetailsPanel
                    key={detailPlaceId}
                    placeId={detailPlaceId}
                    onClose={() => setDetailPlaceId(null)}
                    shareToken={token}
                  />
                </div>
              </SheetContent>
            </Sheet>
          )}

          {/* Desktop: Side Panel */}
          {!isMobile && (
            <div className="fixed right-0 top-0 bottom-0 w-96 bg-white shadow-lg border-l z-50 overflow-y-auto">
              <PlaceDetailsPanel
                key={detailPlaceId}
                placeId={detailPlaceId}
                onClose={() => setDetailPlaceId(null)}
                shareToken={token}
              />
            </div>
          )}
        </>
      )}

      {/* 푸터 - 모바일에서는 숨김 */}
      <footer className="hidden sm:block bg-white border-t mt-6">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-xs text-muted-foreground">
          Travel Planner로 만든 여행 계획입니다.
        </div>
      </footer>
    </div>
  )
}
