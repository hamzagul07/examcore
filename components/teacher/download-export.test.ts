/**
 * The export download's pure part: the file name comes from the route's
 * Content-Disposition, else the caller's fallback. (downloadExport itself
 * needs a browser: it clicks an object-URL link.)
 */
import assert from 'node:assert/strict'
import { exportFilename } from '@/components/teacher/download-export'

assert.equal(exportFilename('attachment; filename="12B-maths-sets.csv"', 'fallback.csv'), '12B-maths-sets.csv')
assert.equal(exportFilename(null, 'set-markbook.csv'), 'set-markbook.csv', 'no header: the fallback')
assert.equal(exportFilename('attachment', 'set-markbook.csv'), 'set-markbook.csv', 'no file name in it: the fallback')
assert.equal(exportFilename('attachment; filename=""', 'x.csv'), 'x.csv', 'an empty name is no name')

console.log('download-export.test.ts: all checks passed')
