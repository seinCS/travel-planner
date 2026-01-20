import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// DELETE /api/projects/[id]/text-inputs/[textInputId] - 텍스트 입력 삭제
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; textInputId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, textInputId } = await params

    // TextInput 조회 및 프로젝트 소유권 확인
    const textInput = await prisma.textInput.findFirst({
      where: { id: textInputId, projectId: id },
      include: {
        project: { select: { userId: true } },
      },
    })

    if (!textInput || textInput.project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Text input not found' }, { status: 404 })
    }

    // 삭제 (PlaceTextInput은 cascade로 삭제됨)
    await prisma.textInput.delete({
      where: { id: textInputId },
    })

    console.log(`[TextInput API] Deleted text input: ${textInputId}`)
    return NextResponse.json({ message: 'Deleted successfully' })
  } catch (error) {
    console.error('Error deleting text input:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
