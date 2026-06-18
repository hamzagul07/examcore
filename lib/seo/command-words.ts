/**
 * Cambridge International command words — the instructing verbs at the start of a
 * question that set the DEPTH of answer required. Definitions follow Cambridge's
 * published command-word guidance (en-GB). Reused by the /tools/command-words
 * explainer and the per-subject command-word blog posts so wording stays consistent.
 */

export type CommandWordTier = 'recall' | 'understanding' | 'application' | 'analysis' | 'evaluation'

export type CommandWord = {
  word: string
  /** What Cambridge says the word requires. */
  meaning: string
  /** What earns the marks in practice. */
  examiner: string
  /** The common error that loses marks. */
  pitfall: string
  tier: CommandWordTier
}

export const COMMAND_WORD_TIERS: Record<CommandWordTier, string> = {
  recall: 'Recall — short factual answers',
  understanding: 'Understanding — show you grasp the idea',
  application: 'Application — use knowledge in context',
  analysis: 'Analysis — break down and connect',
  evaluation: 'Evaluation — judge with evidence',
}

export const COMMAND_WORDS: CommandWord[] = [
  {
    word: 'State / Give / Name',
    meaning: 'Give a short, factual answer — a term, value or example — with no explanation.',
    examiner: 'A correct word or phrase is enough; extra detail wins no more marks.',
    pitfall: 'Over-writing a one-mark recall question and wasting time.',
    tier: 'recall',
  },
  {
    word: 'Define',
    meaning: 'Give the precise meaning of a term.',
    examiner: 'Marks for an accurate definition that matches the syllabus wording.',
    pitfall: 'Giving an example instead of the actual definition.',
    tier: 'recall',
  },
  {
    word: 'Identify',
    meaning: 'Select or point out something from information given.',
    examiner: 'Marks for naming the correct item — often from a source, graph or scenario.',
    pitfall: 'Explaining when the question only asks you to pick out the answer.',
    tier: 'recall',
  },
  {
    word: 'Outline / Describe',
    meaning: 'Set out the main features or points, without giving reasons.',
    examiner: 'Marks for each correct, relevant point or stage — say what, not why.',
    pitfall: 'Drifting into explanation and running out of time on later questions.',
    tier: 'understanding',
  },
  {
    word: 'Explain',
    meaning: 'Set out the reasons or causes (the "why" and "how") and make relationships clear.',
    examiner: 'Marks for developed reasoning — because… therefore… so that… — not just statements.',
    pitfall: 'Describing what happens instead of explaining why it happens.',
    tier: 'understanding',
  },
  {
    word: 'Calculate',
    meaning: 'Work out a numerical answer, showing your working.',
    examiner: 'Method marks for the correct approach; accuracy marks for the right value with units.',
    pitfall: 'Writing only a final answer — no working means no method marks if it is wrong.',
    tier: 'application',
  },
  {
    word: 'Suggest',
    meaning: 'Apply your knowledge to a new context, or propose a reasoned idea where there is no single fixed answer.',
    examiner: 'Marks for a sensible, applied response that fits the scenario.',
    pitfall: 'Giving a generic textbook answer that ignores the context in the question.',
    tier: 'application',
  },
  {
    word: 'Apply',
    meaning: 'Use a concept, method or theory in a particular situation.',
    examiner: 'Marks for linking the idea explicitly to the data, case or scenario given.',
    pitfall: 'Stating the theory without connecting it to the specific context.',
    tier: 'application',
  },
  {
    word: 'Analyse',
    meaning: 'Examine in detail, breaking something into parts to show meaning, causes or relationships.',
    examiner: 'Marks for chains of reasoning that connect cause to effect or part to whole.',
    pitfall: 'Listing points separately instead of developing and linking them.',
    tier: 'analysis',
  },
  {
    word: 'Compare',
    meaning: 'Identify similarities and differences between two or more things.',
    examiner: 'Marks for explicit comparative points — "whereas", "both", "unlike" — not two separate descriptions.',
    pitfall: 'Describing each item in turn and leaving the comparison implied.',
    tier: 'analysis',
  },
  {
    word: 'Discuss',
    meaning: 'Write about an issue from more than one point of view, considering arguments for and against.',
    examiner: 'Marks for balanced, developed argument across different viewpoints.',
    pitfall: 'Arguing only one side, or listing points with no development.',
    tier: 'evaluation',
  },
  {
    word: 'Evaluate',
    meaning: 'Judge or weigh up the quality, importance or success of something, then reach a supported conclusion.',
    examiner: 'Top marks need both sides weighed AND a justified judgement or conclusion.',
    pitfall: 'Giving points on both sides but never reaching a conclusion — this stays mid-band.',
    tier: 'evaluation',
  },
  {
    word: 'Assess',
    meaning: 'Make an informed judgement about the importance or value of something, supported by evidence.',
    examiner: 'Marks for prioritising factors and explaining which matter most, and why.',
    pitfall: 'Treating every factor as equally important with no judgement.',
    tier: 'evaluation',
  },
  {
    word: 'Justify',
    meaning: 'Support a case, choice or decision with evidence and reasoned argument.',
    examiner: 'Marks for reasons that defend your position and address the alternative.',
    pitfall: 'Stating a decision without giving the evidence that backs it.',
    tier: 'evaluation',
  },
  {
    word: 'To what extent',
    meaning: 'Judge how far a statement is true, weighing supporting and opposing evidence.',
    examiner: 'Top marks need a clear degree judgement ("largely", "only partly") with justification.',
    pitfall: 'Answering yes/no instead of how far, or omitting the degree of agreement.',
    tier: 'evaluation',
  },
]

export function getCommandWords(): CommandWord[] {
  return COMMAND_WORDS
}
