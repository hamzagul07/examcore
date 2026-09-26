import type { Metadata } from 'next'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/service'
import { loadAssignmentGaps, reconcileAssignment, type AssignmentGaps } from '@/lib/teacher/assignments'
import { loadPublishedSets, type SetRow } from '@/lib/teacher-classroom-data'
import { isTeacherV2 } from '@/lib/teacher/flags'
import { teacherOmniContext } from '@/lib/teacher/insights/omni'
import { loadClassDue, loadClassGaps, loadSetItems, type ClassDue, type ClassGaps } from '@/lib/teacher/insights/server'
import type { AssignmentItem } from '@/lib/teacher/types'
import { OmniAIBridge } from '@/components/omni-ai/OmniAIBridge'
import { LoadingLink } from '@/components/ui/LoadingLink'
import { StatusMessage } from '@/components/ui/StatusMessage'
import { ClassBlindspots } from '@/components/teacher/ClassBlindspots'
import { ClassDeskHead } from '@/components/teacher/ClassDeskHead'
import { ClassDueList } from '@/components/teacher/ClassDueList'
import { ClassTabs } from '@/components/teacher/ClassTabs'
import { ClassroomSummary } from '@/components/teacher/ClassroomSummary'
import { TeacherPageContainer } from '@/components/teacher/TeacherPageChrome'
import { ErrorGroupsPanel } from '@/components/teacher/assignments/ErrorGroupsPanel'
import { ItemGapList } from '@/components/teacher/assignments/ItemGapList'
import { PrintButton } from '@/components/teacher/assignments/PrintButton'
import { composerHref, setHref } from '@/components/teacher/assignments/links'
import { setTopicCodes } from '@/components/teacher/assignments/set-display'
import { firstParam, requireClassContext } from '../assignments/_lib/context'
import { GapReport } from './_components/GapReport'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function pagePath(id: string): string {
  return `/teacher/classroom/${encodeURIComponent(id)}/gaps`
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const { classroom } = await requireClassContext(id, pagePath(id))
  return { title: `Gaps · ${classroom.name}` }
}

type Loaded<T> = { ok: true; value: T } | { ok: false }

function settle<T>(label: string, classroomId: string, work: Promise<T>): Promise<Loaded<T>> {
  return work.then(
    (value) => ({ ok: true as const, value }),
    (err: unknown) => {
      console.error(`[teacher/gaps] ${label} failed`, {
        classroomId,
        error: err instanceof Error ? err.message : String(err),
      })
      return { ok: false as const }
    }
  )
}

const UNREADABLE = 'Reload the page to try again. Nothing in the class has changed.'

/**
 * The Gaps tab (docs/TEACHER_SYSTEM_SPEC.md §4 `.../gaps`): where the class
 * loses marks, in its own subject, with the cohort gap report's existing
 * layout — plus a set filter, "Set a drill" calls to action, and the shared
 * mistakes panel.
 *
 * Whole class (default): the headline figures, the weakest syllabus topics,
 * the mark-type report, error groups and topics due for review — all over
 * the class's scoped work (active members, marked since joining, in the
 * class subject), from one read with per-mark detail.
 *
 * `?set=<id>`: the same report over that set's hand-ins, with the item by
 * item breakdown. Only a published set of THIS class is accepted.
 *
 * A server component: nothing about the class is fetched by the browser.
 * An archived class has no live marked work to read (spec conflict
 * rulings), so it says so rather than showing an empty report as a finding.
 */
