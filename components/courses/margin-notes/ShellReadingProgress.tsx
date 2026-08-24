'use client'

import { usePathname } from 'next/navigation'
import { ReadingProgress } from '@/components/courses/margin-notes/ReadingProgress'

/** A lesson deeper than the subject hub — /courses/9709/… or /ib/courses/x/… */
function isLessonPath(pathname: string): boolean {
  return (
    /^\/courses\/[^/]+\/.+/.test(pathname) ||
    /^\/ib\/courses\/[^/]+\/.+/.test(pathname)
  )
}

/**
 * The reading shell's progress bar, suppressed on lesson pages.
 *
 * CourseLessonPage renders its own accented `<ReadingProgress />`, so the shell
 * must not render a second one — that suppression is why the shell used to read
 * the pathname from `headers()`, which in turn made the entire marketing route
 * group render dynamically.
 *
 * Nested layouts are additive, so a group layout cannot un-render something a
 * parent already drew, and this decision cannot be expressed by route grouping
 * alone. It moves to the client instead: the bar is decorative, so deciding it
 * after hydration costs nothing, while the header, footer and nav links that
 * actually matter for SEO stay in the server-rendered HTML.
 *
 * `ReadingProgress` itself is deliberately left unaware of routes — making IT
 * self-suppress would also have killed the one the lesson page renders.
 */
export function ShellReadingProgress() {
  const pathname = usePathname()
  if (isLessonPath(pathname)) return null
  return <ReadingProgress />
}
