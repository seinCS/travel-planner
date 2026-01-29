'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, Plane } from '@/components/icons'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  type Airport,
  searchAirports,
  getAirportByCode,
  formatAirportDisplay,
  countryFlags,
  getRecentAirports,
  addRecentAirport,
} from '@/lib/airports'

interface AirportComboboxProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  id?: string
  disabled?: boolean
  className?: string
}

export function AirportCombobox({
  value,
  onChange,
  placeholder = '공항 선택',
  id,
  disabled = false,
  className,
}: AirportComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [recentAirports, setRecentAirports] = React.useState<Airport[]>([])

  // 최근 공항 목록 로드
  React.useEffect(() => {
    setRecentAirports(getRecentAirports())
  }, [])

  // 검색 결과
  const searchResults = React.useMemo(() => {
    if (searchQuery.length > 0) {
      return searchAirports(searchQuery)
    }
    return []
  }, [searchQuery])

  // 현재 선택된 공항
  const selectedAirport = React.useMemo(() => {
    // value에서 공항 코드 추출 (예: "서울 (ICN)" -> "ICN", "ICN" -> "ICN")
    const codeMatch = value.match(/\(([A-Z]{3})\)/)
    if (codeMatch) {
      return getAirportByCode(codeMatch[1])
    }
    // 직접 코드가 입력된 경우
    if (value.length === 3) {
      return getAirportByCode(value)
    }
    return undefined
  }, [value])

  // 공항 선택 핸들러
  const handleSelect = React.useCallback((airport: Airport) => {
    const displayValue = formatAirportDisplay(airport)
    onChange(displayValue)
    addRecentAirport(airport.code)
    setRecentAirports(getRecentAirports())
    setSearchQuery('')
    setOpen(false)
  }, [onChange])

  // 표시할 값
  const displayValue = selectedAirport
    ? formatAirportDisplay(selectedAirport)
    : value

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal',
            !displayValue && 'text-muted-foreground',
            className
          )}
        >
          <span className="flex items-center gap-2 truncate">
            {selectedAirport && (
              <span className="text-base">
                {countryFlags[selectedAirport.countryCode] || ''}
              </span>
            )}
            {displayValue || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="공항명, 도시, 코드 검색..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>

            {/* 검색 결과 */}
            {searchResults.length > 0 && (
              <CommandGroup heading="검색 결과">
                {searchResults.map((airport) => (
                  <CommandItem
                    key={airport.code}
                    value={airport.code}
                    onSelect={() => handleSelect(airport)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        selectedAirport?.code === airport.code
                          ? 'opacity-100'
                          : 'opacity-0'
                      )}
                    />
                    <span className="mr-2 text-base">
                      {countryFlags[airport.countryCode] || ''}
                    </span>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="font-medium truncate">
                        {airport.city} ({airport.code})
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {airport.name} - {airport.country}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* 검색어가 없을 때 최근 공항 표시 */}
            {searchQuery.length === 0 && recentAirports.length > 0 && (
              <CommandGroup heading="최근 선택">
                {recentAirports.map((airport) => (
                  <CommandItem
                    key={airport.code}
                    value={airport.code}
                    onSelect={() => handleSelect(airport)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        selectedAirport?.code === airport.code
                          ? 'opacity-100'
                          : 'opacity-0'
                      )}
                    />
                    <span className="mr-2 text-base">
                      {countryFlags[airport.countryCode] || ''}
                    </span>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="font-medium truncate">
                        {airport.city} ({airport.code})
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {airport.name}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* 검색어가 없고 최근 공항도 없을 때 안내 메시지 */}
            {searchQuery.length === 0 && recentAirports.length === 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                <Plane className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p>공항명, 도시, 코드를 입력하세요</p>
                <p className="text-xs mt-1">예: 인천, 도쿄, ICN, NRT</p>
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
