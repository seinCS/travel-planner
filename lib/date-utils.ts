/**
 * Date Utilities
 *
 * date-fns 함수를 중앙화하여 번들 최적화 (bundle-barrel-imports 패턴)
 * 모든 date-fns import는 이 파일을 통해 사용하도록 권장
 */

import { format, addDays, differenceInDays } from 'date-fns'
import { ko } from 'date-fns/locale'

/**
 * 문자열/Date를 안전하게 Date로 변환
 */
const toSafeDate = (date: Date | string): Date => {
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid date provided: ${date}`)
  }
  return d
}

/**
 * 한국어 로케일로 날짜 포맷팅
 */
export const formatDate = (date: Date | string, pattern: string = 'yyyy-MM-dd'): string => {
  const d = toSafeDate(date)
  return format(d, pattern, { locale: ko })
}

/**
 * 날짜+시간 포맷팅 (M월 d일 HH:mm)
 */
export const formatDateTime = (date: Date | string): string =>
  formatDate(date, 'M월 d일 HH:mm')

/**
 * 짧은 날짜 포맷팅 (M월 d일)
 */
export const formatDateShort = (date: Date | string): string =>
  formatDate(date, 'M월 d일')

/**
 * 요일 포함 날짜 포맷팅 (M월 d일 (E))
 */
export const formatDateWithDay = (date: Date | string): string =>
  formatDate(date, 'M월 d일 (E)')

/**
 * 시간만 포맷팅 (HH:mm)
 */
export const formatTime = (date: Date | string): string =>
  formatDate(date, 'HH:mm')

/**
 * 날짜에 일수 추가
 */
export const addDaysToDate = (date: Date | string, days: number): Date => {
  const d = toSafeDate(date)
  return addDays(d, days)
}

/**
 * 두 날짜 사이 일수 계산
 */
export const getDaysDifference = (start: Date | string, end: Date | string): number => {
  const startDate = toSafeDate(start)
  const endDate = toSafeDate(end)
  return differenceInDays(endDate, startDate)
}

/**
 * 여행 기간 포맷팅 (시작일 ~ 종료일)
 */
export const formatDateRange = (start: Date | string, end: Date | string): string => {
  return `${formatDateShort(start)} ~ ${formatDateShort(end)}`
}

// 원본 함수도 re-export (호환성 유지)
export { format, addDays, differenceInDays, ko }
