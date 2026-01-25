/** 장소 카테고리별 스타일 정의 */
export const CATEGORY_STYLES = {
  restaurant: { color: '#EF4444', icon: '🍽️', label: '맛집' },
  cafe: { color: '#92400E', icon: '☕', label: '카페' },
  attraction: { color: '#3B82F6', icon: '📸', label: '관광지' },
  shopping: { color: '#8B5CF6', icon: '🛍️', label: '쇼핑' },
  accommodation: { color: '#10B981', icon: '🏨', label: '숙소' },
  other: { color: '#6B7280', icon: '📍', label: '기타' },
} as const

export type PlaceCategory = keyof typeof CATEGORY_STYLES

/** 지원하는 이미지 MIME 타입 */
export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/** 최대 이미지 파일 크기 (10MB) */
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024

/** 한 번에 업로드 가능한 최대 이미지 수 */
export const MAX_UPLOAD_COUNT = 20

/** 이미지 리사이즈 최대 크기 (픽셀) */
export const IMAGE_RESIZE_MAX = 1024

/** 지원하는 이미지 확장자 */
export const SUPPORTED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif']

/**
 * API 에러 메시지 상수
 * 일관된 에러 응답을 위해 사용
 */
export const API_ERRORS = {
  // 인증/권한 관련
  UNAUTHORIZED: 'Unauthorized',
  PROJECT_NOT_FOUND: 'Project not found',
  PROJECT_ACCESS_DENIED: 'Project not found or access denied',
  OWNER_ONLY_DELETE: 'Only project owner can delete the project',
  OWNER_ONLY_SHARE: 'Only project owner can manage sharing settings',
  OWNER_ONLY_ITINERARY_DELETE: 'Only project owner can delete the itinerary',

  // 리소스 관련
  ITINERARY_NOT_FOUND: 'Itinerary not found',
  ITINERARY_EXISTS: 'Itinerary already exists for this project',
  PLACE_DUPLICATE: '이미 추가된 장소입니다.',

  // 유효성 관련
  INVALID_REQUEST: 'Invalid request body',
  NO_FILES: 'No files provided',
  INVALID_FILE_TYPE: 'Invalid file type',
  FILE_TOO_LARGE: 'File too large (max 10MB)',
  URL_REQUIRED: 'URL is required',
  INVALID_GOOGLE_MAPS_URL: 'Not a valid Google Maps URL',
  CANNOT_PARSE_URL: 'Could not parse Google Maps URL',
  CANNOT_EXTRACT_PLACE: 'Could not extract place information from URL',
  INVALID_DATE_RANGE: 'End date must be after start date',
  LOCATION_NOT_FOUND: 'Could not find location',

  // 서버 에러
  INTERNAL_ERROR: 'Internal server error',
  ITINERARY_LOAD_ERROR: '일정 데이터를 불러오는데 실패했습니다. 페이지를 새로고침 해주세요.',
} as const

export type ApiErrorKey = keyof typeof API_ERRORS
