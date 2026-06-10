// page-courses.jsx — catalog + lesson view with explain-simpler toggle

const COURSE_LIST = [
  { code: '9709', name: 'Mathematics', glyph: '∫', color: 'var(--acc-blue)', units: 11, meta: '54 lessons · 312 past-paper questions', prog: 62 },
  { code: '9702', name: 'Physics', glyph: 'Ω', color: 'var(--acc-violet)', units: 25, meta: '48 lessons · 280 past-paper questions', prog: 41 },
  { code: '9701', name: 'Chemistry', glyph: '⌬', color: 'var(--acc-teal)', units: 23, meta: '46 lessons · 265 past-paper questions', prog: 18 },
  { code: '9700', name: 'Biology', glyph: 'ϕ', color: 'var(--ink)', units: 19, meta: '50 lessons · 240 past-paper questions', prog: 0 },
];

const TOC = [
  { head: 'Unit 17 · Oscillations' },
  { t: '17.1 Simple harmonic motion', st: '✓', on: true },
  { t: '17.2 Energy in SHM', st: '✓' },
  { t: '17.3 Damped & forced oscillations', st: '·' },
  { head: 'Unit 18 · Electric fields' },
  { t: '18.1 Concept of a field', st: '·' },
  { t: '18.2 Uniform fields', st: '·' },
];

const FLASHCARDS = [
  { q: 'Define simple harmonic motion (the 2-mark version).', a: 'a ∝ −x: acceleration proportional to displacement, directed towards the fixed point' },
  { q: 'v_max in terms of ω and amplitude?', a: 'v_max = ωx₀ — ONE power of ω (a_max = ω²x₀)' },
  { q: 'What does the minus sign in a = −ω²x earn?', a: 'usually a whole B1 — it encodes “restoring”' },
];

