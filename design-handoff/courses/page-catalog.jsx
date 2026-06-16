// page-catalog.jsx — /courses : the free-course library

function ContinueStrip({ go }) {
  const phys = SUBJECTS.find(s => s.code === '9702');
  return (
    <div className="continue card" onClick={() => go('lesson', { subject: '9702', topic: '4.3' })} data-screen-label="Courses — continue learning">
      <div className="continue-ring"><Ring pct={phys.prog} size={62} stroke={5} color="var(--acc-violet)" /></div>
      <div className="continue-body">
        <p className="micro" style={{ color: 'var(--ink)' }}>PICK UP WHERE YOU LEFT OFF</p>
        <h3 className="h3" style={{ margin: '3px 0 2px' }}>Physics 9702 · <span style={{ fontWeight: 400, fontStyle: 'italic' }}>4.3 Density and pressure</span></h3>
        <p className="body-2" style={{ fontSize: 14 }}>Unit 4 · Forces, density &amp; pressure — next up in Paper 1.</p>
      </div>
      <span className="continue-cta btn-primary sm">Resume →</span>
    </div>
  );
}

function SubjectCard({ s, go }) {
  const started = s.prog > 0;
  return (
    <button className="scard" style={{ '--acc': `var(--${s.acc})` }} onClick={() => go('hub', { subject: s.code })}
      data-screen-label={'Courses — ' + s.name + ' card'}>
      <div className="scard-top">
        <span className="scard-glyph">{s.glyph}</span>
        <span className="scard-tab">{s.code}</span>
        {started
          ? <Ring pct={s.prog} size={40} stroke={3.5} color="var(--acc)" />
          : <span className="stamp-free">FREE<br/>FOREVER</span>}
      </div>
      <div className="scard-body">
        <h3 className="scard-name">{s.name}</h3>
        <p className="scard-meta">{s.level} · CAIE · {s.units} units</p>
        <p className="scard-stat">{s.lessons} lessons · {s.q} past-paper questions</p>
      </div>
      <div className="scard-foot">
        <span className="scard-rule"></span>
        <span className="scard-go">{started ? s.prog + '% covered' : 'Start free'} →</span>
      </div>
    </button>
  );
}

function CatalogPage({ go }) {
  const [fam, setFam] = React.useState('All');
  const fams = ['All', 'Sciences', 'Maths', 'Commerce', 'Humanities'];
  const list = fam === 'All' ? SUBJECTS : SUBJECTS.filter(s => s.fam === fam);
  const totalLessons = SUBJECTS.reduce((a, s) => a + s.lessons, 0);
  const totalQ = SUBJECTS.reduce((a, s) => a + s.q, 0);

  return (
    <main className="catalog-page" data-screen-label="Courses — catalog">
      <header className="catalog-hero pg">
        <div className="catalog-hero-text">
          <p className="overline">Courses · 100% free, forever</p>
          <h1 className="h-display">Premium courses,<br/><em>without the premium.</em></h1>
          <p className="lead" style={{ marginTop: 18 }}>
            Syllabus-aligned, topic by topic — with a real Cambridge past-paper question for every
            syllabus point. Learn it, practise it, <InkScribble>mark it</InkScribble>.
          </p>
        </div>
        <div className="catalog-hero-meta">
          <div className="hero-stat"><b>{SUBJECTS.length}</b><span>subjects</span></div>
          <div className="hero-stat"><b>{totalLessons.toLocaleString()}</b><span>lessons</span></div>
          <div className="hero-stat"><b>{totalQ.toLocaleString()}</b><span>past-paper Qs</span></div>
          <MarginNote style={{ top: -30, right: 4, whiteSpace: 'nowrap' }}>all free — no card ↓</MarginNote>
        </div>
      </header>

      <div className="pg">
        <ContinueStrip go={go} />

        <div className="catalog-bar">
          <div className="fam-tabs">
            {fams.map(f => (
              <button key={f} className={'fam-tab' + (fam === f ? ' on' : '')} onClick={() => setFam(f)}>{f}</button>
            ))}
          </div>
          <span className="micro catalog-count">{list.length} courses · A-Level</span>
        </div>

        <div className="catalog-grid">
          {list.map(s => <SubjectCard key={s.code} s={s} go={go} />)}
        </div>

        <div className="catalog-footnote">
          <span className="micro">FLASHCARDS · WORKED EXAMPLES · EXAM TIPS · “EXPLAIN SIMPLER” ON EVERY LESSON</span>
        </div>
      </div>
    </main>
  );
}

Object.assign(window, { CatalogPage });
