import assert from 'node:assert/strict'
import {
  isEligibleForMaxDay4,
  isEligibleForMaxTour,
  MAX_DAY4_DELAY_MS,
  MAX_LIFECYCLE_BACKLOG_MS,
  MAX_TOUR_DELAY_MS,
} from './lifecycle-timing'

const welcome = new Date('2026-08-01T12:00:00Z')

assert.equal(
  isEligibleForMaxTour({
    welcomeAt: welcome,
    now: new Date(welcome.getTime() + MAX_TOUR_DELAY_MS - 1000),
    alreadySent: false,
  }),
  false,
  'tour before 24h'
)
assert.equal(
  isEligibleForMaxTour({
    welcomeAt: welcome,
    now: new Date(welcome.getTime() + MAX_TOUR_DELAY_MS + 1000),
    alreadySent: false,
  }),
  true,
  'tour after 24h'
)
assert.equal(
  isEligibleForMaxTour({
    welcomeAt: welcome,
    now: new Date(welcome.getTime() + MAX_TOUR_DELAY_MS + 1000),
    alreadySent: true,
  }),
  false,
  'tour already sent'
)
assert.equal(
  isEligibleForMaxTour({
    welcomeAt: welcome,
    now: new Date(welcome.getTime() + MAX_LIFECYCLE_BACKLOG_MS + 1000),
    alreadySent: false,
  }),
  false,
  'tour backlog'
)

assert.equal(
  isEligibleForMaxDay4({
    welcomeAt: welcome,
    now: new Date(welcome.getTime() + MAX_DAY4_DELAY_MS - 1000),
    alreadySent: false,
  }),
  false,
  'day4 before 4d'
)
assert.equal(
  isEligibleForMaxDay4({
    welcomeAt: welcome,
    now: new Date(welcome.getTime() + MAX_DAY4_DELAY_MS + 1000),
    alreadySent: false,
  }),
  true,
  'day4 after 4d'
)

console.log('lifecycle-timing: all assertions passed')
