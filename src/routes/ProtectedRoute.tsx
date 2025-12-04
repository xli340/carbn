import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuthStore } from '@/features/auth/store/auth-store'

export function ProtectedRoute() {
  const token = useAuthStore((state) => state.token)
  const status = useAuthStore((state) => state.status)
  const location = useLocation()

  if (status === 'authenticating') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Checking credentials…
      </div>
    )
  }

  if (!token) {
    const redirectTo = `${location.pathname}${location.search}`
    return <Navigate to={`/login?from=${encodeURIComponent(redirectTo)}`} replace />
  }

  return <Outlet />
}
