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
    const message = await response.text()
    throw new Error(message || 'Unable to authenticate with the platform')
  }

  return (await response.json()) as LoginResponse
}
