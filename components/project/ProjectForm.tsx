'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface ProjectFormProps {
  onSubmit: (data: { name: string; destination: string; country?: string }) => Promise<void>
}

export function ProjectForm({ onSubmit }: ProjectFormProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [destination, setDestination] = useState('')
  const [country, setCountry] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !destination.trim()) return

    setLoading(true)
    try {
      await onSubmit({
        name: name.trim(),
        destination: destination.trim(),
        country: country.trim() || undefined,
      })
      setOpen(false)
      setName('')
      setDestination('')
      setCountry('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg">+ 새 프로젝트</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>새 여행 프로젝트</DialogTitle>
          <DialogDescription>
            여행할 도시와 프로젝트 이름을 입력하세요.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">프로젝트 이름</Label>
              <Input
                id="name"
                placeholder="예: 도쿄 여행 2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="destination">여행지 (도시)</Label>
              <Input
                id="destination"
                placeholder="예: 도쿄"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="country">국가 (선택)</Label>
              <Input
                id="country"
                placeholder="예: 일본"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button type="submit" disabled={loading || !name.trim() || !destination.trim()}>
              {loading ? '생성 중...' : '생성'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
