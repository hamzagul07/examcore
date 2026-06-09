#!/usr/bin/env node
import { spawnSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), 'generate-senpai-pilots.mjs')
const args = ['--level', 'as', ...process.argv.slice(2)]
const r = spawnSync(process.execPath, [script, ...args], { stdio: 'inherit' })
process.exit(r.status ?? 1)
