import { LoadingLink } from '@/components/ui/LoadingLink'

/**
 * 404 for everything under /teacher — a class that was deleted, a set from
 * another teacher's class, a review link for a student who has since left.
 * Rendered inside the teacher layout (pages call notFound() on an empty RLS
 * read), so the frame stays and the way back is the desk, not the homepage.
 *
 * Deliberately says the same thing for "does not exist" and "not yours": the
 * difference is exactly what an id-guessing visitor would want to learn.
 */
export default function TeacherNotFound() {
  return (
    <section className="ms-teacher-notfound" aria-labelledby="teacher-404-title">
      <span className="ms-teacher-notfound__stamp" aria-hidden>
        404
      </span>
      <h1 id="teacher-404-title" className="ms-teacher-notfound__title">
        Not on your desk
      </h1>
      <p className="ms-teacher-notfound__body">
        This class, set or script isn&apos;t one of yours — or it has been deleted. If a student
        left the class, their work drops off your desk with them.
      </p>
      <span className="ms-teacher-notfound__note" aria-hidden>
        check the class code, then try again
      </span>
      <div className="ms-teacher-notfound__actions">
        <LoadingLink
          href="/teacher/dashboard"
          loadingText="Opening…"
          className="ec-btn-primary inline-flex min-h-[44px] items-center justify-center"
        >
          Back to your desk
        </LoadingLink>
        <LoadingLink
          href="/teacher/classrooms"
          loadingText="Opening…"
          className="ec-btn-ghost inline-flex min-h-[44px] items-center justify-center"
        >
          All classes
        </LoadingLink>
      </div>
    </section>
  )
}
