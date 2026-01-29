/**
 * 주요 공항 데이터
 * 한국, 일본, 동남아, 중국, 미주, 유럽 등 주요 공항 50개+
 */

export interface Airport {
  code: string          // IATA 코드
  name: string          // 공항명 (한글)
  nameEn: string        // 공항명 (영문)
  city: string          // 도시명 (한글)
  cityEn: string        // 도시명 (영문)
  country: string       // 국가명 (한글)
  countryCode: string   // 국가 코드 (ISO 3166-1 alpha-2)
}

export const airports: Airport[] = [
  // 대한민국
  { code: 'ICN', name: '인천국제공항', nameEn: 'Incheon International', city: '서울', cityEn: 'Seoul', country: '대한민국', countryCode: 'KR' },
  { code: 'GMP', name: '김포국제공항', nameEn: 'Gimpo International', city: '서울', cityEn: 'Seoul', country: '대한민국', countryCode: 'KR' },
  { code: 'PUS', name: '김해국제공항', nameEn: 'Gimhae International', city: '부산', cityEn: 'Busan', country: '대한민국', countryCode: 'KR' },
  { code: 'CJU', name: '제주국제공항', nameEn: 'Jeju International', city: '제주', cityEn: 'Jeju', country: '대한민국', countryCode: 'KR' },
  { code: 'TAE', name: '대구국제공항', nameEn: 'Daegu International', city: '대구', cityEn: 'Daegu', country: '대한민국', countryCode: 'KR' },
  { code: 'CJJ', name: '청주국제공항', nameEn: 'Cheongju International', city: '청주', cityEn: 'Cheongju', country: '대한민국', countryCode: 'KR' },

  // 일본
  { code: 'NRT', name: '나리타국제공항', nameEn: 'Narita International', city: '도쿄', cityEn: 'Tokyo', country: '일본', countryCode: 'JP' },
  { code: 'HND', name: '하네다국제공항', nameEn: 'Haneda International', city: '도쿄', cityEn: 'Tokyo', country: '일본', countryCode: 'JP' },
  { code: 'KIX', name: '간사이국제공항', nameEn: 'Kansai International', city: '오사카', cityEn: 'Osaka', country: '일본', countryCode: 'JP' },
  { code: 'ITM', name: '오사카 이타미공항', nameEn: 'Osaka Itami', city: '오사카', cityEn: 'Osaka', country: '일본', countryCode: 'JP' },
  { code: 'NGO', name: '주부센트레아국제공항', nameEn: 'Chubu Centrair International', city: '나고야', cityEn: 'Nagoya', country: '일본', countryCode: 'JP' },
  { code: 'FUK', name: '후쿠오카공항', nameEn: 'Fukuoka Airport', city: '후쿠오카', cityEn: 'Fukuoka', country: '일본', countryCode: 'JP' },
  { code: 'CTS', name: '신치토세공항', nameEn: 'New Chitose Airport', city: '삿포로', cityEn: 'Sapporo', country: '일본', countryCode: 'JP' },
  { code: 'OKA', name: '나하공항', nameEn: 'Naha Airport', city: '오키나와', cityEn: 'Okinawa', country: '일본', countryCode: 'JP' },

  // 중국
  { code: 'PEK', name: '베이징 수도국제공항', nameEn: 'Beijing Capital International', city: '베이징', cityEn: 'Beijing', country: '중국', countryCode: 'CN' },
  { code: 'PKX', name: '베이징 다싱국제공항', nameEn: 'Beijing Daxing International', city: '베이징', cityEn: 'Beijing', country: '중국', countryCode: 'CN' },
  { code: 'PVG', name: '상하이 푸동국제공항', nameEn: 'Shanghai Pudong International', city: '상하이', cityEn: 'Shanghai', country: '중국', countryCode: 'CN' },
  { code: 'SHA', name: '상하이 훙차오국제공항', nameEn: 'Shanghai Hongqiao International', city: '상하이', cityEn: 'Shanghai', country: '중국', countryCode: 'CN' },
  { code: 'CAN', name: '광저우 바이윈국제공항', nameEn: 'Guangzhou Baiyun International', city: '광저우', cityEn: 'Guangzhou', country: '중국', countryCode: 'CN' },
  { code: 'SZX', name: '선전 바오안국제공항', nameEn: 'Shenzhen Bao\'an International', city: '선전', cityEn: 'Shenzhen', country: '중국', countryCode: 'CN' },
  { code: 'HKG', name: '홍콩국제공항', nameEn: 'Hong Kong International', city: '홍콩', cityEn: 'Hong Kong', country: '홍콩', countryCode: 'HK' },
  { code: 'MFM', name: '마카오국제공항', nameEn: 'Macau International', city: '마카오', cityEn: 'Macau', country: '마카오', countryCode: 'MO' },

  // 대만
  { code: 'TPE', name: '타이완 타오위안국제공항', nameEn: 'Taiwan Taoyuan International', city: '타이베이', cityEn: 'Taipei', country: '대만', countryCode: 'TW' },
  { code: 'TSA', name: '타이베이 쑹산공항', nameEn: 'Taipei Songshan Airport', city: '타이베이', cityEn: 'Taipei', country: '대만', countryCode: 'TW' },

  // 동남아시아
  { code: 'BKK', name: '수완나품국제공항', nameEn: 'Suvarnabhumi International', city: '방콕', cityEn: 'Bangkok', country: '태국', countryCode: 'TH' },
  { code: 'DMK', name: '돈므앙국제공항', nameEn: 'Don Mueang International', city: '방콕', cityEn: 'Bangkok', country: '태국', countryCode: 'TH' },
  { code: 'CNX', name: '치앙마이국제공항', nameEn: 'Chiang Mai International', city: '치앙마이', cityEn: 'Chiang Mai', country: '태국', countryCode: 'TH' },
  { code: 'HKT', name: '푸켓국제공항', nameEn: 'Phuket International', city: '푸켓', cityEn: 'Phuket', country: '태국', countryCode: 'TH' },
  { code: 'SIN', name: '창이국제공항', nameEn: 'Changi International', city: '싱가포르', cityEn: 'Singapore', country: '싱가포르', countryCode: 'SG' },
  { code: 'KUL', name: '쿠알라룸푸르국제공항', nameEn: 'Kuala Lumpur International', city: '쿠알라룸푸르', cityEn: 'Kuala Lumpur', country: '말레이시아', countryCode: 'MY' },
  { code: 'SGN', name: '탄손낫국제공항', nameEn: 'Tan Son Nhat International', city: '호치민', cityEn: 'Ho Chi Minh City', country: '베트남', countryCode: 'VN' },
  { code: 'HAN', name: '노이바이국제공항', nameEn: 'Noi Bai International', city: '하노이', cityEn: 'Hanoi', country: '베트남', countryCode: 'VN' },
  { code: 'DAD', name: '다낭국제공항', nameEn: 'Da Nang International', city: '다낭', cityEn: 'Da Nang', country: '베트남', countryCode: 'VN' },
  { code: 'CXR', name: '깜라인국제공항', nameEn: 'Cam Ranh International', city: '나트랑', cityEn: 'Nha Trang', country: '베트남', countryCode: 'VN' },
  { code: 'PQC', name: '푸꾸옥국제공항', nameEn: 'Phu Quoc International', city: '푸꾸옥', cityEn: 'Phu Quoc', country: '베트남', countryCode: 'VN' },
  { code: 'MNL', name: '니노이 아키노국제공항', nameEn: 'Ninoy Aquino International', city: '마닐라', cityEn: 'Manila', country: '필리핀', countryCode: 'PH' },
  { code: 'CEB', name: '막탄 세부국제공항', nameEn: 'Mactan-Cebu International', city: '세부', cityEn: 'Cebu', country: '필리핀', countryCode: 'PH' },
  { code: 'CGK', name: '수카르노하타국제공항', nameEn: 'Soekarno-Hatta International', city: '자카르타', cityEn: 'Jakarta', country: '인도네시아', countryCode: 'ID' },
  { code: 'DPS', name: '응우라라이국제공항', nameEn: 'Ngurah Rai International', city: '발리', cityEn: 'Bali', country: '인도네시아', countryCode: 'ID' },

  // 미주
  { code: 'LAX', name: '로스앤젤레스국제공항', nameEn: 'Los Angeles International', city: '로스앤젤레스', cityEn: 'Los Angeles', country: '미국', countryCode: 'US' },
  { code: 'JFK', name: '존 F. 케네디국제공항', nameEn: 'John F. Kennedy International', city: '뉴욕', cityEn: 'New York', country: '미국', countryCode: 'US' },
  { code: 'SFO', name: '샌프란시스코국제공항', nameEn: 'San Francisco International', city: '샌프란시스코', cityEn: 'San Francisco', country: '미국', countryCode: 'US' },
  { code: 'SEA', name: '시애틀 타코마국제공항', nameEn: 'Seattle-Tacoma International', city: '시애틀', cityEn: 'Seattle', country: '미국', countryCode: 'US' },
  { code: 'ORD', name: '시카고 오헤어국제공항', nameEn: 'Chicago O\'Hare International', city: '시카고', cityEn: 'Chicago', country: '미국', countryCode: 'US' },
  { code: 'HNL', name: '호놀룰루국제공항', nameEn: 'Daniel K. Inouye International', city: '호놀룰루', cityEn: 'Honolulu', country: '미국', countryCode: 'US' },
  { code: 'GUM', name: '안토니오 B. 원팻국제공항', nameEn: 'Antonio B. Won Pat International', city: '괌', cityEn: 'Guam', country: '괌', countryCode: 'GU' },
  { code: 'SPN', name: '사이판국제공항', nameEn: 'Saipan International', city: '사이판', cityEn: 'Saipan', country: '북마리아나제도', countryCode: 'MP' },

  // 유럽
  { code: 'LHR', name: '런던 히드로공항', nameEn: 'London Heathrow', city: '런던', cityEn: 'London', country: '영국', countryCode: 'GB' },
  { code: 'CDG', name: '파리 샤를드골공항', nameEn: 'Paris Charles de Gaulle', city: '파리', cityEn: 'Paris', country: '프랑스', countryCode: 'FR' },
  { code: 'FRA', name: '프랑크푸르트공항', nameEn: 'Frankfurt Airport', city: '프랑크푸르트', cityEn: 'Frankfurt', country: '독일', countryCode: 'DE' },
  { code: 'AMS', name: '암스테르담 스히폴공항', nameEn: 'Amsterdam Schiphol', city: '암스테르담', cityEn: 'Amsterdam', country: '네덜란드', countryCode: 'NL' },
  { code: 'FCO', name: '로마 피우미치노공항', nameEn: 'Rome Fiumicino', city: '로마', cityEn: 'Rome', country: '이탈리아', countryCode: 'IT' },
  { code: 'BCN', name: '바르셀로나 엘프라트공항', nameEn: 'Barcelona El Prat', city: '바르셀로나', cityEn: 'Barcelona', country: '스페인', countryCode: 'ES' },
  { code: 'MAD', name: '마드리드 바라하스공항', nameEn: 'Madrid Barajas', city: '마드리드', cityEn: 'Madrid', country: '스페인', countryCode: 'ES' },
  { code: 'ZRH', name: '취리히공항', nameEn: 'Zurich Airport', city: '취리히', cityEn: 'Zurich', country: '스위스', countryCode: 'CH' },
  { code: 'VIE', name: '비엔나국제공항', nameEn: 'Vienna International', city: '비엔나', cityEn: 'Vienna', country: '오스트리아', countryCode: 'AT' },
  { code: 'PRG', name: '프라하 바츨라프 하벨공항', nameEn: 'Prague Vaclav Havel', city: '프라하', cityEn: 'Prague', country: '체코', countryCode: 'CZ' },

  // 오세아니아
  { code: 'SYD', name: '시드니국제공항', nameEn: 'Sydney Kingsford Smith', city: '시드니', cityEn: 'Sydney', country: '호주', countryCode: 'AU' },
  { code: 'MEL', name: '멜버른국제공항', nameEn: 'Melbourne Airport', city: '멜버른', cityEn: 'Melbourne', country: '호주', countryCode: 'AU' },
  { code: 'BNE', name: '브리즈번공항', nameEn: 'Brisbane Airport', city: '브리즈번', cityEn: 'Brisbane', country: '호주', countryCode: 'AU' },
  { code: 'AKL', name: '오클랜드공항', nameEn: 'Auckland Airport', city: '오클랜드', cityEn: 'Auckland', country: '뉴질랜드', countryCode: 'NZ' },

  // 중동
  { code: 'DXB', name: '두바이국제공항', nameEn: 'Dubai International', city: '두바이', cityEn: 'Dubai', country: '아랍에미리트', countryCode: 'AE' },
  { code: 'DOH', name: '하마드국제공항', nameEn: 'Hamad International', city: '도하', cityEn: 'Doha', country: '카타르', countryCode: 'QA' },
  { code: 'IST', name: '이스탄불공항', nameEn: 'Istanbul Airport', city: '이스탄불', cityEn: 'Istanbul', country: '튀르키예', countryCode: 'TR' },
]

