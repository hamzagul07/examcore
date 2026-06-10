// page-story.jsx — the founder story / about page

const STORY_TIMELINE = [
  { when: 'Late 2024', what: 'The frustration', note: 'Marked my own mocks with a green pen and a PDF scheme. Took longer than the paper.' },
  { when: 'Early 2025', what: 'First prototype', note: 'One subject (9709), one paper, my own handwriting. It caught a method mark I\u2019d missed.' },
  { when: 'Mid 2025', what: 'Examiner\u2019s Ink', note: 'Stamps on the actual script instead of a text report. Everything clicked.' },
  { when: '2026', what: '15 subjects, free courses', note: 'Whole-paper marking, progress tracking, and courses that are free forever.' },
  { when: 'Next', what: 'IB & more boards', note: 'Same loop, more syllabuses. Slowly, properly.' },
];

function StoryPage({ go }) {
  return (
    <main className="pg" style={{ paddingTop: 56, maxWidth: 920 }} data-screen-label="The story">
      <p className="overline">The story</p>
      <h2 className="h2" style={{ fontSize: 'clamp(36px, 5vw, 56px)' }}>Built by a student <em>who needed it.</em></h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 36, alignItems: 'start', marginTop: 36 }}>
        <div style={{ width: 150, height: 150, borderRadius: '50%', background: 'var(--ink-soft)', border: '1.5px dashed var(--ink-border)', display: 'grid', placeItems: 'center', textAlign: 'center', padding: 14 }}>
          <span className="hand" style={{ fontSize: 19, color: 'var(--ink)', lineHeight: 1.2 }}>your photo here ✎</span>
        </div>
        <div>
          <p className="founder-quote" style={{ fontSize: 26 }}>
            "Past papers without the examiner's eye are half the loop. You practise, you check the
            answer, you <em>think</em> you'd have scored — and then results day disagrees."
          </p>
          <p className="body-2" style={{ fontSize: 16 }}>
            MarkScheme exists to close that gap: marking that cites the official scheme line by line,
            courses that are genuinely free, and honesty about what AI can and can't judge. It's an
            independent tool — not endorsed by Cambridge International — built between revision sessions.
          </p>
        </div>
      </div>

      <section className="sec-tight" data-screen-label="Story — timeline">
        <p className="overline" style={{ marginBottom: 20 }}>The paper trail</p>
        <div className="card" style={{ overflow: 'hidden' }}>
          {STORY_TIMELINE.map((t, i) => (
            <div key={t.when} className="sess" style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 20, alignItems: 'baseline' }}>
              <span className="mono" style={{ fontSize: 12, color: i === STORY_TIMELINE.length - 1 ? 'var(--ink)' : 'var(--muted)', fontWeight: 600 }}>{t.when.toUpperCase()}</span>
              <div>
                <b className="serif" style={{ fontSize: 19, fontWeight: 600 }}>{t.what}</b>
                <p className="body-2" style={{ marginTop: 3 }}>{t.note}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="sec-tight" data-screen-label="Story — principles">
        <p className="overline" style={{ marginBottom: 20 }}>Three promises</p>
        <div className="steps" style={{ marginTop: 0 }}>
          <div className="card step">
            <div className="num">i.</div>
            <h3 className="h3">The courses stay free</h3>
            <p className="body-2">Every lesson, flashcard and practice question — free forever. Marking at scale is what's paid.</p>
          </div>
          <div className="card step">
            <div className="num">ii.</div>
            <h3 className="h3">Honest about AI</h3>
            <p className="body-2">Illegible lines get flagged, not guessed. Essay bands are approximate. Estimates say so.</p>
          </div>
          <div className="card step">
            <div className="num">iii.</div>
            <h3 className="h3">Your work is yours</h3>
            <p className="body-2">Export or delete everything, anytime. No training on your scripts without asking.</p>
          </div>
        </div>
      </section>

      <div style={{ textAlign: 'center', marginTop: 56 }}>
        <button className="btn-primary" onClick={() => go('mark')}>Mark your first question</button>
        <p className="micro" style={{ marginTop: 16 }}>QUESTIONS? <button className="btn-underline" style={{ fontSize: 12, fontFamily: 'IBM Plex Mono, monospace' }} onClick={() => go('how')}>READ HOW IT WORKS</button></p>
      </div>
    </main>
  );
}

Object.assign(window, { StoryPage });
