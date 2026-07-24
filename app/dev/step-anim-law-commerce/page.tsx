import type { ComponentType } from 'react'
import { LawSystemDiagram } from '@/components/diagrams/LawSystemDiagram'
import { LawContractDiagram } from '@/components/diagrams/LawContractDiagram'
import { LawCriminalDiagram } from '@/components/diagrams/LawCriminalDiagram'
import { LawRemediesDiagram } from '@/components/diagrams/LawRemediesDiagram'
import { AcctStatementsDiagram } from '@/components/diagrams/AcctStatementsDiagram'
import { AcctCostDiagram } from '@/components/diagrams/AcctCostDiagram'
import { BankReconciliationDiagram } from '@/components/diagrams/BankReconciliationDiagram'
import { BizFinanceDiagram } from '@/components/diagrams/BizFinanceDiagram'
import { BizOrgStructureDiagram } from '@/components/diagrams/BizOrgStructureDiagram'
import { BizMarketingMixDiagram } from '@/components/diagrams/BizMarketingMixDiagram'
import { CashFlowDiagram } from '@/components/diagrams/CashFlowDiagram'
import { StakeholderDiagram } from '@/components/diagrams/StakeholderDiagram'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, stepStateFor } from '@/lib/courses/diagram-specs'

export const metadata = {
  title: 'Step-animation (law + commerce) — dev',
  robots: { index: false, follow: false },
}

const ITEMS: { name: string; slug: string; Component: ComponentType<LessonDiagramComponentProps> }[] = [
  { name: 'Legal system', slug: '1-1-1-english-legal-system-and-its-context', Component: LawSystemDiagram },
  { name: 'Contract formation', slug: '2-1-1-formation-of-contract', Component: LawContractDiagram },
  { name: 'Criminal liability', slug: '3-1-1-criminal-liability', Component: LawCriminalDiagram },
  { name: 'Remedies', slug: '4-2-1-remedies', Component: LawRemediesDiagram },
  { name: 'Financial statements', slug: '1-3-1-capital-and-revenue-income-and-expenditure', Component: AcctStatementsDiagram },
  { name: 'Cost behaviour', slug: '5-4-1-cost-information', Component: AcctCostDiagram },
  { name: 'Bank reconciliation', slug: '1-4-3-bank-reconciliation-statements', Component: BankReconciliationDiagram },
  { name: 'Sources of finance', slug: '5-2-1-business-ownership-and-sources-of-finance', Component: BizFinanceDiagram },
  { name: 'Org structure', slug: '7-1-1-the-relationship-between-business-objectives-and-organisational-structure', Component: BizOrgStructureDiagram },
  { name: 'Marketing mix', slug: '3-3-1-the-elements-of-the-marketing-mix-the-4ps', Component: BizMarketingMixDiagram },
  { name: 'Cash flow & budgets', slug: '5-5-1-the-meaning-and-purpose-of-budgets', Component: CashFlowDiagram },
  { name: 'Stakeholders', slug: '1-5-1-business-stakeholders', Component: StakeholderDiagram },
]

export default function StepAnimLawCommerceDevPage() {
  return (
    <main style={{ maxWidth: 1160, margin: '0 auto', padding: '32px 20px 80px' }}>
      <p className="ec-label-tech" style={{ marginBottom: 6 }}>
        DEV PREVIEW · STEP ANIMATION · LAW + COMMERCE
      </p>
      <h1 className="ms-h2" style={{ marginBottom: 20 }}>
        Law &amp; commerce clusters — newly animated
      </h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        {ITEMS.map(({ name, slug, Component }) => {
          const spec = getLessonDiagramSpec(slug)
          const steps = spec?.steps ?? []
          return (
            <section key={slug}>
              <p className="ec-label-tech" style={{ marginBottom: 8 }}>
                {name} — {steps.length} steps
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))`, gap: 12 }}>
                {steps.map((_, i) => (
                  <figure key={i} className="ec-card" style={{ padding: 9, margin: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <span className="ec-label-tech">STEP {i + 1}</span>
                    <div style={{ background: 'var(--ec-surface)', borderRadius: 6, padding: 4 }}>
                      <Component lessonSlug={slug} stepIndex={i} />
                    </div>
                    <figcaption style={{ fontSize: 10.5, color: 'var(--ec-text-secondary)', lineHeight: 1.3 }}>
                      {stepStateFor(spec, i)?.caption}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </main>
  )
}
