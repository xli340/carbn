import { Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { LoginPage } from '@/pages/LoginPage'
import { VehicleMapPage } from '@/pages/VehicleMapPage'
import { AppLayout } from '@/routes/AppLayout'
import { ProtectedRoute } from '@/routes/ProtectedRoute'

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="text-sm text-muted-foreground">Preparing application…</div>}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index element={<VehicleMapPage />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
