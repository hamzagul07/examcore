import { getApprovedTestimonials } from '@/lib/marketing/testimonials'
import { SUBJECT_CODE_MAP } from '@/lib/profile-options'

/**
 * Student voices on the landing page.
 *
 * The site previously had twelve sections and not one word from an actual user
 * — every claim was our own. This section is fed only by feedback students left
 * after a real mark, opted in to sharing, and that was then approved.
 *
 * It renders nothing at all when there is nothing approved yet. Showing an
 * empty "loved by students" shell, or inventing quotes to fill it, would do
 * more damage to trust than having no section — so the absence is the design.
 */
export async function LandingProof() {
  const testimonials = await getApprovedTestimonials(6)
  if (testimonials.length === 0) return null

  return (
    <section
      id="students"
      className="ms-pg ms-sec scroll-mt-20"
      aria-labelledby="students-heading"
    >
      <h2 id="students-heading" className="ms-h2">
        What students say after a mark
      </h2>
      <p className="ms-lead" style={{ marginTop: 12 }}>
        Every quote below was left by a student straight after their own work
        was marked, and shared with their permission.
      </p>

      <ul
        className="mt-8 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3"
        role="list"
      >
        {testimonials.map((t) => {
          // Own-property lookup only. A bare `MAP[key]` resolves '__proto__' /
          // 'toString' to inherited members, which React then throws on while
          // rendering — one bad row would 500 the homepage.
          const subject =
            t.subjectCode && Object.hasOwn(SUBJECT_CODE_MAP, t.subjectCode)
              ? SUBJECT_CODE_MAP[t.subjectCode]
              : null
          return (
            <li key={t.id} className="ec-card flex h-full flex-col gap-3 p-5">
              <blockquote className="flex-1 text-sm leading-relaxed text-[var(--ec-text-primary)]">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <footer className="text-xs text-[var(--ec-text-secondary)]">
                <span className="font-semibold">{t.name}</span>
                {typeof subject === 'string' && <span> · {subject}</span>}
              </footer>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
