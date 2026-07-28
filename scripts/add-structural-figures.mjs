#!/usr/bin/env node
/**
 * Adds structural figures to the subjects with no visual coverage at all.
 *
 * Deliberately **structural**, not factual. Chemistry structures could be
 * sourced from PubChem and formula-checked; a history date cannot be verified
 * the same way, and a confidently wrong date in exam prep is worse than no
 * diagram. So this batch covers diagrams whose content is the *shape of an
 * idea* — a design cycle, an essay's argument structure, the layers a packet
 * passes through, the notes of a major scale. Those are checkable by reading
 * them, and they are exactly what the zero-coverage subjects lack.
 *
 * Date-heavy timelines (history, global politics events) are deliberately not
 * here. They need a subject expert on the facts, not just on the captions.
 *
 * Usage:
 *   node scripts/add-structural-figures.mjs --dry-run
 *   node scripts/add-structural-figures.mjs
 */

import fs from 'node:fs'
import path from 'node:path'

const PROJECT = process.cwd()
const DRY_RUN = process.argv.includes('--dry-run')

/** `subjects` fans one curation entry across the HL/SL pair that shares a slug. */
const CURATION = [
  // ── Computer science ─────────────────────────────────────────────────────
  {
    subjects: ['ib-computer-science-hl', 'ib-computer-science-sl'],
    slug: '4-4-flowcharts-pseudocode-and-algorithm-design',
    figures: [
      {
        kind: 'mermaid',
        title: 'Linear search as a flowchart',
        caption:
          'Every loop needs three things the examiner looks for: somewhere to start, a condition that can become false, and a change inside the loop that moves towards it.',
        source: `flowchart TD
    A([Start]) --> B[/Input: list, target/]
    B --> C["i = 0"]
    C --> D{"i < length?"}
    D -- No --> E[/Output: not found/]
    D -- Yes --> F{"list[i] = target?"}
    F -- Yes --> G[/Output: i/]
    F -- No --> H["i = i + 1"]
    H --> D
    E --> Z([End])
    G --> Z`,
      },
    ],
  },
  {
    subjects: ['ib-computer-science-hl', 'ib-computer-science-sl'],
    slug: '4-1-computational-thinking-abstraction-decomposition-and-algorithms',
    figures: [
      {
        kind: 'mermaid',
        title: 'The four pillars of computational thinking',
        caption:
          'Questions usually name one pillar. Decomposition asks you to break the problem up; abstraction asks you to say what you are ignoring and why.',
        source: `mindmap
  root((Computational thinking))
    Decomposition
      Break into sub-problems
      Solve each separately
    Pattern recognition
      Spot repetition
      Reuse a known solution
    Abstraction
      Keep what matters
      Discard the rest
    Algorithm design
      Ordered steps
      Unambiguous
      Terminates`,
      },
    ],
  },
  {
    subjects: ['ib-computer-science-hl', 'ib-computer-science-sl'],
    slug: '3-1-network-fundamentals',
    figures: [
      {
        kind: 'mermaid',
        title: 'What happens to data on the way down',
        caption:
          'Each layer adds its own header, and the matching layer at the other end strips it. That is why a change at one layer does not force a change at the others.',
        source: `flowchart TD
    A["Application: your message"] --> B["Transport: split into segments, add port"]
    B --> C["Network: add source and destination IP"]
    C --> D["Data link: add MAC address, frame it"]
    D --> E["Physical: transmit as signal"]
    E --> F["...and reassembled in reverse at the far end"]`,
      },
    ],
  },

  // ── Theory of knowledge ──────────────────────────────────────────────────
  {
    subjects: ['ib-tok'],
    slug: '3-2-tok-essay-argument-and-evidence',
    figures: [
      {
        kind: 'mermaid',
        title: 'The shape of a TOK argument',
        caption:
          'Marks come from the evaluation step, not the claim. An essay that states claims and examples without weighing them stalls in the middle bands.',
        source: `flowchart TD
    A["Claim<br/>a knowledge assertion"] --> B["Evidence<br/>a specific real example"]
    B --> C["Analysis<br/>why does this example support the claim?"]
    C --> D["Counterclaim<br/>the strongest opposing view"]
    D --> E["Counter-evidence<br/>a specific example, not a hypothetical"]
    E --> F["Evaluation<br/>which holds up, under what conditions?"]
    F --> G["Link back to the title"]`,
      },
    ],
  },
  {
    subjects: ['ib-tok'],
    slug: '3-1-tok-essay-understanding-the-title',
    figures: [
      {
        kind: 'mermaid',
        title: 'Unpacking a prescribed title',
        caption:
          'Do this before planning. Most low-scoring essays answer a title the examiner did not set.',
        source: `mindmap
  root((Prescribed title))
    Key terms
      Which words are contestable?
      Define them on your terms
    Scope
      Which AOKs does it name?
      Which does it exclude?
    Assumption
      What does the title take for granted?
    Command
      What is it asking you to do?
      To what extent / how far`,
      },
    ],
  },

  // ── Design technology ────────────────────────────────────────────────────
  {
    subjects: ['ib-design-technology-hl', 'ib-design-technology-sl'],
    slug: '3-1-the-design-project-investigate-develop-realise',
    figures: [
      {
        kind: 'mermaid',
        title: 'The design cycle',
        caption:
          'It is a cycle, not a line. Testing that sends you back to develop is evidence of iteration, which is what the criteria reward.',
        source: `flowchart LR
    A["Investigate<br/>need, users, research"] --> B["Design<br/>specification, ideas"]
    B --> C["Develop<br/>modelling, refinement"]
    C --> D["Realise<br/>prototype, manufacture"]
    D --> E["Test and evaluate<br/>against the specification"]
    E -->|refine| C
    E -->|reframe the need| A`,
      },
    ],
  },
  {
    subjects: ['ib-design-technology-hl', 'ib-design-technology-sl'],
    slug: '1-2-resource-management-and-sustainable-production',
    figures: [
      {
        kind: 'mermaid',
        title: 'Product life cycle, and where it can loop',
        caption:
          'A linear cycle ends at disposal. Each loop back is a design decision made much earlier — at material selection, not at end of life.',
        source: `flowchart LR
    A["Raw material<br/>extraction"] --> B["Processing"]
    B --> C["Manufacture"]
    C --> D["Distribution"]
    D --> E["Use"]
    E --> F["End of life"]
    F -->|reuse| E
    F -->|recycle| B
    F -->|landfill| G["Disposal"]`,
      },
    ],
  },

  // ── Global politics ──────────────────────────────────────────────────────
  {
    subjects: ['ib-global-politics-hl', 'ib-global-politics-sl'],
    slug: '1-1-power-sovereignty-and-international-relations',
    figures: [
      {
        kind: 'mermaid',
        title: 'Types of power',
        caption:
          'Questions rarely ask "what is power" — they ask which type explains a case. Name the type, then show the mechanism.',
        source: `mindmap
  root((Power))
    Hard
      Military force
      Economic coercion
      Sanctions
    Soft
      Culture and values
      Diplomacy
      Attraction not coercion
    Smart
      Combines hard and soft
    Structural
      Setting the rules
      Agenda-setting`,
      },
    ],
  },
  {
    subjects: ['ib-global-politics-hl', 'ib-global-politics-sl'],
    slug: '2-2-global-actors-states-igos-and-ngos',
    figures: [
      {
        kind: 'mermaid',
        title: 'Who acts in global politics',
        caption:
          'Sovereignty sits with states, so every non-state actor works through influence rather than authority. That distinction carries most of the marks.',
        source: `mindmap
  root((Global actors))
    States
      Sovereign
      Legal authority
    IGOs
      Members are states
      Powers are delegated
    NGOs
      Non-state, non-profit
      Influence via advocacy
    MNCs
      Economic power
      Cross-border operations
    Social movements
      Informal
      Agenda-setting`,
      },
    ],
  },

  // ── Music ────────────────────────────────────────────────────────────────
  {
    subjects: ['ib-music-hl'],
    slug: '1-2-musical-elements-and-analysis',
    figures: MUSIC_FIGURES(),
  },
  {
    subjects: ['ib-music-sl'],
    slug: '1-2-musical-elements-and-written-analysis',
    figures: MUSIC_FIGURES(),
  },
]

