import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Camera,
  Sparkles,
  Map,
  Calendar,
  Users,
  Upload,
  ArrowRight,
  Github,
  MapPin,
  Check
} from '@/lib/icons'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="container mx-auto px-4 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            여행 플래너
          </h1>
        </div>
        <Link href="/login">
          <Button variant="outline">로그인</Button>
        </Link>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-16 pb-24 md:pt-24 md:pb-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100/80 rounded-full text-sm text-blue-700 font-medium mb-6 animate-fade-in">
              <Sparkles className="w-4 h-4" />
              AI 기반 여행 계획 도우미
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              SNS 스크린샷으로
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                여행 계획
              </span>
              을 한번에
            </h2>
            <p className="text-lg md:text-xl text-slate-600 mb-8 max-w-xl mx-auto lg:mx-0">
              인스타그램, 유튜브, X에서 캡처한 여행지 정보를 업로드하면
              AI가 자동으로 장소를 추출하여 지도에 표시해드립니다.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link href="/login">
                <Button size="lg" className="text-lg px-8 py-6 w-full sm:w-auto group">
                  무료로 시작하기
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="#how-it-works">
                <Button variant="outline" size="lg" className="text-lg px-8 py-6 w-full sm:w-auto">
                  사용 방법 보기
                </Button>
              </Link>
            </div>
          </div>

          {/* App Preview Placeholder */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-2xl blur-3xl opacity-20 animate-pulse" />
            <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/50 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-3 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 text-center text-white/90 text-sm font-medium">
                  도쿄 여행 계획
                </div>
              </div>
              <div className="p-4 space-y-4">
                {/* Map Preview */}
                <div className="bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl h-48 flex items-center justify-center">
                  <div className="text-center">
                    <Map className="w-12 h-12 text-blue-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">지도 미리보기</p>
                  </div>
                </div>
                {/* Place Cards Preview */}
                <div className="space-y-2">
                  {[
                    { name: '센소지', category: '관광지', color: 'blue' },
                    { name: '이치란 라멘', category: '맛집', color: 'orange' },
                    { name: '시부야 스카이', category: '관광지', color: 'purple' },
                  ].map((place, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <div className={`w-8 h-8 rounded-full bg-${place.color}-100 flex items-center justify-center`}>
                        <MapPin className={`w-4 h-4 text-${place.color}-500`} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{place.name}</p>
                        <p className="text-xs text-slate-500">{place.category}</p>
                      </div>
                      <Check className="w-4 h-4 text-green-500" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20 md:py-28">
        <div className="text-center mb-16">
          <h3 className="text-3xl md:text-4xl font-bold mb-4">
            여행 계획의 모든 것
          </h3>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            스크린샷 하나로 시작하는 스마트한 여행 계획
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: Upload,
              title: '스크린샷 업로드',
              description: 'SNS에서 캡처한 이미지를 드래그앤드롭으로 간편하게 업로드',
              gradient: 'from-blue-500 to-blue-600',
              bgColor: 'bg-blue-50',
            },
            {
              icon: Sparkles,
              title: 'AI 자동 추출',
              description: '이미지에서 장소명, 카테고리, 설명을 Claude AI가 자동 추출',
              gradient: 'from-purple-500 to-purple-600',
              bgColor: 'bg-purple-50',
            },
            {
              icon: Map,
              title: '지도 시각화',
              description: '추출된 장소를 Google Maps에 핀으로 표시하여 한눈에 확인',
              gradient: 'from-green-500 to-green-600',
              bgColor: 'bg-green-50',
            },
            {
              icon: Calendar,
              title: '일정 관리 & 공유',
              description: '드래그앤드롭으로 일정을 편성하고 그룹과 함께 협업',
              gradient: 'from-orange-500 to-orange-600',
              bgColor: 'bg-orange-50',
            },
          ].map((feature, i) => (
            <div
              key={i}
              className="group bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/50 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 hover:-translate-y-1"
            >
              <div className={`w-14 h-14 rounded-xl ${feature.bgColor} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${feature.gradient} flex items-center justify-center`}>
                  <feature.icon className="w-5 h-5 text-white" />
                </div>
              </div>
              <h4 className="font-semibold text-lg mb-2">{feature.title}</h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="container mx-auto px-4 py-20 md:py-28">
        <div className="text-center mb-16">
          <h3 className="text-3xl md:text-4xl font-bold mb-4">
            3단계로 완성하는 여행 계획
          </h3>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            복잡한 여행 계획, 이제 3단계면 충분합니다
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connection Lines (hidden on mobile) */}
            <div className="hidden md:block absolute top-16 left-1/3 right-1/3 h-0.5 bg-gradient-to-r from-blue-300 via-purple-300 to-green-300" />

            {[
              {
                step: 1,
                icon: Camera,
                title: '스크린샷 업로드',
                description: 'Instagram, YouTube, X 등 SNS에서 저장한 여행지 스크린샷을 업로드하세요.',
                color: 'blue',
              },
              {
                step: 2,
                icon: Sparkles,
                title: 'AI가 장소 추출',
                description: 'Claude AI가 이미지를 분석해 장소명, 주소, 카테고리를 자동으로 추출합니다.',
                color: 'purple',
              },
              {
                step: 3,
                icon: Map,
                title: '지도에서 확인 & 편성',
                description: '추출된 장소를 지도에서 확인하고 드래그앤드롭으로 일정을 편성하세요.',
                color: 'green',
              },
            ].map((item, i) => (
              <div key={i} className="relative text-center">
                <div className={`w-32 h-32 mx-auto mb-6 rounded-full bg-${item.color}-50 flex items-center justify-center relative`}>
                  <div className={`absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-${item.color}-500 to-${item.color}-600 text-white font-bold text-sm flex items-center justify-center shadow-lg`}>
                    {item.step}
                  </div>
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br from-${item.color}-500 to-${item.color}-600 flex items-center justify-center shadow-lg`}>
                    <item.icon className="w-8 h-8 text-white" />
                  </div>
                </div>
                <h4 className="font-semibold text-xl mb-3">{item.title}</h4>
                <p className="text-slate-600 leading-relaxed max-w-xs mx-auto">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-8 md:p-12 text-center text-white relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

          <div className="relative">
            <div className="flex justify-center gap-8 md:gap-16 mb-8">
              <div>
                <div className="text-4xl md:text-5xl font-bold mb-2">1,000+</div>
                <div className="text-blue-100 text-sm md:text-base">여행 계획</div>
              </div>
              <div className="w-px bg-white/20" />
              <div>
                <div className="text-4xl md:text-5xl font-bold mb-2">5,000+</div>
                <div className="text-blue-100 text-sm md:text-base">장소 추출</div>
              </div>
              <div className="w-px bg-white/20 hidden sm:block" />
              <div className="hidden sm:block">
                <div className="text-4xl md:text-5xl font-bold mb-2">500+</div>
                <div className="text-blue-100 text-sm md:text-base">사용자</div>
              </div>
            </div>
            <p className="text-lg md:text-xl text-blue-100 max-w-2xl mx-auto mb-8">
              이미 많은 여행자들이 스마트하게 여행을 계획하고 있습니다
            </p>
            <Link href="/login">
              <Button size="lg" variant="secondary" className="text-lg px-8 py-6 bg-white text-blue-600 hover:bg-blue-50">
                지금 시작하기
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Collaboration Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="order-2 lg:order-1">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-6 max-w-md mx-auto lg:mx-0">
              <div className="flex items-center gap-3 mb-6">
                <Users className="w-6 h-6 text-blue-600" />
                <h5 className="font-semibold">그룹 멤버</h5>
              </div>
              <div className="space-y-3">
                {[
                  { name: '김여행', role: 'Owner', avatar: 'K' },
                  { name: '이탐험', role: 'Member', avatar: 'L' },
                  { name: '박모험', role: 'Member', avatar: 'P' },
                ].map((member, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-medium">
                      {member.avatar}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{member.name}</p>
                      <p className="text-xs text-slate-500">{member.role}</p>
                    </div>
                  </div>
                ))}
                <button className="w-full p-3 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 hover:border-blue-300 hover:text-blue-500 transition-colors text-sm">
                  + 초대 링크로 멤버 추가
                </button>
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2 text-center lg:text-left">
            <h3 className="text-3xl md:text-4xl font-bold mb-4">
              함께 계획하는 여행
            </h3>
            <p className="text-lg text-slate-600 mb-6 max-w-lg mx-auto lg:mx-0">
              초대 링크 하나로 친구, 가족과 함께 여행을 계획하세요.
              실시간으로 장소를 추가하고 일정을 조율할 수 있습니다.
            </p>
            <ul className="space-y-3 text-left max-w-lg mx-auto lg:mx-0">
              {[
                '초대 링크로 간편하게 멤버 추가',
                '실시간 장소 공유 및 일정 편성',
                '공유 링크로 외부에 여행 계획 공유',
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-slate-600">
                  <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-green-600" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-md flex items-center justify-center">
                <MapPin className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-slate-700">여행 플래너</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-500">
              <Link href="/login" className="hover:text-blue-600 transition-colors">
                로그인
              </Link>
              <a
                href="https://github.com/seinCS/travel-planner"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-blue-600 transition-colors"
              >
                <Github className="w-4 h-4" />
                GitHub
              </a>
            </div>
            <p className="text-sm text-slate-400">
              © 2026 여행 플래너. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
