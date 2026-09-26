import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { resolveSiteUrl } from '@/lib/site-url'
import { loadAssignmentPrint } from '@/lib/teacher/assignments'
import { isTeacherV2 } from '@/lib/teacher/flags'
import { TeacherBackLink, TeacherPageContainer } from '@/components/teacher/TeacherPageChrome'
import { AssignmentPrintSheet } from '@/components/teacher/assignments/AssignmentPrintSheet'
import { PrintButton } from '@/components/teacher/assignments/PrintButton'
import { setHref } from '@/components/teacher/assignments/links'
import { requestTimeZone } from '../../_lib/context'
import { requireSetContext } from '../../_lib/set-context'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string; aid: string }> }

export const metadata: Metadata = { title: 'Print set' }

/**
 * The printable handout for a set (docs/TEACHER_SYSTEM_SPEC.md §4
 * `.../assignments/[aid]/print`). Ownership first (the set must be this
 * class's), then loadAssignmentPrint — question text and marks, never the
 * scheme. On paper only the sheet prints: the back link and the button are
 * `print:hidden`, and the teacher frame's own @media print rules drop the nav.
 */
export default async function SetPrintPage({ params }: Props) {
  if (!isTeacherV2()) notFound()
  const { id, aid } = await params
  const { supabase, admin, classroom } = await requireSetContext(
    id,
    aid,
    `/teacher/classroom/${id}/assignments/${aid}/print`
  )
  const [model, timeZone] = await Promise.all([loadAssignmentPrint(supabase, admin, aid), requestTimeZone()])
  if (!model) notFound()

  return (
    <TeacherPageContainer className="ms-teacher-page">
      <div className="print:hidden">
        <TeacherBackLink href={setHref(classroom.id, aid)}>← Back to the set</TeacherBackLink>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="m-0 max-w-xl text-sm text-[var(--ec-text-secondary)]">
            Question text and marks only — never the mark scheme. The join code is at the foot of the sheet.
          </p>
          <PrintButton label="Print this sheet" />
        </div>
      </div>
      <AssignmentPrintSheet model={model} origin={resolveSiteUrl()} timeZone={timeZone} />
    </TeacherPageContainer>
  )
}
