import { notFound } from 'next/navigation'
import { createPageMetadata } from '@/lib/seo/metadata'
import {
  getCourseLessons,
  getCourseSubject,
  getCourseSubjectCodes,
} from '@/lib/courses'
import { buildCourseSubjectSeo } from '@/lib/courses/seo'
import { CourseSubjectJsonLd } from '@/components/seo/CourseSubjectJsonLd'
import { CourseHubClient } from '@/components/courses/margin-notes/CourseHubClient'

type Props = {
  params: Promise<{ code: string }>
  searchParams: Promise<{ paper?: string }>
}

export async function generateStaticParams() {
  return getCourseSubjectCodes().map((code) => ({ code }))
}

export async function generateMetadata({ params }: Props) {
  const { code } = await params
  const course = getCourseSubject(code)
  if (!course) return {}
  const seo = buildCourseSubjectSeo(course, course.lessonCount)
  return createPageMetadata({
    title: seo.title,
    description: seo.description,
    path: course.path,
    keywords: seo.keywords,
  })
}

export default async function CourseSubjectPage({ params, searchParams }: Props) {
  const { code } = await params
  const { paper } = await searchParams
  const course = getCourseSubject(code)
  if (!course) notFound()

  const lessons = getCourseLessons(code)
  const seo = buildCourseSubjectSeo(course, course.lessonCount)

  return (
    <>
      <CourseSubjectJsonLd
        subjectCode={code}
        subjectName={course.name}
        level={course.level}
        description={seo.description}
        lessons={lessons}
      />
      <CourseHubClient
        code={code}
        name={course.name}
        level={course.level}
        lessons={lessons}
        initialPaperNumber={paper ?? null}
      />
    </>
  )
}
