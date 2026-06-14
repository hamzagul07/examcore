import type { CourseLesson } from '@/lib/courses/types'
import { PACK_9701_AS_PHYSICAL } from './9701-as-physical'
import { PACK_9701_AS_ORGANIC } from './9701-as-organic'
import { PACK_9701_AL } from './9701-al'
import { PACK_9709_P1_P3, PACK_9709_P4_P6 } from './9709-p1-p3'
import { PACK_9618 } from './9618-p1-p5'
import { PACK_9231 } from './9231-p1-p4'
import { PACK_9700_PILOT, PACK_9702_PILOT } from './9700-pilot'

/** Content packs keyed by `subjectCode:topicCode` — merged after overrides, before heuristics. */
export const STEM_CONTENT_PACKS: Record<string, Partial<CourseLesson>> = {
  ...Object.fromEntries(
    Object.entries(PACK_9701_AS_PHYSICAL).map(([k, v]) => [k, v as Partial<CourseLesson>])
  ),
  ...Object.fromEntries(
    Object.entries(PACK_9701_AS_ORGANIC).map(([k, v]) => [k, v as Partial<CourseLesson>])
  ),
  ...Object.fromEntries(Object.entries(PACK_9701_AL).map(([k, v]) => [k, v as Partial<CourseLesson>])),
  ...Object.fromEntries(
    Object.entries(PACK_9709_P1_P3).map(([k, v]) => [k, v as Partial<CourseLesson>])
  ),
  ...Object.fromEntries(
    Object.entries(PACK_9709_P4_P6).map(([k, v]) => [k, v as Partial<CourseLesson>])
  ),
  ...Object.fromEntries(Object.entries(PACK_9618).map(([k, v]) => [k, v as Partial<CourseLesson>])),
  ...Object.fromEntries(Object.entries(PACK_9231).map(([k, v]) => [k, v as Partial<CourseLesson>])),
  ...Object.fromEntries(
    Object.entries(PACK_9700_PILOT).map(([k, v]) => [k, v as Partial<CourseLesson>])
  ),
  ...Object.fromEntries(
    Object.entries(PACK_9702_PILOT).map(([k, v]) => [k, v as Partial<CourseLesson>])
  ),
}

export function getStemContentPack(subjectCode: string, topicCode: string): Partial<CourseLesson> | undefined {
  return STEM_CONTENT_PACKS[`${subjectCode}:${topicCode}`]
}
