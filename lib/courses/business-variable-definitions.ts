/** Business & accounting terms for formula \text{} labels and abbreviations (9609, 9706). */

const BUSINESS_TERMS: Record<string, string> = {
  'fixed costs': 'Costs that do not change with output in the short run (rent, salaries)',
  fc: 'Fixed costs — do not vary with output',
  'variable costs': 'Costs that change directly with output (materials, piece-rate wages)',
  vc: 'Variable cost per unit',
  'variable cost per unit': 'Cost that changes with each extra unit produced',
  'selling price': 'Price charged per unit to customers',
  sp: 'Selling price per unit',
  'contribution per unit': 'Contribution per unit — selling price minus variable cost (SP − VC)',
  'contribution per unit ÷ selling price': 'Contribution/sales ratio (C/S ratio) used for break-even revenue',
  'c/s ratio': 'Contribution per unit as a fraction of selling price',
  revenue: 'Total sales income (price × quantity)',
  'gross profit': 'Revenue minus cost of sales (direct production costs)',
  'operating profit': 'Profit from core operations before interest and tax (PBIT)',
  pbit: 'Profit before interest and tax — used in ROCE',
  'net profit': 'Profit after all expenses including finance costs and tax',
  'capital employed': 'Equity plus non-current liabilities (long-term funding)',
  ce: 'Capital employed — total long-term funds in the business',
  'current assets': 'Assets expected to be converted to cash within one year',
  'current liabilities': 'Debts due within one year',
  inventory: 'Stock of raw materials, WIP, or finished goods',
  'non-current liabilities': 'Long-term borrowings and other liabilities due after one year',
  'trade receivables': 'Amounts owed by customers (debtors)',
  'credit sales': 'Sales made on credit (not cash)',
  'cost of sales': 'Direct costs of goods sold (COGS)',
  cogs: 'Cost of goods sold — direct costs of production',
  'finance costs': 'Interest payable on borrowings',
  equity: 'Shareholders’ funds (share capital + reserves)',
  assets: 'Resources owned by the business',
  liabilities: 'Amounts owed by the business',
  depreciation: 'Spreading the cost of a non-current asset over its useful life',
  'residual value': 'Expected proceeds if an asset is sold at end of useful life',
  'useful life': 'Expected period the asset will be used (years)',
  'working capital': 'Current assets minus current liabilities',
  'market share': 'Firm’s sales as a percentage of total market sales',
  'break-even output': 'Output where total revenue equals total cost (zero profit)',
  'break-even revenue': 'Sales revenue at the break-even point',
  'actual output': 'Actual or budgeted units sold/produced',
  'budgeted sales': 'Planned sales volume for the period',
  'target profit': 'Profit the business aims to achieve',
  'margin of safety': 'Buffer between actual sales and break-even (lower = more risk)',
  'mos units': 'Margin of safety expressed in units',
  moS: 'Margin of safety — units or % above break-even',
  npv: 'Net present value — sum of discounted cash flows minus initial investment',
  arr: 'Accounting rate of return — average annual profit ÷ initial investment × 100',
  'discount factor': 'Multiplier to convert future cash flow to present value: 1/(1+r)ⁿ',
  'net cash flow': 'Cash inflows minus cash outflows for the period',
  'opening balance': 'Cash at the start of the period',
  'closing balance': 'Cash at the end of the period',
  'total cost': 'Fixed costs plus total variable costs (TC = FC + TVC)',
  tc: 'Total cost at a given output level',
  tr: 'Total revenue (price × quantity)',
  'total revenue': 'Income from sales at a given output',
  'total contribution': 'Contribution per unit × quantity sold',
  profit: 'Surplus when revenue exceeds total costs',
  'absorption cost': 'Full unit cost including fixed overhead absorbed per unit',
  'contribution': 'Sales revenue minus variable costs (covers fixed costs + profit)',
  'gearing ratio': 'Non-current liabilities as % of capital employed — debt risk',
  gearing: 'Proportion of capital structure financed by long-term debt',
  'interest cover': 'Operating profit ÷ finance costs — ability to pay interest',
  'asset turnover': 'Revenue ÷ capital employed — efficiency of asset use',
  'inventory days': 'Average days stock is held before sale',
  'receivables days': 'Average days taken by customers to pay',
  'current ratio': 'Current assets ÷ current liabilities — short-term liquidity',
  'acid test': 'Quick ratio — (current assets − inventory) ÷ current liabilities',
  'gross profit margin': 'Gross profit ÷ revenue × 100%',
  gpm: 'Gross profit margin percentage',
  gp: 'Gross profit',
  'operating profit margin': 'Operating profit ÷ revenue × 100%',
  opm: 'Operating profit margin percentage',
  roce: 'Return on capital employed — PBIT ÷ capital employed × 100%',
  ped: 'Price elasticity of demand — % ΔQd ÷ % ΔP',
  yed: 'Income elasticity of demand — % ΔQd ÷ % Δ income',
  xed: 'Cross elasticity — % ΔQd of A ÷ % ΔP of B',
  'price elasticity of demand': 'Responsiveness of quantity demanded to price changes',
  'capacity utilisation': 'Actual output ÷ maximum output × 100%',
  'value added': 'Selling price minus cost of bought-in materials and components',
  'average cost': 'Total cost ÷ output (AC = TC/Q)',
  ac: 'Average cost per unit',
  afc: 'Average fixed cost — fixed costs ÷ output',
  avc: 'Average variable cost — variable costs ÷ output',
  'price × quantity': 'Total revenue from units sold',
  'initial outlay': 'Up-front investment cost at time zero (for NPV)',
  'present value': 'Future cash flow × discount factor',
  'average inventory': 'Mean stock level over the period (opening + closing) ÷ 2',
}

