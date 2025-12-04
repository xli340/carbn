import * as Popover from '@radix-ui/react-popover'
import type { ComponentType, PropsWithChildren } from 'react'
import { Check, LogOut, MapPinned, Monitor, Moon, Sun } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useTheme } from '@/hooks/useTheme'
import { cn } from '@/lib/utils'

interface AppShellProps extends PropsWithChildren {
  userEmail?: string
  onSignOut?: () => void
}

export function AppShell({ children, userEmail, onSignOut }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="container flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/60 bg-card text-primary">
              <MapPinned className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-muted-foreground">
                Carbn Fleet
              </p>
              <h1 className="text-lg font-semibold text-foreground">Vehicle Insights Playground</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeMenu />
            <UserMenu userEmail={userEmail} onSignOut={onSignOut} />
          </div>
        </div>
      </header>
      <main className="container flex-1 pb-10 pt-6">{children}</main>
    </div>
  )
}

interface UserMenuProps {
  userEmail?: string
  onSignOut?: () => void
}

function UserMenu({ userEmail, onSignOut }: UserMenuProps) {
  const initials = getInitials(userEmail)

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-card text-sm font-semibold text-foreground shadow-sm transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary/40"
          aria-label="Open account menu"
        >
          {initials}
        </button>
      </Popover.Trigger>
      <Popover.Content
        align="end"
        sideOffset={12}
        className="z-50 w-64 rounded-2xl border border-border/70 bg-background/95 p-4 text-sm shadow-xl backdrop-blur focus:outline-none"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Signed in as</p>
            <p className="text-base font-semibold text-foreground">{userEmail ?? 'Guest user'}</p>
          </div>
          {onSignOut && (
            <Button
              size="sm"
              variant="outline"
              className="w-full justify-start text-sm font-semibold"
              onClick={onSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          )}
        </div>
        <Popover.Arrow className="fill-border" />
      </Popover.Content>
    </Popover.Root>
  )
}

function getInitials(email?: string) {
  if (!email) {
    return 'CF'
  }

  const local = email.split('@')[0]
  const segments = local.split(/[.\s_-]/).filter(Boolean)
  if (!segments.length) {
    return local.slice(0, 2).toUpperCase()
  }
  return segments
    .map((segment) => segment[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function ThemeMenu() {
  const { theme, setTheme } = useTheme()

  const themeOptions: { label: string; value: 'light' | 'dark' | 'system'; icon: ComponentType<{ className?: string }> }[] =
    [
      { label: 'Light', value: 'light', icon: Sun },
      { label: 'Dark', value: 'dark', icon: Moon },
      { label: 'System', value: 'system', icon: Monitor },
    ]

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full border border-border/60">
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </Popover.Trigger>
      <Popover.Content
        align="end"
        sideOffset={12}
        className="z-50 w-48 rounded-2xl border border-border/70 bg-background/95 p-3 text-sm shadow-xl backdrop-blur focus:outline-none"
      >
        <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Theme</p>
        <div className="mt-2 space-y-1">
          {themeOptions.map(({ label, value, icon: Icon }) => (
            <button
              key={value}
              type="button"
              className={cn(
                'flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-muted/60',
                theme === value && 'bg-muted/60 text-foreground',
              )}
              onClick={() => setTheme(value)}
            >
              <span className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                {label}
              </span>
              <Check className={cn('h-4 w-4 text-primary', theme !== value && 'opacity-0')} />
            </button>
          ))}
        </div>
        <Popover.Arrow className="fill-border" />
      </Popover.Content>
    </Popover.Root>
  )
}
