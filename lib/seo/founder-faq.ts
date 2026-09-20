import { CONTACT_EMAIL, SITE_NAME, SITE_URL } from '@/lib/site-config'
import { DEFAULT_BLOG_AUTHOR } from '@/lib/seo/authors'

/**
 * The founder page's Q&A — rendered on the page and emitted as FAQPage schema.
 *
 * Written as the direct answers a name query wants ("who is…", "who founded…"),
 * so a search engine or answer engine can lift a sentence that ties the person
 * to the company in one breath. Every fact here also appears on /about or in
 * the Organization schema; nothing is claimed only in this file.
 */
export const FOUNDER_FAQ: { q: string; a: string }[] = [
  {
    q: `Who is ${DEFAULT_BLOG_AUTHOR.name}?`,
    a: `${DEFAULT_BLOG_AUTHOR.name} is the founder and CEO of ${SITE_NAME}, the second-pass marking platform for Cambridge International and IB past papers. He started building it in late 2024 as a Cambridge A-Level student, after marking his own mock papers by hand and finding it took longer than the paper itself.`,
  },
  {
    q: `Who founded ${SITE_NAME}?`,
    a: `${SITE_NAME} was founded by ${DEFAULT_BLOG_AUTHOR.name}, who runs it as CEO. The first prototype, in early 2025, marked one subject (Cambridge 9709 Mathematics) from his own handwriting; it now marks Cambridge, IB and Edexcel International A-Level papers and publishes free syllabus courses.`,
  },
  {
    q: `What does ${SITE_NAME} do?`,
    a: `${SITE_NAME} marks handwritten past-paper answers against the official Cambridge mark schemes and IB markbands, mark by mark, and shows the result as examiner's ink on the student's own script. Around the marking sit free courses for every syllabus it covers and Exam Room, a student community.`,
  },
  {
    q: `How can I contact ${DEFAULT_BLOG_AUTHOR.name}?`,
    a: `Email ${CONTACT_EMAIL}, or use the LinkedIn and GitHub profiles listed on ${SITE_URL}/hamza-gul-hassan. Press facts and methodology are at ${SITE_URL}/research.`,
  },
]

/** Fact list for the page's "At a glance" block. Same sources as the FAQ. */
export const FOUNDER_AT_A_GLANCE: { term: string; value: string }[] = [
  { term: 'Name', value: DEFAULT_BLOG_AUTHOR.name },
  { term: 'Role', value: `${DEFAULT_BLOG_AUTHOR.role}, ${SITE_NAME}` },
  { term: 'Company', value: `${SITE_NAME} (markscheme.app)` },
  { term: 'Started', value: 'Late 2024 as a student project; first prototype early 2025' },
  { term: 'Builds', value: 'Second-pass marking for Cambridge, IB and Edexcel IAL past papers; free syllabus courses; Exam Room' },
  { term: 'Contact', value: CONTACT_EMAIL },
]
