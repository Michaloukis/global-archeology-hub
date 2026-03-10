import React, { createContext, useContext, useMemo } from 'react'
import { isDirector, isFieldArcheologist } from '../utils/roles'

const UserRoleContext = createContext(null)

export function UserRoleProvider({ profile, children }) {
  const profileRole =
    (isDirector(profile) && 'Director') ||
    (isFieldArcheologist(profile) && 'Field Archaeologist') ||
    ''

  const value = useMemo(() => {
    const role = profileRole || 'Field Archaeologist'
    return {
      role,
      isDirector: role === 'Director',
      isFieldArchaeologist: role === 'Field Archaeologist',
      profileRole,
    }
  }, [profileRole])

  return <UserRoleContext.Provider value={value}>{children}</UserRoleContext.Provider>
}

export function useUserRole() {
  const ctx = useContext(UserRoleContext)
  if (!ctx) throw new Error('useUserRole must be used within UserRoleProvider')
  return ctx
}

