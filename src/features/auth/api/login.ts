import { env } from '@/config/env'

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  success: boolean
  data: {
    token: string
    user: {
      id: string
      email: string
    }
  }
}

export async function loginWithCredentials(request: LoginRequest) {
  const response = await fetch(`${env.apiBaseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const fallbackMessage = 'Unable to authenticate with the platform'
    let message: string | undefined

    try {
      message = await response.text()
    } catch (error) {
      console.warn('[auth] Failed to read login error response', error)
    }

    if (response.status === 400 || response.status === 401) {
      message = 'Incorrect email or password'
    }

    throw new Error(message || fallbackMessage)
  }

  return (await response.json()) as LoginResponse
}
