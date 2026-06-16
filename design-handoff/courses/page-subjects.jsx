// page-subjects.jsx — /subjects : subject directory (papers + course + boundaries)

function SubjectsPage({ go }) {
  const [fam, setFam] = React.useState('All');
  const fams = ['All', 'Sciences', 'Maths', 'Commerce', 'Humanities'];
  const list = fam === 'All' ? SUBJECTS : SUBJECTS.filter(s => s.fam === fam);

  return (
    <main className="subjects-page" data-screen-label="Subjects directory">
      <div className="pg">
        <Breadcrumb items={[{ label: 'Home', go: () => go('catalog') }, { label: 'Subjects' }]} />
        <header className="subjects-hero">
          <p className="overline">Subjects · Cambridge International</p>
          <h1 className="h-display" style={{ fontSize: 'clamp(38px,5vw,62px)' }}>Every subject, <em>one shelf.</em></h1>
          <p className="lead" style={{ marginTop: 14 }}>
            Each subject hub bundles the free course, real past papers to mark, and honest grade-boundary
            estimates — all in one place.
          </p>
        </header>

        <div className="catalog-bar">
          <div className="fam-tabs">
            {fams.map(f => <button key={f} className={'fam-tab' + (fam === f ? ' on' : '')} onClick={() => setFam(f)}>{f}</button>)}
          </div>
          <span className="micro catalog-count">{list.length} subjects</span>
        </div>

        <div className="subj-ledger">
          {list.map(s => (
            <button key={s.code} className="subj-row" style={{ '--acc': `var(--${s.acc})` }} onClick={() => go('hub', { subject: s.code })}
              data-screen-label={'Subjects — ' + s.name}>
              <span className="subj-glyph">{s.glyph}</span>
              <div className="subj-main">
                <h3 className="subj-name">{s.name}</h3>
                <span className="subj-code mono">{s.code} · {s.level} · {s.units} units</span>
              </div>
              <div className="subj-tags">
                <span className="subj-tag mono">{s.lessons} LESSONS</span>
                <span className="subj-tag mono">{s.q} QUESTIONS</span>
                {s.prog > 0 && <span className="subj-tag on mono">{s.prog}% COVERED</span>}
              </div>
              <div className="subj-links">
                <span className="subj-pill">Course</span>
                <span className="subj-pill">Papers</span>
                <span className="subj-pill">Boundaries</span>
              </div>
              <span className="subj-go">→</span>
            </button>
          ))}
        </div>

        <div className="subjects-note card card-pad">
          <span className="micro" style={{ color: 'var(--ink)' }}>HONEST ABOUT GRADES</span>
          <p className="body-2" style={{ marginTop: 6, maxWidth: '64ch' }}>
            Grade boundaries shift every session. We show honest A*–E estimates from recent series so you know
            what a mark is roughly worth — never a promise, always a guide.
          </p>
        </div>
      </div>
    </main>
  );
}

Object.assign(window, { SubjectsPage });
