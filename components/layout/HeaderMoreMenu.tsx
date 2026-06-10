'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import type { MarketingNavItem } from '@/lib/marketing-nav'

type HeaderMoreMenuProps = {
  items: MarketingNavItem[]
  isActive: (href: string) => boolean
}

export function HeaderMoreMenu({ items, isActive }: HeaderMoreMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const anyActive = items.some((item) => isActive(item.href))

  useEffect(() => {
    if (!open) return

    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  if (items.length === 0) return null

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className={`ec-marketing-header__link ec-marketing-header__more ${anyActive ? 'ec-marketing-header__link--active' : ''}`}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        More
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      {open && (
        <div
          className="ec-header-more-menu absolute left-0 top-[calc(100%+0.35rem)] z-50 min-w-[11rem] py-1.5"
          role="menu"
        >
          {items.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                className={`ec-header-more-menu__item ${active ? 'ec-header-more-menu__item--active' : ''}`}
                aria-current={active ? 'page' : undefined}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
