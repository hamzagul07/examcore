import type { CourseLesson, LessonInteractiveEmbed } from '@/lib/courses/types'
import { hasLessonLiveDiagram } from '@/lib/courses/lesson-diagrams'
import {
  PHET_RETAIN_WITH_NATIVE,
  preferNativeDiagramOverPlaceholder,
} from '@/lib/courses/placeholder-embeds'
import { resolveVisualCatalogSlug } from '@/lib/courses/visual-slug-aliases'

export type InteractiveEmbedProvider = LessonInteractiveEmbed['provider']

/** HTML5 PhET sim — standard embed path. */
export function phetHtml5EmbedUrl(simId: string): string {
  return `https://phet.colorado.edu/sims/html/${simId}/latest/${simId}_en.html`
}

/** Legacy Java sims ported with CheerpJ (e.g. photoelectric). */
export function phetCheerpjEmbedUrl(simId: string): string {
  return `https://phet.colorado.edu/sims/cheerpj/${simId}/latest/${simId}.html`
}

/** @deprecated Use phetHtml5EmbedUrl or phetCheerpjEmbedUrl */
export function phetEmbedUrl(simId: string): string {
  return phetHtml5EmbedUrl(simId)
}

export function phetSimPageUrl(simId: string): string {
  return `https://phet.colorado.edu/en/simulations/${simId}`
}

/**
 * GeoGebra material embed.
 * Note: geogebra.org/material/iframe/id/… returns 410 — use classic app URL.
 */
export function geogebraEmbedUrl(materialId: string): string {
  return `https://www.geogebra.org/classic?material=${materialId}`
}

export function geogebraMaterialPageUrl(materialId: string): string {
  /** Same host as embed — reliably opens the material in GeoGebra Classic. */
  return geogebraEmbedUrl(materialId)
}

const PHET_ATTRIBUTION = {
  source: 'PhET Interactive Simulations, University of Colorado Boulder',
  license: 'CC BY 4.0',
  sourceUrl: 'https://phet.colorado.edu',
} as const

const GEOGEBRA_ATTRIBUTION = {
  source: 'GeoGebra',
  license: 'GeoGebra Terms of Service',
  sourceUrl: 'https://www.geogebra.org',
} as const

function phetEntry(
  simId: string,
  title: string,
  hint: string,
  options?: { cheerpj?: boolean }
): LessonInteractiveEmbed {
  return {
    provider: 'phet',
    title,
    embedUrl: options?.cheerpj ? phetCheerpjEmbedUrl(simId) : phetHtml5EmbedUrl(simId),
    launchUrl: phetSimPageUrl(simId),
    hint,
    aspectRatio: '834 / 504',
    attribution: PHET_ATTRIBUTION,
  }
}

function geogebraEntry(
  materialId: string,
  title: string,
  hint: string
): LessonInteractiveEmbed {
  return {
    provider: 'geogebra',
    title,
    embedUrl: geogebraEmbedUrl(materialId),
    launchUrl: geogebraMaterialPageUrl(materialId),
    hint,
    aspectRatio: '834 / 504',
    attribution: GEOGEBRA_ATTRIBUTION,
  }
}

/**
 * Curated interactive sims for topics without a native diagram (or gold-standard dual-visual).
 * Lesson JSON may override via `interactiveEmbed`.
 */
