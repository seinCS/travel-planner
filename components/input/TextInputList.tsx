'use client'

import { Button } from '@/components/ui/button'
import { TextInput } from '@/types'

interface TextInputListProps {
  textInputs: TextInput[]
  onDelete: (id: string) => void
  onRetry: (ids: string[]) => void
  disabled?: boolean
}

const statusConfig = {
  pending: {
    label: '대기',
    color: 'bg-yellow-100 text-yellow-800',
    icon: '⏳',
  },
  processed: {
    label: '완료',
    color: 'bg-green-100 text-green-800',
    icon: '✅',
  },
  failed: {
    label: '실패',
    color: 'bg-red-100 text-red-800',
    icon: '❌',
  },
}

export function TextInputList({
  textInputs,
  onDelete,
  onRetry,
  disabled,
}: TextInputListProps) {
  const failedInputs = textInputs.filter((t) => t.status === 'failed')

  const handleDelete = async (id: string) => {
    if (confirm('이 입력을 삭제하시겠습니까?')) {
      onDelete(id)
    }
  }

  const handleRetryAll = () => {
    const failedIds = failedInputs.map((t) => t.id)
    onRetry(failedIds)
  }

  if (textInputs.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">텍스트/URL 입력 ({textInputs.length})</h3>
        {failedInputs.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleRetryAll}
            disabled={disabled}
          >
            실패 재시도 ({failedInputs.length})
          </Button>
        )}
      </div>

      <div className="space-y-2 max-h-[200px] overflow-y-auto">
        {textInputs.map((input) => {
          const status = statusConfig[input.status]
          const isUrl = input.type === 'url'

          return (
            <div
              key={input.id}
              className="p-2 border rounded-lg text-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs ${status.color}`}>
                      {status.icon} {status.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {isUrl ? '🔗 URL' : '📝 텍스트'}
                    </span>
                  </div>
                  <p className="truncate text-xs">
                    {isUrl ? (
                      <a
                        href={input.sourceUrl || input.content}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {input.content}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">
                        {input.content.substring(0, 100)}
                        {input.content.length > 100 && '...'}
                      </span>
                    )}
                  </p>
                  {input.status === 'failed' && input.errorMessage && (
                    <p className="text-xs text-red-500 mt-1">
                      {input.errorMessage}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-500 hover:text-red-700 h-6 px-2 flex-shrink-0"
                  onClick={() => handleDelete(input.id)}
                  disabled={disabled}
                >
                  삭제
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
