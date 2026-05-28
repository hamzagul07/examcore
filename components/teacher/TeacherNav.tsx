'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  BookOpen,
  ClipboardCheck,
  LogOut,
  Settings,
} from 'lucide-react'

const NAV = [
  { href: '/teacher/dashboard', label: 'Classrooms', icon: LayoutDashboard },
  { href: '/teacher/reviews', label: 'Reviews', icon: ClipboardCheck },
]

export function TeacherNav() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-[#12141C]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-8">
          <Link href="/teacher/dashboard" className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-emerald-400" />
            <span className="font-bold text-white">
              Examcore <span className="text-slate-500 font-normal">Teacher</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active =
                pathname === href || pathname.startsWith(href + '/')
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                    active
                      ? 'bg-white/10 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              )
            })}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/account"
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
            aria-label="Account settings"
          >
            <Settings className="h-4 w-4" />
          </Link>
          <Link
            href="/auth/signout"
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </header>
  )
}
