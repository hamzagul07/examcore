import 'server-only'

import { getBlogPosts } from '@/lib/blog'
import {
  buildSubjectPageCopy,
  getMarkingSubjectPages,
} from '@/lib/seo/programmatic-subjects'
import {
  getCommandWordsSubjectProfile,
  type CommandWordsMarkingStyle,
} from '@/lib/seo/command-words-subjects'

export type CommandWordsHubEntry = {
  code: string
  label: string
  level: string
  toolPath: string
  subjectPath: string
  guideSlug: string | null
  guideTitle: string | null
  markingStyle: CommandWordsMarkingStyle
  emphasis: string
  topVerbs: string[]
}

export function getCommandWordsGuideSlug(code: string): string | null {
  const post = getBlogPosts().find(
    (p) => p.slug.startsWith(`cambridge-${code}-`) && p.slug.includes('command-words')
  )
  return post?.slug ?? null
}

export function getCommandWordsHubEntries(): CommandWordsHubEntry[] {
  return getMarkingSubjectPages().map((subject) => {
    const copy = buildSubjectPageCopy(subject)
    const profile = getCommandWordsSubjectProfile(subject.code)
    const guideSlug = getCommandWordsGuideSlug(subject.code)
    const guide = guideSlug
      ? getBlogPosts().find((p) => p.slug === guideSlug)
      : undefined

    return {
      code: subject.code,
      label: subject.label,
      level: copy.level,
      toolPath: `/tools/command-words/${subject.code}`,
      subjectPath: `/subjects/${subject.code}`,
      guideSlug,
      guideTitle: guide?.title ?? null,
      markingStyle: profile.markingStyle,
      emphasis: profile.emphasis,
      topVerbs: profile.topVerbs,
    }
  })
}

export function getCommandWordsHubEntry(code: string): CommandWordsHubEntry | null {
  return getCommandWordsHubEntries().find((e) => e.code === code) ?? null
}
