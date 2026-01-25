import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

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

    // 2. 새 프로젝트 생성
    const newProject = await prisma.project.create({
      data: {
        userId: session.user.id,
        name: `${sourceProject.name} (복제)`,
        destination: sourceProject.destination,
        country: sourceProject.country,
      },
    })

    // 3. 장소 복제 (ID 매핑 유지)
    const placeIdMap = new Map<string, string>()

    for (const place of sourceProject.places) {
      const newPlace = await prisma.place.create({
        data: {
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
          status: 'cloned',
        },
      })
      placeIdMap.set(place.id, newPlace.id)
    }

    // 4. 일정 복제 (있는 경우)
    if (sourceProject.itinerary) {
      const sourceItinerary = sourceProject.itinerary

      // 숙소 ID 매핑
      const accommodationIdMap = new Map<string, string>()

      const newItinerary = await prisma.itinerary.create({
        data: {
          projectId: newProject.id,
          title: sourceItinerary.title,
          startDate: sourceItinerary.startDate,
          endDate: sourceItinerary.endDate,
        },
      })

      // Accommodations 먼저 복제 (items에서 참조하기 때문)
      for (const accom of sourceItinerary.accommodations) {
        const newAccom = await prisma.accommodation.create({
          data: {
            itineraryId: newItinerary.id,
            name: accom.name,
            address: accom.address,
            latitude: accom.latitude,
            longitude: accom.longitude,
            checkIn: accom.checkIn,
            checkOut: accom.checkOut,
            note: accom.note,
          },
        })
        accommodationIdMap.set(accom.id, newAccom.id)
      }

      // Days 복제
      for (const day of sourceItinerary.days) {
        const newDay = await prisma.itineraryDay.create({
          data: {
            itineraryId: newItinerary.id,
            dayNumber: day.dayNumber,
            date: day.date,
          },
        })

        // Items 복제 (새 placeId, accommodationId 사용)
        for (const item of day.items) {
          await prisma.itineraryItem.create({
            data: {
              dayId: newDay.id,
              placeId: item.placeId ? placeIdMap.get(item.placeId) : null,
              accommodationId: item.accommodationId
                ? accommodationIdMap.get(item.accommodationId)
                : null,
              itemType: item.itemType,
              order: item.order,
              startTime: item.startTime,
              note: item.note,
            },
          })
        }
      }

      // Flights 복제
      for (const flight of sourceItinerary.flights) {
        await prisma.flight.create({
          data: {
            itineraryId: newItinerary.id,
            departureCity: flight.departureCity,
            arrivalCity: flight.arrivalCity,
            airline: flight.airline,
            flightNumber: flight.flightNumber,
            departureDate: flight.departureDate,
            arrivalDate: flight.arrivalDate,
            note: flight.note,
          },
        })
      }
    }

    return NextResponse.json({
      projectId: newProject.id,
      message: 'Itinerary cloned successfully',
    })
  } catch (error) {
    console.error('[Clone Itinerary Error]', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