const INTERACTIVE_EMBED_CATALOG_RAW: Record<string, LessonInteractiveEmbed> = {
  '22-2-photoelectric-effect': phetEntry(
    'photoelectric',
    'Photoelectric effect',
    'Increase frequency and intensity — see threshold frequency and photoelectron energy (22.2).',
    { cheerpj: true }
  ),
  '3-5-shapes-of-molecules': phetEntry(
    'molecule-shapes',
    'Molecule shapes',
    'Add bonding pairs and lone pairs — read the predicted VSEPR geometry (3.5).'
  ),
  // ── 9708 Economics (GeoGebra) ──────────────────────────────────────────
  '2-1-demand-and-supply-curves': geogebraEntry(
    'VGWtkPU5',
    'Supply and demand introduction',
    'Shift curves — read equilibrium price and quantity (9708 2.1).'
  ),
  '2-4-the-interaction-of-demand-and-supply': geogebraEntry(
    'SnqQmKsq',
    'Supply and demand shifts',
    'Move demand or supply — track new equilibrium P and Q (9708 2.4).'
  ),
  '2-2-price-elasticity-income-elasticity-and-cross-elasticity-of-demand': geogebraEntry(
    'SnqQmKsq',
    'Elasticity and equilibrium',
    'Steep vs flat demand — relate elasticity to price responsiveness (9708 2.2).'
  ),
  '1-5-production-possibility-curves': geogebraEntry(
    'hxJ5J2Rk',
    'Production possibility frontier',
    'Move along the PPC — opportunity cost and efficiency (9708 1.5).'
  ),
  // ── 9708 Macroeconomics ────────────────────────────────────────────────
  '4-3-aggregate-demand-and-aggregate-supply-analysis': geogebraEntry(
    'gvkgx8ga',
    'AD–AS model',
    'Shift AD or AS — read effects on real GDP and price level (9708 4.3).'
  ),
  '4-4-economic-growth': geogebraEntry(
    'gvkgx8ga',
    'AD–AS and growth',
    'Rightward LRAS or AD shift — link to economic growth (9708 4.4).'
  ),
  '4-5-unemployment': geogebraEntry(
    'n65waCV4',
    'Macro equilibrium shifts',
    'Recessionary gap — equilibrium below full employment (9708 4.5).'
  ),
  '4-6-price-stability': geogebraEntry(
    'gvkgx8ga',
    'AD–AS and inflation',
    'Demand-pull vs cost-push — trace price level changes (9708 4.6).'
  ),
  // ── 9708 Policy & trade ────────────────────────────────────────────────
  '5-2-fiscal-policy': geogebraEntry(
    'gvkgx8ga',
    'Fiscal policy AD–AS',
    'Government spending or tax shift — trace AD movement (9708 5.2).'
  ),
  '5-3-monetary-policy': geogebraEntry(
    'gvkgx8ga',
    'Monetary policy AD–AS',
    'Interest rate effect on AD — consumption and investment channel (9708 5.3).'
  ),
  '5-4-supply-side-policy': geogebraEntry(
    'gvkgx8ga',
    'Supply-side LRAS shift',
    'Rightward LRAS — productivity and incentive effects (9708 5.4).'
  ),
  '6-1-the-reasons-for-international-trade': geogebraEntry(
    'VGWtkPU5',
    'Comparative advantage trade',
    'Specialisation and exchange — lower opportunity cost drives trade (9708 6.1).'
  ),
  // ── 9708 International macro batch 5 ─────────────────────────────────
  '6-2-protectionism': geogebraEntry(
    'SnqQmKsq',
    'Trade and tariff effects',
    'Tariff on imports — deadweight loss and consumer surplus change (9708 6.2).'
  ),
  '6-3-current-account-of-the-balance-of-payments': geogebraEntry(
    'gvkgx8ga',
    'Macro flows and AD',
    'Link net exports (X−M) to aggregate demand and the current account (9708 6.3).'
  ),
  '6-4-exchange-rates': geogebraEntry(
    'VGWtkPU5',
    'Exchange rate and trade',
    'Currency depreciation — effect on export competitiveness (9708 6.4).'
  ),
  // ── 9708 A Level micro batch 6 ─────────────────────────────────────────
  '7-2-indifference-curves-and-budget-lines': geogebraEntry(
    'SnqQmKsq',
    'Budget and choice',
    'Budget line pivot — utility maximisation at tangency (9708 7.2).'
  ),
  '7-3-efficiency-and-market-failure': geogebraEntry(
    'VGWtkPU5',
    'Efficiency and welfare',
    'Deadweight loss when market quantity ≠ socially optimal (9708 7.3).'
  ),
  '7-4-private-costs-and-benefits-externalities-and-social-costs-and-benefits': geogebraEntry(
    'SnqQmKsq',
    'Externalities diagram',
    'MSC > MPC — overproduction and welfare loss from negative externality (9708 7.4).'
  ),
  '7-6-different-market-structures': geogebraEntry(
    'VGWtkPU5',
    'Market structures',
    'Compare demand curves facing firms — perfect competition vs monopoly (9708 7.6).'
  ),
  // ── 9708 A Level macro batch 7 ─────────────────────────────────────────
  '8-1-government-policies-to-achieve-efficient-resource-allocation-and-correct-market-failure':
    geogebraEntry(
      'SnqQmKsq',
      'Policy and welfare',
      'Tax/subsidy shifts MSC toward social optimum (9708 8.1).'
    ),
  '8-2-equity-and-redistribution-of-income-and-wealth': geogebraEntry(
    'gvkgx8ga',
    'Income distribution',
    'Progressive tax and transfers — equity vs efficiency trade-off (9708 8.2).'
  ),
  '9-1-the-circular-flow-of-income': geogebraEntry(
    'gvkgx8ga',
    'Circular flow AD',
    'Injections and withdrawals — link to aggregate demand (9708 9.1).'
  ),
  '9-2-economic-growth-and-sustainability': geogebraEntry(
    'gvkgx8ga',
    'LRAS and growth',
    'Rightward LRAS — sustainable growth vs resource limits (9708 9.2).'
  ),
  // ── 9708 A Level macro batch 8 ───────────────────────────────────────────
  '9-3-employment-unemployment': geogebraEntry(
    'gvkgx8ga',
    'Labour market AD–AS',
    'Unemployment types — link output gap to macro equilibrium (9708 9.3).'
  ),
  '9-4-money-and-banking': geogebraEntry(
    'gvkgx8ga',
    'Money and AD',
    'Credit creation and interest rate transmission (9708 9.4).'
  ),
  '10-1-government-macroeconomic-policy-objectives': geogebraEntry(
    'gvkgx8ga',
    'Macro objectives',
    'Growth, inflation, employment, BOP — trade-offs on AD–AS (9708 10.1).'
  ),
  '10-2-links-between-macroeconomic-problems-and-their-interrelatedness': geogebraEntry(
    'gvkgx8ga',
    'Interconnected macro problems',
    'Inflation vs unemployment — Phillips curve tension (9708 10.2).'
  ),
  '10-3-effectiveness-of-policy-options-to-meet-all-macroeconomic-objectives': geogebraEntry(
    'gvkgx8ga',
    'Policy trade-offs',
    'Can one policy meet all objectives simultaneously? (9708 10.3).'
  ),
  // ── 9708 development economics batch 9 ─────────────────────────────────
  '11-1-policies-to-correct-disequilibrium-in-the-balance-of-payments': geogebraEntry(
    'gvkgx8ga',
    'BOP correction policies',
    'Expenditure-switching and reducing policies (9708 11.1).'
  ),
  '11-3-economic-development': geogebraEntry(
    'gvkgx8ga',
    'Development and LRAS',
    'Human capital and infrastructure — long-run growth (9708 11.3).'
  ),
  '11-4-characteristics-of-countries-at-different-levels-of-development': geogebraEntry(
    'SnqQmKsq',
    'Development indicators',
    'Compare HDI, GDP per capita, and structural change (9708 11.4).'
  ),
  '11-5-relationship-between-countries-at-different-levels-of-development': geogebraEntry(
    'VGWtkPU5',
    'Trade and development',
    'Terms of trade and dependency between economies (9708 11.5).'
  ),
  '11-6-globalisation': geogebraEntry(
    'VGWtkPU5',
    'Globalisation flows',
    'Trade, capital, and labour mobility across borders (9708 11.6).'
  ),
  // ── 9708 micro & macro batch 10 ────────────────────────────────────────
  '7-1-utility': geogebraEntry(
    'SnqQmKsq',
    'Utility and demand',
    'Marginal utility and downward-sloping demand (9708 7.1).'
  ),
  '7-5-types-of-cost-revenue-and-profit-short-run-and-long-run-production': geogebraEntry(
    'SnqQmKsq',
    'Cost curves',
    'MC, ATC, economies of scale — SR and LR (9708 7.5).'
  ),
  '7-7-growth-and-survival-of-firms': geogebraEntry(
    'VGWtkPU5',
    'Firm growth',
    'Integration and diversification strategies (9708 7.7).'
  ),
  '8-3-labour-market-forces-and-government-intervention': geogebraEntry(
    'gvkgx8ga',
    'Labour market',
    'Wage determination and minimum wage effects (9708 8.3).'
  ),
  '11-2-exchange-rates': geogebraEntry(
    'VGWtkPU5',
    'A Level exchange rates',
    'Managed floats, currency unions, and policy (9708 11.2).'
  ),
  // ── 9708 foundations & firm objectives batch 11 ──────────────────────────
  '7-8-differing-objectives-and-policies-of-firms': geogebraEntry(
    'SnqQmKsq',
    'Firm objectives',
    'Profit maximisation vs sales, growth, and satisficing (9708 7.8).'
  ),
  '1-2-economic-methodology': geogebraEntry(
    'SnqQmKsq',
    'Positive vs normative',
    'Ceteris paribus and model assumptions (9708 1.2).'
  ),
  '1-3-factors-of-production': geogebraEntry(
    'SnqQmKsq',
    'Factors of production',
    'Land, labour, capital, enterprise — rewards and mobility (9708 1.3).'
  ),
  '1-4-resource-allocation-in-different-economic-systems': geogebraEntry(
    'VGWtkPU5',
    'Economic systems',
    'Market, planned, and mixed economies (9708 1.4).'
  ),
  '2-3-price-elasticity-of-supply': geogebraEntry(
    'SnqQmKsq',
    'PES',
    'Elastic vs inelastic supply — spare capacity and time (9708 2.3).'
  ),
  // ── 9708 intervention & welfare batch 12 ───────────────────────────────
  '1-6-classification-of-goods-and-services': geogebraEntry(
    'SnqQmKsq',
    'Types of goods',
    'Public, private, merit, and demerit goods (9708 1.6).'
  ),
  '2-5-consumer-and-producer-surplus': geogebraEntry(
    'SnqQmKsq',
    'Consumer surplus',
    'Area between demand curve and price (9708 2.5).'
  ),
  '3-1-reasons-for-government-intervention-in-markets': geogebraEntry(
    'gvkgx8ga',
    'Market failure',
    'Externalities, public goods, and information failure (9708 3.1).'
  ),
  '3-2-methods-and-effects-of-government-intervention-in-markets': geogebraEntry(
    'gvkgx8ga',
    'Government intervention',
    'Taxes, subsidies, regulation, and price controls (9708 3.2).'
  ),
  '3-3-addressing-income-and-wealth-inequality': geogebraEntry(
    'VGWtkPU5',
    'Inequality',
    'Progressive tax, benefits, and minimum wage (9708 3.3).'
  ),
  // ── 9708 macro completion batch 13 ───────────────────────────────────────
  '4-1-national-income-statistics': geogebraEntry(
    'VGWtkPU5',
    'National income',
    'GDP, GNI, and measurement approaches (9708 4.1).'
  ),
  '4-2-introduction-to-the-circular-flow-of-income': geogebraEntry(
    'gvkgx8ga',
    'Circular flow AS',
    'Households, firms, government, and injections/withdrawals (9708 4.2).'
  ),
  '5-1-government-macroeconomic-policy-objectives': geogebraEntry(
    'VGWtkPU5',
    'Macro objectives',
    'Growth, employment, inflation, BOP balance (9708 5.1).'
  ),
  '6-5-policies-to-correct-imbalances-in-the-current-account-of-the-balance-of-payments': geogebraEntry(
    'VGWtkPU5',
    'BOP correction AS',
    'Expenditure-reducing and switching policies (9708 6.5).'
  ),
}

