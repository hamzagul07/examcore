import type { SubjectOption } from '@/lib/profile-options'
import type { CourseSeoContext } from '@/lib/courses/seo'
import { formatMetaDescription, formatSerpTitle } from '@/lib/seo/on-page'

/** High-level SEO profile for each Cambridge marking syllabus. */
export type SubjectSeoProfile = {
  code: string
  name: string
  level: 'A-Level' | 'O-Level'
  /** SERP title for /subjects/{code} (without site suffix). */
  markingTitle: string
  /** Meta description for /subjects/{code}. */
  markingDescription: string
  /** SERP title stem for /courses/{code}. */
  courseTitle: string
  /** Meta description template for /courses/{code} — use {count} for lesson count. */
  courseDescription: string
  /** OG subtitle and social preview line. */
  tagline: string
  keywords: string[]
  /** JSON-LD teaches / knowsAbout topics. */
  topics: string[]
}

const PROFILES: SubjectSeoProfile[] = [
  {
    code: '9709',
    name: 'Mathematics',
    level: 'A-Level',
    markingTitle: 'Mark Cambridge 9709 Maths past papers',
    markingDescription:
      'Upload A-Level Mathematics (9709) answers. B1/M1/A1 feedback from real Cambridge mark schemes — Pure, Mechanics & Statistics. Handwritten photos welcome. Free to try.',
    courseTitle: 'Free Cambridge 9709 Maths course — all syllabus topics',
    courseDescription:
      'Free Cambridge A-Level Mathematics (9709) course with {count} topics. Pure, Mechanics & Statistics revision notes, visual lessons & past-paper marking.',
    tagline: '9709 · Pure, Mechanics & Statistics · B1/M1/A1',
    keywords: ['9709 past papers', 'A-Level maths marking', '9709 mark scheme', 'Cambridge mathematics', '9709 revision', 'pure maths past papers', 'M1 S1 past papers'],
    topics: ['Pure Mathematics', 'Mechanics', 'Probability & Statistics', 'Cambridge 9709'],
  },
  {
    code: '9231',
    name: 'Further Mathematics',
    level: 'A-Level',
    markingTitle: 'Mark Cambridge 9231 Further Maths past papers',
    markingDescription:
      'Upload Further Mathematics (9231) answers. Point-based B1/M1/A1 marking on proof, further pure, mechanics & statistics — real Cambridge schemes. Free to try.',
    courseTitle: 'Free Cambridge 9231 Further Maths course',
    courseDescription:
      'Free Cambridge A-Level Further Mathematics (9231) course with {count} syllabus topics. Visual revision, exam tips & past-paper marking.',
    tagline: '9231 · Further Pure · Proof & advanced applications',
    keywords: ['9231 past papers', 'Further Mathematics Cambridge', 'A-Level further maths marking', '9231 mark scheme', '9231 revision'],
    topics: ['Further Pure Mathematics', 'Further Mechanics', 'Further Statistics', 'Cambridge 9231'],
  },
  {
    code: '4024',
    name: 'Mathematics',
    level: 'O-Level',
    markingTitle: 'Mark Cambridge 4024 O-Level Maths past papers',
    markingDescription:
      'Upload O-Level Mathematics (4024) answers. Method and accuracy marking from real Cambridge schemes — calculator & non-calculator papers. Free to try.',
    courseTitle: 'Free Cambridge 4024 O-Level Maths course',
    courseDescription:
      'Free Cambridge O-Level Mathematics (4024) course with {count} topics. Algebra, graphs, trigonometry & mensuration — visual revision & marking.',
    tagline: '4024 · O-Level Maths · Calculator & non-calculator',
    keywords: ['4024 past papers', 'O-Level maths Cambridge', '4024 mark scheme', 'O-Level mathematics marking', '4024 revision'],
    topics: ['O-Level Mathematics', 'Number & algebra', 'Geometry & trigonometry', 'Cambridge 4024'],
  },
  {
    code: '4037',
    name: 'Additional Mathematics',
    level: 'O-Level',
    markingTitle: 'Mark Cambridge 4037 Additional Maths past papers',
    markingDescription:
      'Upload Additional Mathematics (4037) answers. Cambridge mark-scheme marking on algebra, functions, coordinate geometry & introductory calculus. Free to try.',
    courseTitle: 'Free Cambridge 4037 Additional Maths course',
    courseDescription:
      'Free Cambridge O-Level Additional Mathematics (4037) course with {count} topics. Calculus, functions & coordinate geometry revision.',
    tagline: '4037 · Additional Maths · Calculus & functions',
    keywords: ['4037 past papers', 'Additional Mathematics O-Level', '4037 mark scheme', 'Cambridge additional maths', '4037 revision'],
    topics: ['Additional Mathematics', 'Calculus', 'Coordinate geometry', 'Cambridge 4037'],
  },
  {
    code: '9700',
    name: 'Biology',
    level: 'A-Level',
    markingTitle: 'Mark Cambridge 9700 Biology past papers',
    markingDescription:
      'Upload A-Level Biology (9700) answers. Keyword-accurate marking from real Cambridge schemes — MCQ, structured & practical skills papers. Free to try.',
    courseTitle: 'Free Cambridge 9700 Biology course — all topics',
    courseDescription:
      'Free Cambridge A-Level Biology (9700) course with {count} syllabus topics. Visual revision, exam tips, definitions & past-paper marking.',
    tagline: '9700 · MCQ, structured & practical papers',
    keywords: ['9700 past papers', 'A-Level biology marking', '9700 mark scheme', 'Cambridge biology', '9700 revision', 'biology past paper practice'],
    topics: ['Cell biology', 'Genetics', 'Human physiology', 'Ecology', 'Cambridge 9700'],
  },
  {
    code: '5090',
    name: 'Biology',
    level: 'O-Level',
    markingTitle: 'Mark Cambridge 5090 O-Level Biology past papers',
    markingDescription:
      'Upload O-Level Biology (5090) answers. Precise keyword marking from Cambridge schemes — cells, physiology, ecology & genetics. Free to try.',
    courseTitle: 'Free Cambridge 5090 O-Level Biology course',
    courseDescription:
      'Free Cambridge O-Level Biology (5090) course with {count} topics. Syllabus-aligned revision notes & past-paper marking.',
    tagline: '5090 · O-Level Biology · Keyword marking',
    keywords: ['5090 past papers', 'O-Level biology Cambridge', '5090 mark scheme', 'biology past paper marking', '5090 revision'],
    topics: ['O-Level Biology', 'Cells & organisation', 'Human biology', 'Cambridge 5090'],
  },
  {
    code: '9701',
    name: 'Chemistry',
    level: 'A-Level',
    markingTitle: 'Mark Cambridge 9701 Chemistry past papers',
    markingDescription:
      'Upload A-Level Chemistry (9701) answers. Point marking on equations, mechanisms, calculations & definitions — real Cambridge schemes. Free to try.',
    courseTitle: 'Free Cambridge 9701 Chemistry course — all topics',
    courseDescription:
      'Free Cambridge A-Level Chemistry (9701) course with {count} topics. Organic, inorganic & physical chemistry — visual lessons & marking.',
    tagline: '9701 · Organic, inorganic & physical chemistry',
    keywords: ['9701 past papers', 'A-Level chemistry marking', '9701 mark scheme', 'Cambridge chemistry', '9701 revision', 'organic chemistry past papers'],
    topics: ['Organic chemistry', 'Inorganic chemistry', 'Physical chemistry', 'Cambridge 9701'],
  },
  {
    code: '5070',
    name: 'Chemistry',
    level: 'O-Level',
    markingTitle: 'Mark Cambridge 5070 O-Level Chemistry past papers',
    markingDescription:
      'Upload O-Level Chemistry (5070) answers. Cambridge mark-scheme marking on equations, bonding, calculations & practical vocabulary. Free to try.',
    courseTitle: 'Free Cambridge 5070 O-Level Chemistry course',
    courseDescription:
      'Free Cambridge O-Level Chemistry (5070) course with {count} topics. Bonding, equations & qualitative analysis revision.',
    tagline: '5070 · O-Level Chemistry · Equations & bonding',
    keywords: ['5070 past papers', 'O-Level chemistry Cambridge', '5070 mark scheme', 'chemistry past papers', '5070 revision'],
    topics: ['O-Level Chemistry', 'Chemical bonding', 'Quantitative chemistry', 'Cambridge 5070'],
  },
  {
    code: '9702',
    name: 'Physics',
    level: 'A-Level',
    markingTitle: 'Mark Cambridge 9702 Physics past papers',
    markingDescription:
      'Upload A-Level Physics (9702) answers. B1/M1/A1 marking on calculations, definitions & graph work — real Cambridge schemes with units checked. Free to try.',
    courseTitle: 'Free Cambridge 9702 Physics course — all topics',
    courseDescription:
      'Free Cambridge A-Level Physics (9702) course with {count} topics. Mechanics, waves, electricity & quantum — visual revision & marking.',
    tagline: '9702 · Calculations, definitions & practical skills',
    keywords: ['9702 past papers', 'A-Level physics marking', '9702 mark scheme', 'Cambridge physics', '9702 revision', 'physics past paper practice'],
    topics: ['Mechanics', 'Waves & optics', 'Electricity', 'Quantum physics', 'Cambridge 9702'],
  },
  {
    code: '5054',
    name: 'Physics',
    level: 'O-Level',
    markingTitle: 'Mark Cambridge 5054 O-Level Physics past papers',
    markingDescription:
      'Upload O-Level Physics (5054) answers. Method and accuracy marking from Cambridge schemes — mechanics, waves, electricity & thermal. Free to try.',
    courseTitle: 'Free Cambridge 5054 O-Level Physics course',
    courseDescription:
      'Free Cambridge O-Level Physics (5054) course with {count} topics. Mechanics, waves & electricity revision with past-paper marking.',
    tagline: '5054 · O-Level Physics · Show your working',
    keywords: ['5054 past papers', 'O-Level physics Cambridge', '5054 mark scheme', 'physics marking', '5054 revision'],
    topics: ['O-Level Physics', 'Mechanics', 'Waves & electricity', 'Cambridge 5054'],
  },
  {
    code: '9708',
    name: 'Economics',
    level: 'A-Level',
    markingTitle: 'Mark Cambridge 9708 Economics past papers',
    markingDescription:
      'Upload A-Level Economics (9708) answers. Essay band, data response & MCQ marking from real Cambridge schemes — micro & macro. Free to try.',
    courseTitle: 'Free Cambridge 9708 Economics course',
    courseDescription:
      'Free Cambridge A-Level Economics (9708) course with {count} topics. Micro, macro, diagrams & essay technique with past-paper marking.',
    tagline: '9708 · MCQ, data response & essay bands',
    keywords: ['9708 past papers', 'A-Level economics essay marking', '9708 mark scheme', 'economics band descriptors', '9708 revision', 'Cambridge economics'],
    topics: ['Microeconomics', 'Macroeconomics', 'Essay evaluation', 'Cambridge 9708'],
  },
  {
    code: '2281',
    name: 'Economics',
    level: 'O-Level',
    markingTitle: 'Mark Cambridge 2281 O-Level Economics past papers',
    markingDescription:
      'Upload O-Level Economics (2281) answers. Applied marking on definitions, diagrams & data questions — real Cambridge schemes. Free to try.',
    courseTitle: 'Free Cambridge 2281 O-Level Economics course',
    courseDescription:
      'Free Cambridge O-Level Economics (2281) course with {count} topics. Theory, diagrams & application with past-paper marking.',
    tagline: '2281 · O-Level Economics · Diagrams & application',
    keywords: ['2281 past papers', 'O-Level economics Cambridge', '2281 mark scheme', 'economics past papers', '2281 revision'],
    topics: ['O-Level Economics', 'Market systems', 'Government intervention', 'Cambridge 2281'],
  },
  {
    code: '9609',
    name: 'Business',
    level: 'A-Level',
    markingTitle: 'Mark Cambridge 9609 Business past papers',
    markingDescription:
      'Upload A-Level Business (9609) answers. Case study & essay band marking — application, analysis & evaluation from real Cambridge schemes. Free to try.',
    courseTitle: 'Free Cambridge 9609 Business course — all topics',
    courseDescription:
      'Free Cambridge A-Level Business (9609) course with {count} topics. Finance, marketing, HR & strategy — visual lessons & marking.',
    tagline: '9609 · Case studies · Application & evaluation',
    keywords: ['9609 past papers', 'A-Level business marking', '9609 mark scheme', 'Cambridge business studies', 'case study past papers', '9609 revision'],
    topics: ['Business finance', 'Marketing', 'Human resources', 'Strategy', 'Cambridge 9609'],
  },
  {
    code: '7115',
    name: 'Business Studies',
    level: 'O-Level',
    markingTitle: 'Mark Cambridge 7115 Business Studies past papers',
    markingDescription:
      'Upload O-Level Business Studies (7115) answers. Applied case marking from Cambridge schemes — enterprise, marketing, finance & operations. Free to try.',
    courseTitle: 'Free Cambridge 7115 Business Studies course',
    courseDescription:
      'Free Cambridge O-Level Business Studies (7115) course with {count} topics. Case-based revision & past-paper marking.',
    tagline: '7115 · O-Level Business · Case-based answers',
    keywords: ['7115 past papers', 'O-Level business studies', '7115 mark scheme', 'Cambridge business past papers', '7115 revision'],
    topics: ['O-Level Business Studies', 'Enterprise', 'Marketing & finance', 'Cambridge 7115'],
  },
  {
    code: '9706',
    name: 'Accounting',
    level: 'A-Level',
    markingTitle: 'Mark Cambridge 9706 Accounting past papers',
    markingDescription:
      'Upload A-Level Accounting (9706) answers. Point marking on financial statements, ratios, ledgers & decision-making — real Cambridge schemes. Free to try.',
    courseTitle: 'Free Cambridge 9706 Accounting course — all topics',
    courseDescription:
      'Free Cambridge A-Level Accounting (9706) course with {count} topics. Financial statements, ratios & costing with past-paper marking.',
    tagline: '9706 · Financial statements · Ratio analysis',
    keywords: ['9706 past papers', 'A-Level accounting marking', '9706 mark scheme', 'Cambridge accounting', 'financial statements past papers', '9706 revision'],
    topics: ['Financial statements', 'Cost accounting', 'Ratio analysis', 'Cambridge 9706'],
  },
  {
    code: '7707',
    name: 'Accounting',
    level: 'O-Level',
    markingTitle: 'Mark Cambridge 7707 O-Level Accounting past papers',
    markingDescription:
      'Upload O-Level Accounting (7707) answers. Format and accuracy marking on bookkeeping, final accounts & control accounts. Free to try.',
    courseTitle: 'Free Cambridge 7707 O-Level Accounting course',
    courseDescription:
      'Free Cambridge O-Level Accounting (7707) course with {count} topics. Bookkeeping, ledgers & final accounts revision.',
    tagline: '7707 · O-Level Accounting · Bookkeeping & ledgers',
    keywords: ['7707 past papers', 'O-Level accounting Cambridge', '7707 mark scheme', 'accounting past papers', '7707 revision'],
    topics: ['O-Level Accounting', 'Bookkeeping', 'Final accounts', 'Cambridge 7707'],
  },
  {
    code: '9489',
    name: 'History',
    level: 'A-Level',
    markingTitle: 'Mark Cambridge 9489 History past papers',
    markingDescription:
      'Upload A-Level History (9489) answers. Essay band marking on argument, evidence & source analysis — real Cambridge level-of-response schemes. Free to try.',
    courseTitle: 'Free Cambridge 9489 History course',
    courseDescription:
      'Free Cambridge A-Level History (9489) course with {count} topics. Essay technique, source analysis & past-paper marking.',
    tagline: '9489 · Essay bands · Sources & historiography',
    keywords: ['9489 past papers', 'A-Level history marking', '9489 mark scheme', 'history essay bands Cambridge', '9489 revision'],
    topics: ['Historical argument', 'Source analysis', 'Essay writing', 'Cambridge 9489'],
  },
  {
    code: '9699',
    name: 'Sociology',
    level: 'A-Level',
    markingTitle: 'Mark Cambridge 9699 Sociology past papers',
    markingDescription:
      'Upload A-Level Sociology (9699) answers. Essay band marking on theory, application & evaluation — real Cambridge schemes with named theorists. Free to try.',
    courseTitle: 'Free Cambridge 9699 Sociology course',
    courseDescription:
      'Free Cambridge A-Level Sociology (9699) course with {count} topics. Theory, application & evaluation with past-paper marking.',
    tagline: '9699 · Theorists · Application & evaluation',
    keywords: ['9699 past papers', 'A-Level sociology marking', '9699 mark scheme', 'sociology essay bands', '9699 revision'],
    topics: ['Sociological theory', 'Family & education', 'Crime & deviance', 'Cambridge 9699'],
  },
  {
    code: '9990',
    name: 'Psychology',
    level: 'A-Level',
    markingTitle: 'Mark Cambridge 9990 Psychology past papers',
    markingDescription:
      'Upload A-Level Psychology (9990) answers. Mixed marking on named studies, application & evaluation — real Cambridge schemes. Free to try.',
    courseTitle: 'Free Cambridge 9990 Psychology course',
    courseDescription:
      'Free Cambridge A-Level Psychology (9990) course with {count} topics. Core studies, approaches & application with marking.',
    tagline: '9990 · Core studies · Application & evaluation',
    keywords: ['9990 past papers', 'A-Level psychology marking', '9990 mark scheme', 'Cambridge psychology', '9990 revision'],
    topics: ['Core studies', 'Research methods', 'Approaches in psychology', 'Cambridge 9990'],
  },
  {
    code: '9084',
    name: 'Law',
    level: 'A-Level',
    markingTitle: 'Mark Cambridge 9084 Law past papers',
    markingDescription:
      'Upload A-Level Law (9084) answers. Problem question & essay band marking — IRAC application, cases & statutes from real schemes. Free to try.',
    courseTitle: 'Free Cambridge 9084 Law course',
    courseDescription:
      'Free Cambridge A-Level Law (9084) course with {count} topics. Problem questions, essays & case law with past-paper marking.',
    tagline: '9084 · Problem questions · Case law & statutes',
    keywords: ['9084 past papers', 'A-Level law marking', '9084 mark scheme', 'Cambridge law past papers', 'law problem questions', '9084 revision'],
    topics: ['Legal rules & application', 'Case law', 'Essay argument', 'Cambridge 9084'],
  },
  {
    code: '9488',
    name: 'Islamic Studies',
    level: 'A-Level',
    markingTitle: 'Mark Cambridge 9488 Islamic Studies past papers',
    markingDescription:
      'Upload A-Level Islamic Studies (9488) answers. Essay band marking on textual knowledge, themes & evaluation — real Cambridge schemes. Free to try.',
    courseTitle: 'Free Cambridge 9488 Islamic Studies course',
    courseDescription:
      'Free Cambridge A-Level Islamic Studies (9488) course with {count} topics. Textual knowledge, themes & evaluative essays.',
    tagline: '9488 · Textual knowledge · Thematic essays',
    keywords: ['9488 past papers', 'Islamic Studies A-Level Cambridge', '9488 mark scheme', 'Cambridge past papers', '9488 revision'],
    topics: ['Islamic texts', 'Thematic study', 'Evaluative essays', 'Cambridge 9488'],
  },
  {
    code: '9618',
    name: 'Computer Science',
    level: 'A-Level',
    markingTitle: 'Mark Cambridge 9618 Computer Science past papers',
    markingDescription:
      'Upload A-Level Computer Science (9618) answers. Point marking on algorithms, pseudocode, logic & theory — real Cambridge schemes. Free to try.',
    courseTitle: 'Free Cambridge 9618 Computer Science course',
    courseDescription:
      'Free Cambridge A-Level Computer Science (9618) course with {count} topics. Algorithms, programming & theory with marking.',
    tagline: '9618 · Algorithms · Pseudocode & logic',
    keywords: ['9618 past papers', 'A-Level computer science Cambridge', '9618 mark scheme', 'computing past papers', '9618 revision'],
    topics: ['Algorithms', 'Programming', 'Computer systems', 'Cambridge 9618'],
  },
  {
    code: '2210',
    name: 'Computer Science',
    level: 'O-Level',
    markingTitle: 'Mark Cambridge 2210 O-Level Computer Science past papers',
    markingDescription:
      'Upload O-Level Computer Science (2210) answers. Precise technical marking on algorithms, databases & hardware — real Cambridge schemes. Free to try.',
    courseTitle: 'Free Cambridge 2210 O-Level Computer Science course',
    courseDescription:
      'Free Cambridge O-Level Computer Science (2210) course with {count} topics. Theory, algorithms & problem-solving revision.',
    tagline: '2210 · O-Level Computing · Algorithms & theory',
    keywords: ['2210 past papers', 'O-Level computer science', '2210 mark scheme', 'Cambridge computing O-Level', '2210 revision'],
    topics: ['O-Level Computer Science', 'Algorithms', 'Hardware & software', 'Cambridge 2210'],
  },
  {
    code: '9607',
    name: 'Media Studies',
    level: 'A-Level',
    markingTitle: 'Mark Cambridge 9607 Media Studies past papers',
    markingDescription:
      'Upload A-Level Media Studies (9607) answers. Essay band marking on terminology, examples & analysis of media construction. Free to try.',
    courseTitle: 'Free Cambridge 9607 Media Studies course',
    courseDescription:
      'Free Cambridge A-Level Media Studies (9607) course with {count} topics. Media forms, industries & analysis with marking.',
    tagline: '9607 · Media analysis · Terminology & examples',
    keywords: ['9607 past papers', 'A-Level media studies Cambridge', '9607 mark scheme', 'media analysis marking', '9607 revision'],
    topics: ['Media forms', 'Representation', 'Media industries', 'Cambridge 9607'],
  },
]

