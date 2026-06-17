import type { CourseLesson, LessonSection } from '@/lib/courses/types'
import { topicToLessonSlug } from '@/lib/courses/slug'
import type { SyllabusTopic } from '@/lib/syllabi'
import { STEM_TOPIC_OVERRIDES } from './stem-topic-overrides'
import { getStemContentPack } from './stem-content-packs/index'
import { assertDeepLesson } from './stem-deep-quality'

export type StemBuildOptions = {
  subjectCode: string
  subjectName: string
  topic: SyllabusTopic
  status?: 'pilot' | 'premium' | 'outline'
  deep?: boolean
  allowTemplate?: boolean
}

function domainAnalogy(subjectCode: string, topicCode: string, name: string): string {
  const lower = name.toLowerCase()

  if (subjectCode === '9701') {
    if (topicCode.startsWith('8.2') || /activation energy|temperature on reaction rates/.test(lower))
      return `Activation energy is the minimum height athletes need to clear a hurdle — raising temperature gives more molecules enough energy to get over; a catalyst lowers the hurdle itself.`
    if (/organic|alkane|alkene|alcohol|amine|carboxylic|polymer|isomer/.test(lower))
      return `Think of organic chemistry like a LEGO set: functional groups are specialised bricks, and IUPAC naming is the instruction manual that tells you exactly how they connect.`
    if (/bond|lattice|orbital|electroneg/.test(lower))
      return `Picture atoms as people at a party: ionic bonding is giving away your phone entirely, covalent is sharing earbuds, and metallic is a mosh pit where electrons move freely.`
    if (/equilib|acids|bases|pH|Kc|Kp/.test(lower))
      return `Chemical equilibrium is like a busy doorway: people enter and leave at equal rates, so the crowd inside stays constant even though individuals keep moving.`
    if (/enthalpy|hess|born-haber|lattice energy/.test(lower))
      return `Enthalpy is your bank balance for heat: exothermic reactions pay out to the surroundings; endothermic ones withdraw energy from them.`
    if (/entropy|gibbs/.test(lower))
      return `Entropy is messy bedrooms vs tidy ones — spreading energy and particles into more arrangements is statistically favoured unless enthalpy or temperature says otherwise.`
    if (/rate|catalyst|maxwell|boltzmann/.test(lower))
      return `Activation energy is the height of a wall between reactants and products — a catalyst lowers the wall without changing where you start or finish.`
    return `Imagine ${name.toLowerCase()} as a toolkit rule: learn the pattern once, then apply it whenever Cambridge swaps the numbers or context in a past paper.`
  }
  if (subjectCode === '9709' || subjectCode === '9231') {
    if (/differentiat|integrat|vector|matrix|complex|polar/.test(lower))
      return `Calculus and algebra are like zooming in on a curve: the derivative tells you the slope at one instant; integration adds up infinitely many thin slices to recover the whole area.`
    if (/probability|distribution|hypothesis|stat/.test(lower))
      return `Statistics is detective work with uncertainty: you never prove guilt with absolute certainty — you weigh evidence until the probability of innocence becomes too small.`
    if (/mechanic|force|momentum|projectile/.test(lower))
      return `Mechanics is a film storyboard: draw the forces, choose a sign convention, then let Newton's laws tell you what happens frame by frame.`
    return `Treat ${name.toLowerCase()} like a recipe: identify the method, write each line of working, then check units and boundary cases before accepting the answer.`
  }
  if (subjectCode === '9700') {
    if (/photosynthesis|respiration|energy/.test(lower))
      return `Photosynthesis and respiration are opposite conveyor belts: one builds glucose using light; the other breaks glucose down to release ATP for the cell's work.`
    if (/DNA|RNA|protein|gene|replication|transcription/.test(lower))
      return `DNA to protein is a two-step translation service: the master blueprint stays in the office (nucleus), while messenger RNA carries photocopied instructions to the factory floor (ribosomes).`
    if (/immune|antibod|pathogen/.test(lower))
      return `Your immune system is a security team with memory: innate guards react immediately; adaptive cells keep mugshots so the same intruder is stopped faster next time.`
    return `Biology links structure to function like architecture: always ask what a structure's shape allows it to do, then how that helps the organism survive exam scenarios.`
  }
  if (subjectCode === '9618') {
    if (/logic|gate|circuit|boolean/.test(lower))
      return `Logic gates are strict bouncers at a club: AND lets you in only if both friends vouch for you; OR if either does; NOT flips your answer entirely.`
    if (/algorithm|recursion|sort|search/.test(lower))
      return `An algorithm is a recipe with no ambiguity: every step must be executable by a dumb robot — if you cannot trace it line by line, the algorithm is not finished.`
    if (/network|protocol|packet/.test(lower))
      return `Packet switching is posting letters instead of hiring a dedicated courier: each packet finds its own route, and TCP reassembles them in order at the destination.`
    return `Computer science rewards precision: define the input, trace the state after each step, then verify the output matches the specification — exactly as an examiner expects.`
  }
  if (subjectCode === '9702') {
    return `Physics models strip a messy real situation to essentials: draw a diagram, label forces or fields, pick the conservation law that bypasses the hard path.`
  }
  return `Master ${name.toLowerCase()} by connecting the definition to one past-paper question — the mark scheme shows what Cambridge actually rewards.`
}

