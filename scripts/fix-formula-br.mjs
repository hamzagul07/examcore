import fs from 'fs'
import path from 'path'

const root = path.join(process.cwd(), 'content', 'courses')

let fixed = 0

for (const code of fs.readdirSync(root)) {
  const dir = path.join(root, code)
  if (!fs.statSync(dir).isDirectory()) continue

  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const fp = path.join(dir, file)
    const raw = fs.readFileSync(fp, 'utf8')
    if (!/<br\s*\/?>/i.test(raw)) continue

    const lesson = JSON.parse(raw)
    let changed = false

    for (const section of lesson.sections ?? []) {
      if (section.type !== 'formula' || !section.content) continue
      const next = section.content
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
      if (next !== section.content) {
        section.content = next
        changed = true
      }
    }

    if (changed) {
      fs.writeFileSync(fp, `${JSON.stringify(lesson, null, 2)}\n`)
      fixed++
      console.log('fixed:', path.join(code, file))
    }
  }
}

console.log(`Done. ${fixed} lesson file(s) updated.`)
