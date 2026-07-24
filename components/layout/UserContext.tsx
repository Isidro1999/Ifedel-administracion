'use client'

import { createContext, useContext } from 'react'
import type { Session } from 'next-auth'

type User = Session['user'] | null

const UserContext = createContext<User>(null)

type UserProviderProps = {
  user: User
  children: React.ReactNode
}

export function UserProvider({ user, children }: UserProviderProps) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>
}

export function useCurrentUser() {
  return useContext(UserContext)
}

