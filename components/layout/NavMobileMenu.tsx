'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import type { SiteNavItem } from '@/lib/site-nav'

type Props = {
  items: SiteNavItem[]
  pathname: string
  className?: string
  linkClassName?: string
  activeClassName?: string
  accordionClassName?: string
  onNavigate?: () => void
  extraLinks?: { href: string; label: string }[]
}

function hrefActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + '/')
}

export function NavMobileMenu({
  items,
  pathname,
  className = '',
  linkClassName = '',
  activeClassName = 'active',
  accordionClassName = 'nav-mobile-accordion',
  onNavigate,
  extraLinks = [],
}: Props) {
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <nav className={className} aria-label="Mobile">
      {items.map((item) => {
        if (item.children?.length) {
          const expanded = openId === item.id
          const anyChildActive = item.children.some((c) => hrefActive(pathname, c.href))
          return (
            <div key={item.id} className={accordionClassName}>
              <button
                type="button"
                className={`${linkClassName} nav-mobile-accordion-trigger${anyChildActive ? ` ${activeClassName}` : ''}`.trim()}
                aria-expanded={expanded}
                onClick={() => setOpenId((v) => (v === item.id ? null : item.id))}
              >
                <span>{item.label}</span>
                <ChevronDown
                  className={`nav-mobile-accordion-caret${expanded ? ' nav-mobile-accordion-caret--open' : ''}`}
                  aria-hidden
                />
              </button>
              {expanded ? (
                <div className="nav-mobile-accordion-panel" role="group" aria-label={item.label}>
                  {item.children.map((c) => (
                    <Link
                      key={c.href}
                      href={c.href}
                      className={`nav-mobile-accordion-item${hrefActive(pathname, c.href) ? ` ${activeClassName}` : ''}`}
                      onClick={onNavigate}
                    >
                      <span className="nav-mobile-accordion-item-label">{c.label}</span>
                      {c.sublabel ? (
                        <span className="nav-mobile-accordion-item-sub">{c.sublabel}</span>
                      ) : null}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          )
        }

        const active = item.isActive(pathname)
        return (
          <Link
            key={item.id}
            href={item.href}
            className={`${linkClassName}${active ? ` ${activeClassName}` : ''}`.trim()}
            aria-current={active ? 'page' : undefined}
            onClick={onNavigate}
          >
            {item.label}
          </Link>
        )
      })}
      {extraLinks.map((link) => (
        <Link
          key={link.href + link.label}
          href={link.href}
          className={linkClassName}
          onClick={onNavigate}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  )
}