export default async function ClassGapsPage({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams])
  const { supabase, classroom } = await requireClassContext(id, pagePath(id))

  const v2 = isTeacherV2()
  const archived = classroom.archived_at !== null
  const canSetWork = v2 && !archived
  // Service client only now that the class is proven to be the caller's.
  const admin = createServiceClient()

  // Sets are the teacher's own rows, readable through RLS whether or not the class is archived.
  const setsR = v2
    ? await settle('sets', classroom.id, loadPublishedSets(supabase, [classroom.id]))
    : ({ ok: true, value: [] } as Loaded<SetRow[]>)
  const sets = setsR.ok
    ? [...setsR.value].sort(
        (a, b) => Date.parse(b.published_at ?? '') - Date.parse(a.published_at ?? '') || a.title.localeCompare(b.title)
      )
    : []
  const requestedSet = firstParam(sp.set)?.toLowerCase() ?? null
  const selected = requestedSet ? (sets.find((s) => s.id === requestedSet) ?? null) : null

  // Everything the chosen view reads, in parallel, each part failing on its own.
  const [setGaps, classGaps, classDue] = await Promise.all([
    selected ? loadSetGaps(supabase, admin, selected.id, archived) : null,
    !selected && !archived ? settle('class gaps', classroom.id, loadClassGaps(supabase, admin, classroom)) : null,
    !selected && !archived ? settle('due topics', classroom.id, loadClassDue(supabase, admin, classroom)) : null,
  ])

  return (
    <TeacherPageContainer className="ms-teacher-page">
      <OmniAIBridge context={teacherOmniContext({ classroomId: classroom.id, view: 'gaps' })} />
      <ClassDeskHead
        classroom={classroom}
        eyebrow="Gaps"
        actions={<PrintButton label="Print report" />}
      />
      <ClassTabs classroomId={classroom.id} current="gaps" v2={v2} />

      {!classroom.subject_code ? (
        <StatusMessage className="mb-6 print:hidden">
          This class has no subject set, so its work isn&apos;t matched to a syllabus: topics, coverage and shared
          mistakes stay empty.{' '}
          <Link href={`/teacher/classroom/${encodeURIComponent(classroom.id)}/settings`} className="ec-link">
            Set the subject in Settings
          </Link>
        </StatusMessage>
      ) : null}

      {v2 && sets.length > 0 ? (
        <form
          className="ms-review-filters print:hidden"
          method="get"
          action={pagePath(classroom.id)}
          role="search"
          aria-label="Choose what the report covers"
        >
          <label className="ms-review-filters__field">
            <span className="ms-review-filters__label">Report on</span>
            <select name="set" className="ec-input" defaultValue={selected?.id ?? ''}>
              <option value="">The whole class — all marked work</option>
              {sets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                  {s.is_mock ? ' (mock)' : ''}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="ms-review-filters__submit ec-btn-secondary inline-flex items-center">
            Show
          </button>
        </form>
      ) : null}

      {!setsR.ok ? (
        <p className="mb-6 text-sm text-[var(--ec-text-secondary)]" role="status">
          The class&apos;s sets didn&apos;t load, so the report covers the whole class. Reload to filter by set.
        </p>
      ) : null}
      {requestedSet && setsR.ok && !selected ? (
        <p className="mb-6 text-sm text-[var(--ec-text-secondary)]" role="status">
          That set isn&apos;t one of this class&apos;s published sets, so the report covers the whole class.
        </p>
      ) : null}

      {selected && setGaps ? (
        <SetGaps
          classroomId={classroom.id}
          set={selected}
          archived={archived}
          canSetWork={canSetWork}
          gaps={setGaps}
        />
      ) : archived || !classGaps || !classDue ? (
        <section className="ms-teacher-empty mb-8" aria-labelledby="gaps-archived-title">
          <span className="ms-teacher-empty__icon" aria-hidden>
            ARC
          </span>
          <h2 id="gaps-archived-title" className="ms-teacher-empty__title">
            An archived class has no live report
          </h2>
          <p className="ms-teacher-empty__body">
            Its students&apos; current work is no longer read.
            {sets.length > 0 ? ' Choose a set above to see the marks it kept.' : ''}
          </p>
        </section>
      ) : (
        <ClassGapsView
          classroomId={classroom.id}
          subjectCode={classroom.subject_code}
          canSetWork={canSetWork}
          gaps={classGaps}
          due={classDue}
        />
      )}
    </TeacherPageContainer>
  )
}

type SetGapsData = { gaps: AssignmentGaps; items: AssignmentItem[] } | null

/**
 * One set's report. Hand-ins are brought up to date first (at most once a
 * minute — reconcileAssignment), best-effort: a failed reconcile still shows
 * what was already linked.
 */
