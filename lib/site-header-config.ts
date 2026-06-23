import type { SiteHeaderVariant, SiteNavItem } from '@/lib/site-nav'
import { SITE_NAV_ITEMS } from '@/lib/site-nav'
import { getIbSubject } from '@/lib/ib/catalog'
import {
  getSiteHeaderTone,
  useTransparentHeaderShell,
  type SiteHeaderTone,
} from '@/lib/site-header-tone'

export type HeaderCta = {
  label: string
  /** Shorter label when header actions are tight (e.g. community). */
  shortLabel?: string
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

function ibSubjectLabel(slug: string): string {
  const subject = getIbSubject(slug)
  if (!subject) return slug.replace(/-/g, ' ')
  if (subject.groupNumber === 7) return subject.name
  return `${subject.name} ${subject.level}`
}

function coursesContext(pathname: string): HeaderContext | undefined {
  const ibCourseMatch = pathname.match(/^\/ib\/courses\/([^/]+)(?:\/(.+))?/)
  if (ibCourseMatch) {
    const slug = ibCourseMatch[1]
    const subject = getIbSubject(slug)
    if (ibCourseMatch[2]) {
      return {
        label: ibSubjectLabel(slug),
        href: `/ib/courses/${slug}`,
        glyph: subject?.glyph ?? '📖',
      }
    }
    return {
      label: subject ? `IB ${subject.name}` : 'IB course',
      href: `/ib/courses/${slug}`,
      glyph: subject?.glyph ?? '📚',
    }
  }

  const ibSubjectMatch = pathname.match(/^\/ib\/subjects\/([^/]+)/)
  if (ibSubjectMatch?.[1]) {
    const slug = ibSubjectMatch[1]
    return {
      label: ibSubjectLabel(slug),
      href: `/ib/subjects/${slug}`,
      glyph: getIbSubject(slug)?.glyph ?? '📚',
    }
  }

  if (pathname === '/ib' || pathname.startsWith('/ib/past-papers')) {
    return { label: 'IB Diploma', href: '/ib', glyph: '◇' }
  }

  if (pathname === '/ib/courses') {
    return { label: 'IB courses', href: '/ib/courses', glyph: '📚' }
  }

  const ibTopicMatch = pathname.match(/^\/ib\/past-papers\/([^/]+)\/([^/]+)/)
  if (ibTopicMatch?.[1]) {
    return {
      label: ibSubjectLabel(ibTopicMatch[1]),
      href: `/ib/past-papers/${ibTopicMatch[1]}`,
      glyph: getIbSubject(ibTopicMatch[1])?.glyph ?? '📄',
    }
  }

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
    pathname.startsWith('/ib/courses')
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
        shortLabel: 'Mark free',
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
      wordmarkHref: '/',
      navItemIds: ['courses', 'subjects', 'mark', 'community', 'pricing'],
      context: coursesContext(pathname),
      primaryCta: { label: 'Mark a question', href: '/mark', style: 'primary' },
      secondaryCta: { label: 'All subjects', href: '/subjects', style: 'ghost' },
    }
  }

  if (tone === 'discuss') {
    const onSubmit = pathname.startsWith('/community/submit')
    return {
      tone,
      transparentShell,
      wordmarkHref: '/',
      navItemIds: ['community', 'mark', 'courses', 'subjects'],
      context: communityContext(pathname),
      primaryCta: onSubmit
        ? {
            label: 'Back to Exam Room',
            shortLabel: 'Feed',
            href: '/community',
            style: 'ghost',
          }
        : {
            label: 'Create a post',
            shortLabel: 'New post',
            href: '/community/submit',
            style: 'primary',
          },
      secondaryCta: onSubmit
        ? undefined
        : {
            label: 'Subject rooms',
            shortLabel: 'Rooms',
            href: '/community/subjects',
            style: 'ghost',
          },
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