const BY_CODE = new Map(PROFILES.map((p) => [p.code, p]))

export function getSubjectSeoProfile(code: string): SubjectSeoProfile | undefined {
  return BY_CODE.get(code)
}

export function getAllSubjectSeoProfiles(): SubjectSeoProfile[] {
  return PROFILES
}

/** Keywords merged into page metadata for /subjects/{code} and /courses/{code}. */
export function keywordsForSubjectPath(path: string): string[] | undefined {
  const match = path.match(/^\/(?:subjects|courses)\/(\d{4})$/)
  if (!match) return undefined
  return getSubjectSeoProfile(match[1]!)?.keywords
}

function profileFor(subject: SubjectOption): SubjectSeoProfile {
  const hit = getSubjectSeoProfile(subject.code)
  if (hit) return hit
  const level = subject.levels.includes('O-Level') ? 'O-Level' : 'A-Level'
  return {
    code: subject.code,
    name: subject.label,
    level,
    markingTitle: `Mark Cambridge ${subject.code} ${subject.label} past papers`,
    markingDescription: `Upload ${level} ${subject.label} (${subject.code}) answers. Mark-scheme feedback from real Cambridge papers. Free to try.`,
    courseTitle: `Free Cambridge ${subject.code} ${subject.label} course`,
    courseDescription: `Free Cambridge ${level} ${subject.label} (${subject.code}) course with {count} topics. Visual revision & past-paper marking.`,
    tagline: `${subject.code} · ${subject.label} · Cambridge marking`,
    keywords: [`${subject.code} past papers`, `Cambridge ${subject.label}`, `${subject.code} mark scheme`],
    topics: [subject.label, `Cambridge ${subject.code}`],
  }
}

