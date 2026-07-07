#!/usr/bin/env node
/**
 * Regenerate public/llms.txt from lib/seo/llms-document.ts (Q&A from llms-geo-qa.ts).
 * Run: pnpm seo:generate-llms — also chained before seo:geo-sync-check in CI.
 */
import { writeFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const { buildLlmsTxt } = await import('../lib/seo/llms-document.ts')

const outPath = path.join(root, 'public', 'llms.txt')
writeFileSync(outPath, `${buildLlmsTxt()}\n`)
console.log(`Wrote ${outPath}`)
