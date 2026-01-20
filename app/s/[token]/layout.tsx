import { Metadata } from 'next'
import { prisma } from '@/lib/db'

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{ token: string }>
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>
}): Promise<Metadata> {
  const { token } = await params

  const project = await prisma.project.findUnique({
    where: { shareToken: token },
    select: {
      name: true,
      destination: true,
      country: true,
      shareEnabled: true,
    },
  })

  if (!project || !project.shareEnabled) {
    return {
      title: '공유 페이지를 찾을 수 없습니다',
      description: '요청하신 여행 계획 공유 페이지가 존재하지 않거나 비활성화되었습니다.',
    }
  }

  const locationText = project.country
    ? `${project.destination}, ${project.country}`
    : project.destination

  return {
    title: `${project.name} - Travel Planner`,
    description: `${locationText} 여행 계획을 확인해보세요.`,
    openGraph: {
      title: project.name,
      description: `${locationText} 여행 계획`,
      type: 'website',
    },
  }
}

export default async function ShareLayout({ children }: LayoutProps) {
  return <>{children}</>
}
