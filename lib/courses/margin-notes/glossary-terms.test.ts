import assert from 'node:assert/strict'
import { glossaryFromBoldTerms } from './glossary-terms'

const lesson = {
  sections: [
    {
      type: 'intro' as const,
      content: 'Welcome to the world of **practical circuits**! This lesson dives into how power sources behave. Let\'s get started!',
    },
    {
      type: 'text' as const,
      content:
        'Every power source, like a battery or power pack, has an **electromotive force (e.m.f., ε)**. This is the total electrical energy it supplies per unit charge to drive current around a complete circuit. It\'s like the \'push\' for the charges.',
    },
    {
      type: 'text' as const,
      content:
        'No power source is perfect. Inside, it has a small but significant **internal resistance (r)** due to the materials it\'s made from. The voltage available to your external circuit, called the **terminal potential difference (V)**, is always less than the full e.m.f. when current is flowing.',
    },
    { type: 'formula' as const, content: '$\\varepsilon = V + Ir$ (where **V** is terminal p.d.)' },
    { type: 'text' as const, content: 'Again the **electromotive force (e.m.f., ε)** matters. **This whole sentence is bold, so it is emphasis.**' },
  ],
}

const g = glossaryFromBoldTerms(lesson)
const terms = g.map((e) => e.t)
assert.deepEqual(terms, [
  'practical circuits',
  'electromotive force (e.m.f., ε)',
  'internal resistance (r)',
  'terminal potential difference (V)',
])
assert.ok(
  g[1]!.d.startsWith('Every power source') && g[1]!.d.includes('This is the total electrical energy'),
  `a term that ends its sentence takes the next sentence too: ${g[1]!.d}`
)
assert.ok(!g[1]!.d.includes('**'), 'definitions are plain text')
assert.ok(
  g[2]!.d.startsWith('Inside, it has a small but significant internal resistance (r)'),
  `the sentence that explains the term is the definition: ${g[2]!.d}`
)
assert.ok(!terms.includes('V'), 'formula parts are not glossary terms')
assert.deepEqual(glossaryFromBoldTerms({ sections: [] }), [])

console.log('glossary-terms.test.ts: ok')
