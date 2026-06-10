import { createPageMetadata } from '@/lib/seo/metadata'
import { getCourseCatalog } from '@/lib/courses'
import {
  countCourseUnits,
  courseCatalogMeta,
  type CourseCatalogEntry,
} from '@/lib/courses/catalog-display'
import { getCatalogSubject } from '@/lib/subjects-catalog'
import { MarketingPageShell } from '@/components/marketing/MarketingPageShell'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { CoursesCatalogGrid } from '@/components/courses/CoursesCatalogGrid'

export const metadata = createPageMetadata({
  title: 'Free Cambridge A-Level & O-Level courses — topic by topic',
  description:
    'Free syllabus-aligned courses for Cambridge A-Level and O-Level. Learn every topic step by step, then practise past papers with real mark scheme marking on MarkScheme.',
  path: '/courses',
  keywords: [
    'free A Level course',
    'free Cambridge notes',
    'ZNotes alternative',
    'A Level revision free',
    'Cambridge syllabus topics',
    '9709 course free',
  ],
})

function buildCatalogEntries(): CourseCatalogEntry[] {
  return getCourseCatalog().map((course) => {
    const catalog = getCatalogSubject(course.code)
    return {
      code: course.code,
      name: course.name,
      level: course.level,
      lessonCount: course.lessonCount,
      publishedCount: course.publishedCount,
      path: course.path,
      units: countCourseUnits(course.code),
      meta: courseCatalogMeta(course),
      glyph: catalog?.glyph ?? course.name.charAt(0),
      color: catalog?.color ?? 'var(--ec-brand)',
    }
  })
}

export default function CoursesIndexPage() {
  const entries = buildCatalogEntries()

  return (
    <MarketingPageShell>
      <PageJsonLd
        path="/courses"
        title="Free Cambridge courses"
        description="Syllabus-aligned free courses for Cambridge International A-Level and O-Level subjects."
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Free courses', path: '/courses' },
        ]}
      />

      <div className="ms-pg ms-course-hero">
        <p className="ms-overline">Courses · 100% free, forever</p>
        <h1 className="ms-h2" style={{ fontSize: 'clamp(36px, 5vw, 56px)' }}>
          Premium courses, <em>without the premium.</em>
        </h1>
        <p className="ms-lead">
          Syllabus-aligned, topic by topic — with a real Cambridge past-paper
          question for every syllabus point. Learn it, practise it, mark it.
        </p>

        <CoursesCatalogGrid courses={entries} />

        <p className="ms-micro" style={{ marginTop: 28 }}>
          FLASHCARDS · WORKED EXAMPLES · EXAM TIPS · &ldquo;EXPLAIN SIMPLER&rdquo; ON
          EVERY LESSON
        </p>
      </div>
    </MarketingPageShell>
  )
}
