export const DIAGRAM_LABEL_STYLE = {
  fontSize: 'clamp(12px, 1.5cqi, 15px)',
  fill: 'var(--course-read-text, var(--ec-text-primary))',
  fontFamily: 'var(--font-mono), "IBM Plex Mono", ui-monospace, monospace',
} as const

export const DIAGRAM_STROKE = 'var(--course-subject-accent, var(--ec-brand))'
export const DIAGRAM_FILL = 'var(--course-surface, var(--ec-surface-muted))'
export const DIAGRAM_TEXT = 'var(--course-read-text, var(--ec-text-primary))'

/**
 * High-class curve palette for economics / dual-series diagrams.
 * Demand = cool blue, supply = warm rose, equilibrium / highlight = gold.
 * CSS vars let Vault cinema override without rewriting every SVG.
 */
export const DIAGRAM_DEMAND = 'var(--diagram-demand, #1d4ed8)'
export const DIAGRAM_SUPPLY = 'var(--diagram-supply, #c2410c)'
export const DIAGRAM_EQUILIBRIUM = 'var(--diagram-eq, #b45309)'
export const DIAGRAM_GROWTH = 'var(--diagram-growth, #0f766e)'
export const DIAGRAM_INEFFICIENT = 'var(--diagram-mute, #78716c)'
export const DIAGRAM_AXIS = 'var(--diagram-axis, #44403c)'
export const DIAGRAM_GUIDE = 'var(--diagram-guide, #a8a29e)'
export const DIAGRAM_SHADE = 'var(--diagram-shade, rgba(29, 78, 216, 0.08))'
export const DIAGRAM_SHADE_WARM = 'var(--diagram-shade-warm, rgba(194, 65, 12, 0.08))'
