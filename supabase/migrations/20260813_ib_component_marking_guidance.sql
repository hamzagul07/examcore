-- Operational examiner brief for a whole component.
--
-- Criterion and band rows already carried `marking_guidance`; the component did
-- not, and teacher support material turns out to discuss assessment holistically
-- far more than band by band. For the TOK essay it is the only level at which
-- real guidance exists, and it carries the instruction that matters most to a
-- holistic component: the mark is a global judgement, examiners do not use a
-- checklist, and not every aspect of a descriptor need be met for a mark in
-- that level.
--
-- Read by lib/ib/assessment-catalog.ts into ResolvedIbComponent.componentGuidance
-- and sent to the marker as `examiner_approach`.

alter table public.ib_component
  add column if not exists marking_guidance text;

comment on column public.ib_component.marking_guidance is
  'Operational examiner brief for the component as a whole, from teacher support material. Sits alongside the verbatim criteria, never replacing them. Teacher support material discusses assessment holistically far more than band by band, so this is often the only level at which real guidance exists.';
