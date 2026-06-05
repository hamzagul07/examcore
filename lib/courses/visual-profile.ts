import type { VisualTemplate } from '@/lib/courses/visual-types'
import type { CourseLesson } from '@/lib/courses/types'

const RULES: { template: VisualTemplate; pattern: RegExp }[] = [
  {
    template: 'circuit',
    pattern:
      /electric|current|resistance|circuit|voltage|capacitor|magnetic|field line|ohm|kirchhoff|divider|rectif/i,
  },
  {
    template: 'waves',
    pattern: /wave|interference|diffraction|polaris|doppler|stationary|spectrum|superposition|oscillation|harmonic/i,
  },
  {
    template: 'forces',
    pattern: /force|momentum|motion|equilibrium|vector|newton|kinematic|circular|projectile|density|pressure/i,
  },
  {
    template: 'energy',
    pattern: /energy|power|work|thermal|heat|thermodynamic|gas|entropy|internal energy/i,
  },
  {
    template: 'cell',
    pattern: /cell|membrane|transport|enzyme|protein|organelle|mitosis|microscope|water|fluid mosaic/i,
  },
  {
    template: 'molecule',
    pattern: /dna|rna|nucleic|replication|atom|mole|bond|organic|electrolysis|stoichiometry/i,
  },
  {
    template: 'genetics',
    pattern: /gene|allele|phenotype|genotype|inheritance|variation|evolution|selection|vaccin|immune/i,
  },
]

export function detectVisualTemplate(
  subjectCode: string,
  lesson: Pick<CourseLesson, 'title' | 'topicCode'>
): VisualTemplate {
  const hay = `${lesson.title} ${lesson.topicCode} ${subjectCode}`
  for (const { template, pattern } of RULES) {
    if (pattern.test(hay)) return template
  }
  if (subjectCode.startsWith('97')) return 'process'
  return 'process'
}

export function diagramPath(subjectCode: string, slug: string): string {
  return `/courses/diagrams/${subjectCode}/${slug}.png`
}
