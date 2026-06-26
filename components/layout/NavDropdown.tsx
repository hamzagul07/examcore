'use client'

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'

export type NavDropdownItem = { href: string; label: string; sublabel?: string }

const MENU_MIN_WIDTH = 210
const VIEWPORT_PAD = 12
const MENU_GAP = 8
const ITEM_HEIGHT = 44
const MENU_CHROME = 14

function estimateMenuHeight(itemCount: number): number {
  return itemCount * ITEM_HEIGHT + MENU_CHROME
}

function computeMenuPosition(
  trigger: DOMRect,
  menuWidth: number,
  menuHeight: number
): { top: number; left: number; placement: 'below' | 'above' } {
  const vw = window.innerWidth
  const vh = window.innerHeight

  let left = trigger.left
  let top = trigger.bottom + MENU_GAP
  let placement: 'below' | 'above' = 'below'

  if (left + menuWidth > vw - VIEWPORT_PAD) {
    left = trigger.right - menuWidth
  }
  if (left < VIEWPORT_PAD) {
    left = VIEWPORT_PAD
  }

  if (top + menuHeight > vh - VIEWPORT_PAD) {
    top = trigger.top - MENU_GAP - menuHeight
    placement = 'above'
  }
  if (top < VIEWPORT_PAD) {
    top = trigger.bottom + MENU_GAP
    placement = 'below'
  }

  return { top, left, placement }
}

/**
 * Reusable header dropdown. Menu is portaled to `document.body` with fixed
 * coordinates so it never collides with wrapped header CTAs or page content.
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
  const [mounted, setMounted] = useState(false)
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({})
  const [placement, setPlacement] = useState<'below' | 'above'>('below')
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const anyActive = items.some((i) => isActive(i.href))

  useEffect(() => {
    setMounted(true)
  }, [])

  const reposition = () => {
    const trigger = triggerRef.current
    if (!trigger) return

    const triggerRect = trigger.getBoundingClientRect()
    const measuredHeight = menuRef.current?.offsetHeight
    const measuredWidth = menuRef.current?.offsetWidth
    const menuHeight = measuredHeight ?? estimateMenuHeight(items.length)
    const menuWidth = measuredWidth ?? MENU_MIN_WIDTH
    const pos = computeMenuPosition(triggerRect, menuWidth, menuHeight)

    setPlacement(pos.placement)
    setMenuStyle({
      position: 'fixed',
      top: pos.top,
      left: pos.left,
      minWidth: MENU_MIN_WIDTH,
      zIndex: 222,
    })
  }

  useLayoutEffect(() => {
    if (!open) return
    reposition()
  }, [open, items.length])

  useEffect(() => {
    if (!open) return

    document.body.classList.add('ec-nav-dropdown-open')

    function onDown(e: MouseEvent) {
      const target = e.target as Node
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    function onScroll() {
      setOpen(false)
    }
    function onResize() {
      reposition()
    }

    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)

    return () => {
      document.body.classList.remove('ec-nav-dropdown-open')
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [open, items.length])

  if (!items.length) return null

  const menu = open ? (
    <div
      ref={menuRef}
      className={`nav-dd-menu nav-dd-menu--portal nav-dd-menu--${placement}`}
      style={menuStyle}
      role="menu"
    >
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
  ) : null

  return (
    <div ref={rootRef} className="nav-dd">
      <button
        ref={triggerRef}
        type="button"
        className={`${triggerClass} nav-dd-trigger ${anyActive ? activeClass : ''}`.trim()}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        {lowercase ? label.toLowerCase() : label}
        <ChevronDown className={`nav-dd-caret${open ? ' nav-dd-caret--open' : ''}`} aria-hidden />
      </button>
      {mounted && menu ? createPortal(menu, document.body) : null}
    </div>
  )
}
