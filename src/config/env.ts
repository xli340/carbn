function getEnvVar(key: string): string {
  const value = import.meta.env[key]
  if (value === undefined || value === '') {
    throw new Error(`Environment variable ${key} is missing`)
  }
  return value
}

export const env = {
  apiBaseUrl: getEnvVar('VITE_API_BASE_URL'),
  wsBaseUrl: getEnvVar('VITE_WS_BASE_URL'),
  googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  googleMapId: import.meta.env.VITE_GOOGLE_MAP_ID || '',
  serviceAccountEmail: import.meta.env.VITE_API_EMAIL || '',
  serviceAccountPassword: import.meta.env.VITE_API_PASSWORD || '',
  enableReactQueryDevtools: import.meta.env.VITE_ENABLE_REACT_QUERY_DEVTOOLS === 'true',
}