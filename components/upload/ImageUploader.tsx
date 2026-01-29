'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { SUPPORTED_IMAGE_TYPES, MAX_IMAGE_SIZE, MAX_UPLOAD_COUNT } from '@/lib/constants'
import { imagesApi } from '@/infrastructure/api-client/images.api'
import { Screenshot } from '@/components/icons'

interface ImageUploaderProps {
  projectId: string
  onUploadComplete: (uploadedCount: number, failedCount: number) => void
  disabled?: boolean
}

// 이미지 압축 함수 (최대 1024px, 품질 0.8)
async function compressImage(file: File, maxSize = 1024, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img

      // 리사이징 계산
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = (height / width) * maxSize
          width = maxSize
        } else {
          width = (width / height) * maxSize
          height = maxSize
        }
      }

      // Canvas로 압축
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas context not available'))
        return
      }

      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to compress image'))
          }
        },
        'image/jpeg',
        quality
      )
    }

    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
}

export function ImageUploader({ projectId, onUploadComplete, disabled }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [statusText, setStatusText] = useState('')

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files).slice(0, MAX_UPLOAD_COUNT)

      // 파일 검증
      const validFiles = fileArray.filter((file) => {
        if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
          console.warn(`Invalid file type: ${file.name}`)
          return false
        }
        if (file.size > MAX_IMAGE_SIZE) {
          console.warn(`File too large: ${file.name}`)
          return false
        }
        return true
      })

      if (validFiles.length === 0) {
        onUploadComplete(0, fileArray.length)
        return
      }

      setUploading(true)
      setProgress(0)
      setStatusText('이미지 압축 중...')

      try {
        // 이미지 병렬 압축 (async-parallel 패턴)
        setStatusText(`이미지 압축 중... (${validFiles.length}개)`)
        setProgress(10)

        const compressionPromises = validFiles.map(async (file) => {
          try {
            const compressed = await compressImage(file)
            return { name: file.name, blob: compressed }
          } catch (error) {
            console.error('Compression failed for:', file.name, error)
            // 압축 실패 시 원본 사용
            return { name: file.name, blob: file }
          }
        })

        const compressedFiles = await Promise.all(compressionPromises)
        setProgress(30)

        setStatusText('서버에 업로드 중...')
        setProgress(40)

        // FormData 생성 - Blob을 File로 변환하여 type 보장
        const formData = new FormData()
        compressedFiles.forEach(({ name, blob }) => {
          // 파일 확장자를 jpg로 변경 (압축 후 JPEG 형식)
          const newName = name.replace(/\.[^.]+$/, '.jpg')
          // Blob을 File로 변환하여 type을 명시적으로 설정
          const file = new File([blob], newName, { type: 'image/jpeg' })
          formData.append('files', file)
        })

        const data = await imagesApi.upload(projectId, formData)

        setProgress(90)

        const uploadedCount = data.uploaded?.length || 0
        const failedCount = data.failed?.length || 0

        setProgress(100)
        setStatusText('완료!')

        // 약간의 딜레이 후 콜백 호출
        setTimeout(() => {
          onUploadComplete(uploadedCount, failedCount)
        }, 300)
      } catch (error) {
        console.error('Upload failed:', error)
        onUploadComplete(0, validFiles.length)
      } finally {
        // 상태 초기화에 약간의 딜레이
        setTimeout(() => {
          setUploading(false)
          setProgress(0)
          setStatusText('')
        }, 500)
      }
    },
    [projectId, onUploadComplete]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      if (!disabled && e.dataTransfer.files) {
        handleFiles(e.dataTransfer.files)
      }
    },
    [disabled, handleFiles]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFiles(e.target.files)
        // input 초기화 (같은 파일 다시 선택 가능하도록)
        e.target.value = ''
      }
    },
    [handleFiles]
  )

  return (
    <div
      className={`
        border-2 border-dashed rounded-lg p-6 text-center transition-colors
        ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400'}
      `}
      data-testid="image-upload-area"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {uploading ? (
        <div className="space-y-3">
          <div className="text-lg font-medium">{statusText || '업로드 중...'}</div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-500 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground">{progress}%</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center">
          <Screenshot className="w-16 h-16 mb-4 text-muted-foreground" />
          <p className="text-base font-medium mb-1">
            이미지를 드래그하거나 클릭하여 업로드
          </p>
          <p className="text-sm text-muted-foreground mb-3">
            JPG, PNG, WEBP (최대 {MAX_UPLOAD_COUNT}장) - 자동 압축됨
          </p>
          <input
            type="file"
            accept={SUPPORTED_IMAGE_TYPES.join(',')}
            multiple
            className="hidden"
            id="image-upload"
            onChange={handleFileSelect}
            disabled={disabled}
          />
          <label htmlFor="image-upload">
            <Button type="button" variant="outline" disabled={disabled} asChild>
              <span>파일 선택</span>
            </Button>
          </label>
        </div>
      )}
    </div>
  )
}
