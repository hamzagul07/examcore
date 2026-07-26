import fs from 'node:fs'
import path from 'node:path'

/**
 * Pins the IB subject-code convention that /api/courses/explain depends on.
 *
 * The two IB lesson routes pass different things as `subjectCode`:
 *   /ib/courses/<slug>        (canonical, sitemapped) -> "history-hl"
 *   /courses/ib-<subject>     (legacy alias)          -> "ib-history-hl"
 *
 * Content only ever lives under the prefixed name, so the API resolves the
 * canonical slug by prefixing. When that was missing, every IB lesson page on
 * the canonical route returned "Unknown lesson", and the board detector (which
 * tests for the `ib-` prefix) would have prompted for Cambridge B1/M1/A1 marks
 * on a markband subject.
 *
 * If this test fails, the prefix convention changed and the resolver in
 * app/api/courses/explain/route.ts needs updating with it.
 */

let failed = 0
function check(name: string, ok: boolean) {
  if (!ok) {
    failed++
    console.error(`FAIL ${name}`)
  }
}

const root = 'content/courses'
const ibDirs = fs
  .readdirSync(root)
  .filter((d) => d.startsWith('ib-') && fs.statSync(path.join(root, d)).isDirectory())

check('IB course directories exist', ibDirs.length > 0)

// This mirrors getIbCourseSlugs(), which strips the prefix with d.slice(3).
const canonicalSlugs = ibDirs.map((d) => d.slice(3))

check('no canonical slug keeps the ib- prefix', canonicalSlugs.every((s) => !s.startsWith('ib-')))
check('canonical slugs are unique', new Set(canonicalSlugs).size === canonicalSlugs.length)

// The resolver's whole contract: prefixing a canonical slug finds the content.
for (const slug of canonicalSlugs) {
  const dir = path.join(root, `ib-${slug}`)
  if (!fs.existsSync(dir)) {
    failed++
    console.error(`FAIL prefixing "${slug}" does not locate content (${dir})`)
  }
}
check('every canonical slug resolves by prefixing', true)

// A Cambridge code must NOT be reachable by prefixing — it would silently
// resolve a numeric subject into the IB namespace.
check('cambridge codes are not ib- prefixed', !fs.existsSync(path.join(root, 'ib-9702')))
check('cambridge content still lives unprefixed', fs.existsSync(path.join(root, '9702')))

if (failed > 0) process.exit(1)
console.log(
  `ib-subject-code.test.ts: all checks passed (${canonicalSlugs.length} IB subjects)`
)
