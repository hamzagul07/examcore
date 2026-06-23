/**
 * Curated, fully-legal free IB resources we link out to (we do NOT host or copy
 * any of these). Makes /ib the best free IB jumping-off point. Notes are our own
 * short descriptions. Global links apply everywhere; per-subject links are keyed
 * by the subject base (slug without the -hl/-sl suffix).
 */
import type { IbSubject } from '@/lib/ib/catalog'

export type IbResource = {
  label: string
  href: string
  note: string
}

/** Always shown — the legitimate, free, board-level resources. */
export const IB_GLOBAL_RESOURCES: IbResource[] = [
  {
    label: 'IBO official specimen & sample papers',
    href: 'https://www.ibo.org/programmes/diploma-programme/assessment-and-exams/sample-exam-papers/',
    note: 'The only fully-official free past/specimen papers + markschemes — the gold standard, and format-accurate for the redesigned subjects.',
  },
  {
    label: 'RevisionDojo predicted papers',
    href: 'https://www.revisiondojo.com/predicted-papers',
    note: 'Free exam-style predicted papers written by ex-examiners, with markschemes and model answers (original, not redistributed IB material).',
  },
  {
    label: 'ibresources.cc',
    href: 'https://www.ibresources.cc/',
    note: 'Community hub indexing free notes, predicted-paper archives, score calculators and grade-boundary tools — the best single directory.',
  },
  {
    label: 'IB Academy study guides',
    href: 'https://www.ib.academy/',
    note: 'Free teacher-written study guides across most DP subjects.',
  },
]

/** Per-subject notes/worked-solution sites (teach the marking logic raw papers don't). */
const BY_SUBJECT: Record<string, IbResource[]> = {
  biology: [
    { label: 'BioNinja', href: 'https://ib.bioninja.com.au/', note: 'One-stop free IB Biology notes and diagrams.' },
  ],
  chemistry: [
    { label: 'IBChem.com', href: 'https://www.ibchem.com/', note: 'Free IB Chemistry notes aligned to the guide.' },
    { label: 'Richard Thornley (YouTube)', href: 'https://www.youtube.com/user/richthornley', note: 'Clear video walkthroughs of IB Chemistry topics.' },
  ],
  physics: [
    { label: 'Physics & Maths Tutor', href: 'https://www.physicsandmathstutor.com/', note: 'Free revision notes and question banks for Physics.' },
  ],
  'maths-aa': [
    { label: 'Christos Nikolaidis', href: 'https://www.christosnikolaidis.com/', note: 'The go-to free Maths AA/AI notes, questions and full solutions.' },
    { label: 'Revision Village (free tier)', href: 'https://www.revisionvillage.com/', note: 'Video tutorials to past-paper questions including every sub-part.' },
  ],
  'maths-ai': [
    { label: 'Christos Nikolaidis', href: 'https://www.christosnikolaidis.com/', note: 'The go-to free Maths AA/AI notes, questions and full solutions.' },
    { label: 'Revision Village (free tier)', href: 'https://www.revisionvillage.com/', note: 'Video tutorials to past-paper questions including every sub-part.' },
  ],
  economics: [
    { label: 'EconplusDal (YouTube)', href: 'https://www.youtube.com/@EconplusDal', note: 'Free Economics diagrams and exam-technique videos.' },
  ],
  'computer-science': [
    { label: 'Paul Baumgarten', href: 'https://pbaumgarten.com/', note: 'Free IB Computer Science notes for HL & SL.' },
  ],
  tok: [
    { label: 'IB Academy TOK guide', href: 'https://www.ib.academy/', note: 'Free TOK study guide and assessment tips.' },
  ],
  'extended-essay': [
    { label: 'IB Academy EE guide', href: 'https://www.ib.academy/', note: 'Free Extended Essay structure and criteria guide.' },
  ],
  cas: [
    { label: 'IB Academy CAS guide', href: 'https://www.ib.academy/', note: 'Free CAS learning outcomes and portfolio guidance.' },
  ],
  'visual-arts': [
    { label: 'IBO Visual Arts specimens', href: 'https://www.ibo.org/programmes/diploma-programme/assessment-and-exams/sample-exam-papers/', note: 'Official specimen comparative study and exhibition materials where published.' },
  ],
  theatre: [
    { label: 'IB Academy Theatre guide', href: 'https://www.ib.academy/', note: 'Free Theatre assessment component overview.' },
  ],
  music: [
    { label: 'IB Academy Music guide', href: 'https://www.ib.academy/', note: 'Free Music inquiry, experimentation and presentation guides.' },
  ],
  film: [
    { label: 'IBO Film specimens', href: 'https://www.ibo.org/programmes/diploma-programme/assessment-and-exams/sample-exam-papers/', note: 'Official specimen textual analysis and comparative study where published.' },
  ],
  dance: [
    { label: 'IB Academy Dance guide', href: 'https://www.ib.academy/', note: 'Free Dance composition and investigation guidance.' },
  ],
}

function subjectBase(slug: string): string {
  return slug.replace(/-(hl|sl)$/, '')
}

/** Subject-specific legit resources for an IB subject (excludes the globals). */
export function getIbSubjectResources(subject: Pick<IbSubject, 'slug'>): IbResource[] {
  return BY_SUBJECT[subjectBase(subject.slug)] ?? []
}

/** Global + subject-specific, for rendering a full resource block. */
export function getIbResources(subject: Pick<IbSubject, 'slug'>): IbResource[] {
  return [...getIbSubjectResources(subject), ...IB_GLOBAL_RESOURCES]
}
