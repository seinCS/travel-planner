/**
 * Phase 2A: 공항 데이터 및 검색 기능 단위 테스트
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  airports,
  countryFlags,
  searchAirports,
  getAirportByCode,
  formatAirportDisplay,
  getRecentAirports,
  addRecentAirport,
} from '../airports'

describe('airports.ts - 공항 데이터', () => {
  describe('airports 배열', () => {
    it('최소 60개 이상의 공항 데이터가 존재한다', () => {
      expect(airports.length).toBeGreaterThanOrEqual(60)
    })

    it('각 공항은 필수 필드를 가진다', () => {
      airports.forEach((airport) => {
        expect(airport).toHaveProperty('code')
        expect(airport).toHaveProperty('name')
        expect(airport).toHaveProperty('nameEn')
        expect(airport).toHaveProperty('city')
        expect(airport).toHaveProperty('cityEn')
        expect(airport).toHaveProperty('country')
        expect(airport).toHaveProperty('countryCode')
      })
    })

    it('공항 코드는 3자리 대문자이다', () => {
      airports.forEach((airport) => {
        expect(airport.code).toMatch(/^[A-Z]{3}$/)
      })
    })

    it('한국 공항이 최소 5개 존재한다', () => {
      const koreanAirports = airports.filter((a) => a.countryCode === 'KR')
      expect(koreanAirports.length).toBeGreaterThanOrEqual(5)
    })

    it('일본 공항이 최소 5개 존재한다', () => {
      const japaneseAirports = airports.filter((a) => a.countryCode === 'JP')
      expect(japaneseAirports.length).toBeGreaterThanOrEqual(5)
    })
  })

  describe('countryFlags 객체', () => {
    it('한국 국기가 올바르다', () => {
      expect(countryFlags.KR).toBe('🇰🇷')
    })

    it('일본 국기가 올바르다', () => {
      expect(countryFlags.JP).toBe('🇯🇵')
    })

    it('미국 국기가 올바르다', () => {
      expect(countryFlags.US).toBe('🇺🇸')
    })

    it('모든 공항의 국가 코드에 대응하는 국기가 존재한다', () => {
      const uniqueCountryCodes = [...new Set(airports.map((a) => a.countryCode))]
      uniqueCountryCodes.forEach((code) => {
        expect(countryFlags).toHaveProperty(code)
        expect(countryFlags[code]).toBeTruthy()
      })
    })
  })
})

describe('searchAirports 함수', () => {
  it('빈 검색어는 빈 배열을 반환한다', () => {
    expect(searchAirports('')).toEqual([])
    expect(searchAirports('   ')).toEqual([])
  })

  it('공항 코드로 검색한다 (ICN)', () => {
    const results = searchAirports('ICN')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].code).toBe('ICN')
  })

  it('공항 코드로 검색한다 - 소문자 (icn)', () => {
    const results = searchAirports('icn')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].code).toBe('ICN')
  })

  it('도시명 한글로 검색한다 (서울)', () => {
    const results = searchAirports('서울')
    expect(results.length).toBeGreaterThan(0)
    results.forEach((r) => {
      expect(r.city).toBe('서울')
    })
  })

  it('도시명 영문으로 검색한다 (Tokyo)', () => {
    const results = searchAirports('Tokyo')
    expect(results.length).toBeGreaterThan(0)
    results.forEach((r) => {
      expect(r.cityEn).toBe('Tokyo')
    })
  })

  it('공항명으로 검색한다 (인천)', () => {
    const results = searchAirports('인천')
    expect(results.length).toBeGreaterThan(0)
    expect(results.some((r) => r.code === 'ICN')).toBe(true)
  })

  it('국가명으로 검색한다 (일본)', () => {
    const results = searchAirports('일본')
    expect(results.length).toBeGreaterThan(0)
    results.forEach((r) => {
      expect(r.country).toBe('일본')
    })
  })

  it('검색 결과는 최대 10개이다', () => {
    const results = searchAirports('국제')
    expect(results.length).toBeLessThanOrEqual(10)
  })

  it('정확히 일치하는 코드가 최상위에 온다', () => {
    const results = searchAirports('NRT')
    expect(results[0].code).toBe('NRT')
  })

  it('존재하지 않는 검색어는 빈 배열을 반환한다', () => {
    const results = searchAirports('zzzzzzz')
    expect(results).toEqual([])
  })
})

describe('getAirportByCode 함수', () => {
  it('존재하는 코드로 공항을 찾는다', () => {
    const airport = getAirportByCode('ICN')
    expect(airport).toBeDefined()
    expect(airport?.code).toBe('ICN')
    expect(airport?.city).toBe('서울')
  })

  it('소문자 코드도 동작한다', () => {
    const airport = getAirportByCode('icn')
    expect(airport).toBeDefined()
    expect(airport?.code).toBe('ICN')
  })

  it('존재하지 않는 코드는 undefined를 반환한다', () => {
    const airport = getAirportByCode('ZZZ')
    expect(airport).toBeUndefined()
  })
})

describe('formatAirportDisplay 함수', () => {
  it('공항을 "도시 (코드)" 형식으로 포맷한다', () => {
    const airport = airports.find((a) => a.code === 'ICN')!
    const display = formatAirportDisplay(airport)
    expect(display).toBe('서울 (ICN)')
  })

  it('일본 공항도 올바르게 포맷한다', () => {
    const airport = airports.find((a) => a.code === 'NRT')!
    const display = formatAirportDisplay(airport)
    expect(display).toBe('도쿄 (NRT)')
  })
})

describe('getRecentAirports / addRecentAirport 함수', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.clearAllMocks()
  })

  it('초기 상태에서 빈 배열을 반환한다', () => {
    const recent = getRecentAirports()
    expect(recent).toEqual([])
  })

  it('공항을 추가하면 최근 목록에 나타난다', () => {
    addRecentAirport('ICN')
    const recent = getRecentAirports()
    expect(recent.length).toBe(1)
    expect(recent[0].code).toBe('ICN')
  })

  it('여러 공항을 추가할 수 있다', () => {
    addRecentAirport('ICN')
    addRecentAirport('NRT')
    addRecentAirport('HND')
    const recent = getRecentAirports()
    expect(recent.length).toBe(3)
    // 최신이 앞에 온다
    expect(recent[0].code).toBe('HND')
    expect(recent[1].code).toBe('NRT')
    expect(recent[2].code).toBe('ICN')
  })

  it('최대 5개까지만 저장된다', () => {
    addRecentAirport('ICN')
    addRecentAirport('NRT')
    addRecentAirport('HND')
    addRecentAirport('KIX')
    addRecentAirport('FUK')
    addRecentAirport('CTS') // 6번째
    const recent = getRecentAirports()
    expect(recent.length).toBe(5)
    expect(recent[0].code).toBe('CTS')
    // ICN은 제거됨
    expect(recent.some((r) => r.code === 'ICN')).toBe(false)
  })

  it('이미 있는 공항을 추가하면 맨 앞으로 이동한다', () => {
    addRecentAirport('ICN')
    addRecentAirport('NRT')
    addRecentAirport('HND')
    addRecentAirport('ICN') // 다시 추가
    const recent = getRecentAirports()
    expect(recent.length).toBe(3)
    expect(recent[0].code).toBe('ICN')
    expect(recent[1].code).toBe('HND')
    expect(recent[2].code).toBe('NRT')
  })

  it('존재하지 않는 공항 코드는 무시된다', () => {
    addRecentAirport('ZZZ') // 존재하지 않음
    addRecentAirport('ICN')
    const recent = getRecentAirports()
    // ZZZ는 getRecentAirports에서 filter로 제외됨
    expect(recent.length).toBe(1)
    expect(recent[0].code).toBe('ICN')
  })
})
