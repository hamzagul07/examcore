// page-misc.jsx — dashboard, pricing, teacher

/* ============ dashboard ============ */
function DashboardPage({ go }) {
  const [empty, setEmpty] = React.useState(false);
  const coverage = [
    ['Pure maths 1', 88, 'var(--ink)'], ['Pure maths 3', 64, 'var(--ink)'],
    ['Mechanics', 41, 'var(--amber)'], ['Prob & stats', 23, 'var(--red)'],
  ];
  const heat = [5,4,5,3,2,5,4,1,3,5, 4,5,2,4,5,3,5,4,2,1, 5,5,4,3,4,2,5,5,3,4];
  const heatColor = v => v >= 5 ? 'var(--ink)' : v >= 4 ? 'color-mix(in srgb, var(--ink) 65%, var(--bg-soft))' : v >= 3 ? 'color-mix(in srgb, var(--ink) 35%, var(--bg-soft))' : v >= 2 ? 'var(--amber-soft)' : 'var(--red-soft)';
  return (
    <main className="pg" style={{ paddingTop: 56 }} data-screen-label="Progress dashboard">
      <p className="overline">Progress · 9709 Mathematics</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        <h2 className="h2" style={{ marginBottom: 0 }}>{empty ? <span>Nothing marked <em>— yet.</em></span> : <span>Where you stand — <em>and what to fix next.</em></span>}</h2>
        <button className="btn-underline" style={{ fontSize: 13 }} onClick={() => setEmpty(e => !e)}>{empty ? 'view with data →' : 'preview first visit →'}</button>
      </div>
      {empty ? (
        <div className="card" style={{ marginTop: 36, padding: '72px 40px', textAlign: 'center', position: 'relative' }} data-screen-label="Dashboard — empty state">
          <div style={{ maxWidth: 420, margin: '0 auto' }}>
            <div style={{ display: 'inline-grid', placeItems: 'center', width: 64, height: 64, borderRadius: 18, background: 'var(--ink-soft)', border: '1.5px dashed var(--ink-border)', fontSize: 28, marginBottom: 20 }}>✎</div>
            <h3 className="h3" style={{ fontSize: 24 }}>Your dashboard starts with one question.</h3>
            <p className="body-2" style={{ margin: '10px 0 26px' }}>
              Mark anything you've already written — the syllabus coverage, mastery map and grade
              estimate build themselves from there.
            </p>
            <button className="btn-primary" onClick={() => go('mark')}>Mark your first question</button>
            <p className="greennote" style={{ fontSize: 20, marginTop: 22 }}>takes about a minute — free, no card ↑</p>
          </div>
        </div>
      ) : (
      <div className="dash-grid">
        <div className="card dash-card" style={{ gridColumn: 'span 4', textAlign: 'center' }}>
          <p className="overline" style={{ marginBottom: 4 }}>Grade estimate</p>
          <div className="big-grade">A</div>
          <p className="body-2" style={{ marginTop: 8 }}>boundary ≈ 78% · you're averaging 81%</p>
          <p className="greennote" style={{ fontSize: 20, marginTop: 10 }}>3 marks/paper from A* — mostly mechanics ↓</p>
        </div>
        <div className="card dash-card" style={{ gridColumn: 'span 8' }}>
          <p className="overline" style={{ marginBottom: 14 }}>Syllabus coverage</p>
          {coverage.map(([t, v, c]) => (
            <div key={t} className="bar-row">
              <span style={{ color: 'var(--text-2)' }}>{t}</span>
              <div className="bar-track"><div className="bar-fill" style={{ width: v + '%', background: c }}></div></div>
              <span className="mono" style={{ fontSize: 12, textAlign: 'right', color: 'var(--muted)' }}>{v}%</span>
            </div>
          ))}
        </div>
        <div className="card dash-card" style={{ gridColumn: 'span 5' }}>
          <p className="overline" style={{ marginBottom: 6 }}>Mastery heatmap</p>
          <p className="body-2" style={{ fontSize: 13 }}>30 spec points, last 60 days</p>
          <div className="heat">{heat.map((v, i) => <div key={i} style={{ background: heatColor(v) }} title={'spec point ' + (i + 1)}></div>)}</div>
        </div>
        <div className="card dash-card" style={{ gridColumn: 'span 7' }}>
          <p className="overline" style={{ marginBottom: 8 }}>Fix next — biggest mark leaks</p>
          <div className="fix-item"><span className="chip no">−6</span><span><b>Resolving forces on slopes</b> — M1 lost in 4 of last 5 attempts</span><button className="btn-underline" style={{ marginLeft: 'auto', fontSize: 14, flexShrink: 0 }} onClick={() => go('courses')}>lesson →</button></div>
          <div className="fix-item"><span className="chip no">−4</span><span><b>Conditional probability notation</b> — A marks dropped on wording</span><button className="btn-underline" style={{ marginLeft: 'auto', fontSize: 14, flexShrink: 0 }} onClick={() => go('courses')}>lesson →</button></div>
          <div className="fix-item"><span className="chip warn">−2</span><span><b>Premature rounding</b> — keep 4 s.f. until the final line</span><button className="btn-underline" style={{ marginLeft: 'auto', fontSize: 14, flexShrink: 0 }} onClick={() => go('mark')}>practise →</button></div>
        </div>
      </div>
      )}
    </main>
  );
}

