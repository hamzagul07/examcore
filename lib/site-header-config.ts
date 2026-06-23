import type { SiteHeaderVariant, SiteNavItem } from '@/lib/site-nav'
import { SITE_NAV_ITEMS } from '@/lib/site-nav'
import {
  getSiteHeaderTone,
  useTransparentHeaderShell,
  type SiteHeaderTone,
} from '@/lib/site-header-tone'

export type HeaderCta = {
  label: string
  href: string
  style: 'primary' | 'warm' | 'ghost'
}

export type HeaderContext = {
  label: string
  href: string
  glyph?: string
}

export type SiteHeaderConfig = {
  tone: SiteHeaderTone
  transparentShell: boolean
  wordmarkHref: string
  /** Nav ids in display order; omitted ids hidden on this page family. */
  navItemIds: string[]
  context?: HeaderContext
  primaryCta: HeaderCta
  secondaryCta?: HeaderCta
}

function communityContext(pathname: string): HeaderContext | undefined {
  const roomMatch = pathname.match(/^\/community\/s\/([^/]+)/)
  if (roomMatch) {
    const code = roomMatch[1]
    return {
      label: `s/${code}`,
      href: `/community/s/${code}`,
      glyph: '💬',
    }
  }
  if (pathname.startsWith('/community/submit')) {
    return { label: 'New post', href: '/community/submit', glyph: '✎' }
  }
  if (pathname.startsWith('/community')) {
    return { label: 'Exam Room', href: '/community', glyph: '💬' }
  }
  return undefined
}

function coursesContext(pathname: string): HeaderContext | undefined {
  const lessonMatch = pathname.match(/^\/courses\/([^/]+)(?:\/(.+))?/)
  if (lessonMatch?.[2]) {
    return {
      label: lessonMatch[1],
      href: `/courses/${lessonMatch[1]}`,
      glyph: '📖',
    }
  }
  if (pathname.startsWith('/subjects/')) {
    const code = pathname.split('/')[2]
    return code ? { label: code, href: pathname, glyph: '📚' } : undefined
  }
  if (
    pathname === '/courses' ||
    pathname.startsWith('/courses/') ||
    pathname.startsWith('/subjects') ||
    pathname.startsWith('/ib')
  ) {
    return { label: 'Free courses', href: '/courses', glyph: '📚' }
  }
  return undefined
}

export function getSiteHeaderConfig(
  pathname: string,
  variant: SiteHeaderVariant
): SiteHeaderConfig {
  const tone = getSiteHeaderTone(pathname)
  const transparentShell = useTransparentHeaderShell(variant, tone)

  if (variant === 'app') {
    if (tone === 'mark') {
      return {
        tone,
        transparentShell,
        wordmarkHref: '/dashboard',
        navItemIds: ['mark', 'courses', 'progress', 'community'],
        context: { label: 'Mark a paper', href: '/mark', glyph: '✓' },
        primaryCta: {
          label: 'My progress',
          href: '/dashboard/progress',
          style: 'ghost',
        },
      }
    }
    return {
      tone: 'default',
      transparentShell: false,
      wordmarkHref: '/dashboard',
      navItemIds: ['progress', 'mark', 'courses', 'community', 'account'],
      context: { label: 'Dashboard', href: '/dashboard', glyph: '◆' },
      primaryCta: { label: 'Mark a question', href: '/mark', style: 'primary' },
    }
  }

  if (tone === 'hero') {
    return {
      tone,
      transparentShell,
      wordmarkHref: '/',
      navItemIds: ['mark', 'courses', 'subjects', 'community', 'pricing'],
      context: { label: 'Cambridge & IB', href: '/subjects', glyph: '◇' },
      primaryCta: {
        label: 'Mark free — no card',
        href: '/mark',
        style: 'primary',
      },
      secondaryCta: { label: 'Free courses', href: '/courses', style: 'warm' },
    }
  }

  if (tone === 'learn') {
    return {
      tone,
      transparentShell,
      wordmarkHref: '/courses',
      navItemIds: ['courses', 'subjects', 'mark', 'community', 'pricing'],
      context: coursesContext(pathname),
      primaryCta: { label: 'Mark a question', href: '/mark', style: 'primary' },
      secondaryCta: { label: 'All subjects', href: '/subjects', style: 'ghost' },
    }
  }

  if (tone === 'discuss') {
    return {
      tone,
      transparentShell,
      wordmarkHref: '/community',
      navItemIds: ['community', 'mark', 'courses', 'subjects'],
      context: communityContext(pathname),
      primaryCta: {
        label: 'Create a post',
        href: '/community/submit',
        style: 'primary',
      },
      secondaryCta: { label: 'Subject rooms', href: '/community/subjects', style: 'ghost' },
    }
  }

  if (tone === 'pricing') {
    return {
      tone,
      transparentShell,
      wordmarkHref: '/',
      navItemIds: ['pricing', 'mark', 'courses', 'community'],
      context: { label: 'Plans', href: '/pricing', glyph: '◇' },
      primaryCta: {
        label: 'Start free trial',
        href: '/auth/signup?next=/pricing',
        style: 'primary',
      },
      secondaryCta: { label: 'Compare plans', href: '/pricing#plans', style: 'ghost' },
    }
  }

  return {
    tone: 'default',
    transparentShell,
    wordmarkHref: '/',
    navItemIds: ['mark', 'courses', 'subjects', 'community', 'pricing'],
    primaryCta: { label: 'Mark a question', href: '/mark', style: 'primary' },
  }
}

export function getNavItemsForConfig(
  variant: SiteHeaderVariant,
  config: SiteHeaderConfig
): SiteNavItem[] {
  const byId = new Map(
    SITE_NAV_ITEMS.filter((item) => item.variants.includes(variant)).map((item) => [
      item.id,
      item,
    ])
  )
  return config.navItemIds
    .map((id) => byId.get(id))
    .filter((item): item is SiteNavItem => item != null)
}