async function loadSetGaps(
  supabase: Parameters<typeof loadAssignmentGaps>[0],
  admin: Parameters<typeof loadAssignmentGaps>[1],
  setId: string,
  archived: boolean
): Promise<Loaded<SetGapsData>> {
  if (!archived) {
    await reconcileAssignment(admin, setId).catch((err: unknown) => {
      console.error('[teacher/gaps] reconcile before set report failed', {
        assignmentId: setId,
        error: err instanceof Error ? err.message : String(err),
      })
    })
  }
  return settle(
    'set gaps',
    setId,
    Promise.all([loadAssignmentGaps(supabase, admin, setId), loadSetItems(supabase, setId)]).then(([gaps, items]) =>
      gaps ? { gaps, items } : null
    )
  )
}

function SetGaps({
  classroomId,
  set,
  archived,
  canSetWork,
  gaps,
}: {
  classroomId: string
  set: SetRow
  archived: boolean
  canSetWork: boolean
  gaps: Loaded<SetGapsData>
}) {
  if (!gaps.ok || !gaps.value) {
    return (
      <div className="ms-teacher-error mb-8" role="alert">
        <p className="ms-teacher-error__title">The report on {set.title} didn&apos;t load</p>
        <p className="ms-teacher-error__body">{UNREADABLE}</p>
      </div>
    )
  }
  const { gaps: data, items } = gaps.value
  const codes = setTopicCodes(items)

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-3 print:hidden">
        <LoadingLink
          href={setHref(classroomId, set.id)}
          loadingText="Opening…"
          className="ec-btn-secondary inline-flex min-h-[44px] items-center justify-center"
        >
          Open the set
        </LoadingLink>
        {canSetWork && codes.length > 0 && !data.report.insufficientEvidence ? (
          <LoadingLink
            href={composerHref(classroomId, { source: 'reteach', codes, set: set.id })}
            loadingText="Opening…"
            className="ec-btn-primary inline-flex min-h-[44px] items-center justify-center gap-2"
          >
            <span className="font-mono text-[11px] font-bold tracking-wide" aria-hidden>
              DRL
            </span>
            Set a drill on this set&apos;s topics
          </LoadingLink>
        ) : null}
      </div>

      {data.archived ? (
        <p className="mb-6 text-sm text-[var(--ec-text-secondary)]" role="status">
          This class is archived: its marks are kept, but the scripts behind them are no longer read, so there is no
          breakdown by kind of mark.
        </p>
      ) : null}

      <GapReport
        report={data.report}
        headline={data.headline}
        scope={`on ${set.title}`}
        emptyHint="It fills in once three hand-ins on this set are marked."
      />
      <ItemGapList
        classroomId={classroomId}
        assignmentId={set.id}
        items={items}
        gaps={data.per_item}
        headline={null}
        archived={archived}
      />
    </>
  )
}

function ClassGapsView({
  classroomId,
  subjectCode,
  canSetWork,
  gaps,
  due,
}: {
  classroomId: string
  subjectCode: string | null
  canSetWork: boolean
  gaps: Loaded<ClassGaps>
  due: Loaded<ClassDue>
}) {
  return (
    <>
      {gaps.ok ? (
        <>
          <ClassroomSummary summary={gaps.value.summary} />
          <ClassBlindspots classroomId={classroomId} blindspots={gaps.value.blindspots} canSetWork={canSetWork} />
          <GapReport
            report={gaps.value.report}
            headline={gaps.value.headline}
            scope="across the class"
            emptyHint={canSetWork ? 'Setting a question set is the quickest way to fill it.' : null}
            truncated={gaps.value.truncated}
          />
          <div className="print:hidden">
            <ErrorGroupsPanel
              classroomId={classroomId}
              groups={gaps.value.groups}
              names={gaps.value.names}
              canSetWork={canSetWork}
              truncated={gaps.value.truncated}
            />
          </div>
        </>
      ) : (
        <div className="ms-teacher-error mb-8" role="alert">
          <p className="ms-teacher-error__title">The class&apos;s marked work didn&apos;t load</p>
          <p className="ms-teacher-error__body">{UNREADABLE}</p>
        </div>
      )}

      <ClassDueList
        classroomId={classroomId}
        topics={due.ok ? due.value.topics : []}
        students={due.ok ? due.value.students : 0}
        error={due.ok ? null : UNREADABLE}
        canSetWork={canSetWork}
        showSubject={!subjectCode}
      />
    </>
  )
}
