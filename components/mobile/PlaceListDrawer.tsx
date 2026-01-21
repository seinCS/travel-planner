'use client'

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

interface PlaceListDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  children: React.ReactNode
}

export function PlaceListDrawer({
  open,
  onOpenChange,
  title = '📍 장소 목록',
  children,
}: PlaceListDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[70vh] rounded-t-xl flex flex-col"
      >
        <SheetHeader className="flex-shrink-0 pb-2 border-b">
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto py-4 pb-safe">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  )
}