/**
 * 국가별 국기 이모지 매핑
 */
export const countryFlags: Record<string, string> = {
  KR: '🇰🇷',
  JP: '🇯🇵',
  CN: '🇨🇳',
  HK: '🇭🇰',
  MO: '🇲🇴',
  TW: '🇹🇼',
  TH: '🇹🇭',
  SG: '🇸🇬',
  MY: '🇲🇾',
  VN: '🇻🇳',
  PH: '🇵🇭',
  ID: '🇮🇩',
  US: '🇺🇸',
  GU: '🇬🇺',
  MP: '🇲🇵',
  GB: '🇬🇧',
  FR: '🇫🇷',
  DE: '🇩🇪',
  NL: '🇳🇱',
  IT: '🇮🇹',
  ES: '🇪🇸',
  CH: '🇨🇭',
  AT: '🇦🇹',
  CZ: '🇨🇿',
  AU: '🇦🇺',
  NZ: '🇳🇿',
  AE: '🇦🇪',
  QA: '🇶🇦',
  TR: '🇹🇷',
}

/**
 * 공항 검색 함수
 * @param query 검색어 (공항 코드, 공항명, 도시명, 국가명)
 * @returns 매칭되는 공항 목록 (최대 10개)
 */
export function searchAirports(query: string): Airport[] {
  if (!query || query.trim().length === 0) {
    return []
  }

  const normalizedQuery = query.toLowerCase().trim()

  const results = airports.filter((airport) => {
    return (
      airport.code.toLowerCase().includes(normalizedQuery) ||
      airport.name.toLowerCase().includes(normalizedQuery) ||
      airport.nameEn.toLowerCase().includes(normalizedQuery) ||
      airport.city.toLowerCase().includes(normalizedQuery) ||
      airport.cityEn.toLowerCase().includes(normalizedQuery) ||
      airport.country.toLowerCase().includes(normalizedQuery)
    )
  })

  // 정확도 기반 정렬: 코드 일치 > 도시명 시작 > 나머지
  results.sort((a, b) => {
    // 코드가 정확히 일치하면 최우선
    if (a.code.toLowerCase() === normalizedQuery) return -1
    if (b.code.toLowerCase() === normalizedQuery) return 1

    // 코드가 시작으로 일치
    if (a.code.toLowerCase().startsWith(normalizedQuery)) return -1
    if (b.code.toLowerCase().startsWith(normalizedQuery)) return 1

    // 도시명이 시작으로 일치
    if (a.city.toLowerCase().startsWith(normalizedQuery) || a.cityEn.toLowerCase().startsWith(normalizedQuery)) return -1
    if (b.city.toLowerCase().startsWith(normalizedQuery) || b.cityEn.toLowerCase().startsWith(normalizedQuery)) return 1

    return 0
  })

  return results.slice(0, 10)
}

