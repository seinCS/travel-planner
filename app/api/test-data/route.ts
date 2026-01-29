/**
 * E2E 테스트 데이터 생성 API
 *
 * 주의: 이 엔드포인트는 E2E_TEST_MODE=true 환경에서만 작동합니다.
 * 프로덕션 환경에서는 404를 반환합니다.
 */
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const TEST_USER_ID = 'e2e-test-user-id'
const TEST_PROJECT_ID = 'e2e-test-project-id'
const TEST_ITINERARY_ID = 'e2e-test-itinerary-id'

const TEST_PLACES = [
  {
    id: 'e2e-place-1',
    name: '센소지',
    category: 'attraction',
    comment: '도쿄의 유명한 사찰',
    latitude: 35.7147,
    longitude: 139.7966,
    formattedAddress: '도쿄 다이토구 아사쿠사 2-3-1',
    rating: 4.5,
    userRatingsTotal: 50000,
  },
  {
    id: 'e2e-place-2',
    name: '이치란 라멘 시부야점',
    category: 'restaurant',
    comment: '유명한 돈코츠 라멘',
    latitude: 35.6595,
    longitude: 139.7004,
    formattedAddress: '도쿄 시부야구 우다가와초 13-7',
    rating: 4.2,
    userRatingsTotal: 10000,
  },
  {
    id: 'e2e-place-3',
    name: '블루보틀 커피 시부야',
    category: 'cafe',
    comment: '스페셜티 커피',
    latitude: 35.6580,
    longitude: 139.7016,
    formattedAddress: '도쿄 시부야구 진난 1-5-8',
    rating: 4.3,
    userRatingsTotal: 3000,
  },
  {
    id: 'e2e-place-4',
    name: '시부야 스카이',
    category: 'attraction',
    comment: '전망대',
    latitude: 35.6580,
    longitude: 139.7020,
    formattedAddress: '도쿄 시부야구 시부야 2-24-12',
    rating: 4.6,
    userRatingsTotal: 20000,
  },
  {
    id: 'e2e-place-5',
    name: '유니클로 긴자점',
    category: 'shopping',
    comment: '대형 매장',
    latitude: 35.6721,
    longitude: 139.7689,
    formattedAddress: '도쿄 추오구 긴자 6-9-5',
    rating: 4.1,
    userRatingsTotal: 5000,
  },
  {
    id: 'e2e-place-6',
    name: '호텔 그레이서리 신주쿠',
    category: 'accommodation',
    comment: '고질라 호텔',
    latitude: 35.6938,
    longitude: 139.7034,
    formattedAddress: '도쿄 신주쿠구 가부키초 1-19-1',
    rating: 4.4,
    userRatingsTotal: 8000,
  },
]

export async function POST() {
  // 테스트 모드가 아니면 거부
  if (process.env.E2E_TEST_MODE !== 'true') {
    return NextResponse.json(
      { error: 'This endpoint is only available in E2E test mode' },
      { status: 404 }
    )
  }

  try {
    // 1. 테스트 사용자 확인 (test-login에서 생성됨)
    const user = await prisma.user.findUnique({
      where: { id: TEST_USER_ID },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Test user not found. Call /api/auth/test-login first.' },
        { status: 400 }
      )
    }

    // 2. 기존 테스트 데이터 삭제 (cascade로 관련 데이터도 삭제됨)
    try {
      await prisma.itineraryItem.deleteMany({
        where: { day: { itinerary: { projectId: TEST_PROJECT_ID } } },
      })
      await prisma.itineraryDay.deleteMany({
        where: { itinerary: { projectId: TEST_PROJECT_ID } },
      })
      await prisma.itinerary.deleteMany({
        where: { projectId: TEST_PROJECT_ID },
      })
      await prisma.place.deleteMany({
        where: { projectId: TEST_PROJECT_ID },
      })
      await prisma.project.deleteMany({
        where: { id: TEST_PROJECT_ID },
      })
    } catch (e) {
      console.log('Cleanup error (ignorable):', e)
    }

    // 3. 테스트 프로젝트 생성
    const project = await prisma.project.upsert({
      where: { id: TEST_PROJECT_ID },
      update: {
        name: '도쿄 여행 테스트',
        destination: '도쿄',
        country: '일본',
        inviteEnabled: true,
        inviteToken: 'e2e-invite-token',
      },
      create: {
        id: TEST_PROJECT_ID,
        userId: TEST_USER_ID,
        name: '도쿄 여행 테스트',
        destination: '도쿄',
        country: '일본',
        inviteEnabled: true,
        inviteToken: 'e2e-invite-token',
      },
    })

    // 4. 테스트 장소들 생성 (upsert 사용)
    for (const place of TEST_PLACES) {
      await prisma.place.upsert({
        where: { id: place.id },
        update: {
          ...place,
          projectId: TEST_PROJECT_ID,
          status: 'auto',
        },
        create: {
          ...place,
          projectId: TEST_PROJECT_ID,
          status: 'auto',
        },
      })
    }

    // 5. 테스트 일정 생성 (upsert 사용)
    const startDate = new Date()
    startDate.setHours(0, 0, 0, 0)
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + 2) // 3일 일정

    // 기존 일정 삭제 후 새로 생성
    await prisma.itinerary.deleteMany({
      where: { projectId: TEST_PROJECT_ID },
    }).catch(() => {})

    const itinerary = await prisma.itinerary.create({
      data: {
        id: TEST_ITINERARY_ID,
        projectId: TEST_PROJECT_ID,
        title: '도쿄 3일 여행',
        startDate,
        endDate,
        days: {
          create: [
            { dayNumber: 1, date: startDate },
            {
              dayNumber: 2,
              date: new Date(startDate.getTime() + 24 * 60 * 60 * 1000),
            },
            {
              dayNumber: 3,
              date: new Date(startDate.getTime() + 2 * 24 * 60 * 60 * 1000),
            },
          ],
        },
      },
      include: {
        days: true,
      },
    })

    // 6. Day 1에 일정 항목 추가 (센소지)
    await prisma.itineraryItem.create({
      data: {
        dayId: itinerary.days[0].id,
        placeId: 'e2e-place-1', // 센소지
        itemType: 'place',
        order: 0,
        startTime: '10:00',
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        projectId: project.id,
        itineraryId: itinerary.id,
        placeCount: TEST_PLACES.length,
        dayCount: itinerary.days.length,
      },
    })
  } catch (error) {
    console.error('Test data creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create test data', details: String(error) },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  // 테스트 모드가 아니면 거부
  if (process.env.E2E_TEST_MODE !== 'true') {
    return NextResponse.json(
      { error: 'This endpoint is only available in E2E test mode' },
      { status: 404 }
    )
  }

  try {
    // 테스트 프로젝트만 삭제 (cascade로 관련 데이터도 삭제됨)
    // 주의: 사용자는 삭제하지 않음 (test-login에서 관리)
    await prisma.project.deleteMany({
      where: { id: TEST_PROJECT_ID },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Test data cleanup error:', error)
    return NextResponse.json(
      { error: 'Failed to cleanup test data' },
      { status: 500 }
    )
  }
}
