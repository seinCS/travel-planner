'use client'

import { useEffect, useState } from 'react'
import { ProjectCard } from '@/components/project/ProjectCard'
import { ProjectForm } from '@/components/project/ProjectForm'
import { toast } from 'sonner'

interface Project {
  id: string
  name: string
  destination: string
  country: string | null
  createdAt: string
  updatedAt: string
  _count: {
    places: number
    images: number
  }
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects')
      if (res.ok) {
        const data = await res.json()
        setProjects(data)
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error)
      toast.error('프로젝트 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  const handleCreateProject = async (data: {
    name: string
    destination: string
    country?: string
  }) => {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (res.ok) {
        toast.success('프로젝트가 생성되었습니다.')
        fetchProjects()
      } else {
        throw new Error('Failed to create project')
      }
    } catch (error) {
      console.error('Failed to create project:', error)
      toast.error('프로젝트 생성에 실패했습니다.')
    }
  }

  const handleDeleteProject = async (id: string) => {
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        toast.success('프로젝트가 삭제되었습니다.')
        setProjects(projects.filter((p) => p.id !== id))
      } else {
        throw new Error('Failed to delete project')
      }
    } catch (error) {
      console.error('Failed to delete project:', error)
      toast.error('프로젝트 삭제에 실패했습니다.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="glass-card px-6 py-4 animate-pulse">
          <div className="text-muted-foreground">로딩 중...</div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">내 여행 프로젝트</h1>
          <p className="text-muted-foreground">
            SNS 스크린샷을 업로드하여 여행 계획을 세워보세요.
          </p>
        </div>
        <ProjectForm onSubmit={handleCreateProject} />
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-20 glass-card">
          <div className="text-4xl mb-4">🗺️</div>
          <h2 className="text-lg font-semibold mb-2 text-gray-800">아직 프로젝트가 없습니다</h2>
          <p className="text-muted-foreground mb-4">
            첫 번째 여행 프로젝트를 만들어보세요!
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              id={project.id}
              name={project.name}
              destination={project.destination}
              country={project.country}
              placesCount={project._count.places}
              imagesCount={project._count.images}
              updatedAt={project.updatedAt}
              onDelete={handleDeleteProject}
            />
          ))}
        </div>
      )}
    </div>
  )
}
