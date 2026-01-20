'use client'

import { useEffect, useState, use } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { CATEGORY_STYLES } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

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
}

interface SharePageProps {
  params: Promise<{ token: string }>
}

export default function SharePage({ params }: SharePageProps) {
  const { token } = use(params)
  const { data: session } = useSession()
  const router = useRouter()
  const [data, setData] = useState<SharePageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [cloning, setCloning] = useState(false)

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
      } catch {
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
    } catch {
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
              <p className="text-sm text-muted-foreground">
                {project.destination}
                {project.country && `, ${project.country}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs text-muted-foreground bg-gray-100 px-3 py-1 rounded-full">
                공유된 여행 계획
              </div>
              <Button
                size="sm"
                onClick={handleClone}
                disabled={cloning}
              >
                {cloning ? '복사 중...' : '내 프로젝트로 복사'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-[2fr_1fr] gap-6 h-[calc(100vh-180px)]">
          {/* 지도 */}
          <div className="bg-white rounded-lg border overflow-hidden h-full min-h-[400px]">
            <GoogleMap
              places={places}
              selectedPlaceId={selectedPlaceId}
              onPlaceSelect={setSelectedPlaceId}
            />
          </div>

          {/* 장소 목록 */}
          <div className="bg-white rounded-lg border p-4 overflow-hidden h-full flex flex-col">
            <h2 className="font-semibold mb-3 flex-shrink-0">
              장소 목록 ({places.length}개)
            </h2>

            {/* 카테고리 필터 */}
            <div className="flex flex-wrap gap-2 mb-4 flex-shrink-0">
              <Button
                size="sm"
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

            {/* 장소 목록 */}
            <div className="flex-1 overflow-y-auto space-y-2">
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
                          <h3 className="font-medium text-sm">{place.name}</h3>

                          {/* 평점 */}
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

                          {/* 코멘트 */}
                          {place.comment && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {place.comment}
                            </p>
                          )}

                          {/* 주소 */}
                          {place.formattedAddress && (
                            <p className="text-xs text-gray-400 mt-1 truncate">
                              {place.formattedAddress}
                            </p>
                          )}

                          {/* Google Maps 링크 */}
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
          </div>
        </div>
      </main>

      {/* 푸터 */}
      <footer className="bg-white border-t mt-6">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-xs text-muted-foreground">
          Travel Planner로 만든 여행 계획입니다.
        </div>
      </footer>
    </div>
  )
}
