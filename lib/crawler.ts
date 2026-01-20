import * as cheerio from 'cheerio'

export interface CrawlResult {
  success: boolean
  text: string | null
  title: string | null
  error: string | null
}

const CRAWL_TIMEOUT = 30000 // 30초

// 제거할 요소들
const REMOVE_SELECTORS = [
  'script',
  'style',
  'noscript',
  'iframe',
  'nav',
  'header',
  'footer',
  '.sidebar',
  '.comments',
  '.comment',
  '.advertisement',
  '.ad',
  '.ads',
  '.related-posts',
  '.related',
  '.share',
  '.social',
  '[role="navigation"]',
  '[role="banner"]',
  '[role="contentinfo"]',
]

// 본문 추출 셀렉터 (우선순위 순)
const CONTENT_SELECTORS = [
  // 네이버 블로그
  '.se-main-container',
  '.post-view',
  '#postViewArea',
  '.se_component_wrap',

  // 티스토리
  '.article-view',
  '.entry-content',
  '.tt_article_useless_p_margin',
  '.contents_style',

  // 일반 블로그/아티클
  'article',
  '[role="main"]',
  '.post-content',
  '.content',
  '.post-body',
  '.article-content',
  '.blog-post',
  '.entry',

  // Fallback
  'main',
  '#content',
  '.container',
  'body',
]

export async function crawlUrl(url: string): Promise<CrawlResult> {
  // URL 유효성 검증
  try {
    new URL(url)
  } catch {
    return {
      success: false,
      text: null,
      title: null,
      error: '올바른 URL 형식이 아닙니다.',
    }
  }

  try {
    // AbortController로 타임아웃 처리
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), CRAWL_TIMEOUT)

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return {
        success: false,
        text: null,
        title: null,
        error: `웹페이지를 불러올 수 없습니다. (${response.status})`,
      }
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // 제목 추출
    const title =
      $('meta[property="og:title"]').attr('content') ||
      $('title').text().trim() ||
      null

    // 불필요한 요소 제거 (한 번의 DOM 순회로 최적화)
    $(REMOVE_SELECTORS.join(',')).remove()

    // 본문 추출 시도
    let contentText = ''

    for (const selector of CONTENT_SELECTORS) {
      const element = $(selector)
      if (element.length > 0) {
        contentText = element.text()
        break
      }
    }

    // 텍스트 정제
    contentText = contentText
      .replace(/\s+/g, ' ') // 여러 공백을 하나로
      .replace(/\n+/g, '\n') // 여러 줄바꿈을 하나로
      .trim()

    // 최대 길이 제한 (Claude API 토큰 비용 고려)
    const MAX_TEXT_LENGTH = 10000
    if (contentText.length > MAX_TEXT_LENGTH) {
      contentText = contentText.substring(0, MAX_TEXT_LENGTH) + '...'
    }

    if (!contentText || contentText.length < 50) {
      return {
        success: false,
        text: null,
        title,
        error: '웹페이지에서 텍스트를 추출할 수 없습니다.',
      }
    }

    return {
      success: true,
      text: contentText,
      title,
      error: null,
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          text: null,
          title: null,
          error: '웹페이지 로딩 시간이 초과되었습니다.',
        }
      }
      return {
        success: false,
        text: null,
        title: null,
        error: `크롤링 오류: ${error.message}`,
      }
    }
    return {
      success: false,
      text: null,
      title: null,
      error: '알 수 없는 오류가 발생했습니다.',
    }
  }
}
