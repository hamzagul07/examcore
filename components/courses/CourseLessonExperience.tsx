'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, BookOpen, Eye, Heart, Lightbulb, Target } from 'lucide-react'
import type { CourseLesson, PastPaperQuestionRef } from '@/lib/courses/types'
import type { EnrichedVisualLesson, VisualBlock, VisualTemplate } from '@/lib/courses/visual-types'
import { CourseLessonContent } from '@/components/courses/CourseLessonContent'
import { CoursePastPaperSection } from '@/components/courses/CoursePastPaperSection'
import { TopicDiagram } from '@/components/courses/visuals/TopicDiagram'
import { VisualStepCarousel } from '@/components/courses/visuals/VisualStepCarousel'
import { VisualStepTimeline } from '@/components/courses/visuals/VisualStepTimeline'
import { LearningPathBar } from '@/components/courses/visuals/LearningPathBar'
import { FormulaVisual } from '@/components/courses/visuals/FormulaVisual'
import { SnapshotGrid } from '@/components/courses/visuals/SnapshotGrid'
import { ConceptCompare } from '@/components/courses/visuals/ConceptCompare'
import { ConceptMapVisual } from '@/components/courses/visuals/ConceptMapVisual'
import { QuickCheckPanel } from '@/components/courses/visuals/QuickCheckPanel'
import { KeyTermsPanel } from '@/components/courses/visuals/KeyTermsPanel'

type Tab = 'visual' | 'notes' | 'practice'

function HeroVisual({
  template,
  caption,
}: {
  template: VisualTemplate
  caption: string
}) {
  return (
    <div className="course-visual-hero">
      <div className="course-visual-hero-diagram px-5 pt-5 lg:px-8 lg:pt-8">
        <div className="rounded-xl border-2 border-dashed border-[color-mix(in_srgb,var(--ec-brand)_30%,var(--ec-border-subtle))] bg-[var(--ec-surface-raised)] p-3">
          <TopicDiagram template={template} />
        </div>
        <p className="mt-3 text-center text-[10px] font-bold uppercase tracking-wide text-[var(--ec-text-tertiary)]">
          Visual overview
        </p>
      </div>
      <p className="course-visual-hero-caption lg:text-base">{caption}</p>
    </div>
  )
}

function VisualBlockRenderer({
  block,
  template,
  stageSteps,
}: {
  block: VisualBlock
  template: VisualTemplate
  stageSteps?: Extract<VisualBlock, { type: 'step-carousel' }> | null
}) {
  if (block.type === 'hero-visual' && stageSteps) {
    return (
      <div className="course-visual-stage grid gap-6 lg:grid-cols-2 lg:gap-8 xl:grid-cols-[1.15fr_0.85fr]">
        <HeroVisual template={block.template} caption={block.caption} />
        <div>
          <VisualStepTimeline title={stageSteps.title} steps={stageSteps.steps} />
          <VisualStepCarousel title={stageSteps.title} steps={stageSteps.steps} />
        </div>
      </div>
    )
  }

  switch (block.type) {
    case 'step-carousel':
      return <VisualStepCarousel title={block.title} steps={block.steps} />
    case 'hero-visual':
      return <HeroVisual template={block.template} caption={block.caption} />
    case 'learning-path':
      return <LearningPathBar title={block.title} steps={block.steps} />
    case 'diagram-image':
      return (
        <figure className="overflow-hidden rounded-2xl border-2 border-[color-mix(in_srgb,var(--ec-brand)_30%,var(--ec-border-subtle))] bg-[var(--ec-surface-muted)] p-2 shadow-lg lg:rounded-3xl">
          <Image
            src={block.src}
            alt={block.alt}
            width={1280}
            height={720}
            className="h-auto w-full rounded-xl border border-[var(--ec-border-subtle)]"
            unoptimized
          />
          <figcaption className="px-2 py-2 text-center text-xs text-[var(--ec-text-tertiary)]">
            Syllabus diagram — use labels to link ideas to past papers
          </figcaption>
        </figure>
      )
    case 'key-terms':
      return <KeyTermsPanel title={block.title} terms={block.terms} />
    case 'concept-map':
      return <ConceptMapVisual center={block.center} nodes={block.nodes} template={template} />
    case 'quick-check':
      return <QuickCheckPanel title={block.title} items={block.items} />
    case 'formula-visual':
      return <FormulaVisual expression={block.expression} parts={block.parts} />
    case 'snapshots':
      return <SnapshotGrid title={block.title} cards={block.cards} />
    case 'compare':
      return <ConceptCompare title={block.title} simple={block.simple} exam={block.exam} />
    case 'worked-visual':
      return (
        <div className="course-worked-box lg:col-span-2">
          <div className="course-worked-header px-4 py-3 lg:px-6 lg:py-4">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--ec-accent)]">
              <Target className="h-4 w-4" aria-hidden />
              Worked example — follow each line
            </p>
            <p className="mt-2 font-medium text-[var(--ec-text-primary)] lg:text-lg">
              {block.question}
            </p>
          </div>
          <pre className="whitespace-pre-wrap border-t-2 border-[var(--ec-border-subtle)] bg-[var(--ec-surface-muted)] px-4 py-4 font-mono text-sm leading-relaxed text-[var(--ec-text-secondary)] lg:px-6 lg:py-5 lg:text-base">
            {block.solution}
          </pre>
        </div>
      )
    case 'exam-tip':
      return (
        <div className="course-exam-tip-box flex gap-3 px-4 py-4 text-sm leading-relaxed text-[var(--ec-text-secondary)] lg:px-6 lg:py-5 lg:text-base">
          <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
          <div>
            <p className="mb-1 font-bold text-[var(--ec-text-primary)]">Examiner tip</p>
            <p>{block.content}</p>
          </div>
        </div>
      )
    case 'practice-cta':
      return (
        <Link
          href={block.href}
          className="ec-btn-primary inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-base font-semibold no-underline"
        >
          {block.label}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      )
    default:
      return null
  }
}