const ABBREVIATIONS: Record<string, string> = {
  FC: BUSINESS_TERMS.fc!,
  VC: BUSINESS_TERMS.vc!,
  SP: BUSINESS_TERMS.sp!,
  TR: BUSINESS_TERMS.tr!,
  TC: BUSINESS_TERMS.tc!,
  CE: BUSINESS_TERMS.ce!,
  COGS: BUSINESS_TERMS.cogs!,
  GP: BUSINESS_TERMS.gp!,
  NP: 'Net profit',
  PBIT: BUSINESS_TERMS.pbit!,
  ROCE: BUSINESS_TERMS.roce!,
  NPV: BUSINESS_TERMS.npv!,
  ARR: BUSINESS_TERMS.arr!,
  PED: BUSINESS_TERMS.ped!,
  YED: BUSINESS_TERMS.yed!,
  XED: BUSINESS_TERMS.xed!,
  MoS: BUSINESS_TERMS.moS!,
  GPM: BUSINESS_TERMS.gpm!,
  OPM: BUSINESS_TERMS.opm!,
  AC: BUSINESS_TERMS.ac!,
  AFC: BUSINESS_TERMS.afc!,
  AVC: BUSINESS_TERMS.avc!,
  CA: 'Current assets',
  CL: 'Current liabilities',
  Rev: 'Revenue — total sales income',
}

const BUSINESS_SUBJECTS = new Set(['9609', '9706'])

export function isBusinessSubject(subjectCode?: string): boolean {
  return !!subjectCode && BUSINESS_SUBJECTS.has(subjectCode)
}

function normalizeTermKey(term: string): string {
  return term.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function lookupBusinessTerm(term: string, subjectCode?: string): string | undefined {
  const raw = term.trim()
  if (!raw) return undefined

  const key = normalizeTermKey(raw)
  if (BUSINESS_TERMS[key]) return BUSINESS_TERMS[key]

  if (isBusinessSubject(subjectCode)) {
    const upper = raw.toUpperCase()
    if (ABBREVIATIONS[upper as keyof typeof ABBREVIATIONS]) {
      return ABBREVIATIONS[upper as keyof typeof ABBREVIATIONS]
    }
  }

  return undefined
}

/** Fallback when term is recognised in a formula but not in the map. */
export function describeBusinessLabel(label: string): string {
  const hit = lookupBusinessTerm(label)
  if (hit) return hit
  const cleaned = label.replace(/\s+/g, ' ').trim()
  if (/^[%$£]/.test(cleaned) || cleaned.length > 48) {
    return 'Key term in this formula'
  }
  return `${cleaned} — key term in this formula`
}

export { BUSINESS_TERMS }
