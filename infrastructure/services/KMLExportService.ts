/**
 * KML Export Service
 * Place 배열을 KML XML 형식으로 변환하는 서비스
 */

import { CATEGORY_STYLES, type PlaceCategory } from '@/lib/constants'

// KML 색상 포맷: aabbggrr (Alpha, Blue, Green, Red)
// HTML 색상(#RRGGBB)을 KML 포맷으로 변환
function hexToKmlColor(hex: string, alpha: string = 'ff'): string {
  const r = hex.slice(1, 3)
  const g = hex.slice(3, 5)
  const b = hex.slice(5, 7)
  return `${alpha}${b}${g}${r}`
}

// KML에서 사용할 카테고리별 색상 매핑
const CATEGORY_KML_COLORS: Record<PlaceCategory, string> = {
  restaurant: hexToKmlColor(CATEGORY_STYLES.restaurant.color),
  cafe: hexToKmlColor(CATEGORY_STYLES.cafe.color),
  attraction: hexToKmlColor(CATEGORY_STYLES.attraction.color),
  shopping: hexToKmlColor(CATEGORY_STYLES.shopping.color),
  accommodation: hexToKmlColor(CATEGORY_STYLES.accommodation.color),
  other: hexToKmlColor(CATEGORY_STYLES.other.color),
}

export interface KMLPlace {
  id: string
  name: string
  category: string
  latitude: number
  longitude: number
  comment?: string | null
  rating?: number | null
  formattedAddress?: string | null
}

export interface KMLDay {
  dayNumber: number
  date: string
  items: Array<{ placeId: string; order: number }>
}

export interface KMLExportOptions {
  projectName: string
  places: KMLPlace[]
  days?: KMLDay[]
}

/**
 * XML 특수 문자 이스케이프
 */
function escapeXml(str: string | null | undefined): string {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * 카테고리 한글 라벨 가져오기
 */
function getCategoryLabel(category: string): string {
  const style = CATEGORY_STYLES[category as PlaceCategory]
  return style?.label || '기타'
}

/**
 * Place를 KML Placemark로 변환
 */
function placeToPlacemark(place: KMLPlace, index?: number): string {
  const categoryLabel = getCategoryLabel(place.category)
  const category = place.category as PlaceCategory

  // description 구성
  const descriptionParts: string[] = []
  descriptionParts.push(`<b>카테고리:</b> ${escapeXml(categoryLabel)}`)

  if (place.rating) {
    descriptionParts.push(`<b>평점:</b> ${place.rating.toFixed(1)}`)
  }

  if (place.formattedAddress) {
    descriptionParts.push(`<b>주소:</b> ${escapeXml(place.formattedAddress)}`)
  }

  if (place.comment) {
    descriptionParts.push(`<b>메모:</b> ${escapeXml(place.comment)}`)
  }

  const description = descriptionParts.join('<br/>')
  const name = index !== undefined
    ? `${index + 1}. ${escapeXml(place.name)}`
    : escapeXml(place.name)

  return `    <Placemark>
      <name>${name}</name>
      <description><![CDATA[${description}]]></description>
      <styleUrl>#style-${category}</styleUrl>
      <Point>
        <coordinates>${place.longitude},${place.latitude},0</coordinates>
      </Point>
    </Placemark>`
}

/**
 * 카테고리별 Style 정의 생성
 */
function generateStyles(): string {
  const categories: PlaceCategory[] = ['restaurant', 'cafe', 'attraction', 'shopping', 'accommodation', 'other']

  return categories.map(category => {
    const color = CATEGORY_KML_COLORS[category]
    return `  <Style id="style-${category}">
    <IconStyle>
      <color>${color}</color>
      <scale>1.0</scale>
      <Icon>
        <href>https://maps.google.com/mapfiles/kml/paddle/wht-blank.png</href>
      </Icon>
    </IconStyle>
    <LabelStyle>
      <color>${color}</color>
      <scale>0.8</scale>
    </LabelStyle>
  </Style>`
  }).join('\n')
}

/**
 * 날짜를 YYYY-MM-DD 형식으로 포맷
 */
function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).replace(/\. /g, '-').replace('.', '')
  } catch {
    return dateStr
  }
}

/**
 * KML XML 생성
 */
export function generateKML(options: KMLExportOptions): string {
  const { projectName, places, days } = options

  const styles = generateStyles()

  let content: string

  if (days && days.length > 0) {
    // 날짜별 Folder로 그룹화
    const placeMap = new Map(places.map(p => [p.id, p]))

    const folders = days.map(day => {
      const dayPlaces = day.items
        .sort((a, b) => a.order - b.order)
        .map(item => placeMap.get(item.placeId))
        .filter((p): p is KMLPlace => p !== undefined)

      const placemarks = dayPlaces.map((place, index) => placeToPlacemark(place, index)).join('\n')
      const formattedDate = formatDate(day.date)

      return `  <Folder>
    <name>Day ${day.dayNumber} (${formattedDate})</name>
${placemarks}
  </Folder>`
    }).join('\n')

    // 일정에 포함되지 않은 장소들도 별도 폴더로 추가
    const scheduledPlaceIds = new Set(days.flatMap(d => d.items.map(i => i.placeId)))
    const unscheduledPlaces = places.filter(p => !scheduledPlaceIds.has(p.id))

    if (unscheduledPlaces.length > 0) {
      const unscheduledPlacemarks = unscheduledPlaces.map(place => placeToPlacemark(place)).join('\n')
      content = `${folders}
  <Folder>
    <name>미배정 장소</name>
${unscheduledPlacemarks}
  </Folder>`
    } else {
      content = folders
    }
  } else {
    // 전체 장소를 단일 리스트로 출력
    const placemarks = places.map(place => placeToPlacemark(place)).join('\n')
    content = placemarks
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
  <name>${escapeXml(projectName)}</name>
  <description>Travel Planner에서 내보낸 여행 일정</description>
${styles}
${content}
</Document>
</kml>`
}
