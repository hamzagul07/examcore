// page-subject-detail.jsx — per-subject past-paper browser

const SD_SESSIONS = [
  { name: 'May/June 2024', variants: ['11', '12', '13', '21', '22', '23'], marked: [] },
  { name: 'Oct/Nov 2023', variants: ['11', '12', '13', '21', '22', '23'], marked: ['12'] },
  { name: 'May/June 2023', variants: ['11', '12', '13', '21', '22', '23'], marked: ['22'] },
  { name: 'Oct/Nov 2022', variants: ['11', '12', '13', '21', '22', '23'], marked: [] },
  { name: 'May/June 2022', variants: ['11', '12', '13', '21', '22', '23'], marked: [] },
];

const SD_TOPICS = {
  '9702': ['Simple harmonic motion', 'Stationary waves', 'Electric fields', 'Potential dividers', 'Nuclear physics'],
  '9709': ['Differentiation', 'Integration', 'Series', 'Vectors', 'Probability distributions'],
  default: ['Most-missed topic 1', 'Most-missed topic 2', 'Most-missed topic 3', 'Most-missed topic 4'],
};

function SubjectDetailPage({ go, param }) {
  const all = [...SUBJECTS.alevel, ...SUBJECTS.olevel];
  const s = all.find(x => x.code === param) || all[1];
  const topics = SD_TOPICS[s.code] || SD_TOPICS.default;
  const [yr, setYr] = React.useState('all');
  const sessions = SD_SESSIONS.filter(x => yr === 'all' || x.name.includes(yr));
  return (
    <main className="pg" style={{ paddingTop: 48, '--sc': s.color }} data-screen-label="Subject detail">
      <button className="btn-underline" style={{ fontSize: 15 }} onClick={() => go('subjects')}>← All subjects</button>
      <div className="sd-head" style={{ marginTop: 22 }}>
        <div className="sd-glyph">{s.glyph}</div>
        <div>
          <h2 className="h2" style={{ marginBottom: 2 }}>{s.name} <em style={{ color: 'var(--muted)', fontSize: '0.6em' }}>· {s.code}</em></h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className="chip dim">{s.papers} past papers</span>
            <span className="chip dim">CAIE · {SUBJECTS.olevel.includes(s) ? 'O Level' : 'AS & A Level'}</span>
            {s.course ? <span className="chip ok">free course ✓</span> : <span className="chip outline">course coming soon</span>}
          </div>
        </div>
        <button className="btn-primary" style={{ marginLeft: 'auto' }} onClick={() => go('mark')}>Mark a {s.code} question</button>
      </div>

      <div className="sd-grid">
        <div className="card" style={{ overflow: 'hidden' }} data-screen-label="Subject — paper browser">
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span className="micro">PAST PAPERS — PICK A VARIANT TO MARK AGAINST ITS SCHEME</span>
            <span className="yr-chips">
              {['all', '2024', '2023', '2022'].map(y => (
                <button key={y} className={'yr-chip' + (yr === y ? ' on' : '')} onClick={() => setYr(y)}>{y.toUpperCase()}</button>
              ))}
            </span>
          </div>
          {sessions.map(sess => (
            <div key={sess.name} className="sess">
              <div className="sess-name">
                <b className="serif">{sess.name}</b>
                <span className="micro">{sess.variants.length} VARIANTS</span>
              </div>
              <div className="variant-row">
                {sess.variants.map(v => (
                  <button
                    key={v}
                    className={'variant' + (sess.marked.includes(v) ? ' marked' : '')}
                    onClick={() => go('mark')}
                    title={sess.marked.includes(v) ? 'You marked this paper' : 'Mark against this scheme'}
                  >
                    Paper {v}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {s.course && (
            <div className="card card-pad">
              <p className="overline" style={{ marginBottom: 8 }}>Free course</p>
              <h3 className="h3" style={{ fontSize: 20 }}>{s.name} — full syllabus</h3>
              <p className="body-2" style={{ margin: '6px 0 16px' }}>Topic-by-topic lessons with a real past-paper question on every syllabus point.</p>
              <button className="btn-ghost sm" onClick={() => go('courses')}>Open the course →</button>
            </div>
          )}
          <div className="card card-pad" data-screen-label="Subject — hot topics">
            <p className="overline" style={{ marginBottom: 6 }}>Where students lose marks</p>
            {topics.map((t, i) => (
              <div key={t} className="topic-row">
                <span><span className="mono" style={{ color: 'var(--red)', fontSize: 12, marginRight: 10 }}>#{i + 1}</span>{t}</span>
                <button className="btn-underline" style={{ fontSize: 13.5, flexShrink: 0 }} onClick={() => go(s.course ? 'courses' : 'mark')}>{s.course ? 'lesson →' : 'practise →'}</button>
              </div>
            ))}
          </div>
          <div className="card card-pad" style={{ background: 'var(--bg-soft)' }}>
            <p className="greennote" style={{ fontSize: 20, marginTop: 0 }}>grade boundaries for {s.code} hover around 78% for an A — check Progress for your estimate ↗</p>
            <button className="btn-underline" style={{ fontSize: 14 }} onClick={() => go('dashboard')}>Your {s.name} progress →</button>
          </div>
        </div>
      </div>
    </main>
  );
}

Object.assign(window, { SubjectDetailPage });
