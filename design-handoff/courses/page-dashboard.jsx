// page-dashboard.jsx — /dashboard : student progress

const RECENT = [
  { ref: '9702/22 · Q4 · Density & pressure', got: 5, of: 6, when: 'Today', note: 'lost A1 — forgot ×g for weight' },
  { ref: '9709/12 · Q7 · Differentiation', got: 8, of: 8, when: 'Yesterday', note: 'full marks — clean method' },
  { ref: '9701/21 · Q2 · Enthalpy changes', got: 4, of: 7, when: '2 days ago', note: 'sign error in ΔH; re-read step' },
  { ref: '9702/21 · Q3 · Equilibrium of forces', got: 6, of: 6, when: '3 days ago', note: 'moments taken correctly' },
];
const WEAK = [
  { code: '9701', n: '5.2', t: 'Electrolysis', acc: 'acc-teal' },
  { code: '9702', n: '6.1', t: 'Stress and strain', acc: 'acc-violet' },
  { code: '9709', n: '8.2', t: 'Definite integrals', acc: 'acc-blue' },
];

function DashboardPage({ go }) {
  const inProgress = SUBJECTS.filter(s => s.prog > 0);
  const days = ['M','T','W','T','F','S','S'];
  const streak = [1,1,1,1,1,0,0]; // last 7 days

  return (
    <main className="dash-page" data-screen-label="Progress dashboard">
      <div className="pg">
        <Breadcrumb items={[{ label: 'Home', go: () => go('catalog') }, { label: 'Progress' }]} />
        <header className="dash-hero">
          <div>
            <p className="overline">Your progress</p>
            <h1 className="h-display" style={{ fontSize: 'clamp(34px,4.5vw,56px)' }}>Welcome back, <em>Hassan.</em></h1>
            <p className="lead" style={{ marginTop: 12 }}>You're marking more than you're re-reading — that's exactly how the marks come.</p>
          </div>
          <div className="dash-streakcard card">
            <p className="micro">STUDY STREAK</p>
            <div className="streak-num"><span className="flame">🔥</span><b>5</b><span className="streak-days">days</span></div>
            <div className="streak-cal">
              {days.map((d, i) => (
                <span key={i} className={'streak-dot' + (streak[i] ? ' on' : '')}>{d}</span>
              ))}
            </div>
          </div>
        </header>

        <div className="dash-stats">
          {[
            { n: '47', l: 'questions marked' },
            { n: '79%', l: 'average mark' },
            { n: '12', l: 'topics covered' },
            { n: 'B+', l: 'projected grade · 9702' },
          ].map((s, i) => (
            <div key={i} className="dash-stat card">
              <b className="dash-stat-n serif">{s.n}</b>
              <span className="dash-stat-l">{s.l}</span>
            </div>
          ))}
        </div>

        <div className="dash-cols">
          <section className="dash-main">
            <h2 className="h3" style={{ marginBottom: 14 }}>Recently marked</h2>
            <div className="sheet dash-sheet">
              <div className="sheet-head"><span>QUESTION</span><span>MARK · OFFICIAL SCHEME</span></div>
              {RECENT.map((r, i) => {
                const full = r.got === r.of;
                return (
                  <div key={i} className="dash-mark" onClick={() => go('lesson', { subject: '9702', topic: '4.3' })}>
                    <div className="dash-mark-top">
                      <span className="dash-mark-ref">{r.ref}</span>
                      <span className={'stamp ' + (full ? 'ok' : 'no')}>{r.got}/{r.of}</span>
                    </div>
                    <span className={full ? 'greennote' : 'rednote'}>{r.note}</span>
                    <span className="dash-when micro">{r.when}</span>
                  </div>
                );
              })}
            </div>

            <h2 className="h3" style={{ margin: '34px 0 14px' }}>Continue learning</h2>
            <div className="dash-continue">
              {inProgress.map(s => (
                <button key={s.code} className="dash-course card" style={{ '--acc': `var(--${s.acc})` }} onClick={() => go('hub', { subject: s.code })}>
                  <Ring pct={s.prog} size={54} stroke={5} color={`var(--${s.acc})`} />
                  <div>
                    <h4 className="dash-course-name">{s.name}</h4>
                    <span className="micro">{s.code} · {s.prog}% covered</span>
                  </div>
                  <span className="dash-course-go">→</span>
                </button>
              ))}
            </div>
          </section>

          <aside className="dash-aside">
            <div className="card card-pad dash-weak">
              <p className="overline" style={{ marginBottom: 12 }}>Spec points to revisit</p>
              <p className="body-2" style={{ fontSize: 13.5, marginBottom: 14 }}>Where you've lost the most marks lately. Retrieval beats re-reading.</p>
              {WEAK.map(w => (
                <button key={w.code + w.n} className="weak-row" style={{ '--acc': `var(--${w.acc})` }} onClick={() => go('lesson', { subject: w.code, topic: w.n })}>
                  <span className="weak-n mono">{w.code} · {w.n}</span>
                  <span className="weak-t">{w.t}</span>
                  <span className="weak-go">revise →</span>
                </button>
              ))}
            </div>
            <div className="card card-pad hub-tip">
              <p className="micro" style={{ color: 'var(--ink)' }}>NEXT MILESTONE</p>
              <p className="body-2" style={{ marginTop: 6 }}>3 more topics in <b style={{ color: 'var(--text)' }}>9702 Unit 4</b> to unlock your Forces &amp; pressure badge.</p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

Object.assign(window, { DashboardPage });
