/**
 * AccommodationItinerarySyncService
 *
 * 숙소와 일정 아이템 간의 동기화를 관리하는 서비스
 * - 숙소 생성 시 체크인/체크아웃/중간 일자에 자동으로 일정 아이템 생성
 * - 숙소 수정 시 관련 일정 아이템 업데이트
 * - 숙소 삭제 시 관련 일정 아이템 자동 삭제 (Prisma Cascade)
 */

import { PrismaClient, ItineraryDay, Accommodation, Prisma } from '@prisma/client'

export type AccommodationItemType =
  | 'accommodation_checkin'
  | 'accommodation_checkout'
  | 'accommodation_stay'

interface SyncResult {
  created: number
  updated: number
  deleted: number
}

// Prisma 트랜잭션 클라이언트 타입 (PrismaClient 또는 트랜잭션 컨텍스트)
type PrismaTransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>

export class AccommodationItinerarySyncService {
  constructor(private prisma: PrismaClient | PrismaTransactionClient) {}

  /**
   * 숙소에 해당하는 날짜들의 ItineraryDay를 찾아서 반환
   */
  private async findDaysForAccommodation(
    itineraryId: string,
    checkIn: Date,
    checkOut: Date
  ): Promise<ItineraryDay[]> {
    const checkInDate = new Date(checkIn)
    const checkOutDate = new Date(checkOut)

    // 체크인 날짜부터 체크아웃 날짜까지의 모든 day를 가져옴
    const days = await this.prisma.itineraryDay.findMany({
      where: {
        itineraryId,
        date: {
          gte: new Date(checkInDate.toISOString().split('T')[0]),
          lte: new Date(checkOutDate.toISOString().split('T')[0]),
        },
      },
      orderBy: { dayNumber: 'asc' },
    })

    return days
  }

  /**
   * 특정 날짜가 체크인, 체크아웃, 중간 숙박인지 판별
   */
  private getItemTypeForDay(
    dayDate: Date,
    checkIn: Date,
    checkOut: Date
  ): AccommodationItemType {
    const day = new Date(dayDate).toISOString().split('T')[0]
    const checkInDay = new Date(checkIn).toISOString().split('T')[0]
    const checkOutDay = new Date(checkOut).toISOString().split('T')[0]

    if (day === checkInDay) {
      return 'accommodation_checkin'
    }
    if (day === checkOutDay) {
      return 'accommodation_checkout'
    }
    return 'accommodation_stay'
  }

  /**
   * 숙소 아이템의 order 값 계산
   * - 체크인: 해당 날짜의 마지막 (가장 높은 order + 1)
   * - 체크아웃: 해당 날짜의 첫번째 (order = 0, 기존 아이템들은 +1)
   * - 중간 숙박: 해당 날짜의 마지막
   */
  private async calculateOrder(
    dayId: string,
    itemType: AccommodationItemType
  ): Promise<{ order: number; needsReorder: boolean }> {
    const maxOrderItem = await this.prisma.itineraryItem.findFirst({
      where: { dayId },
      orderBy: { order: 'desc' },
      select: { order: true },
    })

    const maxOrder = maxOrderItem?.order ?? -1

    if (itemType === 'accommodation_checkout') {
      // 체크아웃은 첫번째 위치
      return { order: 0, needsReorder: true }
    }

    // 체크인과 중간 숙박은 마지막 위치
    return { order: maxOrder + 1, needsReorder: false }
  }

  /**
   * 숙소 생성 시 일정 아이템 자동 생성
   */
  async createItemsForAccommodation(accommodation: Accommodation): Promise<SyncResult> {
    const days = await this.findDaysForAccommodation(
      accommodation.itineraryId,
      accommodation.checkIn,
      accommodation.checkOut
    )

    let created = 0

    for (const day of days) {
      const itemType = this.getItemTypeForDay(
        day.date,
        accommodation.checkIn,
        accommodation.checkOut
      )

      const { order, needsReorder } = await this.calculateOrder(day.id, itemType)

      // 체크아웃인 경우 기존 아이템들의 order를 +1
      if (needsReorder) {
        await this.prisma.itineraryItem.updateMany({
          where: { dayId: day.id },
          data: { order: { increment: 1 } },
        })
      }

      // 숙소 아이템 생성
      await this.prisma.itineraryItem.create({
        data: {
          dayId: day.id,
          accommodationId: accommodation.id,
          placeId: null,
          itemType,
          order,
          startTime: itemType === 'accommodation_checkin' ? '15:00' :
                     itemType === 'accommodation_checkout' ? '11:00' : null,
          note: null,
        },
      })

      created++
    }

    return { created, updated: 0, deleted: 0 }
  }

  /**
   * 숙소 수정 시 일정 아이템 동기화
   * - 날짜 변경 시 기존 아이템 삭제 후 새로 생성
   */
  async syncItemsForAccommodation(
    accommodation: Accommodation,
    previousCheckIn?: Date,
    previousCheckOut?: Date
  ): Promise<SyncResult> {
    // 날짜가 변경되지 않았으면 업데이트 불필요
    const checkInChanged = previousCheckIn &&
      new Date(previousCheckIn).toISOString().split('T')[0] !==
      new Date(accommodation.checkIn).toISOString().split('T')[0]
    const checkOutChanged = previousCheckOut &&
      new Date(previousCheckOut).toISOString().split('T')[0] !==
      new Date(accommodation.checkOut).toISOString().split('T')[0]

    if (!checkInChanged && !checkOutChanged) {
      return { created: 0, updated: 0, deleted: 0 }
    }

    // 기존 아이템 모두 삭제
    const deleteResult = await this.prisma.itineraryItem.deleteMany({
      where: { accommodationId: accommodation.id },
    })

    // 새로운 아이템 생성
    const createResult = await this.createItemsForAccommodation(accommodation)

    return {
      created: createResult.created,
      updated: 0,
      deleted: deleteResult.count,
    }
  }

  /**
   * 숙소 삭제 시 관련 일정 아이템 삭제
   * (Prisma onDelete: Cascade로 자동 처리되지만, 명시적으로 호출할 수도 있음)
   */
  async deleteItemsForAccommodation(accommodationId: string): Promise<SyncResult> {
    const deleteResult = await this.prisma.itineraryItem.deleteMany({
      where: { accommodationId },
    })

    return { created: 0, updated: 0, deleted: deleteResult.count }
  }
}

// Factory function (PrismaClient 또는 트랜잭션 컨텍스트 모두 지원)
export function createAccommodationItinerarySyncService(
  prisma: PrismaClient | PrismaTransactionClient
): AccommodationItinerarySyncService {
  return new AccommodationItinerarySyncService(prisma)
}