function Flashcards() {
  const [flipped, setFlipped] = React.useState({});
  return (
    <div style={{ marginTop: 30 }} data-screen-label="Courses — flashcards">
      <p className="overline" style={{ marginBottom: 4 }}>Flashcards · tap to flip</p>
      <div className="fc-row">
        {FLASHCARDS.map((c, i) => {
          const f = !!flipped[i];
          return (
            <div key={i} className={'fc' + (f ? ' flipped' : '')} onClick={() => setFlipped(s => ({ ...s, [i]: !s[i] }))}>
              <span className="fc-side">{f ? 'ANSWER' : 'QUESTION ' + (i + 1) + ' / ' + FLASHCARDS.length}</span>
              {f ? <span className="fc-a">{c.a}</span> : <span className="fc-q">{c.q}</span>}
              <span className="fc-hint">{f ? 'tap to see the question' : 'tap to reveal'}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CoursesPage({ go }) {
  const [view, setView] = React.useState('catalog');
  const [simpler, setSimpler] = React.useState(false);

  if (view === 'catalog') {
    return (
      <main className="pg course-hero" data-screen-label="Courses — catalog">
        <p className="overline">Courses · 100% free, forever</p>
        <h2 className="h2" style={{ fontSize: 'clamp(36px, 5vw, 56px)' }}>Premium courses, <em>without the premium.</em></h2>
        <p className="lead">Syllabus-aligned, topic by topic — with a real Cambridge past-paper question for every syllabus point. Learn it, practise it, mark it.</p>
        <div className="catalog">
          {COURSE_LIST.map(c => (
            <div key={c.code} className="card scard2" style={{ '--sc': c.color }} onClick={() => setView('lesson')}>
              <div className="tile" style={{ height: 110 }}>
                <span className="tg">{c.glyph}</span>
                <span className="badge">{c.prog > 0 ? c.prog + '% COVERED' : 'START FREE'}</span>
              </div>
              <div className="body">
                <h3 className="sname" style={{ fontSize: 26 }}>{c.name}</h3>
                <span className="scode">{c.code} · CAIE · {c.units} units</span>
                <p className="body-2" style={{ fontSize: 13.5 }}>{c.meta}</p>
                <div className="prog-track"><div className="prog-fill" style={{ width: c.prog + '%', background: c.color }}></div></div>
                <div className="stat-row" style={{ marginTop: 8 }}>
                  <span><b>FREE</b> FOREVER</span>
                  <span>FLASHCARDS · TIPS · PRACTICE</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="micro" style={{ marginTop: 28 }}>FLASHCARDS · WORKED EXAMPLES · EXAM TIPS · "EXPLAIN SIMPLER" ON EVERY LESSON</p>
      </main>
    );
  }

  return (
    <main className="pg" data-screen-label="Courses — lesson">
      <div className="lesson-shell">
        <aside className="card lesson-toc">
          <div style={{ padding: '0 18px 10px' }}>
            <button className="btn-underline" style={{ fontSize: 14 }} onClick={() => setView('catalog')}>← 9702 Physics</button>
          </div>
          {TOC.map((item, i) => item.head
            ? <div key={i} className="toc-head">{item.head}</div>
            : <div key={i} className={'toc-topic' + (item.on ? ' on' : '')}>
                <span>{item.t}</span><span className="st" style={{ color: item.st === '✓' ? 'var(--ink)' : 'var(--muted)' }}>{item.st}</span>
              </div>
          )}
        </aside>

        <article className="lesson-body">
          <p className="overline" style={{ marginBottom: 8 }}>9702 · Unit 17.1 · syllabus point 17.1.2</p>
          <h2 className="h2">Simple harmonic motion: <em>the defining equation</em></h2>
          <div style={{ display: 'flex', gap: 12, margin: '14px 0 26px', alignItems: 'center' }}>
            <span className="chip ok">core concept</span>
            <span className="chip dim">≈ 8 min</span>
            <label className="simpler" style={{ marginLeft: 'auto', cursor: 'pointer' }}>
              <span className="micro">EXPLAIN SIMPLER</span>
              <span
                onClick={() => setSimpler(s => !s)}
                style={{ width: 38, height: 22, borderRadius: 99, background: simpler ? 'var(--ink)' : 'var(--border)', position: 'relative', display: 'inline-block' }}
              >
                <span style={{ position: 'absolute', top: 3, left: simpler ? 19 : 3, width: 16, height: 16, borderRadius: '50%', background: 'var(--surface)', boxShadow: '0 1px 3px rgba(0,0,0,0.25)' }}></span>
              </span>
            </label>
          </div>

          {!simpler ? (
            <div>
              <p className="body-2" style={{ fontSize: 16.5 }}>
                A body performs simple harmonic motion when its acceleration is directly proportional
                to its displacement from a fixed point, and always directed towards that point.
                Formally:
              </p>
              <div className="lesson-eq">a = −ω²x &nbsp;&nbsp;where ω = 2π/T = 2πf</div>
              <p className="body-2" style={{ fontSize: 16.5 }}>
                The minus sign carries a whole mark in most papers: it encodes that the restoring force
                opposes displacement. Omit it and you typically lose the defining-equation B1.
              </p>
            </div>
          ) : (
            <div>
              <p className="body-2" style={{ fontSize: 16.5 }}>
                Imagine a spring pulling a ball back to the middle. The further the ball gets,
                the harder it's pulled back. That's all SHM is:
              </p>
              <div className="lesson-eq">pull-back strength ∝ how far away you are (and it points back home — that's the minus sign)</div>
              <p className="body-2" style={{ fontSize: 16.5 }}>
                Examiners give a mark just for the minus sign — it says "back towards the middle."
              </p>
            </div>
          )}

          <div className="lesson-callout">
            <p className="micro" style={{ color: 'var(--ink)', marginBottom: 6 }}>EXAM TIP</p>
            <p className="body-2">When asked to <em>show</em> SHM, you must derive a = −ω²x explicitly — quoting it scores zero. M1 is for the derivation, A1 for the form.</p>
          </div>

          <Flashcards />

          <div className="card card-pad" style={{ marginTop: 30 }} data-screen-label="Courses — practice question">
            <p className="overline" style={{ marginBottom: 10 }}>Practise this point · real past paper</p>
            <h3 className="h3">9702/22 May/June 2023 · Q3</h3>
            <p className="body-2" style={{ margin: '8px 0 18px' }}>
              A trolley oscillates with period 0.40 s and amplitude 2.0 cm. Calculate ω and the
              maximum speed, and sketch the acceleration–displacement graph. <span className="mono" style={{ fontSize: 12 }}>[5]</span>
            </p>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <button className="btn-primary sm" onClick={() => go('mark')}>Do it on paper → mark it</button>
              <span className="micro">MARKED AGAINST THE OFFICIAL SCHEME</span>
            </div>
          </div>
        </article>
      </div>
    </main>
  );
}

Object.assign(window, { CoursesPage });
