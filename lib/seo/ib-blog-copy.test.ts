import fs from 'fs'
import path from 'path'

const BLOG_DIR = path.join(process.cwd(), 'content/blog')
const IB_APP_DIR = path.join(process.cwd(), 'app/(marketing)/ib')

const FORBIDDEN = [/cambridge/i, /cambridgeinternational/i, /\/blog\/cambridge-/i]

function walkTsx(dir: string): string[] {
  const out: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walkTsx(full))
    else if (entry.name.endsWith('.tsx')) out.push(full)
  }
  return out
}

function ibBlogFiles(): string[] {
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.startsWith('ib-') && f.endsWith('.md'))
}

let failed = 0

for (const file of ibBlogFiles()) {
  const text = fs.readFileSync(path.join(BLOG_DIR, file), 'utf8')
  for (const pattern of FORBIDDEN) {
    if (pattern.test(text)) {
      console.error(`FAIL blog/${file}: matched ${pattern}`)
      failed++
    }
  }
}

for (const file of walkTsx(IB_APP_DIR)) {
  const rel = path.relative(process.cwd(), file)
  const text = fs.readFileSync(file, 'utf8')
  for (const pattern of FORBIDDEN) {
    if (pattern.test(text)) {
      console.error(`FAIL ${rel}: matched ${pattern}`)
      failed++
    }
  }
}

/**
 * Components rendered INTO an IB article are part of its copy.
 *
 * The markdown scan above cannot see them, and that gap was real: a worked
 * example shared across every blog post put "A-Level", a Cambridge syllabus
 * code and a session string onto ~174 IB articles that are deliberately kept
 * Cambridge-free. Anything the blog article template renders on an IB page is
 * checked here too, following one level of local imports so a fixture cannot
 * smuggle the terminology in behind a component.
 */
const BLOG_ARTICLE_COMPONENTS = [
  'components/blog/BlogMarkExample.tsx',
  'lib/marking/demo-result-ib.ts',
]

/**
 * The rule is about copy a reader sees, so comments are stripped before
 * matching — otherwise a file cannot explain the rule without failing it.
 * Removes block comments and whole-line `//` or `*` comments, which leaves
 * URLs inside string literals untouched.
 */
function withoutComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => {
      const t = line.trim()
      return !t.startsWith('//') && !t.startsWith('*')
    })
    .join('\n')
}

function localImports(file: string): string[] {
  const text = fs.readFileSync(file, 'utf8')
  const out: string[] = []
  for (const m of text.matchAll(/from '@\/([^']+)'/g)) {
    for (const ext of ['.ts', '.tsx']) {
      const candidate = path.join(process.cwd(), m[1] + ext)
      if (fs.existsSync(candidate)) out.push(candidate)
    }
  }
  return out
}

for (const rel of BLOG_ARTICLE_COMPONENTS) {
  const file = path.join(process.cwd(), rel)
  if (!fs.existsSync(file)) {
    console.error(`FAIL ${rel}: listed for the IB copy check but missing`)
    failed++
    continue
  }
  // The Cambridge fixture is reached only on the Cambridge branch, so the
  // component file itself may import it; what must stay clean is the IB
  // fixture and any wording the component renders on the IB path.
  const text = withoutComments(fs.readFileSync(file, 'utf8'))
  // Only the IB fixture must be wholly Cambridge-free; the shared component
  // legitimately imports the Cambridge fixture for its Cambridge branch.
  if (!rel.includes('-ib')) continue
  for (const pattern of FORBIDDEN) {
    if (pattern.test(text)) {
      console.error(`FAIL ${rel}: matched ${pattern}`)
      failed++
    }
  }
  if (/a-level|\b9\d{3}\b|May\/June|Oct\/Nov/i.test(text)) {
    console.error(`FAIL ${rel}: contains a Cambridge qualification or paper reference`)
    failed++
  }
}

if (failed > 0) {
  process.exit(1)
}

console.log(
  `OK: ${ibBlogFiles().length} IB blog posts, ${walkTsx(IB_APP_DIR).length} IB hub pages and ${BLOG_ARTICLE_COMPONENTS.length} blog-article components contain no Cambridge references`
)
