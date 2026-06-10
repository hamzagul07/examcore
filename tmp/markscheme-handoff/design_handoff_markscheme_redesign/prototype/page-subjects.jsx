// page-subjects.jsx — ZNotes-style subject catalog: level tabs, search, tile cards

const SUBJECTS = {
  alevel: [
    { code: '9709', name: 'Mathematics', glyph: '∫', color: 'var(--acc-blue)', papers: 124, course: true },
    { code: '9702', name: 'Physics', glyph: 'Ω', color: 'var(--acc-violet)', papers: 112, course: true },
    { code: '9701', name: 'Chemistry', glyph: '⌬', color: 'var(--acc-teal)', papers: 108, course: true },
    { code: '9700', name: 'Biology', glyph: 'ϕ', color: 'var(--ink)', papers: 104, course: true },
    { code: '9708', name: 'Economics', glyph: '£', color: 'var(--amber)', papers: 96, course: false },
    { code: '9609', name: 'Business', glyph: '¶', color: 'var(--acc-rose)', papers: 88, course: false },
    { code: '9618', name: 'Computer Science', glyph: '{}', color: 'var(--acc-slate)', papers: 76, course: false },
    { code: '9093', name: 'English Language', glyph: '“', color: 'var(--acc-blue)', papers: 72, course: false },
    { code: '9489', name: 'History', glyph: '§', color: 'var(--acc-violet)', papers: 68, course: false },
    { code: '9696', name: 'Geography', glyph: '◬', color: 'var(--acc-teal)', papers: 64, course: false },
    { code: '9990', name: 'Psychology', glyph: 'Ψ', color: 'var(--acc-rose)', papers: 58, course: false },
    { code: '9699', name: 'Sociology', glyph: '∴', color: 'var(--amber)', papers: 52, course: false },
  ],
  olevel: [
    { code: '4024', name: 'Mathematics (Syllabus D)', glyph: '∑', color: 'var(--acc-blue)', papers: 86, course: false },
    { code: '5054', name: 'Physics', glyph: 'λ', color: 'var(--acc-violet)', papers: 74, course: false },
    { code: '5070', name: 'Chemistry', glyph: '⚗', color: 'var(--acc-teal)', papers: 70, course: false },
  ],
};

function SubjectCard({ s, go }) {
  const lessons = s.course ? Math.round(s.papers * 0.45) : 0;
  return (
    <div className="card scard2" style={{ '--sc': s.color }} onClick={() => go('subject', s.code)}>
      <div className="tile">
        <span className="tg">{s.glyph}</span>
        <span className="badge">2026 SYLLABUS</span>
      </div>
      <div className="body">
        <h3 className="sname">{s.name}</h3>
        <span className="scode">{s.code} · CAIE</span>
        <div className="stat-row">
          <span><b>{s.papers}</b> PAPERS</span>
          {s.course ? <span><b>{lessons}</b> LESSONS</span> : <span>COURSE SOON</span>}
          <span><b>{(s.papers * 73).toLocaleString()}</b> MARKED</span>
        </div>
        <div className="slinks">
          <button onClick={(e) => { e.stopPropagation(); go('subject', s.code); }}>Past papers →</button>
          {s.course && <button onClick={(e) => { e.stopPropagation(); go('courses'); }}>Course →</button>}
        </div>
      </div>
    </div>
  );
}

function SubjectsPage({ go }) {
  const [lvl, setLvl] = React.useState('alevel');
  const [q, setQ] = React.useState('');
  const list = SUBJECTS[lvl].filter(s => (s.name + ' ' + s.code).toLowerCase().includes(q.toLowerCase()));
  return (
    <main className="pg" style={{ paddingTop: 56 }} data-screen-label="Subjects catalog">
      <p className="overline">Subjects · 15 Cambridge syllabuses</p>
      <h2 className="h2" style={{ fontSize: 'clamp(36px, 5vw, 56px)' }}>Pick your paper. <em>We've got the scheme.</em></h2>
      <p className="lead">Every subject marks against the official Cambridge mark scheme for that exact paper and session.</p>

      <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="lvl-tabs">
          <button className={'lvl-tab' + (lvl === 'alevel' ? ' on' : '')} onClick={() => setLvl('alevel')}>AS &amp; A Level</button>
          <button className={'lvl-tab' + (lvl === 'olevel' ? ' on' : '')} onClick={() => setLvl('olevel')}>O Level</button>
          <button className="lvl-tab" disabled>IB <span className="soon">coming soon!</span></button>
        </div>
        <div className="subj-search" style={{ flex: '1 1 260px' }}>
          <span className="si">⌕</span>
          <input placeholder="Search by name or code — try 9702" value={q} onChange={e => setQ(e.target.value)} />
        </div>
      </div>

      <div className="scard-grid" key={lvl}>
        {list.map(s => <SubjectCard key={s.code} s={s} go={go} />)}
        {list.length === 0 && (
          <div className="card card-pad" style={{ gridColumn: '1 / -1', textAlign: 'center' }}>
            <p className="greennote" style={{ fontSize: 21 }}>nothing matches "{q}" — tell us and we'll add it →</p>
          </div>
        )}
      </div>

      <div className="zstats" data-screen-label="Subjects — stats">
        <div><b>15</b><span>Syllabuses</span></div>
        <div><b>1,158</b><span>Past papers</span></div>
        <div><b>84k+</b><span>Questions marked</span></div>
        <div><b>100%</b><span>Free courses</span></div>
      </div>

      <p className="micro" style={{ marginTop: 26 }}>MISSING YOUR SYLLABUS? TELL US — NEW SUBJECTS SHIP MONTHLY · IB &amp; OTHER BOARDS LATER</p>
    </main>
  );
}

Object.assign(window, { SubjectsPage, SUBJECTS, SubjectCard });
