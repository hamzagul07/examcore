-- Normalize off-enum ai_marking.marking_style values.
--
-- The marker prompt asks the model to echo `marking_style`, and its raw output
-- was written into attempts.ai_marking (jsonb) without coercion, so a few rows
-- carry hallucinated labels that are not part of the MarkingStyle enum
-- ('mcq' | 'point_based' | 'level_of_response' | 'mixed'). The known bad values
-- ('level_based', 'levels_based') are both level-of-response marking, so map
-- them to 'level_of_response'. The code fix (coerceMarkingStyle) prevents new
-- off-enum values from being written going forward.
--
-- Idempotent: only touches rows whose current value is one of the bad labels.

update attempts
set ai_marking = jsonb_set(
  ai_marking,
  '{marking_style}',
  '"level_of_response"'::jsonb,
  false
)
where ai_marking->>'marking_style' in ('level_based', 'levels_based');
