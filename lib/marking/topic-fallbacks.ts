import type { TopicQuestionMatch } from '@/lib/marking/topic-question'

type TopicFallbackRow = Omit<TopicQuestionMatch, 'matched_topic'>

/** Curated fallbacks when mark_schemes has no syllabus_tags for a topic. */
const TOPIC_FALLBACKS: Record<string, TopicFallbackRow> = {
  // 9609 Business
  '9609:5.4.4': {
    paper_code: '9609/22',
    paper_session: 'May/June 2023',
    question_number: '2',
    question_text:
      'Nova Crafts sells handmade lamps for $48 each. Variable cost is $18 per lamp and fixed costs are $12 000 per month. Calculate (a) break-even output, (b) margin of safety if 450 lamps are sold per month.',
    total_marks: 8,
  },
  '9609:5.4.2': {
    paper_code: '9609/22',
    paper_session: 'May/June 2023',
    question_number: '3',
    question_text:
      'Explain the difference between full costing and contribution costing. Evaluate which approach is more useful for short-run pricing decisions.',
    total_marks: 8,
  },
  '9609:2.2.3': {
    paper_code: '9609/21',
    paper_session: 'May/June 2023',
    question_number: '4',
    question_text:
      'Analyse how financial rewards and non-financial motivators may improve employee performance in a manufacturing business.',
    total_marks: 8,
  },
  '9609:10.2.2': {
    paper_code: '9609/33',
    paper_session: 'May/June 2023',
    question_number: '2',
    question_text:
      'Using the data provided, calculate gross profit margin and return on capital employed. Interpret your results for an investor.',
    total_marks: 8,
  },
  // 9706 Accounting
  '9706:2.2.4': {
    paper_code: '9706/22',
    paper_session: 'May/June 2023',
    question_number: '2',
    question_text:
      'Selling price $25; variable cost $10; fixed costs $18 000; budgeted sales 1 500 units. Calculate break-even, margin of safety, and units for $12 000 profit.',
    total_marks: 8,
  },
  '9706:1.4.2': {
    paper_code: '9706/21',
    paper_session: 'May/June 2023',
    question_number: '3',
    question_text:
      'A trial balance shows DR $51 250 and CR $51 000. Explain the error and state the correction journal.',
    total_marks: 6,
  },
  '9706:1.6.2': {
    paper_code: '9706/33',
    paper_session: 'May/June 2023',
    question_number: '2',
    question_text:
      'Calculate gross profit margin, ROCE, current ratio and acid test from the accounts provided. Comment on liquidity and profitability.',
    total_marks: 10,
  },
  // 9084 Law
  '9084:2.2.1': {
    paper_code: '9084/22',
    paper_session: 'May/June 2023',
    question_number: '1',
    question_text:
      'D took V\'s wallet from her bag without her knowledge but returned it an hour later. Consider whether D is guilty of theft under s1 Theft Act 1968.',
    total_marks: 10,
  },
  '9084:4.1.2': {
    paper_code: '9084/42',
    paper_session: 'May/June 2023',
    question_number: '2',
    question_text:
      'A auditor advises a bank on whether to lend to a retailer. Using Caparo, advise whether the auditor owes the bank a duty of care in negligence.',
    total_marks: 10,
  },
  '9084:3.1.2': {
    paper_code: '9084/32',
    paper_session: 'May/June 2023',
    question_number: '1',
    question_text:
      'A shop displays goods in a window with a price tag. A customer offers to buy at that price. Analyse whether a contract has been formed.',
    total_marks: 8,
  },
  // 9699 Sociology
  '9699:2.1': {
    paper_code: '9699/21',
    paper_session: 'May/June 2023',
    question_number: '2',
    question_text:
      'Design a study to investigate why some students truant from school. State aim, method, sample, and two limitations.',
    total_marks: 10,
  },
  '9699:6.2': {
    paper_code: '9699/22',
    paper_session: 'May/June 2023',
    question_number: '3',
    question_text:
      'Assess sociological explanations of working-class underachievement in education.',
    total_marks: 15,
  },
  // 9708 Economics
  '9708:2.5': {
    paper_code: '9708/21',
    paper_session: 'May/June 2023',
    question_number: '2',
    question_text:
      'Demand P = 20 − Q, supply P = 4 + Q. Calculate equilibrium price and quantity and consumer and producer surplus.',
    total_marks: 8,
  },
  '9708:4.3': {
    paper_code: '9708/21',
    paper_session: 'May/June 2023',
    question_number: '4',
    question_text:
      'Using AD/AS analysis, explain the likely effects of an increase in government spending on output and the price level.',
    total_marks: 8,
  },
  '9708:11.3': {
    paper_code: '9708/42',
    paper_session: 'May/June 2023',
    question_number: '3',
    question_text:
      'Evaluate the view that economic development requires both investment in human capital and institutional reform.',
    total_marks: 15,
  },
  // 9990 Psychology
  '9990:1.1.1': {
    paper_code: '9990/31',
    paper_session: 'May/June 2023',
    question_number: '2',
    question_text:
      'Outline positive and negative symptoms of schizophrenia and evaluate the reliability of diagnosis.',
    total_marks: 10,
  },
  '9990:3.2.1': {
    paper_code: '9990/32',
    paper_session: 'May/June 2023',
    question_number: '2',
    question_text:
      'Explain types of non-adherence to medical advice and analyse reasons why patients do not follow treatment.',
    total_marks: 10,
  },
}

export function getStaticTopicFallback(
  subjectCode: string,
  topicCodes: string[]
): TopicQuestionMatch | null {
  const subject = subjectCode.trim()
  for (const code of topicCodes) {
    const row = TOPIC_FALLBACKS[`${subject}:${code}`]
    if (row) {
      return { ...row, matched_topic: code }
    }
  }
  return null
}
