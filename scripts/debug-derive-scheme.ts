import { readFileSync } from 'fs'
import {
  buildDeriveSchemePrompt,
  deriveMarkScheme,
  parseDerivedScheme,
} from '../lib/marking/derive-scheme'
import { generateGeminiTextWithMeta, GEMINI_PRO_MODEL } from '../lib/ai/gemini-text'
import { extractJSON } from '../lib/marking/json'

for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const eq = t.indexOf('=')
  if (eq < 0) continue
  const k = t.slice(0, eq).trim()
  let v = t.slice(eq + 1).trim()
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1)
  }
  if (process.env[k] === undefined) process.env[k] = v
}

const questionText = `(a) Use logarithms to solve the inequality 4^x < 0.05. Give your answer in the form x < a, where the value of a is correct to 3 significant figures.
[2]`

async function main() {
  const prompt = buildDeriveSchemePrompt({
    subjectName: 'Mathematics',
    board: 'Cambridge International',
    questionText,
    totalMarks: 2,
    mathConventions: true,
  })

  console.log('Calling derive via Pro…')
  try {
    const { text } = await generateGeminiTextWithMeta(prompt, {
      task: 'marking',
      model: GEMINI_PRO_MODEL,
      temperature: 0,
      seed: 20260728,
      maxOutputTokens: 10000,
    })
    console.log('raw len', text.length)
    console.log('raw preview', text.slice(0, 800))
    try {
      const json = extractJSON(text)
      console.log('json', JSON.stringify(json, null, 2).slice(0, 1200))
      const parsed = parseDerivedScheme(json, 2)
      console.log(
        'parsed',
        parsed
          ? {
              total: parsed.total,
              marks: parsed.scheme.marks.length,
              unstable: parsed.unstable,
              points: parsed.scheme.marks,
            }
          : null
      )
    } catch (e) {
      console.log('extractJSON failed', (e as Error).message)
    }
  } catch (e) {
    console.log('derive call failed', String((e as Error).message || e).slice(0, 400))
  }

  const wrapped = await deriveMarkScheme({
    subjectName: 'Mathematics',
    board: 'Cambridge International',
    questionText,
    totalMarks: 2,
    mathConventions: true,
  })
  console.log(
    'deriveMarkScheme result',
    wrapped
      ? {
          total: wrapped.total,
          n: wrapped.scheme.marks.length,
          unstable: wrapped.unstable,
        }
      : null
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
