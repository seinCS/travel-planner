'use client'

import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SuggestedQuestionsProps {
  onSelect?: (question: string) => void
}

const SUGGESTED_QUESTIONS = [
  '이 지역에서 꼭 가봐야 할 관광지를 추천해줘',
  '현지인이 추천하는 맛집이 있을까?',
  '가성비 좋은 카페를 알려줘',
  '쇼핑하기 좋은 곳은 어디야?',
]

export function SuggestedQuestions({ onSelect }: SuggestedQuestionsProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4">
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <Sparkles className="h-6 w-6 text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        여행 어시스턴트
      </h3>
      <p className="text-sm text-gray-500 mb-6 max-w-xs">
        여행 계획에 대해 궁금한 점을 물어보세요.
        맛집, 관광지, 쇼핑 등 다양한 정보를 알려드릴게요.
      </p>

      {/* Suggested Questions */}
      <div className="space-y-2 w-full max-w-xs">
        {SUGGESTED_QUESTIONS.map((question, index) => (
          <Button
            key={index}
            variant="outline"
            className="w-full justify-start text-left h-auto py-2 px-3 text-sm"
            onClick={() => onSelect?.(question)}
          >
            {question}
          </Button>
        ))}
      </div>
    </div>
  )
}
