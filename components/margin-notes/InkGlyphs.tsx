import { cn } from '@/lib/utils'

type GlyphProps = {
  className?: string
  title?: string
}

/** Tick stamp — Mark / awarded. */
export function InkGlyphTick({ className, title = 'Mark' }: GlyphProps) {
  return (
    <svg
      className={cn('ms-ink-glyph', className)}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title ? <title>{title}</title> : null}
      <rect
        x="3"
        y="3"
        width="26"
        height="26"
        rx="6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeDasharray="3 2"
        opacity="0.45"
      />
      <path
        d="M8.5 16.5 L13.5 21.5 L23.5 10"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Ruled book slip — Learn / courses. */
export function InkGlyphBook({ className, title = 'Learn' }: GlyphProps) {
  return (
    <svg
      className={cn('ms-ink-glyph', className)}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M6 7.5 H22.5 C24 7.5 25 8.5 25 10 V24.5 C25 25.5 24 26.5 22.5 26.5 H6 V7.5 Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M6 7.5 V26.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M10 12.5 H21 M10 16.5 H18 M10 20.5 H20" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
    </svg>
  )
}

/** Margin scribble / room hash — Discuss. */
export function InkGlyphDiscuss({ className, title = 'Discuss' }: GlyphProps) {
  return (
    <svg
      className={cn('ms-ink-glyph', className)}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M6 9.5 H22 C23.5 9.5 24.5 10.5 24.5 12 V19 C24.5 20.5 23.5 21.5 22 21.5 H14 L9 26 V21.5 H6 C4.5 21.5 3.5 20.5 3.5 19 V12 C3.5 10.5 4.5 9.5 6 9.5 Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M9 14.5 H19 M9 17.5 H15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.75"
      />
    </svg>
  )
}

/** Room hash mark for community crumbs. */
export function InkGlyphHash({ className, title = 'Room' }: GlyphProps) {
  return (
    <svg
      className={cn('ms-ink-glyph', className)}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M12 6 L10 26 M22 6 L20 26 M6 12.5 H26 M5 19.5 H25"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Small note lines — notes feature. */
export function InkGlyphNotes({ className, title = 'Notes' }: GlyphProps) {
  return (
    <svg
      className={cn('ms-ink-glyph', className)}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title ? <title>{title}</title> : null}
      <rect x="7" y="5" width="18" height="22" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M11 11 H21 M11 16 H19 M11 21 H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/** Diamond — diagrams. */
export function InkGlyphDiagram({ className, title = 'Diagrams' }: GlyphProps) {
  return (
    <svg
      className={cn('ms-ink-glyph', className)}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M16 5 L27 16 L16 27 L5 16 Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Card stack — flashcards. */
export function InkGlyphCards({ className, title = 'Flashcards' }: GlyphProps) {
  return (
    <svg
      className={cn('ms-ink-glyph', className)}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title ? <title>{title}</title> : null}
      <rect x="8" y="8" width="16" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" opacity="0.45" transform="rotate(-8 16 14)" />
      <rect x="7" y="10" width="18" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

/** Arrow into mark — practice link. */
export function InkGlyphArrow({ className, title = 'Mark link' }: GlyphProps) {
  return (
    <svg
      className={cn('ms-ink-glyph', className)}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M6 16 H24 M17 9 L24 16 L17 23"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Streak mark — green ink flame substitute (no emoji). */
export function InkGlyphStreak({ className, title = 'Streak' }: GlyphProps) {
  return (
    <svg
      className={cn('ms-ink-glyph', className)}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M16 4 C16 4 10 11 10 17 C10 21.4 12.7 24.5 16 24.5 C19.3 24.5 22 21.4 22 17 C22 14 20 11.5 18.5 10 C19.5 13 18 15 16.5 15.5 C17.5 12 16 7.5 16 4 Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Desk square — Home / dashboard. */
export function InkGlyphHome({ className, title = 'Home' }: GlyphProps) {
  return (
    <svg
      className={cn('ms-ink-glyph', className)}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M5 14.5 L16 6 L27 14.5 V25.5 C27 26.5 26 27.5 25 27.5 H7 C6 27.5 5 26.5 5 25.5 V14.5 Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M12.5 27.5 V18.5 H19.5 V27.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Rising bars — Progress. */
export function InkGlyphProgress({ className, title = 'Progress' }: GlyphProps) {
  return (
    <svg
      className={cn('ms-ink-glyph', className)}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M7 24 V16 M16 24 V10 M25 24 V14"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M5 26 H27"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.45"
      />
    </svg>
  )
}

/** Syllabus code slip — courses crumb. */
export function InkGlyphCode({ className, title = 'Course' }: GlyphProps) {
  return (
    <svg
      className={cn('ms-ink-glyph', className)}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title ? <title>{title}</title> : null}
      <rect x="4" y="9" width="24" height="14" rx="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 16 H23" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
