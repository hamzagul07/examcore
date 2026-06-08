-- Paper 3 practical and Paper 5 planning both assess errors/uncertainties skills.
UPDATE syllabus_objectives
SET examined_in_papers = (
  SELECT array_agg(DISTINCT p ORDER BY p)
  FROM unnest(examined_in_papers || ARRAY['3', '5']::text[]) AS p
)
WHERE subject_code = '9702'
  AND topic_code = '1.3';
