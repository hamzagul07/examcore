export type VisualTemplate =
  | 'circuit'
  | 'waves'
  | 'forces'
  | 'energy'
  | 'thermal'
  | 'cell'
  | 'molecule'
  | 'genetics'
  | 'process'

export type VisualStep = {
  label: string
  detail: string
}

export type FormulaPart = {
  symbol: string
  meaning: string
  color?: string
}

export type SnapshotCard = {
  title: string
  body: string
}

export type QuickCheckItem = {
  prompt: string
  answer: string
}

export type FlashcardItem = {
  front: string
  back: string
}

export type VisualBlock =
  | {
      type: 'hero-visual'
      template: VisualTemplate
      title: string
      caption: string
    }
  | {
      type: 'learning-path'
      title: string
      steps: VisualStep[]
    }
  | {
      type: 'step-carousel'
      title: string
      steps: VisualStep[]
    }
  | {
      type: 'concept-map'
      center: string
      nodes: string[]
    }
  | {
      type: 'key-terms'
      title: string
      terms: { term: string; definition: string }[]
    }
  | {
      type: 'quick-check'
      title: string
      items: QuickCheckItem[]
    }
  | {
      type: 'flashcards'
      title: string
      cards: FlashcardItem[]
    }
  | {
      type: 'formula-visual'
      description: string
      expressions: string[]
      expression: string
      parts: FormulaPart[]
    }
  | {
      type: 'comparison-table'
      title: string
      caption?: string
      columns: string[]
      rows: { property: string; cells: string[] }[]
    }
  | {
      type: 'snapshots'
      title: string
      cards: SnapshotCard[]
    }
  | {
      type: 'compare'
      title: string
      simple: { title: string; points: string[] }
      exam: { title: string; points: string[] }
    }
  | {
      type: 'diagram-image'
      src: string
      alt: string
      caption?: string
    }
  | {
      type: 'worked-visual'
      question: string
      solution: string
    }
  | {
      type: 'exam-tip'
      content: string
    }
  | {
      type: 'practice-cta'
      label: string
      href: string
    }

export type EnrichedVisualLesson = {
  template: VisualTemplate
  blocks: VisualBlock[]
}
