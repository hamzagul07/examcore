import assert from 'node:assert/strict'
import { DEFAULT_BLOG_AUTHOR, getAuthor } from './authors'
import { getFounderSameAs } from './entity'
import { organizationNode, personNode, profilePageNode } from './structured-data'
import { PAGE_SEO } from './page-meta'
import { FOOTER_COMPANY_LINKS } from '@/lib/site-nav'
import { SITE_URL } from '@/lib/site-config'

// One person, one name, one title, one URL — the whole point of the entity work.
const person = personNode(DEFAULT_BLOG_AUTHOR)
const personId = `${SITE_URL}/hamza-gul-hassan#hamza-gul`

assert.equal(person.name, 'Hamza Gul Hassan', 'the Person node carries the full name')
assert.deepEqual(person.alternateName, ['Hamza Gul'], 'the short name the site used for a year stays as an alias')
assert.equal(person.jobTitle, 'Founder & CEO')
assert.equal(person['@id'], personId, 'the Person is anchored on the founder page, not /about')
assert.equal(person.url, `${SITE_URL}/hamza-gul-hassan`)
assert.deepEqual(person.worksFor, { '@id': `${SITE_URL}/#organization` })

const sameAs = person.sameAs as string[]
assert.ok(sameAs.some((u) => u.includes('linkedin.com/in/hamza-gul-hassan')), 'LinkedIn profile is linked')
assert.ok(sameAs.some((u) => u.includes('github.com/hamzagul07')), 'GitHub profile is linked')
assert.deepEqual(getFounderSameAs(), sameAs)

const org = organizationNode()
const founder = org.founder as Record<string, unknown>
assert.equal(founder['@id'], personId, 'Organization.founder points at the same Person node')
assert.equal(founder.name, 'Hamza Gul Hassan')
assert.equal(founder.jobTitle, 'Founder & CEO')

const profile = profilePageNode(DEFAULT_BLOG_AUTHOR)
assert.equal(profile['@type'], 'ProfilePage')
assert.deepEqual(profile.mainEntity, { '@id': personId }, 'ProfilePage.mainEntity is that Person')
assert.equal(profile.name, 'Hamza Gul Hassan — Founder & CEO of MarkScheme')

// Blog bylines resolve to the same person under both historical author ids.
assert.equal(getAuthor('hassan').name, 'Hamza Gul Hassan')
assert.equal(getAuthor('hamza-gul').url, `${SITE_URL}/hamza-gul-hassan`)

// The page is registered where static marketing pages are registered.
assert.ok(PAGE_SEO['/hamza-gul-hassan'], 'page metadata entry exists')
assert.ok(PAGE_SEO['/hamza-gul-hassan'].title.startsWith('Hamza Gul Hassan'))
assert.ok(
  FOOTER_COMPANY_LINKS.some((l) => l.href === '/hamza-gul-hassan'),
  'sitewide footer links to the founder page'
)

console.log('founder-entity: all assertions passed')
