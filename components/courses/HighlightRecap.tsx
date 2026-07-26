'use client'

import {
  HIGHLIGHT_META,
  byKind,
  kindsPresent,
  type Highlight,
} from '@/lib/courses/highlights'

/**
 * What you marked, collected at the end of the lesson.
 *
 * This is the reason the colours mean things. "The four things I did not
 * follow" is a revision list; "the four yellow bits" is not. Grouping by
 * meaning turns a page you scribbled on into the shortest useful summary of it
 * — and the one thing on the page that is entirely yours rather than ours.
 *
 * The unclear group leads with an explanation offer, which closes the loop the
 * highlighter opens: marking something as not understood should do more than
 * colour it in.
 */

export function HighlightRecap({
  list,
  onJump,
}: {
  list: Highlight[]
  onJump: (sectionId: string) => void
}) {
  const kinds = kindsPresent(list)
  if (!kinds.length) return null

  return (
    <section className="lesson-hl-recap" aria-label="Your highlights">
      <p className="micro hl-recap-kicker">YOUR MARKS · {list.length}</p>
      {kinds.map((kind) => {
        const items = byKind(list, kind)
        return (
          <div key={kind} className={`hl-recap-group hl-group-${kind}`}>
            <h3 className="hl-recap-title">{HIGHLIGHT_META[kind].recapTitle}</h3>
            {kind === 'unclear' ? (
              <p className="hl-recap-lead body-2">
                Re-reading these is the least effective thing you could do with
                them. Open the section and use <b>Simpler</b> or <b>Why?</b>{' '}
                underneath the paragraph — that is what they are for.
              </p>
            ) : null}
            <ul className="hl-recap-list">
              {items.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    className="hl-recap-item"
                    onClick={() => onJump(h.section)}
                  >
                    <span className={`hl-recap-quote hl-q-${kind}`}>
                      {h.text || '(highlighted passage)'}
                    </span>
                    <span className="hl-recap-go mono">Go to it →</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </section>
  )
}
