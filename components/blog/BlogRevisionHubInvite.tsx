'use client'

import { useEffect, useState } from 'react'
import { RevisionHubCard } from '@/components/blog/RevisionHubCard'
import { buildBlogHubCopy, type BlogHubVariant } from '@/lib/blog/revision-hub-copy'
import { useAuthCheck } from '@/lib/hooks/useAuthCheck'

type Props = {
  slug: string
  variant?: BlogHubVariant
  subjectCode?: string | null
  subjectName?: string | null
  subjectGuidesHref?: string | null
  calculatorHref?: string | null
}

/**
 * Guest-only gate for the mid-article revision hub card.
 */
export function BlogRevisionHubInvite({
  slug,
  variant = 'default',
  subjectCode = null,
  subjectName = null,
  subjectGuidesHref = null,
  calculatorHref = null,
}: Props) {
  const { user, loading } = useAuthCheck()
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  if (!hydrated || loading || user) return null

  const copy = buildBlogHubCopy({
    variant,
    placement: 'inline',
    subjectCode,
    subjectName,
  })

  return (
    <RevisionHubCard
      copy={copy}
      slug={slug}
      placement="inline"
      subjectCode={subjectCode}
      subjectGuidesHref={subjectGuidesHref}
      calculatorHref={calculatorHref}
    />
  )
}
