'use client'

import React, { createContext, useContext } from 'react'
import type { Organization } from '@/types/database'

interface OrgContextType {
  org: Organization
  userRole: 'admin' | 'member'
}

const OrgContext = createContext<OrgContextType | undefined>(undefined)

interface OrgProviderProps {
  children: React.ReactNode
  org: Organization
  userRole: 'admin' | 'member'
}

export function OrgProvider({ children, org, userRole }: OrgProviderProps) {
  return (
    <OrgContext.Provider value={{ org, userRole }}>
      {children}
    </OrgContext.Provider>
  )
}

export function useOrg() {
  const context = useContext(OrgContext)
  if (context === undefined) {
    throw new Error('useOrg must be used within OrgProvider')
  }
  return context
}
