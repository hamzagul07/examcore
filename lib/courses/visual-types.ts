export type VisualTemplate =
  | 'circuit'
  | 'waves'
  | 'forces'
  | 'energy'
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

export type VisualBlock =
  | {
      type: 'hero-visual'
      template: VisualTemplate
      title: string
      caption: string
    }
  | {
      type: 'step-carousel'
      title: string
      steps: VisualStep[]
    }
  | {
      type: 'formula-visual'
      expression: string
      parts: FormulaPart[]
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
