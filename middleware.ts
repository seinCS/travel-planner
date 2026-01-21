import { withAuth } from 'next-auth/middleware'

// E2E 테스트 모드 체크 (테스트 환경에서만 활성화)
const isTestMode = process.env.E2E_TEST_MODE === 'true'

export default withAuth({
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized: ({ req, token }) => {
      // E2E 테스트 모드에서 특별 헤더가 있으면 인증 우회
      if (isTestMode && req.headers.get('x-e2e-test') === 'true') {
        return true
      }
      return !!token
    },
  },
})

export const config = {
  matcher: ['/projects/:path*'],
}