export function buildSubjectMarkingSeo(subject: SubjectOption) {
  const profile = profileFor(subject)
  return {
    title: formatSerpTitle(profile.markingTitle, true),
    description: formatMetaDescription(profile.markingDescription),
    keywords: profile.keywords,
    tagline: profile.tagline,
    topics: profile.topics,
    path: `/subjects/${subject.code}`,
    ogImagePath: `/subjects/${subject.code}/opengraph-image`,
  }
}

export function buildSubjectCourseSeo(course: CourseSeoContext, lessonCount: number) {
  const profile = getSubjectSeoProfile(course.code)
  if (!profile) {
    return {
      title: formatSerpTitle(`Free ${course.name} ${course.code} course — all topics`, true),
      description: formatMetaDescription(
        `Free Cambridge ${course.level} ${course.name} (${course.code}) course with ${lessonCount} syllabus topics. Visual lessons & past-paper marking.`
      ),
      keywords: [`free ${course.code} course`, `${course.code} notes free`, `Cambridge ${course.code} revision`],
      tagline: `${course.code} · ${course.name} · Free course`,
      topics: [course.name, `Cambridge ${course.code}`],
      ogImagePath: `/courses/${course.code}/opengraph-image`,
    }
  }
  return {
    title: formatSerpTitle(profile.courseTitle, true),
    description: formatMetaDescription(
      profile.courseDescription.replace('{count}', String(lessonCount))
    ),
    keywords: [
      ...profile.keywords,
      `free ${course.code} course`,
      `${course.code} notes free`,
      `ZNotes ${course.code} alternative`,
    ],
    tagline: profile.tagline,
    topics: profile.topics,
    ogImagePath: `/courses/${course.code}/opengraph-image`,
  }
}
