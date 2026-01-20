export const CATEGORY_STYLES = {
  restaurant: { color: '#EF4444', icon: '🍽️', label: '맛집' },
  cafe: { color: '#92400E', icon: '☕', label: '카페' },
  attraction: { color: '#3B82F6', icon: '📸', label: '관광지' },
  shopping: { color: '#8B5CF6', icon: '🛍️', label: '쇼핑' },
  accommodation: { color: '#10B981', icon: '🏨', label: '숙소' },
  other: { color: '#6B7280', icon: '📍', label: '기타' },
} as const

export type PlaceCategory = keyof typeof CATEGORY_STYLES

export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
export const MAX_UPLOAD_COUNT = 20
export const IMAGE_RESIZE_MAX = 1024 // max dimension in pixels