/* ============ pricing ============ */
function PricingPage({ go }) {
  const tiers = [
    { name: 'Free', price: '£0', per: 'forever', cta: 'Start marking', hot: false, feats: ['5 single questions / month', 'All 15 subjects', 'Examiner\u2019s Ink on every mark', 'All courses — 100% free', 'Basic progress tracking'] },
    { name: 'Student', price: '£4.99', per: '/ month', cta: 'Go Student', hot: true, feats: ['Unlimited single questions', '4 whole papers / month with projected grade', 'Full analytics: mastery, error patterns, boundaries', 'Ask MarkScheme (Omni AI) unlimited', 'Priority marking queue'] },
    { name: 'Exam season', price: '£12.99', per: '/ 3 months', cta: 'Cram smart', hot: false, feats: ['Everything in Student', 'Unlimited whole papers', 'Mock-exam mode with timing', 'Teacher share links', 'Ends after results day — no auto-renew'] },
  ];
  return (
    <main className="pg" style={{ paddingTop: 56, maxWidth: 1080 }} data-screen-label="Pricing">
      <p className="overline">Pricing</p>
      <h2 className="h2">The courses are free. <em>The marking scales.</em></h2>
      <p className="lead">Start free, no card. Founding members get 50% off forever.</p>
      <div className="price-grid">
        {tiers.map(t => (
          <div key={t.name} className={'card price-card' + (t.hot ? ' hot' : '')}>
            {t.hot && <span className="hot-badge">most students pick this</span>}
            <span className="overline" style={{ marginBottom: 0 }}>{t.name}</span>
            <div className="amount">{t.price} <small>{t.per}</small></div>
            <div className="price-feats">
              {t.feats.map(f => <div key={f}><span className="tick">✓</span><span>{f}</span></div>)}
            </div>
            <button className={t.hot ? 'btn-primary' : 'btn-ghost'} style={{ justifyContent: 'center' }} onClick={() => go('mark')}>{t.cta}</button>
          </div>
        ))}
      </div>
      <p className="micro" style={{ textAlign: 'center', marginTop: 30 }}>NOT ENDORSED BY CAMBRIDGE INTERNATIONAL · CANCEL ANYTIME · STUDENT-BUILT, STUDENT-PRICED</p>
    </main>
  );
}

/* (Teacher tools removed from scope) */

Object.assign(window, { DashboardPage, PricingPage });
