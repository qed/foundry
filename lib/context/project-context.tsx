'use client'

import React, { createContext, useContext } from 'react'
import type { Project } from '@/types/database'

interface ProjectContextType {
  project: Project
  userRole: 'leader' | 'developer'
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined)

interface ProjectProviderProps {
  children: React.ReactNode
  project: Project
  userRole: 'leader' | 'developer'
}

export function ProjectProvider({
  children,
  project,
  userRole,
}: ProjectProviderProps) {
  return (
    <ProjectContext.Provider value={{ project, userRole }}>
      {children}
    </ProjectContext.Provider>
  )
}

export function useProject() {
  const context = useContext(ProjectContext)
  if (context === undefined) {
    throw new Error('useProject must be used within ProjectProvider')
  }
  return context
}
