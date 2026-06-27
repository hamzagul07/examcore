export type BlogHubVariant = 'default' | 'subject' | 'ib' | 'ib-ia' | 'grade-boundaries'

export type BlogHubPlacement = 'inline' | 'footer'

export type BlogHubPerk = {
  id: string
  label: string
}

export type BlogHubStep = {
  id: string
  label: string
  detail: string
}

export type BlogHubCopy = {
  kicker: string
  titleEmphasis: string
  titleBefore: string
  titleAfter: string
  lead: string
  signupLabel: string
  perks: BlogHubPerk[]
  steps: BlogHubStep[]
  footnote: string
  trustLine: string
  showSubjectGuidesSecondary: boolean
  showCalculatorSecondary: boolean
  secondaryGuidesLabel: string | null
}

export type BlogHubCopyInput = {
  variant: BlogHubVariant
  placement: BlogHubPlacement
  subjectCode?: string | null
  subjectName?: string | null
}

function subjectLabel(code: string | null | undefined, name: string | null | undefined): string {
  if (!code) return 'your subjects'
  if (name && name !== code) return `${code} ${name}`
  return code
}

function inlineLead(intro: string, placement: BlogHubPlacement): string {
  if (placement === 'footer') {
    return `${intro} Start with a free account — setup takes about a minute.`
  }
  return intro
}

export function buildBlogHubCopy(input: BlogHubCopyInput): BlogHubCopy {
  const { variant, placement, subjectCode, subjectName } = input
  const label = subjectLabel(subjectCode, subjectName)
  const shortName = subjectName || subjectCode

  const defaultSteps: BlogHubStep[] = [
    { id: 'subjects', label: 'Pick subjects', detail: '~60 sec' },
    { id: 'return', label: 'Return here', detail: 'Same guide' },
    { id: 'updates', label: 'Get updates', detail: 'Exam season' },
  ]

  const trustLine = 'No card required · Free forever tier · 7-day Pro trial'

  if (variant === 'grade-boundaries') {
    return {
      kicker: 'Exam season',
      titleBefore: 'Boundary alerts for ',
      titleEmphasis: shortName ? label : 'your papers',
      titleAfter: '',
      lead: inlineLead(
        `Thresholds change every series. A free account saves ${shortName ? label : 'your subjects'}, pings you when new boundaries drop, and keeps this guide on your dashboard with a grade calculator ready to go.`,
        placement
      ),
      signupLabel: 'Create hub + boundary alerts',
      perks: [
        { id: 'subjects', label: 'Saved subjects' },
        { id: 'alerts', label: 'Threshold alerts' },
        { id: 'calc', label: 'Grade calculator' },
      ],
      steps: [
        { id: 'subjects', label: 'Save papers', detail: '~60 sec' },
        { id: 'alerts', label: 'Get alerts', detail: 'When published' },
        { id: 'calc', label: 'Estimate grade', detail: 'Any time' },
      ],
      footnote:
        'Use the grade calculator any time as a guest — signup saves your subjects and turns on reminders.',
      trustLine,
      showSubjectGuidesSecondary: Boolean(subjectCode),
      showCalculatorSecondary: true,
      secondaryGuidesLabel: subjectCode ? `${subjectCode} boundary guide` : null,
    }
  }

  if (variant === 'ib-ia') {
    return {
      kicker: 'Internal Assessment',
      titleBefore: 'IA guides for ',
      titleEmphasis: shortName ? label : 'your subjects',
      titleAfter: '',
      lead: inlineLead(
        'Criterion explainers, methodology checklists, and band-by-band feedback — matched to your IB subjects after a quick setup. Marking unlocks when you start drafting.',
        placement
      ),
      signupLabel: 'Create free revision hub',
      perks: [
        { id: 'ia', label: 'IA criterion guides' },
        { id: 'return', label: 'Back to this guide' },
        { id: 'trial', label: '7-day Pro trial' },
      ],
      steps: defaultSteps,
      footnote: 'Band-by-band IA marking is one tap away after signup — no card to start.',
      trustLine,
      showSubjectGuidesSecondary: Boolean(subjectCode),
      showCalculatorSecondary: false,
      secondaryGuidesLabel: subjectCode ? `More ${subjectCode} guides` : null,
    }
  }

  if (variant === 'ib') {
    return {
      kicker: 'IB Diploma',
      titleBefore: 'Your ',
      titleEmphasis: 'IB revision hub',
      titleAfter: '',
      lead: inlineLead(
        'Markband explainers, past-paper guides, and topic practice — filtered to your HL and SL papers. One account, one place for everything you looked up today.',
        placement
      ),
      signupLabel: 'Create free revision hub',
      perks: [
        { id: 'ib', label: 'HL & SL matched' },
        { id: 'return', label: 'Back to this guide' },
        { id: 'trial', label: '7-day Pro trial' },
      ],
      steps: defaultSteps,
      footnote: 'Criterion marking and topic practice unlock when you want to test yourself.',
      trustLine,
      showSubjectGuidesSecondary: Boolean(subjectCode),
      showCalculatorSecondary: false,
      secondaryGuidesLabel: subjectCode ? `More ${subjectCode} guides` : null,
    }
  }

  if (variant === 'subject' && subjectCode) {
    return {
      kicker: 'Keep learning',
      titleBefore: 'More ',
      titleEmphasis: label,
      titleAfter: ' guides',
      lead: inlineLead(
        `Everything for ${label} in one hub — past-paper guides, your subject community room, and exam-season updates. Setup takes about a minute, then you're back here.`,
        placement
      ),
      signupLabel: 'Create free revision hub',
      perks: [
        { id: 'subject', label: `${subjectCode} matched` },
        { id: 'return', label: 'Back to this guide' },
        { id: 'trial', label: '7-day Pro trial' },
      ],
      steps: defaultSteps,
      footnote: `Marking and free courses for ${subjectCode} are there when you want them — no card to start.`,
      trustLine,
      showSubjectGuidesSecondary: true,
      showCalculatorSecondary: false,
      secondaryGuidesLabel: `All ${subjectCode} guides`,
    }
  }

  return {
    kicker: 'Keep learning',
    titleBefore: 'Build your ',
    titleEmphasis: 'revision hub',
    titleAfter: '',
    lead: inlineLead(
      'You came for the answer. A free account tailors Cambridge and IB guides to your board and subjects, brings you back here after setup, and unlocks exam-season alerts.',
      placement
    ),
    signupLabel: 'Create free revision hub',
    perks: [
      { id: 'subjects', label: 'Your subjects' },
      { id: 'return', label: 'Back to this guide' },
      { id: 'trial', label: '7-day Pro trial' },
    ],
    steps: defaultSteps,
    footnote: 'Marking and free courses are there when you want them — no card to start.',
    trustLine,
    showSubjectGuidesSecondary: false,
    showCalculatorSecondary: false,
    secondaryGuidesLabel: null,
  }
}
