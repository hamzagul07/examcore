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

if (failed > 0) {
  process.exit(1)
}

console.log(
  `OK: ${ibBlogFiles().length} IB blog posts and ${walkTsx(IB_APP_DIR).length} IB hub pages contain no Cambridge references`
)