function buildSteps(topic: SyllabusTopic): string[] {
  const name = topic.name
  return [
    `Identify the key definitions and symbols for ${name}.`,
    `Link the concept to a diagram, equation, or mechanism where applicable.`,
    `Apply the idea to a structured past-paper question on ${topic.paperName}.`,
    `Mark your attempt strictly, then revise only the marks lost.`,
  ]
}

function defaultFlashcards(topic: SyllabusTopic, subjectCode: string): { front: string; back: string }[] {
  const n = topic.name
  return [
    { front: `What syllabus point is ${n}?`, back: `${topic.code} on ${topic.paperName}.` },
    { front: `Which paper tests ${n} most directly?`, back: `${topic.paper} — ${topic.paperName}.` },
    { front: `State one command word Cambridge uses for ${n}.`, back: `Common words: define, explain, calculate, describe, deduce — check the mark scheme for this topic.` },
    { front: `What is the first step when tackling a ${n} question?`, back: `Read the stem carefully, list known quantities or keywords, then select the method before writing.` },
    { front: `Why show working in ${n} questions?`, back: `Method marks (M1) are awarded for correct approach even when the final answer is wrong.` },
    { front: `How should units be handled for ${n}?`, back: `Use SI units unless the question specifies otherwise; convert before substituting into formulae.` },
    { front: `What diagram or sketch helps for ${n}?`, back: `Draw a labelled diagram whenever structure, forces, circuits, or mechanisms are involved — examiners reward clear labels.` },
    { front: `How do you check an answer on ${n}?`, back: `Substitute back, check magnitude is reasonable, and confirm you answered the command word asked.` },
    { front: `Name one common mistake in ${n}.`, back: `Rushing to the final answer without stating assumptions or missing a definition mark at the start.` },
    { front: `How does ${n} connect to the wider ${subjectCode} course?`, back: `It builds on earlier topics — revise prerequisites listed in the syllabus before attempting A Level questions.` },
  ]
}

function defaultWorkedExamples(topic: SyllabusTopic): LessonSection[] {
  return [
    {
      type: 'workedExample',
      question: `[${topic.code}] A past-paper style question on ${topic.name}: explain the key principle and apply it to the scenario described in the stem.`,
      solution: `**Step 1 — Define terms:** State the precise definition Cambridge expects for the core quantity or process in ${topic.name}.\n\n**Step 2 — Apply the method:** Show working line by line, keeping units and significant figures consistent with the mark scheme.\n\n**Step 3 — Conclusion:** State the final answer with units and one sentence linking back to the question stem.`,
    },
    {
      type: 'workedExample',
      question: `[${topic.code}] A second structured question testing ${topic.name}: calculate or deduce the unknown using syllabus-level reasoning.`,
      solution: `**Identify:** List known values and the target quantity.\n\n**Select equation or logic:** Choose the relationship from ${topic.name} that connects them.\n\n**Substitute and solve:** Show algebraic steps; do not skip the line that earns the method mark.\n\n**Check:** Verify the sign, units, and that the answer matches the command word (explain/calculate/deduce).`,
    },
  ]
}

function defaultNotesSections(topic: SyllabusTopic, subjectCode: string): LessonSection[] {
  const name = topic.name
  return [
    {
      type: 'intro',
      content: `This **pilot lesson** on **${name}** (${topic.code}) teaches the concept for **${topic.paperName}** — not just what to revise, but how Cambridge tests it. Work through the explanations, both worked examples, then practise with real past papers on MarkScheme.`,
    },
    { type: 'heading', content: `What is ${name}?` },
    {
      type: 'text',
      content: `${name} is syllabus point **${topic.code}** in Cambridge ${subjectCode}. Examiners expect you to use correct terminology from the mark scheme, not informal paraphrases. Start by learning the official definition, then practise applying it in ${topic.paper} questions where command words such as *define*, *explain*, and *calculate* appear frequently.`,
    },
    { type: 'heading', content: 'Core relationships and vocabulary' },
    {
      type: 'text',
      content: `Build a one-page summary for ${name}: key terms, any standard equation, and a labelled diagram if the topic is visual. When a question combines ${name} with other syllabus areas, marks are often awarded for linking concepts — for example, stating *why* a step is valid, not only *what* the result is.`,
    },
    { type: 'heading', content: 'Exam technique for this topic' },
    {
      type: 'keyPoints',
      items: [
        `Always define specialist terms before using them in ${name} answers.`,
        `Match working to the marks available — two marks need at least two clear steps.`,
        `Include units and sensible significant figures in numerical work.`,
        `Common pitfall: recalling a formula but not explaining the physics/chemistry/biology behind it.`,
      ],
    },
    { type: 'examTip', content: `On ${topic.paperName}, ${name} often appears inside longer structured questions. Read the whole stem before writing — later parts may give hints for earlier marks.` },
  ]
}

