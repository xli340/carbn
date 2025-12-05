import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { loginWithCredentials } from '../api/login'

const AUTH_STORAGE_KEY = 'carbn-auth'
const authStorage = createJSONStorage(() =>
  typeof window !== 'undefined'
    ? localStorage
    : ({
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
        clear: () => {},
        key: () => null,
        length: 0,
      } as Storage),
)

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

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: undefined,
      user: undefined,
      status: 'idle',
      error: undefined,
      async login(email: string, password: string) {
        set({ status: 'authenticating', error: undefined })

        try {
          const response = await loginWithCredentials({ email, password })
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
        set({ token: undefined, user: undefined, status: 'idle', error: undefined })
      },
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: authStorage,
      partialize: (state) => ({ token: state.token, user: state.user, status: state.status }),
    },
  ),
)
