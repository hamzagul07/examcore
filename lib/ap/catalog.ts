/**
 * AP / College Board catalog (Phase E6) — Calculus AB + Physics 1 first.
 */

export type ApCourse = {
  slug: string
  name: string
  contentCode: string
  blurb: string
  shellEnabled: boolean
  markingEnabled: boolean
}

const COURSES: ApCourse[] = [
  {
    slug: 'calculus-ab',
    name: 'Calculus AB',
    contentCode: 'ap-calculus-ab',
    blurb:
      'AP Calculus AB FRQ practise — earned/not-earned points against scoring guidelines. Interactive 1–5 calculator is listed as coming soon.',
    shellEnabled: true,
    markingEnabled: true,
  },
  {
    slug: 'physics-1',
    name: 'Physics 1',
    contentCode: 'ap-physics-1',
    blurb:
      'AP Physics 1 FRQ practise — algebraic work, units, and scoring-guideline points.',
    shellEnabled: true,
    markingEnabled: true,
  },
]

export function getApCourses(): ApCourse[] {
  return COURSES.filter((c) => c.shellEnabled)
}

export function getApCourse(slug: string): ApCourse | null {
  return getApCourses().find((c) => c.slug === slug) ?? null
}

export function isApContentCode(code: string): boolean {
  const c = code.trim().toLowerCase()
  return c.startsWith('ap-') || getApCourses().some((x) => x.contentCode === c)
}