function retainCatalogSlug(slug: string): boolean {
  if (!hasLessonLiveDiagram(slug)) return true
  if (PHET_RETAIN_WITH_NATIVE.has(slug)) return true
  const alias = resolveVisualCatalogSlug(slug)
  return alias !== slug && PHET_RETAIN_WITH_NATIVE.has(alias)
}

/** Runtime catalog — omits embeds suppressed when a native diagram exists. */
export const INTERACTIVE_EMBED_CATALOG: Record<string, LessonInteractiveEmbed> = Object.fromEntries(
  Object.entries(INTERACTIVE_EMBED_CATALOG_RAW).filter(([slug]) => retainCatalogSlug(slug))
)

export const INTERACTIVE_EMBED_CATALOG_ALL = INTERACTIVE_EMBED_CATALOG_RAW

export function getCatalogInteractiveEmbed(slug: string): LessonInteractiveEmbed | undefined {
  const direct = INTERACTIVE_EMBED_CATALOG[slug]
  const alias = resolveVisualCatalogSlug(slug)
  const embed =
    direct ?? (alias !== slug ? INTERACTIVE_EMBED_CATALOG[alias] : undefined)
  return preferNativeDiagramOverPlaceholder(slug, embed)
}

export function resolveLessonInteractiveEmbed(
  lesson: CourseLesson
): LessonInteractiveEmbed | null {
  if (lesson.interactiveEmbed?.embedUrl) {
    return (
      preferNativeDiagramOverPlaceholder(lesson.slug, lesson.interactiveEmbed) ?? null
    )
  }
  const inline = lesson.sections.find((s) => s.type === 'interactive')
  if (inline?.type === 'interactive') {
    return preferNativeDiagramOverPlaceholder(lesson.slug, inline.embed) ?? null
  }
  const catalog =
    INTERACTIVE_EMBED_CATALOG[lesson.slug] ?? getCatalogInteractiveEmbed(lesson.slug)
  return preferNativeDiagramOverPlaceholder(lesson.slug, catalog) ?? null
}

export function isCheerpjEmbedUrl(url: string): boolean {
  return url.includes('/sims/cheerpj/')
}

/** When to show a “still loading” hint (ms). CheerpJ Java sims need longer. */
export function embedSlowLoadHintMs(url: string): number {
  return isCheerpjEmbedUrl(url) ? 5_000 : 8_000
}

export function resolveEmbedLaunchUrl(embed: LessonInteractiveEmbed): string | null {
  if (embed.launchUrl) return embed.launchUrl
  if (embed.provider === 'phet') {
    const cheerpj = embed.embedUrl.match(/\/sims\/cheerpj\/([^/]+)\//)
    if (cheerpj) return phetSimPageUrl(cheerpj[1])
    const html5 = embed.embedUrl.match(/\/sims\/html\/([^/]+)\//)
    if (html5) return phetSimPageUrl(html5[1])
  }
  if (embed.provider === 'geogebra') {
    const material = embed.embedUrl.match(/[?&]material=([^&]+)/)
    if (material) return geogebraMaterialPageUrl(material[1])
  }
  return embed.attribution.sourceUrl ?? null
}

export function lessonHasInteractiveEmbed(lesson: CourseLesson): boolean {
  return resolveLessonInteractiveEmbed(lesson) !== null
}
