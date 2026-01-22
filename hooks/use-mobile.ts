'use client'

import { useEffect, useState } from 'react'

// Tailwind CSS 브레이크포인트
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const

type BreakpointKey = keyof typeof BREAKPOINTS

/**
 * 미디어 쿼리 기반 모바일 감지 훅
 * @param breakpoint - 기준 브레이크포인트 (기본값: 'lg' = 1024px)
 * @returns 현재 뷰포트가 브레이크포인트 미만인지 여부 (초기값 undefined)
 */
export function useIsMobile(breakpoint: BreakpointKey = 'lg') {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined)
  const breakpointValue = BREAKPOINTS[breakpoint]

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpointValue - 1}px)`)

    const onChange = () => {
      setIsMobile(window.innerWidth < breakpointValue)
    }

    // Set initial value
    setIsMobile(window.innerWidth < breakpointValue)

    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [breakpointValue])

  return isMobile
}
