/**
 * Shared shapes for the teacher system (docs/TEACHER_SYSTEM_SPEC.md §2.1).
 *
 * Every package in the v2 build codes against these, so they change only by
 * agreement: a field added here is a field every loader, route and component
 * must then honour. Row types mirror the columns created in
 * supabase/migrations/20260926{a,b,c}_teacher_v2_*.sql; timestamps are ISO
 * strings as PostgREST returns them, and `numeric` columns arrive as numbers.
 *
 * Types only — no runtime code — so this module is safe to import from
 * client components, server code and tests alike.
 */

export type AssignmentKind = 'question_set' | 'whole_paper' | 'topic_drill' | 'practice_prompt'
export type AssignmentSource = 'manual' | 'blindspot' | 'error_group' | 'reteach'
export type SubmissionStatus = 'submitted' | 'late' | 'reviewed'
export type ReviewDecision = 'confirm' | 'override' | 'flag'
export type MembershipStatus = 'active' | 'removed' | 'left'
export type ClassroomSettings = { notify_submissions?: 'daily' | 'off'; demo?: boolean; student_can_see_class_avg?: boolean }

export type Classroom = { id: string; teacher_id: string; name: string; description: string | null; invite_code: string;
  board: string; level: string; subject: string; subject_code: string | null; year_group: string | null;
  archived_at: string | null; settings: ClassroomSettings; created_at: string; updated_at: string }

export type Assignment = { id: string; classroom_id: string; teacher_id: string; title: string; instructions: string | null;
  kind: AssignmentKind; subject_code: string; is_mock: boolean; source: AssignmentSource; source_ref: Record<string, unknown> | null;
  target: 'all' | 'students'; due_at: string | null; published_at: string | null; closed_at: string | null; archived_at: string | null;
  reconciled_at: string | null; settings: { timed_minutes?: number; allow_late?: boolean }; created_at: string; updated_at: string }

export type AssignmentItem = { id: string; assignment_id: string; position: number; item_type: 'past_paper_question' | 'whole_paper' | 'prompt';
  mark_scheme_id: string | null; paper_code: string | null; paper_session: string | null; question_number: string | null;
  total_marks: number | null; syllabus_tags: string[] | null; topic_code: string | null; prompt_text: string | null; ib_component_key: string | null }

export type AssignmentSubmission = { id: string; assignment_id: string; item_id: string; student_id: string; attempt_id: string | null;
  attempt_count: number; marks_earned: number | null; total_marks: number | null; status: SubmissionStatus; source: 'linked' | 'reconciled';
  first_submitted_at: string; last_submitted_at: string }

export type AssignmentStudentFlags = { assignment_id: string; student_id: string; excused_at: string | null; extended_due_at: string | null;
  feedback: string | null; feedback_at: string | null; reminded_at: string | null }

export type StudentItemState = 'done' | 'late' | 'reviewed' | 'missing' | 'excused' | 'left'
export type StudentAssignmentState = { student_id: string; display_name: string; membership: MembershipStatus;
  items: Array<{ item_id: string; state: StudentItemState; marks_earned: number | null; total_marks: number | null; attempt_id: string | null }>;
  overall_pct: number | null; is_late: boolean; excused: boolean; extended_due_at: string | null; feedback: string | null }

export type AssignmentProgress = { assignment_id: string; total_students: number; handed_in: number; late: number; excused: number;
  missing: number; left: number; class_mean_pct: number | null; per_item: Array<{ item_id: string; mean_pct: number | null; n: number }>;
  students: StudentAssignmentState[] }

export type AssignmentSummary = Pick<Assignment, 'id' | 'title' | 'kind' | 'due_at' | 'published_at' | 'closed_at' | 'is_mock'> &
  { item_count: number; handed_in: number; late: number; total_students: number; status: 'draft' | 'open' | 'closed' }

export type TeacherFeedback = { id: string; attempt_id: string; student_id: string; teacher_id: string; classroom_id: string | null;
  body: string; created_at: string; read_at: string | null }

export type RosterStudent = { id: string; full_name: string | null; board: string | null; level: string | null; joined_at: string;
  status: MembershipStatus; last_attempt_at: string | null; due_count: number; open_late: number }

export type ClassWeek = { classroom_id: string; week: string; assignments: AssignmentSummary[]; submissions_delta: number;
  silent_students: Array<{ id: string; display_name: string; days_silent: number }>;
  struggling: Array<{ id: string; display_name: string; pct: number }>; improving: Array<{ id: string; display_name: string; delta_pct: number }>;
  headline_gap: string | null; unreviewed: number }

export type TeacherOverview = { classes: Array<{ id: string; name: string; subject_code: string | null; members: number; open_assignments: number;
  due_this_week: number; unreviewed: number; late_students: number; headline_gap: string | null; archived: boolean }>;
  needs_you: { unreviewed: number; late_students: number; silent_classes: number } }

export type ReviewQueueItem = { attempt_id: string; student_id: string; display_name: string; classroom_id: string | null; assignment_id: string | null;
  created_at: string; marks_earned: number; total_marks: number; decision: ReviewDecision | null; priority: number; reasons: string[] }

export type ErrorGroup = { key: string; label: string; classification: string; leaf_code: string | null; student_ids: string[]; evidence_count: number }

export type ItemInput = { item_type: 'past_paper_question'; paper_code: string; paper_session: string; question_number: string }
  | { item_type: 'whole_paper'; paper_code: string; paper_session: string }
  | { item_type: 'prompt'; prompt_text: string; total_marks?: number; ib_component_key?: string }
  | { item_type: 'topic'; topic_code: string; per_topic?: number }              // resolved server-side into past_paper_question rows
export type AssignmentDraftInput = { title: string; kind: AssignmentKind; instructions?: string; due_at?: string | null; is_mock?: boolean;
  items: ItemInput[]; settings?: Assignment['settings']; publish: boolean; source?: AssignmentSource; source_ref?: Record<string, unknown>;
  target?: 'all' | { student_ids: string[] } }
export type ApiError = { error: string; field?: string }
