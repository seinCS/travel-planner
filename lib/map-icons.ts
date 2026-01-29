/**
 * Google Maps 마커용 커스텀 SVG 아이콘 생성
 * 카테고리별 색상과 아이콘을 핀 형태로 렌더링
 */

import { CATEGORY_STYLES } from './constants'

// 카테고리별 심플 아이콘 Path (24x24 viewBox 기준)
const ICON_PATHS: Record<string, string> = {
  // 맛집 - 포크와 나이프
  restaurant: 'M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z',
  // 카페 - 커피컵
  cafe: 'M2 21h18v-2H2M20 8h-2V5h2m0-2H4v10a4 4 0 0 0 4 4h6a4 4 0 0 0 4-4v-3h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z',
  // 관광지 - 카메라
  attraction: 'M12 10.8a2 2 0 1 0 0 4 2 2 0 0 0 0-4m7-5H16.4L15 4H9L7.6 5.8H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-10a2 2 0 0 0-2-2m-7 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10z',
  // 쇼핑 - 쇼핑백
  shopping: 'M19 6h-2c0-2.76-2.24-5-5-5S7 3.24 7 6H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2m-7-3c1.66 0 3 1.34 3 3H9c0-1.66 1.34-3 3-3m7 17H5V8h14v12m-7-8c-1.66 0-3-1.34-3-3H7c0 2.76 2.24 5 5 5s5-2.24 5-5h-2c0 1.66-1.34 3-3 3z',
  // 숙소 - 호텔/빌딩
  accommodation: 'M7 14c1.66 0 3-1.34 3-3S8.66 8 7 8s-3 1.34-3 3 1.34 3 3 3zm0-4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm12-3h-8v8H3V5H1v15h2v-3h18v3h2v-9c0-2.21-1.79-4-4-4zm2 8h-8V9h6c1.1 0 2 .9 2 2v4z',
  // 기타 - 위치 핀
  other: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
}

/**
 * 핀 모양 마커 SVG 생성
 * @param color - 배경 색상
 * @param iconPath - 내부 아이콘 SVG path
 * @param size - 마커 크기 (기본: 40)
 */
function createPinMarkerSvg(color: string, iconPath: string, size = 40): string {
  // 핀 모양 (드롭 형태) + 내부 아이콘
  const pinPath = `M20 0C8.95 0 0 8.95 0 20c0 14.25 20 36 20 36s20-21.75 20-36C40 8.95 31.05 0 20 0z`

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size * 1.4}" viewBox="0 0 40 56">
    <path d="${pinPath}" fill="${color}" stroke="#ffffff" stroke-width="2"/>
    <g transform="translate(8, 8) scale(1)">
      <path d="${iconPath}" fill="#ffffff"/>
    </g>
  </svg>`
}

/**
 * SVG 문자열을 Data URL로 변환
 */
function svgToDataUrl(svg: string): string {
  const encoded = encodeURIComponent(svg)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22')
  return `data:image/svg+xml,${encoded}`
}

/**
 * 카테고리별 마커 아이콘 URL 캐시
 */
const markerIconCache: Record<string, string> = {}

/**
 * 카테고리에 해당하는 마커 아이콘 URL 반환
 * @param category - 장소 카테고리
 * @returns Data URL 형태의 마커 아이콘
 */
export function getMarkerIconUrl(category: string): string {
  if (markerIconCache[category]) {
    return markerIconCache[category]
  }

  const style = CATEGORY_STYLES[category] || CATEGORY_STYLES.other
  const iconPath = ICON_PATHS[category] || ICON_PATHS.other
  const svg = createPinMarkerSvg(style.color, iconPath)
  const url = svgToDataUrl(svg)

  markerIconCache[category] = url
  return url
}

/**
 * Google Maps Marker용 icon 객체 생성
 */
export function createMarkerIcon(category: string): google.maps.Icon {
  return {
    url: getMarkerIconUrl(category),
    scaledSize: new google.maps.Size(22, 32),
    anchor: new google.maps.Point(11, 32),
  }
}

/**
 * 선택된 마커용 아이콘 (더 큰 사이즈)
 */
export function createSelectedMarkerIcon(category: string): google.maps.Icon {
  return {
    url: getMarkerIconUrl(category),
    scaledSize: new google.maps.Size(28, 40),
    anchor: new google.maps.Point(14, 40),
  }
}

/**
 * 숙소 마커 아이콘 URL (특별 스타일)
 */
export function getAccommodationMarkerIconUrl(): string {
  const cacheKey = '__accommodation__'
  if (markerIconCache[cacheKey]) {
    return markerIconCache[cacheKey]
  }

  const svg = createPinMarkerSvg('#3b82f6', ICON_PATHS.accommodation)
  const url = svgToDataUrl(svg)
  markerIconCache[cacheKey] = url
  return url
}

export function createAccommodationMarkerIcon(): google.maps.Icon {
  return {
    url: getAccommodationMarkerIconUrl(),
    scaledSize: new google.maps.Size(22, 32),
    anchor: new google.maps.Point(11, 32),
  }
}