/**
 * 공항 코드로 공항 찾기
 */
export function getAirportByCode(code: string): Airport | undefined {
  return airports.find((airport) => airport.code.toUpperCase() === code.toUpperCase())
}

/**
 * 공항 표시 형식 (예: "서울 (ICN)")
 */
export function formatAirportDisplay(airport: Airport): string {
  return `${airport.city} (${airport.code})`
}

/**
 * 최근 선택 공항 저장/로드 (localStorage)
 */
const RECENT_AIRPORTS_KEY = 'recent-airports'
const MAX_RECENT_AIRPORTS = 5

export function getRecentAirports(): Airport[] {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem(RECENT_AIRPORTS_KEY)
    if (!stored) return []

    const codes: string[] = JSON.parse(stored)
    return codes
      .map((code) => getAirportByCode(code))
      .filter((airport): airport is Airport => airport !== undefined)
  } catch {
    return []
  }
}

export function addRecentAirport(code: string): void {
  if (typeof window === 'undefined') return

  try {
    const recent = getRecentAirports()
    const filtered = recent.filter((a) => a.code !== code)
    const newRecent = [code, ...filtered.map((a) => a.code)].slice(0, MAX_RECENT_AIRPORTS)
    localStorage.setItem(RECENT_AIRPORTS_KEY, JSON.stringify(newRecent))
  } catch {
    // localStorage 에러 무시
  }
}
