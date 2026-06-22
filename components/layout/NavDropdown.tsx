'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'

export type NavDropdownItem = { href: string; label: string; sublabel?: string }

/**
 * Reusable header dropdown. The trigger inherits the host nav's link class
 * (`triggerClass`) so it matches whichever header it lives in (ec-nav or
 * margin-notes nav); the menu + caret are styled via the shared `.nav-dd-*` CSS.
 */
export function NavDropdown({
  label,
  items,
  isActive,
  triggerClass = '',
  activeClass = '',
  lowercase = false,
}: {
  label: string
  items: NavDropdownItem[]
  isActive: (href: string) => boolean
  triggerClass?: string
  activeClass?: string
  lowercase?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const anyActive = items.some((i) => isActive(i.href))

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!items.length) return null

  return (
    <div ref={ref} className="nav-dd">
      <button
        type="button"
        className={`${triggerClass} nav-dd-trigger ${anyActive ? activeClass : ''}`.trim()}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        {lowercase ? label.toLowerCase() : label}
        <ChevronDown className={`nav-dd-caret${open ? ' nav-dd-caret--open' : ''}`} aria-hidden />
      </button>
      {open ? (
        <div className="nav-dd-menu" role="menu">
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              role="menuitem"
              className={`nav-dd-item${isActive(it.href) ? ' nav-dd-item--active' : ''}`}
              aria-current={isActive(it.href) ? 'page' : undefined}
              onClick={() => setOpen(false)}
            >
              <span className="nav-dd-item-label">{it.label}</span>
              {it.sublabel ? <span className="nav-dd-item-sub">{it.sublabel}</span> : null}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  )
}
