import Link from 'next/link'

export function LandingFounder() {
  return (
    <section id="story" className="ms-pg ms-sec scroll-mt-20">
      <div className="ms-founder">
        <div className="ms-founder-avatar" aria-hidden>
          H
        </div>
        <div>
          <p className="ms-founder-quote">
            &ldquo;I built this because I couldn&apos;t tell whether my working would actually score.
            Past papers without the examiner&apos;s eye are half the loop — this closes it.&rdquo;
          </p>
          <p className="ms-micro">
            BUILT BY A STUDENT · HONEST ABOUT AI LIMITS · NOT ENDORSED BY CAMBRIDGE INTERNATIONAL ·{' '}
            <Link
              href="/about"
              className="ec-btn-underline"
              style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}
            >
              READ THE STORY →
            </Link>
          </p>
        </div>
      </div>
    </section>
  )
}
