/**
 * E2E 테스트 전용 로그인 API
 *
 * 주의: 이 엔드포인트는 E2E_TEST_MODE=true 환경에서만 작동합니다.
 * 프로덕션 환경에서는 404를 반환합니다.
 */
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { encode } from 'next-auth/jwt'
import { prisma } from '@/lib/db'

const TEST_USER = {
  id: 'e2e-test-user-id',
  email: 'e2e-test@example.com',
  name: 'E2E Test User',
  image: null,
}

export async function POST() {
  // 프로덕션 환경 또는 테스트 모드가 아니면 거부
  // 이중 체크로 프로덕션 환경에서 실수로 E2E_TEST_MODE가 설정되어도 차단
  if (process.env.NODE_ENV === 'production' || process.env.E2E_TEST_MODE !== 'true') {
    return NextResponse.json(
      { error: 'This endpoint is only available in E2E test mode' },
      { status: 404 }
    )
  }

  try {
    // 테스트 사용자 생성 또는 조회 (upsert로 race condition 방지)
    const user = await prisma.user.upsert({
      where: { id: TEST_USER.id },
      update: {
        email: TEST_USER.email,
        name: TEST_USER.name,
      },
      create: {
        id: TEST_USER.id,
        email: TEST_USER.email,
        name: TEST_USER.name,
        image: TEST_USER.image,
      },
    })

    // JWT 토큰 생성
    const token = await encode({
      token: {
        sub: user.id,
        email: user.email,
        name: user.name,
        picture: user.image,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24시간
      },
      secret: process.env.NEXTAUTH_SECRET!,
    })

    // 세션 쿠키 설정
    const cookieStore = await cookies()

    // next-auth.session-token 쿠키 설정 (테스트 환경 전용 - 프로덕션에서는 도달 불가)
    cookieStore.set('next-auth.session-token', token, {
      httpOnly: true,
      secure: false, // 테스트 환경에서만 사용되므로 secure 불필요
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24시간
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    })
  } catch (error) {
    console.error('Test login error:', error)
    return NextResponse.json(
      { error: 'Failed to create test session' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  // 프로덕션 환경 또는 테스트 모드가 아니면 거부
  if (process.env.NODE_ENV === 'production' || process.env.E2E_TEST_MODE !== 'true') {
    return NextResponse.json(
      { error: 'This endpoint is only available in E2E test mode' },
      { status: 404 }
    )
  }

  // 세션 쿠키 삭제
  const cookieStore = await cookies()
  cookieStore.delete('next-auth.session-token')

  return NextResponse.json({ success: true })
}
