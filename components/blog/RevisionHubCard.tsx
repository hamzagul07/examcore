'use client'

import Link from 'next/link'
import {
  Bell,
  BookOpen,
  Calculator,
  ChevronRight,
  GraduationCap,
  Layers,
  RotateCcw,
  Sparkles,
  Users,
} from 'lucide-react'
import { trackBlogRevisionHubClick } from '@/lib/analytics/blog-events'
import { buildSignUpHref } from '@/lib/auth-redirect'
import type { BlogHubCopy, BlogHubPlacement } from '@/lib/blog/revision-hub-copy'

const PERK_ICONS: Record<string, typeof BookOpen> = {
  subjects: BookOpen,
  subject: BookOpen,
  return: RotateCcw,
  trial: Sparkles,
  alerts: Bell,
  calc: Calculator,
  ia: GraduationCap,
  ib: Layers,
}

export type RevisionHubExtraAction = {
  href: string
  label: string
}

type Props = {
  copy: BlogHubCopy
  slug: string
  placement: BlogHubPlacement
  subjectCode?: string | null
  subjectGuidesHref?: string | null
  calculatorHref?: string | null
  communityHref?: string | null
  extraActions?: RevisionHubExtraAction[]
  showFooterMarkAction?: boolean
  trackEvents?: boolean
}

export function RevisionHubCard({
  copy,
  slug,
  placement,
  subjectCode = null,
  subjectGuidesHref = null,
  calculatorHref = null,
  communityHref = null,
  extraActions = [],
  showFooterMarkAction = true,
  trackEvents = true,
}: Props) {
  const signupHref = buildSignUpHref(`/blog/${slug}`)
  const guidesHref =
    subjectGuidesHref ?? (subjectCode ? `/subjects/${subjectCode}` : '/guides')
  const communityLink =
    communityHref ?? (subjectCode ? `/community?subject=${subjectCode}` : '/community')
  const isFooter = placement === 'footer'
  const isBoundaries = copy.showCalculatorSecondary

  function track(action: 'signup' | 'guides' | 'community' | 'calculator') {
    if (!trackEvents) return
    if (action === 'calculator') {
      trackBlogRevisionHubClick('guides', slug)
      return
    }
    trackBlogRevisionHubClick(action, slug)
  }

  return (
    <aside
      className={`ec-blog-hub-invite${isFooter ? ' ec-blog-hub-invite--footer' : ''}${isBoundaries ? ' ec-blog-hub-invite--boundaries' : ''}`}
      aria-label={copy.signupLabel}
    >
      <div className="ec-blog-hub-invite__glow" aria-hidden />
      <div className="ec-blog-hub-invite__head">
        <span className="ec-blog-hub-invite__icon" aria-hidden>
          <BookOpen className="h-5 w-5 text-[var(--ec-brand)]" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <p className="ec-blog-hub-invite__kicker">{copy.kicker}</p>
          <h2 className="ec-blog-hub-invite__title">
            {copy.titleBefore}
            <em>{copy.titleEmphasis}</em>
            {copy.titleAfter}
          </h2>
        </div>
      </div>

      <p className="ec-blog-hub-invite__lead">{copy.lead}</p>

      <ol className="ec-blog-hub-invite__steps" aria-label="How it works">
        {copy.steps.map((step, index) => (
          <li key={step.id}>
            <span className="ec-blog-hub-invite__step-num" aria-hidden>
              {index + 1}
            </span>
            <span className="ec-blog-hub-invite__step-body">
              <span className="ec-blog-hub-invite__step-label">{step.label}</span>
              <span className="ec-blog-hub-invite__step-detail">{step.detail}</span>
            </span>
            {index < copy.steps.length - 1 ? (
              <ChevronRight
                className="ec-blog-hub-invite__step-chevron hidden sm:block"
                aria-hidden
              />
            ) : null}
          </li>
        ))}
      </ol>

      <ul className="ec-blog-hub-invite__perks" aria-label="Included with a free account">
        {copy.perks.map((perk) => {
          const Icon = PERK_ICONS[perk.id] ?? Sparkles
          return (
            <li key={perk.id}>
              <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--ec-brand)]" aria-hidden />
              {perk.label}
            </li>
          )
        })}
      </ul>

      <div className="ec-blog-hub-invite__actions">
        <Link
          href={signupHref}
          className="ec-btn-primary min-h-[48px]"
          onClick={() => track('signup')}
        >
          {copy.signupLabel}
        </Link>
        {copy.showCalculatorSecondary && calculatorHref ? (
          <Link
            href={calculatorHref}
            className="ec-btn-secondary min-h-[48px]"
            onClick={() => track('calculator')}
          >
            <Calculator className="mr-1.5 h-4 w-4" aria-hidden />
            Grade calculator
          </Link>
        ) : null}
        {copy.showSubjectGuidesSecondary && copy.secondaryGuidesLabel ? (
          <Link
            href={guidesHref}
            className="ec-btn-warm min-h-[48px]"
            onClick={() => track('guides')}
          >
            {copy.secondaryGuidesLabel}
          </Link>
        ) : null}
        {isFooter && showFooterMarkAction && !copy.showCalculatorSecondary ? (
          <Link
            href={subjectCode ? `/mark?subject=${subjectCode}` : '/mark'}
            className="ec-btn-ghost min-h-[48px]"
            onClick={() => track('guides')}
          >
            Mark a paper free
          </Link>
        ) : null}
        {extraActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="ec-btn-ghost min-h-[48px]"
            onClick={() => track('guides')}
          >
            {action.label}
          </Link>
        ))}
      </div>

      <p className="ec-blog-hub-invite__trust">{copy.trustLine}</p>

      <p className="ec-blog-hub-invite__footnote">
        {copy.footnote}
        {subjectCode && !isBoundaries ? (
          <>
            {' '}
            Questions? Join the{' '}
            <Link
              href={communityLink}
              className="ec-link inline-flex items-center gap-0.5"
              onClick={() => track('community')}
            >
              <Users className="h-3.5 w-3.5" aria-hidden />
              {subjectCode} room
            </Link>
            .
          </>
        ) : null}
      </p>
    </aside>
  )
}
