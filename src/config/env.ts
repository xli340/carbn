const defaultApiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'https://api-dev.carbn.nz'
const defaultWsBaseUrl =
  import.meta.env.VITE_WS_BASE_URL ?? defaultApiBaseUrl.replace(/^http/, 'ws')

export const env = {
  apiBaseUrl: defaultApiBaseUrl,
  wsBaseUrl: defaultWsBaseUrl,
  googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '',
  googleMapId: import.meta.env.VITE_GOOGLE_MAP_ID ?? '',
  serviceAccountEmail: import.meta.env.VITE_API_EMAIL ?? 'xinya@bfsnz.co.nz',
  serviceAccountPassword: import.meta.env.VITE_API_PASSWORD ?? 'NewPass@1979',
  enableReactQueryDevtools: import.meta.env.VITE_ENABLE_REACT_QUERY_DEVTOOLS === 'true',
}
