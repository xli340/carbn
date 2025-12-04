import { Outlet, useNavigate } from 'react-router-dom'

import { AppShell } from '@/components/layout/AppShell'
import { useAuthStore } from '@/features/auth/store/auth-store'

export function AppLayout() {
  const user = useAuthStore((state) => state.user)
  const signOut = useAuthStore((state) => state.signOut)
  const navigate = useNavigate()

  const handleLogout = () => {
    signOut()
    navigate('/login', { replace: true })
  }

  return (
    <AppShell userEmail={user?.email} onSignOut={handleLogout}>
      <Outlet />
    </AppShell>
  )
}
