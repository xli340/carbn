import { env } from '@/config/env'
import { useAuthStore } from '@/features/auth/store/auth-store'

export interface ApiRequestOptions<TBody = unknown> {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: TBody
  headers?: HeadersInit
  token?: string
  signal?: AbortSignal
}

export async function apiRequest<TResponse, TBody = unknown>(
  path: string,
  { method = 'GET', body, headers, token, signal }: ApiRequestOptions<TBody> = {},
): Promise<TResponse> {
  const requestUrl = buildUrl(path)
  const requestHeaders = new Headers(headers ?? {})

  if (body && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json')
  }

  const authToken = token ?? useAuthStore.getState().token

  if (authToken && !requestHeaders.has('Authorization')) {
    requestHeaders.set('Authorization', `Bearer ${authToken}`)
  }

  const response = await fetch(requestUrl, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  })

  if (!response.ok) {
    const message = await safeReadText(response)
    throw new Error(message || `API request failed with status ${response.status}`)
  }

  return response.json() as Promise<TResponse>
}

function buildUrl(path: string) {
  if (path.startsWith('http')) {
    return path
  }

  const url = new URL(path, env.apiBaseUrl)
  return url.toString()
}

async function safeReadText(response: Response) {
  try {
    return await response.text()
  } catch {
    return undefined
  }
}
