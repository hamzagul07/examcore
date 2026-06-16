// page-hub.jsx — /courses/:code : paper selector + syllabus spine (data-driven)

function HowItWorks() {
  const steps = [
    { n: 1, t: 'Choose your paper', d: 'Pick the exam paper you sit, then a topic from the spine.' },
    { n: 2, t: 'Learn visually', d: 'Diagrams, step cards and full notes — or flip to “explain simpler”.' },
    { n: 3, t: 'Practise & mark', d: 'Attempt a real past-paper question, marked against the official scheme.' },
    { n: 4, t: 'Mark complete', d: 'Tick the topic, watch your mastery ring fill, move to the next.' },
  ];
  return (
    <div className="how-grid">
      {steps.map(s => (
        <div key={s.n} className="how-card">
          <span className="how-num mono">{s.n}</span>
          <div className="how-text">
            <h4 className="how-t">{s.t}</h4>
            <p className="body-2" style={{ fontSize: 13.5 }}>{s.d}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function HubPage({ go, subject }) {
  const meta = SUBJECTS.find(s => s.code === subject) || SUBJECTS.find(s => s.code === '9702');
  const course = getCourse(meta.code);
  const [paper, setPaper] = React.useState(1);
  const spines = spinesOf(course);
  const p1 = spines[1] || course.units;
  const groups = spines[paper] || null;
  const allItems = (groups || []).flatMap(g => g.items);
  const doneCount = allItems.filter(i => i.done).length;
  const total = allItems.length || ((course.papers.find(p => p.id === paper) || {}).topics || 0);
  const pct = total ? Math.round((doneCount / total) * 100) : 0;
  const acc = `var(--${meta.acc})`;
  const firstTopic = (p1[0] && p1[0].items[0]) || { n: '1.1' };
  const activeTopic = allItems.find(i => i.active) || p1.flatMap(g => g.items).find(i => i.active) || firstTopic;

  return (
    <main className="hub-page" data-screen-label={'Course hub — ' + meta.code + ' ' + meta.name} data-screen-label-hub={meta.code}>
      <div className="pg">
        <Breadcrumb items={[{ label: 'Home', go: () => go('catalog') }, { label: 'Courses', go: () => go('catalog') }, { label: meta.name }]} />
      </div>

      <header className="hub-hero" style={{ '--acc-violet': acc }}>
        <div className="pg hub-hero-inner">
          <div className="hub-hero-left">
            <span className="hub-glyph" style={{ color: acc }}>{meta.glyph}</span>
            <div>
              <p className="overline">{meta.level} · {meta.code} · Free premium course</p>
              <h1 className="h-display" style={{ fontSize: 'clamp(40px,5.5vw,68px)' }}>{meta.name}</h1>
              <p className="lead" style={{ marginTop: 12 }}>{course.blurb}</p>
              <div className="hub-cta-row">
                <button className="btn-primary" onClick={() => go('lesson', { subject: meta.code, topic: firstTopic.n })}>Start Paper 1 →</button>
                <button className="btn-ghost sm" onClick={() => go('lesson', { subject: meta.code, topic: activeTopic.n })}>Mark this topic</button>
              </div>
            </div>
          </div>
          <div className="hub-hero-right card">
            <p className="micro">YOUR PROGRESS</p>
            <div className="hub-prog">
              <Ring pct={pct} size={92} stroke={7} color={acc} label={doneCount + '/' + total} />
              <div>
                <p className="body-2" style={{ fontSize: 14, margin: 0 }}><b style={{ color: 'var(--text)' }}>{doneCount} of {total}</b> topics in Paper {paper}</p>
                <p className="micro" style={{ marginTop: 6 }}>SAVED ON THIS DEVICE · SIGN IN TO SYNC</p>
              </div>
            </div>
            <div className="hub-streak">
              <span className="flame">🔥</span><span className="body-2" style={{ fontSize: 13.5 }}><b style={{ color: 'var(--text)' }}>{meta.prog > 0 ? '5-day' : 'New'}</b> {meta.prog > 0 ? 'study streak' : '— start your streak today'}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="pg hub-body">
        <div className="paper-tabs">
          {course.papers.map(p => (
            <button key={p.id} className={'paper-tab' + (paper === p.id ? ' on' : '')} onClick={() => setPaper(p.id)} style={paper === p.id ? { '--acc-violet': acc } : null}>
              <span className="paper-tab-id mono" style={{ color: acc }}>PAPER {p.id}</span>
              <span className="paper-tab-name">{p.name}</span>
              <span className="paper-tab-meta">{p.topics ? p.topics + ' topics' : 'premium'}</span>
            </button>
          ))}
        </div>

        <div className="hub-cols">
          <div className="spine" style={{ '--acc-violet': acc }}>
            {groups ? groups.map((g, gi) => (
              <section key={gi} className="spine-unit">
                <div className="spine-unit-head">
                  <span className="spine-node" style={{ borderColor: acc }}></span>
                  <h3 className="spine-unit-title">Unit {g.unit}</h3>
                </div>
                <div className="spine-topics">
                  {g.items.map((it) => (
                    <button key={it.n} className={'topic-row' + (it.active ? ' active' : '') + (it.done ? ' done' : '')}
                      onClick={() => go('lesson', { subject: meta.code, topic: it.n })}
                      style={(it.active) ? { '--acc-violet': acc } : null}>
                      <span className={'topic-check' + (it.done ? ' on' : '') + (it.active ? ' cur' : '')} style={it.active ? { borderColor: acc, color: acc } : null}>
                        {it.done ? '✓' : it.active ? '◆' : ''}
                      </span>
                      <span className="topic-name">{it.t}</span>
                      <span className="topic-n mono">{it.n}</span>
                      {it.active && <span className="topic-flag mono" style={{ color: acc, background: `color-mix(in srgb, ${acc} 14%, transparent)` }}>CONTINUE</span>}
                      <span className="topic-arrow">→</span>
                    </button>
                  ))}
                </div>
              </section>
            )) : (
              <div className="spine-empty card card-pad">
                <p className="overline" style={{ marginBottom: 6 }}>Paper {paper} · {(course.papers.find(p=>p.id===paper)||{}).name}</p>
                <h3 className="h3">{(course.papers.find(p=>p.id===paper)||{}).topics || '—'} premium lessons</h3>
                <p className="body-2" style={{ margin: '6px 0 16px' }}>Same structure as Paper 1 — every syllabus point gets a visual lesson and a real past-paper question to mark.</p>
                <button className="btn-underline" onClick={() => setPaper(1)}>← Back to Paper 1</button>
              </div>
            )}
          </div>

          <aside className="hub-aside">
            <div className="card card-pad">
              <p className="overline" style={{ marginBottom: 14 }}>How this course works</p>
              <HowItWorks />
            </div>
            <div className="card card-pad hub-tip">
              <p className="micro" style={{ color: 'var(--ink)' }}>WHY IT'S DIFFERENT</p>
              <p className="body-2" style={{ marginTop: 6 }}>
                Every lesson ends in a real Cambridge question — marked <b style={{ color: 'var(--text)' }}>mark-by-mark</b> against
                the official scheme, not a generic AI guess.
              </p>
              <MarginNote style={{ position: 'static', display: 'block', marginTop: 10, transform: 'rotate(-2deg)' }}>that's the whole point ↑</MarginNote>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

Object.assign(window, { HubPage });
