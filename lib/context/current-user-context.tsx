'use client'

import React, { createContext, useContext } from 'react'
import type { Profile } from '@/types/database'

interface CurrentUserContextType {
  user: Profile
  isOrgAdmin: boolean
  isProjectLeader: boolean
}

const CurrentUserContext = createContext<CurrentUserContextType | undefined>(
  undefined
)

interface CurrentUserProviderProps {
  children: React.ReactNode
  user: Profile
  isOrgAdmin: boolean
  isProjectLeader: boolean
}

export function CurrentUserProvider({
  children,
  user,
  isOrgAdmin,
  isProjectLeader,
}: CurrentUserProviderProps) {
  return (
    <CurrentUserContext.Provider value={{ user, isOrgAdmin, isProjectLeader }}>
      {children}
    </CurrentUserContext.Provider>
  )
}

export function useCurrentUser() {
  const context = useContext(CurrentUserContext)
  if (context === undefined) {
    throw new Error('useCurrentUser must be used within CurrentUserProvider')
  }
  return context
}
