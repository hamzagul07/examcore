import assert from 'node:assert/strict'
import { clearCourseCatalogCache, readLessonsCache, writeLessonsCache } from './catalog-cache'

clearCourseCatalogCache()
assert.equal(readLessonsCache('9709'), undefined)
writeLessonsCache('9709', [{ slug: 'test', topicCode: '1.1' } as never])
assert.equal(readLessonsCache('9709')?.length, 1)
clearCourseCatalogCache()

console.log('catalog-cache.test.ts: ok')
