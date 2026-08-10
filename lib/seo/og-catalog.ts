/** Static paper OG slips served from /api/og/page/[slug]. */

export type OgSlip = { title: string; subtitle: string }

export const PAGE_OG: Record<string, OgSlip> = {
  home: {
    title: 'Your past papers, marked like the exam',
    subtitle: 'Handwritten past papers · real mark schemes · mark-by-mark in seconds',
  },
  mark: {
    title: 'Get marked in 30 seconds',
    subtitle: 'Cambridge past paper · real mark scheme · B1 M1 A1 feedback',
  },
  faq: {
    title: 'Frequently asked questions',
    subtitle: 'Marking, privacy, pricing & getting started',
  },
  about: {
    title: 'Built by a student, for students',
    subtitle: 'Real Cambridge schemes · Honest AI marking',
  },
  pricing: {
    title: 'Plans for every study pace',
    subtitle: 'Max — Vault, Cinema, Sunday coach',
  },
  'how-it-works': {
    title: 'Upload. Mark. Fix.',
    subtitle: "Real Cambridge schemes · Examiner's Ink · Mastery tracking",
  },
  contact: {
    title: 'Get in touch',
    subtitle: 'Questions, feedback, and support',
  },
  ib: {
    title: 'IB Diploma past papers & mark schemes',
    subtitle: 'Every HL & SL subject · Markband guides · Free on MarkScheme',
  },
  'past-papers': {
    title: 'Cambridge past papers & mark schemes',
    subtitle: 'Practise real papers · Instant mark-scheme marking · Free to start',
  },
  subjects: {
    title: 'Cambridge A-Levels we mark',
    subtitle: '15 subjects · Real mark schemes · MCQ, points & essays',
  },
  blog: {
    title: 'Revision guides',
    subtitle: 'Cambridge & IB past-paper marking, mark schemes & exam technique',
  },
  guides: {
    title: 'Study guides',
    subtitle: 'Cambridge marking · grade boundaries · IB markbands',
  },
  'for-teachers': {
    title: 'For teachers & schools',
    subtitle: 'Classroom blindspots · grade risk · review queue',
  },
  results: {
    title: 'Results Day 2026',
    subtitle: 'Will my grade hold? · Boundaries · What to do next',
  },
  community: {
    title: 'Exam Room',
    subtitle: 'Ask · share · revise with other Cambridge & IB students',
  },
  insights: {
    title: 'Marking insights',
    subtitle: 'Self-mark gaps vs a strict second pass — citable data',
  },
  changelog: {
    title: 'Changelog',
    subtitle: 'What shipped on MarkScheme — marking, courses, Exam Room',
  },
  edexcel: {
    title: 'Edexcel International',
    subtitle: 'Wrong board? Here is how MarkScheme maps to IAL UMS',
  },
  oxfordaqa: {
    title: 'OxfordAQA',
    subtitle: 'Board bridge — Cambridge-style marking on MarkScheme',
  },
  compare: {
    title: 'Compare revision tools',
    subtitle: 'MarkScheme vs tutors, ZNotes, and self-marking',
  },
}

/** Map a site path to a working API OG URL (file-convention OG 404s under (marketing)). */
export function ogApiPathForPage(path: string): string {
  if (path === '/tools' || path === '/tools/') return '/api/og/tools/hub'
  if (path.startsWith('/tools/')) {
    const slug = path.split('/').filter(Boolean)[1] ?? 'hub'
    return `/api/og/tools/${slug}`
  }
  if (path === '/mark' || path.startsWith('/mark/')) return '/api/og/page/mark'
  if (path.startsWith('/blog')) return '/api/og/page/blog'
  if (path === '/ib' || path === '/ib/') return '/api/og/page/ib'
  if (path.startsWith('/ib/')) {
    const parts = path.split('/').filter(Boolean)
    // /ib/subjects/[slug] or /ib/courses/[slug] or /ib/past-papers/[slug]
    const slug = parts[2]
    if (slug && parts[1] && ['subjects', 'courses', 'past-papers'].includes(parts[1])) {
      return `/api/og/ib/${slug}`
    }
    return '/api/og/page/ib'
  }
  if (path === '/past-papers') return '/api/og/page/past-papers'
  if (path.startsWith('/past-papers/')) {
    const code = path.split('/').filter(Boolean)[1]
    if (code && /^\d{4}$/.test(code)) return `/api/og/subject/${code}`
    return '/api/og/page/past-papers'
  }
  if (path === '/subjects' || path === '/courses') return '/api/og/page/subjects'
  if (path.startsWith('/subjects/') || path.startsWith('/courses/')) {
    const code = path.split('/').filter(Boolean)[1]
    if (code && /^\d{4}$/.test(code)) return `/api/og/subject/${code}`
    return '/api/og/page/subjects'
  }
  if (path.startsWith('/guides')) return '/api/og/page/guides'
  if (path.startsWith('/results')) return '/api/og/page/results'
  if (path.startsWith('/community') || path.startsWith('/exam-room')) {
    return '/api/og/page/community'
  }
  if (path.startsWith('/for-teachers') || path.startsWith('/teacher')) {
    return '/api/og/page/for-teachers'
  }

  const exact: Record<string, string> = {
    '/': 'home',
    '/faq': 'faq',
    '/about': 'about',
    '/pricing': 'pricing',
    '/how-it-works': 'how-it-works',
    '/contact': 'contact',
    '/changelog': 'changelog',
    '/insights': 'insights',
    '/caie': 'past-papers',
    '/edexcel': 'edexcel',
    '/oxfordaqa': 'oxfordaqa',
    '/compare': 'compare',
  }
  return `/api/og/page/${exact[path] ?? 'home'}`
}
