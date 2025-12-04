import { env } from '@/config/env'

export interface FleetSocketOptions {
  path?: string
  token: string
}

export function createAuthorizedWebSocket({
  path = '/api/v1/fleet/live',
  token,
}: FleetSocketOptions) {
  const url = buildWsUrl(path, token)
  return new WebSocket(url)
}

export function buildWsUrl(path: string, token?: string) {
  const url = new URL(path, env.wsBaseUrl)

  if (token) {
    url.searchParams.set('token', token)
  }

  return url.toString()
}
