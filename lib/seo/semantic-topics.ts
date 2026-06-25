import type { ContentClusterId } from '@/lib/seo/clusters'

/**
 * Semantic completeness — entities & subtopics expected for NLP/embedding relevance.
 * Use when refreshing posts: cover unchecked items in H2 sections.
 */
export const CLUSTER_SEMANTIC_ENTITIES: Record<ContentClusterId, string[]> = {
  'past-paper-marking': [
    'mark scheme',
    'self-marking',
    'second marking pass',
    'lost marks log',
    'handwriting upload',
    'examiner standard',
    'strict marking',
  ],
  'mark-schemes': [
    'B1 M1 A1',
    'method marks',
    'accuracy marks',
    'level of response',
    'essay bands',
    'command words',
    'MCQ key',
  ],
  'revision-strategy': [
    'revision timetable',
    'past paper schedule',
    'mock exam',
    'timed conditions',
    'spaced practice',
  ],
  'exam-technique': [
    'examiner report',
    'photograph answers',
    'presentation of working',
    'time management',
  ],
  'subject-guides': [
    'syllabus code',
    'paper components',
    'grade boundaries',
    'topic list',
  ],
  'subject-choice': [
    'university requirements',
    'subject combinations',
    'facilitating subjects',
    'workload',
  ],
  'exam-integrity': [
    'exam leaks',
    'AI policy',
    'academic integrity',
    'May June series',
  ],
  'resources-tools': [
    'official past papers',
    'mark scheme PDF',
    'examiner report',
    'tutor vs self-study',
  ],
  'grade-boundaries': [
    'grade threshold',
    'raw mark',
    'percentage uniform mark',
    'A* to E boundaries',
    'results day',
    'grade conversion',
    'component marks',
  ],
  'command-words': [
    'command word',
    'explain vs describe',
    'evaluate',
    'discuss',
    'justify',
    'assessment objective',
    'mark scheme phrasing',
  ],
  'free-alternatives': [
    'free revision notes',
    'official Cambridge PDFs',
    'free past papers',
    'free mark scheme',
    'free AI marking',
    'paid vs free',
  ],
  ib: [
    'IB Diploma Programme',
    'Higher Level and Standard Level',
    'markbands',
    'assessment criteria',
    'Papers 1, 2 and 3',
    'May and November sessions',
    'internal assessment',
    'topic practice',
    'free IB courses',
    'criterion marking',
    'Theory of Knowledge',
    'Extended Essay',
    'Group 6 arts',
    'command terms',
  ],
}

export function getSemanticChecklist(clusterId: ContentClusterId): string[] {
  return CLUSTER_SEMANTIC_ENTITIES[clusterId] ?? []
}
