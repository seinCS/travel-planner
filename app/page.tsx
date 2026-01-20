import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="container mx-auto px-4 py-6 flex justify-between items-center">
        <h1 className="text-xl font-bold">여행 플래너</h1>
        <Link href="/login">
          <Button variant="outline">로그인</Button>
        </Link>
      </header>

      <main className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-4xl md:text-5xl font-bold mb-6">
          SNS 스크린샷으로<br />
          <span className="text-blue-600">여행 계획</span>을 한번에
        </h2>
        <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
          인스타그램, 유튜브, X에서 캡처한 여행지 정보를 업로드하면
          AI가 자동으로 장소를 추출하여 지도에 표시해드립니다.
        </p>
        <Link href="/login">
          <Button size="lg" className="text-lg px-8">
            무료로 시작하기
          </Button>
        </Link>

        <div className="mt-20 grid md:grid-cols-3 gap-8 text-left max-w-4xl mx-auto">
          <div className="bg-white/80 rounded-lg p-6 shadow-sm">
            <div className="text-3xl mb-4">📸</div>
            <h3 className="font-semibold mb-2">스크린샷 업로드</h3>
            <p className="text-sm text-muted-foreground">
              SNS에서 캡처한 이미지를 드래그앤드롭으로 간편하게 업로드
            </p>
          </div>
          <div className="bg-white/80 rounded-lg p-6 shadow-sm">
            <div className="text-3xl mb-4">🤖</div>
            <h3 className="font-semibold mb-2">AI 자동 추출</h3>
            <p className="text-sm text-muted-foreground">
              이미지에서 장소명, 카테고리, 설명을 자동으로 추출
            </p>
          </div>
          <div className="bg-white/80 rounded-lg p-6 shadow-sm">
            <div className="text-3xl mb-4">🗺️</div>
            <h3 className="font-semibold mb-2">지도 시각화</h3>
            <p className="text-sm text-muted-foreground">
              추출된 장소를 Google Maps에 핀으로 표시하여 한눈에 확인
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
