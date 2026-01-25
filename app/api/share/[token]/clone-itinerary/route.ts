import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'

// POST /api/share/[token]/clone-itinerary - 일정 포함 전체 복제
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Login required to clone itinerary' },
        { status: 401 }
      )
    }

    const { token } = await params

    // 1. 원본 프로젝트 조회 (장소, 일정, 항공편, 숙소 모두 포함)
    const sourceProject = await prisma.project.findUnique({
      where: { shareToken: token, shareEnabled: true },
      include: {
        places: true,
        itinerary: {
          include: {
            days: {
              include: {
                items: true,
              },
            },
            flights: true,
            accommodations: true,
          },
        },
      },
    })

    if (!sourceProject) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (sourceProject.userId === session.user.id) {
      return NextResponse.json(
        { error: '자신의 프로젝트는 복제할 수 없습니다.' },
        { status: 400 }
      )
    }

    // 2. 트랜잭션으로 전체 복제 수행 (데이터 정합성 보장)
    const result = await prisma.$transaction(async (tx) => {
      // 2-1. 새 프로젝트 생성
      const newProject = await tx.project.create({
        data: {
          userId: session.user.id,
          name: `${sourceProject.name} (복제)`,
          destination: sourceProject.destination,
          country: sourceProject.country,
        },
      })

      // 2-2. 장소 배치 복제 (N+1 문제 해결)
      const placeIdMap = new Map<string, string>()

      if (sourceProject.places.length > 0) {
        // 각 장소에 새 ID 생성 및 매핑
        const placesData = sourceProject.places.map((place) => ({
          id: crypto.randomUUID(),
          projectId: newProject.id,
          name: place.name,
          category: place.category,
          latitude: place.latitude,
          longitude: place.longitude,
          comment: place.comment,
          formattedAddress: place.formattedAddress,
          googlePlaceId: place.googlePlaceId,
          googleMapsUrl: place.googleMapsUrl,
          rating: place.rating,
          userRatingsTotal: place.userRatingsTotal,
          priceLevel: place.priceLevel,
          status: 'cloned' as const,
        }))

        // ID 매핑 저장
        sourceProject.places.forEach((place, index) => {
          placeIdMap.set(place.id, placesData[index].id)
        })

        // 배치 생성
        await tx.place.createMany({
          data: placesData,
        })
      }

      // 2-3. 일정 복제 (있는 경우)
      if (sourceProject.itinerary) {
        const sourceItinerary = sourceProject.itinerary
        const accommodationIdMap = new Map<string, string>()

        const newItinerary = await tx.itinerary.create({
          data: {
            projectId: newProject.id,
            title: sourceItinerary.title,
            startDate: sourceItinerary.startDate,
            endDate: sourceItinerary.endDate,
          },
        })

        // 숙소 배치 복제
        if (sourceItinerary.accommodations.length > 0) {
          const accommodationsData = sourceItinerary.accommodations.map((accom) => ({
            id: crypto.randomUUID(),
            itineraryId: newItinerary.id,
            name: accom.name,
            address: accom.address,
            latitude: accom.latitude,
            longitude: accom.longitude,
            checkIn: accom.checkIn,
            checkOut: accom.checkOut,
            note: accom.note,
          }))

          // ID 매핑 저장
          sourceItinerary.accommodations.forEach((accom, index) => {
            accommodationIdMap.set(accom.id, accommodationsData[index].id)
          })

          await tx.accommodation.createMany({
            data: accommodationsData,
          })
        }

        // Days 배치 복제 (N+1 문제 해결)
        const dayIdMap = new Map<string, string>()

        if (sourceItinerary.days.length > 0) {
          const daysData = sourceItinerary.days.map((day) => ({
            id: crypto.randomUUID(),
            itineraryId: newItinerary.id,
            dayNumber: day.dayNumber,
            date: day.date,
          }))

          // ID 매핑 저장
          sourceItinerary.days.forEach((day, index) => {
            dayIdMap.set(day.id, daysData[index].id)
          })

          await tx.itineraryDay.createMany({
            data: daysData,
          })

          // Items 배치 복제 (모든 days의 items를 한 번에 처리)
          const allItemsData = sourceItinerary.days.flatMap((day) =>
            day.items.map((item) => ({
              dayId: dayIdMap.get(day.id)!,
              placeId: item.placeId ? placeIdMap.get(item.placeId) || null : null,
              accommodationId: item.accommodationId
                ? accommodationIdMap.get(item.accommodationId) || null
                : null,
              itemType: item.itemType,
              order: item.order,
              startTime: item.startTime,
              note: item.note,
            }))
          )

          if (allItemsData.length > 0) {
            await tx.itineraryItem.createMany({
              data: allItemsData,
            })
          }
        }

        // Flights 배치 복제
        if (sourceItinerary.flights.length > 0) {
          await tx.flight.createMany({
            data: sourceItinerary.flights.map((flight) => ({
              itineraryId: newItinerary.id,
              departureCity: flight.departureCity,
              arrivalCity: flight.arrivalCity,
              airline: flight.airline,
              flightNumber: flight.flightNumber,
              departureDate: flight.departureDate,
              arrivalDate: flight.arrivalDate,
              note: flight.note,
            })),
          })
        }
      }

      return newProject
    })

    return NextResponse.json({
      projectId: result.id,
      message: 'Itinerary cloned successfully',
    })
  } catch (error) {
    // 에러 타입별 구분 처리
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('[Clone Error - DB]', error.code, error.message)
      return NextResponse.json(
        { error: '데이터베이스 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      console.error('[Clone Error - Validation]', error.message)
      return NextResponse.json(
        { error: '데이터 검증 오류가 발생했습니다.' },
        { status: 400 }
      )
    }

    console.error(
      '[Clone Itinerary Error]',
      error instanceof Error ? error.message : 'Unknown error'
    )
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
