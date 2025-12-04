import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { LogIn } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { env } from '@/config/env'
import { useAuthStore } from '@/features/auth/store/auth-store'

export function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const status = useAuthStore((state) => state.status)
  const error = useAuthStore((state) => state.error)
  const token = useAuthStore((state) => state.token)
  const login = useAuthStore((state) => state.login)

  const [email, setEmail] = useState(env.serviceAccountEmail)
  const [password, setPassword] = useState(env.serviceAccountPassword)

  const from = searchParams.get('from') ?? '/'

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      try {
        await login(email, password)
        navigate(from, { replace: true })
      } catch (submitError) {
        console.error('Login failed', submitError)
      }
    },
    [email, password, login, navigate, from],
  )

  useEffect(() => {
    if (token) {
      navigate(from, { replace: true })
    }
  }, [token, navigate, from])

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      <div className="relative hidden flex-col border-r border-border/40 bg-muted/30 p-10 text-foreground lg:flex">
        <div className="flex items-center text-lg font-semibold">
          <LogIn className="mr-2 h-6 w-6 text-primary" />
          Carbn
        </div>
        <div className="mt-12 flex flex-1 items-center justify-center">
          <div className="w-full max-w-md rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-primary/20 via-primary/5 to-background/80 p-10 shadow-2xl shadow-primary/20 backdrop-blur">
            <div className="rounded-[2.25rem] border border-white/20 bg-background/80 p-6 shadow-inner shadow-primary/10">
              <div className="mx-auto flex h-full max-w-sm items-center justify-center rounded-[1.75rem] bg-muted/60 p-6">
                <img
                  src="/EV.png"
                  alt="Electric vehicle fleet illustration"
                  className="h-56 w-auto object-contain drop-shadow-2xl"
                />
              </div>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Carbn. Internal preview.</p>
      </div>

      <div className="flex flex-col justify-center px-6 py-12 lg:px-16">
        <div className="mx-auto w-full max-w-md space-y-8">
          <div className="flex items-center justify-center text-lg font-semibold text-foreground lg:hidden">
            <LogIn className="mr-2 h-6 w-6 text-primary" />
            Carbn
          </div>
          <div className="space-y-2 text-center lg:text-left">
            <p className="text-sm font-semibold uppercase tracking-[0.4em] text-muted-foreground">Sign in</p>
            <h1 className="text-3xl font-bold">Welcome back</h1>
          </div>

          <Card className="border border-border/60 shadow-xl shadow-primary/10">
            <CardContent className="space-y-6 p-6">
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2 text-left">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
                <div className="space-y-2 text-left">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button className="h-11 w-full text-base font-semibold" type="submit" disabled={status === 'authenticating'}>
                  {status === 'authenticating' ? 'Signing in…' : 'Continue'}
                </Button>
              </form>
              <p className="text-center text-xs text-muted-foreground">
                By continuing you acknowledge this is a private sandbox environment.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