/** Shared between the HL and SL music lessons, whose slugs differ. */
function MUSIC_FIGURES() {
  return [
    {
      kind: 'notation',
      title: 'C major scale',
      caption:
        'Tone–tone–semitone–tone–tone–tone–semitone. The two semitones fall between degrees 3–4 and 7–8, which is what makes it major.',
      abc: 'X:1\nT:C major\nM:4/4\nL:1/4\nK:C\nC D E F | G A B c |',
      playable: true,
    },
    {
      kind: 'notation',
      title: 'Perfect cadence (V–I)',
      caption:
        'G major resolving to C major. The strongest close in tonal music — name the chords by degree, not by letter, when you analyse.',
      abc: 'X:1\nT:Perfect cadence in C\nM:4/4\nL:1/2\nK:C\n[GBd] [ceg] |',
      playable: true,
    },
  ]
}

function main() {
  let written = 0
  let figuresTotal = 0
  const problems = []

  for (const entry of CURATION) {
    for (const subject of entry.subjects) {
      const file = path.join(PROJECT, 'content/courses', subject, `${entry.slug}.json`)
      if (!fs.existsSync(file)) {
        problems.push(`MISSING LESSON  ${subject}/${entry.slug}`)
        continue
      }
      const lesson = JSON.parse(fs.readFileSync(file, 'utf8'))
      const kinds = new Set(entry.figures.map((f) => f.kind))
      // Replace only the kinds this entry manages, so a re-run is idempotent and
      // molecule figures written by the chemistry script are never clobbered.
      const existing = (lesson.figures ?? []).filter((f) => !kinds.has(f.kind))
      lesson.figures = [...existing, ...entry.figures]

      if (!DRY_RUN) fs.writeFileSync(file, `${JSON.stringify(lesson, null, 2)}\n`)
      written++
      figuresTotal += entry.figures.length
      console.log(
        `${DRY_RUN ? '[dry] ' : ''}${subject}/${entry.slug} — ${entry.figures.length} figure(s): ${entry.figures.map((f) => f.title).join(', ')}`
      )
    }
  }

  console.log('─'.repeat(72))
  console.log(`${DRY_RUN ? 'Would write' : 'Wrote'} ${figuresTotal} figures across ${written} lessons`)
  if (problems.length) {
    console.log(`\n${problems.length} problem(s):`)
    for (const p of problems) console.log(`  ${p}`)
    process.exitCode = 1
  }
}

main()