function isWideBlock(block: VisualBlock): boolean {
  return (
    block.type === 'concept-map' ||
    block.type === 'compare' ||
    block.type === 'worked-visual' ||
    block.type === 'diagram-image' ||
    block.type === 'learning-path' ||
    block.type === 'hero-visual'
  )
}

export function CourseLessonExperience({
  lesson,
  enriched,
  pastPaperQuestions,
  topicTitle,
}: {
  lesson: CourseLesson
  enriched: EnrichedVisualLesson
  pastPaperQuestions: PastPaperQuestionRef[]
  topicTitle: string
}) {
  const [tab, setTab] = useState<Tab>('visual')

  const tabs: { id: Tab; label: string; hint: string; icon: typeof Eye }[] = [
    { id: 'visual', label: 'Learn visually', hint: 'Diagrams & steps', icon: Eye },
    { id: 'notes', label: 'Read notes', hint: 'Full write-up', icon: BookOpen },
    { id: 'practice', label: 'Past papers', hint: 'Try questions', icon: Target },
  ]

  const stageSteps = enriched.blocks.find(
    (b): b is Extract<VisualBlock, { type: 'step-carousel' }> => b.type === 'step-carousel'
  )

  return (
    <div className="course-lesson-experience">
      <div
        className="course-visual-tabs mb-8 inline-flex w-full flex-wrap gap-1 rounded-2xl border border-[var(--ec-border-subtle)] bg-[var(--ec-surface-muted)] p-1.5 sm:w-auto"
        role="tablist"
        aria-label="Lesson view"
      >
        {tabs.map(({ id, label, hint, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`flex flex-col items-center justify-center gap-0.5 rounded-xl px-5 py-2.5 transition-colors sm:min-w-[8.5rem] ${
              tab === id
                ? 'bg-[var(--ec-surface-raised)] text-[var(--ec-text-primary)] shadow-sm'
                : 'text-[var(--ec-text-tertiary)] hover:text-[var(--ec-text-secondary)]'
            }`}
          >
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </span>
            <span className="text-[10px] font-medium opacity-80">{hint}</span>
          </button>
        ))}
      </div>

      {tab === 'visual' ? (
        <div role="tabpanel">
          <div className="course-student-banner" role="note">
            <Heart className="mt-0.5 h-5 w-5 shrink-0 text-[var(--ec-brand)]" aria-hidden />
            <p>
              <strong>Learn your way.</strong> Tap symbols, swipe steps, and reveal answers when you
              are ready. You do not need to read everything at once — go at your own pace.
            </p>
          </div>
          <div className="course-visual-canvas space-y-8 lg:space-y-10">
          {enriched.blocks.map((block, i) => {
            if (block.type === 'step-carousel') return null
            const wide = isWideBlock(block)
            return (
              <div
                key={`${block.type}-${i}`}
                className={wide ? 'course-visual-block-wide' : 'course-visual-block'}
              >
                <VisualBlockRenderer
                  block={block}
                  template={enriched.template}
                  stageSteps={stageSteps}
                />
              </div>
            )
          })}
          </div>
        </div>
      ) : null}

      {tab === 'notes' ? (
        <div
          className="course-notes-panel max-w-none rounded-2xl border-2 border-[var(--ec-border-subtle)] bg-[var(--ec-surface-raised)] p-5 sm:p-6"
          role="tabpanel"
        >
          <CourseLessonContent lesson={lesson} />
        </div>
      ) : null}

      {tab === 'practice' ? (
        <div className="space-y-6" role="tabpanel">
          <CoursePastPaperSection questions={pastPaperQuestions} topicTitle={topicTitle} />
          {enriched.blocks
            .filter((b): b is Extract<VisualBlock, { type: 'practice-cta' }> => b.type === 'practice-cta')
            .map((b) => (
              <VisualBlockRenderer key={b.href} block={b} template={enriched.template} />
            ))}
        </div>
      ) : null}
    </div>
  )
}