function mergeLayers(
  base: CourseLesson,
  ...layers: (Partial<CourseLesson> | undefined)[]
): CourseLesson {
  let out = base
  for (const layer of layers) {
    if (!layer) continue
    out = {
      ...out,
      ...layer,
      simpleExplanation: layer.simpleExplanation ?? out.simpleExplanation,
      flashcards: layer.flashcards ?? out.flashcards,
      faq: layer.faq ?? out.faq,
      sections: layer.sections ?? out.sections,
      learningObjectives: layer.learningObjectives ?? out.learningObjectives,
    }
  }
  return out
}

export function buildStemPilotLesson(opts: StemBuildOptions): CourseLesson {
  const {
    subjectCode,
    subjectName,
    topic,
    status = 'pilot',
    deep = false,
    allowTemplate = !deep,
  } = opts
  const slug = topicToLessonSlug(topic.code, topic.name)
  const override = STEM_TOPIC_OVERRIDES[`${subjectCode}:${topic.code}`]
  const pack = getStemContentPack(subjectCode, topic.code)

  const base: CourseLesson = {
    slug,
    topicCode: topic.code,
    title: topic.name,
    paper: topic.paper,
    paperName: topic.paperName,
    status,
    summary: `Cambridge ${subjectCode} pilot lesson: ${topic.name} (${topic.code}) for ${topic.paperName}.`,
    durationMin: 22,
    updated: new Date().toISOString().slice(0, 10),
    learningObjectives: [
      `Explain ${topic.name} using correct syllabus terminology.`,
      `Apply ${topic.name} in ${topic.paper} structured questions.`,
      `Avoid common misconceptions that cost definition and method marks.`,
    ],
    simpleExplanation: {
      title: `${topic.name} — explained simply`,
      summary: `${topic.name} is a core ${subjectName} topic on ${topic.paperName}. This lesson builds understanding step by step before past-paper practice.`,
      analogy: domainAnalogy(subjectCode, topic.code, topic.name),
      steps: buildSteps(topic),
    },
    flashcards: allowTemplate ? defaultFlashcards(topic, subjectCode) : [],
    faq: [
      {
        q: `Which paper is ${topic.name} examined in?`,
        a: `${topic.paper} — ${topic.paperName}. Check recent sessions for combined topics in longer questions.`,
      },
      {
        q: `How should I revise ${topic.name}?`,
        a: `Read this lesson, complete both worked examples without looking, then mark a real past-paper question on MarkScheme.`,
      },
    ],
    sections: [
      ...defaultNotesSections(topic, subjectCode),
      ...(allowTemplate ? defaultWorkedExamples(topic) : []),
      {
        type: 'practice',
        label: `Mark a past-paper question on ${topic.name}`,
        href: `/mark?subject=${subjectCode}&topic=${encodeURIComponent(topic.code)}`,
      },
      {
        type: 'resources',
        items: [
          { label: `${subjectCode} past papers & marking`, href: `/subjects/${subjectCode}` },
          { label: 'How to read mark schemes', href: '/blog/how-to-read-a-cambridge-mark-scheme' },
          { label: `${subjectCode} course index`, href: `/courses/${subjectCode}` },
        ],
      },
    ],
    generatorVersion: 'stem-pilot-builder-2',
  }

  return mergeLayers(base, pack, override)
}

export function assertPilotDepth(lesson: CourseLesson): string[] {
  const deepIssues = assertDeepLesson(lesson)
  if (deepIssues.length === 0) return []
  const legacy: string[] = []
  const worked = (lesson.sections ?? []).filter((s) => s.type === 'workedExample').length
  if (worked < 2) legacy.push(`need ≥2 worked examples (found ${worked})`)
  if ((lesson.flashcards?.length ?? 0) < 8) legacy.push('need ≥8 flashcards')
  if (!lesson.simpleExplanation?.analogy?.trim()) legacy.push('missing analogy')
  return legacy
}

export { assertDeepLesson, isDeepLesson, isGenericFlashcard } from './stem-deep-quality'
