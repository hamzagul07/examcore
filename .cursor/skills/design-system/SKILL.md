---
name: design-system-cofounder-lets-you-run-an-entire-company-with-ag
description: Creates implementation-ready design-system guidance with tokens, component behavior, and accessibility standards. Use when creating or updating UI rules, component specifications, or design-system documentation.
---

<!-- TYPEUI_SH_MANAGED_START -->

# Cofounder lets you run an entire company with agents

## Mission
Deliver implementation-ready design-system guidance for Cofounder lets you run an entire company with agents that can be applied consistently across marketing site interfaces.

## Brand
- Product/brand: Cofounder lets you run an entire company with agents
- URL: https://cofounder.co/
- Audience: buyers, teams, and decision-makers
- Product surface: marketing site

## Style Foundations
- Visual style: structured, accessible, implementation-first
- Main font style: `font.family.primary=neoris`, `font.family.stack=neoris, neoris Fallback, sans-serif`, `font.size.base=16px`, `font.weight.base=400`, `font.lineHeight.base=24px`
- Typography scale: `font.size.xs=10px`, `font.size.sm=11px`, `font.size.md=12px`, `font.size.lg=15px`, `font.size.xl=16px`, `font.size.2xl=20px`, `font.size.3xl=24px`, `font.size.4xl=32px`
- Color palette: `color.text.primary=#171717`, `color.text.secondary=#262323`, `color.text.tertiary=#ffffff`, `color.surface.muted=#fbfbf8`, `color.surface.base=#000000`, `color.surface.raised=#f5f5f2`, `color.surface.strong=#1a6fd1`
- Spacing scale: `space.1=2px`, `space.2=4px`, `space.3=6px`, `space.4=8px`, `space.5=10px`, `space.6=12px`, `space.7=14px`, `space.8=16px`
- Radius/shadow/motion tokens: `radius.xs=6px`, `radius.sm=7.14px`, `radius.md=8px`, `radius.lg=12px`, `radius.xl=16px` | `shadow.1=rgb(255, 255, 255) 0px 0px 0px 1px inset, rgba(0, 0, 0, 0.08) 0px 0px 0px 1px, rgba(0, 0, 0, 0.04) 0px 1px 2px 0px, rgba(0, 0, 0, 0.04) 0px 4px 8px 0px`, `shadow.2=rgba(0, 0, 0, 0.06) 0px 2px 3px 0px, rgba(255, 255, 255, 0.35) 0px 0px 0.357px 1.5px inset, rgb(255, 255, 255) 0px 2px 0px 0px inset`, `shadow.3=rgb(255, 255, 255) 0px 0px 0px 0.714px inset, rgba(0, 0, 0, 0.08) 0px 0px 0px 0.714px, rgba(0, 0, 0, 0.04) 0px 0px 14.284px 0px, rgba(0, 0, 0, 0.01) 0px 16.427px 19.998px 0px, rgba(0, 0, 0, 0.02) 0px 7.142px 14.284px 0px, rgba(0, 0, 0, 0.03) 0px 2.143px 7.856px 0px`, `shadow.4=rgba(64, 64, 64, 0.12) 0px 0px 0px 1px, rgba(0, 0, 0, 0.03) 0px 2px 8px 0px, rgba(0, 0, 0, 0.16) 0px 3px 4px 0px, rgba(255, 255, 255, 0.24) 0px 2px 0px 0px inset, rgba(0, 0, 0, 0.25) 0px -0.5px 2px 0px inset` | `motion.duration.instant=20ms`, `motion.duration.fast=60ms`, `motion.duration.normal=120ms`, `motion.duration.slow=140ms`, `motion.duration.slower=200ms`, `motion.duration.step6=700ms`

## Accessibility
- Target: WCAG 2.2 AA
- Keyboard-first interactions required.
- Focus-visible rules required.
- Contrast constraints required.

## Writing Tone
concise, confident, implementation-focused

## Rules: Do
- Use semantic tokens, not raw hex values in component guidance.
- Every component must define required states: default, hover, focus-visible, active, disabled, loading, error.
- Responsive behavior and edge-case handling should be specified for every component family.
- Accessibility acceptance criteria must be testable in implementation.

## Rules: Don't
- Do not allow low-contrast text or hidden focus indicators.
- Do not introduce one-off spacing or typography exceptions.
- Do not use ambiguous labels or non-descriptive actions.

## Guideline Authoring Workflow
1. Restate design intent in one sentence.
2. Define foundations and tokens.
3. Define component anatomy, variants, and interactions.
4. Add accessibility acceptance criteria.
5. Add anti-patterns and migration notes.
6. End with QA checklist.

## Required Output Structure
- Context and goals
- Design tokens and foundations
- Component-level rules (anatomy, variants, states, responsive behavior)
- Accessibility requirements and testable acceptance criteria
- Content and tone standards with examples
- Anti-patterns and prohibited implementations
- QA checklist

## Component Rule Expectations
- Include keyboard, pointer, and touch behavior.
- Include spacing and typography token requirements.
- Include long-content, overflow, and empty-state handling.

## Quality Gates
- Every non-negotiable rule must use "must".
- Every recommendation should use "should".
- Every accessibility rule must be testable in implementation.
- Prefer system consistency over local visual exceptions.

<!-- TYPEUI_SH_MANAGED_END -->
