import assert from 'node:assert/strict'
import { buildFirstMarkHref, wantsFirstMark } from './first-mark-link'

assert.equal(buildFirstMarkHref('9709'), '/mark?starter=1&subject=9709')
assert.equal(buildFirstMarkHref(' 9702 '), '/mark?starter=1&subject=9702')
assert.equal(buildFirstMarkHref('ib-chemistry'), '/mark?starter=1', 'no banked starters outside Cambridge codes')
assert.equal(buildFirstMarkHref(null), '/mark?starter=1')
assert.equal(buildFirstMarkHref(undefined), '/mark?starter=1')
assert.equal(buildFirstMarkHref(''), '/mark?starter=1')

assert.equal(wantsFirstMark('?starter=1&subject=9709'), true)
assert.equal(wantsFirstMark(new URLSearchParams('starter=1')), true)
assert.equal(wantsFirstMark('?subject=9709'), false)
assert.equal(wantsFirstMark('?starter=0'), false)

console.log('first-mark-link: all assertions passed')
