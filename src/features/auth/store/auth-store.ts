import { create } from 'zustand'

import { loginWithCredentials } from '../api/login'

const AUTH_STORAGE_KEY = 'carbn-auth'

type PersistedAuth = {
  token: string
  user: {
    id: string
    email: string
  }
}

export type AuthStatus = 'idle' | 'authenticating' | 'authenticated' | 'error'

interface AuthState {
  token?: string
  user?: {
    id: string
    email: string
  }
  status: AuthStatus
  error?: string
  login: (email: string, password: string) => Promise<string | undefined>
  signOut: () => void
}

function readPersistedAuth(): PersistedAuth | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as PersistedAuth) : undefined
  } catch (error) {
    console.warn('[auth] Failed to read persisted auth state', error)
    return undefined
  }
}

function persistAuth(auth: PersistedAuth) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth))
}

function clearPersistedAuth() {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.removeItem(AUTH_STORAGE_KEY)
}

const storedAuth = readPersistedAuth()

export const useAuthStore = create<AuthState>((set) => ({
  token: storedAuth?.token,
  user: storedAuth?.user,
  status: storedAuth?.token ? 'authenticated' : 'idle',
  error: undefined,
  async login(email: string, password: string) {
    set({ status: 'authenticating', error: undefined })

    try {
      const response = await loginWithCredentials({ email, password })
      persistAuth({ token: response.data.token, user: response.data.user })

      set({
        token: response.data.token,
        user: response.data.user,
        status: 'authenticated',
        error: undefined,
      })
      return response.data.token
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to login'
      set({ status: 'error', error: message })
      throw error
    }
  },
  signOut() {
    clearPersistedAuth()
    set({ token: undefined, user: undefined, status: 'idle', error: undefined })
  },
}))
