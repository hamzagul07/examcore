// page-lesson.jsx — /courses/:code/:topic (data-driven: authored or outline)

const SIMPLE_NOTES = {
  '1. Density (ρ)': 'Density = how much stuff is squeezed into a space. Same material, same density — a gold ring and a gold bar match. Water ≈ 1000 kg per cubic metre, a handy benchmark.',
  '2. Pressure (p)': 'Pressure = how concentrated a push is. Spread a force over a big area → gentle (tractor tyres). Squeeze it onto a tiny area → fierce (a needle tip).',
  '3. Pressure in a fluid': 'Go deeper in water and more water sits on top of you, pushing harder. Stack it up and the extra pressure is just Δp = ρgh.',
};

function jumpTo(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const y = el.getBoundingClientRect().top + window.scrollY - 88;
  window.scrollTo({ top: y, behavior: 'smooth' });
}

function FormulaCard({ f }) {
  const [sel, setSel] = React.useState(null);
  const toks = f.tex.split(/(\s+)/);
  return (
    <div className="formula-card">
      <div className="formula-eq mono">
        {toks.map((tk, i) => {
          const part = f.parts.find(p => p.s === tk.trim());
          if (!part) return <span key={i}>{tk}</span>;
          const active = sel === part.s;
          return <button key={i} className={'fsym' + (active ? ' on' : '')} onClick={() => setSel(active ? null : part.s)}>{tk}</button>;
        })}
      </div>
      <div className="formula-parts">
        {f.parts.map(p => (
          <button key={p.s} className={'fpart' + (sel === p.s ? ' on' : '')} onClick={() => setSel(sel === p.s ? null : p.s)}>
            <span className="fpart-s mono">{p.s}</span>
            <span className="fpart-m">{p.m}</span>
          </button>
        ))}
      </div>
      <p className="formula-hint micro">{sel ? '' : 'TAP A SYMBOL — GREAT FOR EXAM DEFINITIONS'}</p>
    </div>
  );
}

function Worked({ w, idx }) {
  const [shown, setShown] = React.useState(1);
  return (
    <div className="worked card" data-screen-label={'Lesson — ' + w.title}>
      <div className="worked-head">
        <span className="worked-badge mono">EXAMPLE {idx + 1}</span>
        <p className="worked-q">{w.q}</p>
      </div>
      <ol className="worked-steps">
        {w.steps.slice(0, shown).map((s, i) => (
          <li key={i} className="worked-step">
            <span className="worked-step-n mono">{i + 1}</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
      {shown < w.steps.length
        ? <button className="btn-ghost sm worked-reveal" onClick={() => setShown(n => n + 1)}>Reveal step {shown + 1} of {w.steps.length} →</button>
        : <span className="worked-done mono">✓ FULLY WORKED</span>}
    </div>
  );
}

function ConceptMap() {
  const nodes = [
    { id: 'mass', t: 'Mass', d: 'Measured on a balance, in kilograms. One of the two ingredients of density.' },
    { id: 'vol', t: 'Volume', d: 'Space occupied, in m³. For irregular solids, use the water-displacement method.' },
    { id: 'force', t: 'Weight', d: 'For a resting object the force causing pressure is its weight, W = mg.' },
    { id: 'fluid', t: 'Fluids', d: 'Pressure rises with depth — the basis of barometers, dams and hydraulics.' },
  ];
  const [sel, setSel] = React.useState(null);
  const cur = nodes.find(n => n.id === sel);
  return (
    <div className="cmap" data-screen-label="Lesson — concept map">
      <div className="cmap-stage">
        <div className="cmap-core">
          <span className="micro" style={{ color: 'var(--bg)', opacity: 0.7 }}>MAIN IDEA</span>
          <span className="cmap-core-t">Density &amp; pressure</span>
        </div>
        {nodes.map((n, i) => (
          <button key={n.id} className={'cmap-node n' + i + (sel === n.id ? ' on' : '')} onClick={() => setSel(sel === n.id ? null : n.id)}>{n.t}</button>
        ))}
      </div>
      <div className="cmap-detail">
        {cur
          ? <React.Fragment><p className="micro" style={{ color: 'var(--ink)' }}>{cur.t.toUpperCase()}</p><p className="body-2" style={{ marginTop: 4 }}>{cur.d}</p></React.Fragment>
          : <p className="body-2">Tap a linked idea to see how it connects back to the main topic — that connection is what examiners reward.</p>}
      </div>
    </div>
  );
}

function Glossary({ items }) {
  const [open, setOpen] = React.useState(null);
  return (
    <div className="gloss-grid">
      {items.map((g, i) => (
        <button key={i} className={'gloss' + (open === i ? ' on' : '')} onClick={() => setOpen(open === i ? null : i)}>
          <span className="gloss-t">{g.t}</span>
          <span className="gloss-d">{open === i ? g.d : 'Tap to reveal definition'}</span>
        </button>
      ))}
    </div>
  );
}

function QuickCheck({ items }) {
  const [open, setOpen] = React.useState({});
  return (
    <div className="qc-list">
      {items.map((q, i) => (
        <button key={i} className={'qc' + (open[i] ? ' on' : '')} onClick={() => setOpen(s => ({ ...s, [i]: !s[i] }))}>
          <div className="qc-q"><span className="qc-n mono">Q{i + 1}</span><span>{q.q}</span></div>
          {open[i] ? <p className="qc-a">{q.a}</p> : <span className="qc-reveal mono">TAP TO CHECK</span>}
        </button>
      ))}
    </div>
  );
}

function Flashcards({ cards }) {
  const [i, setI] = React.useState(0);
  const [flip, setFlip] = React.useState(false);
  const c = cards[i];
  const go = (d) => { setFlip(false); setI(p => (p + d + cards.length) % cards.length); };
  return (
    <div className="fc-zone" data-screen-label="Lesson — flashcards">
      <div className={'fcard' + (flip ? ' flipped' : '')} onClick={() => setFlip(f => !f)}>
        <div className="fcard-face fcard-front">
          <span className="micro">QUESTION · {i + 1} / {cards.length}</span>
          <span className="fcard-text serif">{c.q}</span>
          <span className="fcard-hint micro">TAP TO FLIP</span>
        </div>
        <div className="fcard-face fcard-back">
          <span className="micro" style={{ color: 'var(--ink)' }}>ANSWER</span>
          <span className="fcard-text serif">{c.a}</span>
          <span className="fcard-hint micro">TAP TO FLIP BACK</span>
        </div>
      </div>
      <div className="fc-nav">
        <button className="fc-arrow" onClick={() => go(-1)}>←</button>
        <span className="micro">{i + 1} / {cards.length}</span>
        <button className="fc-arrow" onClick={() => go(1)}>→</button>
      </div>
    </div>
  );
}

function SecHead({ k, title, sub }) {
  return (
    <div className="lsec-head">
      <span className="lsec-k mono">{k}</span>
      <h2 className="lsec-title serif">{title}</h2>
      {sub && <p className="body-2 lsec-sub">{sub}</p>}
    </div>
  );
}

function Faq({ f }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className={'faq' + (open ? ' on' : '')}>
      <button className="faq-q" onClick={() => setOpen(o => !o)}><span>{f.q}</span><span className="faq-plus">{open ? '−' : '+'}</span></button>
      {open && <p className="faq-a body-2">{f.a}</p>}
    </div>
  );
}

function PracticeBlock({ go, L, big }) {
  const p = L.practice;
  return (
    <div className={'practice card' + (big ? ' big' : '')} data-screen-label="Lesson — practice question">
      <div className="practice-head">
        <span className="practice-tag mono">REAL PAST PAPER</span>
        <span className="practice-marks mono">[{p.marks}]</span>
      </div>
      <h3 className="h3 practice-ref">{p.ref}</h3>
      <p className="body-2 practice-text">{p.text}</p>
      <div className="practice-foot">
        <button className="btn-primary" onClick={() => go('catalog')}>Do it on paper → mark it</button>
        <span className="micro">MARKED MARK-BY-MARK · B1 / M1 / A1 · OFFICIAL SCHEME</span>
      </div>
      {!L.outline && (
        <div className="practice-scheme">
          <span className="practice-scheme-tag mono">MARK SCHEME PREVIEW</span>
          <div className="ms-line"><span>(a) p = ρgh = 850 × 9.81 × 0.60</span><span className="stamp ok">M1</span></div>
          <div className="ms-line"><span>= 5.0 × 10³ Pa</span><span className="stamp ok">A1</span></div>
          <div className="ms-line"><span>(b) F = pA = 5003 × 4.0 × 10⁻³ = 20 N</span><span className="stamp ok">A1</span></div>
        </div>
      )}
    </div>
  );
}

function LessonPage({ go, subject, topic, simplerDefault }) {
  const L = getLesson(subject, topic || '4.3');
  const meta = SUBJECTS.find(s => s.code === (L.code || subject)) || SUBJECTS[1];
  const course = getCourse(L.code || subject);
  const acc = `var(--${meta.acc})`;

  const [mode, setMode] = React.useState('learn');
  const [simpler, setSimpler] = React.useState(!!simplerDefault);
  const [step, setStep] = React.useState(1);
  const [active, setActive] = React.useState('simple');
  const [done, setDone] = React.useState(false);

  // neighbours from the spine the topic belongs to
  const ctx = topicContext(L.code || subject, L.point);
  const flat = ctx.flat;
  const idx = ctx.idx;
  const prev = L.prev || (idx > 0 ? flat[idx - 1] : null);
  const next = L.next || (idx >= 0 && idx < flat.length - 1 ? flat[idx + 1] : null);
  const related = (L.related && L.related.length) ? L.related
    : flat.filter((_, i) => i !== idx).slice(Math.max(0, idx - 1), idx + 3).slice(0, 4);

  const hasVisual = L.steps && ['fluid', 'shm', 'vt'].includes(L.diagram);
  // build TOC dynamically
  const toc = [
    { id: 'simple', label: 'Simple explanation', on: true },
    { id: 'visual', label: 'Visual learning', on: hasVisual },
    { id: 'formulas', label: 'Key formulas', on: !!L.formulas },
    { id: 'notes', label: 'Full notes', on: !!L.notes },
    { id: 'worked', label: 'Worked examples', on: !!L.worked },
    { id: 'cmap', label: 'Concept map', on: !L.outline && L.code === '9702' && L.point === '4.3' },
    { id: 'glossary', label: 'Glossary', on: !!L.glossary },
    { id: 'quiz', label: 'Quick check', on: !!L.quiz },
    { id: 'cards', label: 'Flashcards', on: !!L.flashcards },
    { id: 'takeaways', label: 'Key takeaways', on: !!L.takeaways },
    { id: 'practice', label: 'Practice', on: true },
  ].filter(s => s.on);

  React.useEffect(() => {
    const obs = new IntersectionObserver((ents) => {
      ents.forEach(e => { if (e.isIntersecting) setActive(e.target.id); });
    }, { rootMargin: '-30% 0px -60% 0px' });
    toc.forEach(t => { const el = document.getElementById(t.id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, [mode, L]);

  const paperLabel = (L.papers || '').toUpperCase();

  return (
    <main className="lesson-page" data-screen-label={'Lesson — ' + L.name} style={{ '--acc-lesson': acc }}>
      <ReadingProgress />
      <div className="pg">
        <Breadcrumb items={[
          { label: 'Courses', go: () => go('catalog') },
          { label: meta.name + ' ' + meta.code, go: () => go('hub', { subject: meta.code }) },
          { label: L.name },
        ]} />
      </div>

      <header className="lesson-hero pg">
        <div className="lesson-hero-main">
          <div className="lesson-tagrow">
            <span className="chip outline mono">{L.code} · {L.point}</span>
            <span className="chip dim mono">{meta.name.toUpperCase()}</span>
          </div>
          <h1 className="h-display lesson-title">{L.heroEm ? <React.Fragment>{L.heroPre} <em>{L.heroEm}</em></React.Fragment> : L.name}</h1>
          <p className="lead lesson-intro">{L.intro}</p>
          {L.objectives && (
            <div className="lesson-objlist">
              <p className="micro" style={{ marginBottom: 10 }}>BY THE END, YOU CAN…</p>
              <ol>
                {L.objectives.map((o, i) => (
                  <li key={i}><span className="obj-n mono">{i + 1}</span><span>{o}</span></li>
                ))}
              </ol>
            </div>
          )}
        </div>
        <aside className="lesson-hero-side">
          <div className="sheet lesson-sheet">
            <div className="tally">{L.point}</div>
            <div className="sheet-head"><span>{L.code} · {meta.name.toUpperCase()}</span><span>≈ {L.mins} MIN</span></div>
            <p className="lesson-sheet-name serif">{L.name}</p>
            <p className="micro" style={{ marginBottom: 14 }}>{L.papers}</p>
            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => jumpTo('practice')}>Practise &amp; mark this topic →</button>
            {hasVisual && <button className="btn-ghost sm" style={{ width: '100%', justifyContent: 'center', marginTop: 10 }} onClick={() => jumpTo('visual')}>Jump to the live diagram</button>}
            <p className="greennote" style={{ marginTop: 12, textAlign: 'center' }}>marked against the real scheme ✓</p>
          </div>
        </aside>
      </header>

      <div className="lesson-modebar-wrap">
        <div className="pg lesson-modebar">
          <div className="mode-tabs">
            <button className={'mode-tab' + (mode === 'learn' ? ' on' : '')} onClick={() => setMode('learn')}>Learn <span className="mode-sub">visuals + notes</span></button>
            <button className={'mode-tab' + (mode === 'papers' ? ' on' : '')} onClick={() => setMode('papers')}>Past papers <span className="mode-sub">try questions</span></button>
          </div>
          <div className="mode-right">
            <span className="chip ok mono">{(L.tag || 'topic').toUpperCase()}</span>
            <label className="simpler-toggle">
              <span className="micro">EXPLAIN SIMPLER</span>
              <button className={'switch' + (simpler ? ' on' : '')} onClick={() => setSimpler(s => !s)}><span className="knob"></span></button>
            </label>
          </div>
        </div>
      </div>

      {mode === 'papers' ? (
        <div className="pg lesson-papers"><PracticeBlock go={go} L={L} big /></div>
      ) : (
      <div className="lesson-layout pg">
        <aside className="lesson-toc">
          <p className="micro" style={{ marginBottom: 12 }}>ON THIS PAGE</p>
          <nav>
            {toc.map((tt, i) => (
              <button key={tt.id} className={'toc-link' + (active === tt.id ? ' on' : '')} onClick={() => jumpTo(tt.id)}>
                <span className="toc-num mono">{String(i + 1).padStart(2, '0')}</span>{tt.label}
              </button>
            ))}
          </nav>
          <div className="toc-progress card">
            <Ring pct={done ? 100 : 35} size={40} stroke={4} color="var(--ink)" />
            <span className="body-2" style={{ fontSize: 13 }}>{done ? 'Topic complete' : 'Keep going'}</span>
          </div>
        </aside>

        <article className="lesson-article">
          {simpler && <div className="simpler-banner"><span className="hand">plain-English mode on — no jargon, no fear ✎</span></div>}
          {L.outline && <div className="outline-banner card"><span className="outline-tag mono">OUTLINE TOPIC</span><p className="body-2">The full premium walkthrough for this point is being written. The syllabus alignment is set — <b style={{color:'var(--text)'}}>practise a real question now</b> and mark it against the official scheme.</p></div>}

          <section id="simple" className="lsec">
            <SecHead k="01" title="In simple terms" sub="A friendly intro before the formal notes — no formulas yet." />
            <div className="simple-lead card card-pad"><p className="serif simple-lead-text">{L.simple.lead}</p></div>
            <div className="analogy">
              <span className="analogy-tag mono">THINK OF IT LIKE…</span>
              <p className="body-2">{L.simple.analogy}</p>
              {L.point === '4.3' && <MarginNote style={{ position: 'static', display: 'inline-block', marginTop: 8, transform: 'rotate(-2deg)' }}>stiletto vs flat shoe = same weight, different area!</MarginNote>}
            </div>
          </section>

          {hasVisual && (
            <section id="visual" className="lsec">
              <SecHead k="02" title="Explore the concept" sub={L.diagram === 'fluid' ? 'Use the live diagram and follow the synced steps — play it, drag the depth marker, or tap a step.' : L.diagram === 'shm' ? 'Watch the mass oscillate and the displacement trace it in real time — play it, or tap a step.' : 'Read the graph step by step — gradient, area, then the equations.'} />
              <div className="visual-grid">
                <LessonDiagram type={L.diagram} step={step} setStep={setStep} />
                <ol className="step-list">
                  {L.steps.map(s => (
                    <li key={s.n}>
                      <button className={'step-card' + (step === s.n ? ' on' : '')} onClick={() => setStep(s.n)}>
                        <span className="step-n mono">{s.n}</span>
                        <span className="step-text"><b className="step-title">{s.title}</b><span className="body-2" style={{ fontSize: 14 }}>{s.body}</span></span>
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            </section>
          )}

          {L.formulas && (
            <section id="formulas" className="lsec">
              <SecHead k="03" title="Key formulas" sub="Tap any symbol to reveal exactly what it means and its units." />
              <div className="formula-row">{L.formulas.map((f, i) => <FormulaCard key={i} f={f} />)}</div>
            </section>
          )}

          {L.notes && (
            <section id="notes" className="lsec">
              <SecHead k="04" title="Full topic notes" sub={simpler ? 'Plain-English mode — the exam rigour is one toggle away.' : 'Formal explanation with the rigour you need for the exam.'} />
              <div className="notes-body">
                {L.notes.map((n, i) => (
                  <div key={i} className="note-block">
                    <h3 className="note-h serif">{n.h}</h3>
                    <p className="body-2 note-p">{simpler && SIMPLE_NOTES[n.h] ? SIMPLE_NOTES[n.h] : n.p}</p>
                    {n.tip && !simpler && (
                      <div className="note-tip"><span className="note-tip-tag mono">EXAM TIP</span><p className="body-2">{n.tip}</p></div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {L.worked && (
            <section id="worked" className="lsec">
              <SecHead k="05" title="Worked examples" sub="See the formulas applied — reveal one step at a time, like the exam." />
              <div className="worked-stack">{L.worked.map((w, i) => <Worked key={i} w={w} idx={i} />)}</div>
            </section>
          )}

          {!L.outline && L.code === '9702' && L.point === '4.3' && (
            <section id="cmap" className="lsec">
              <SecHead k="06" title="How it all connects" sub="The big idea sits in the middle — tap a linked idea to explore the link." />
              <ConceptMap />
            </section>
          )}

          {L.glossary && (
            <section id="glossary" className="lsec">
              <SecHead k="07" title="Glossary" sub="Try to recall each definition before you reveal it." />
              <Glossary items={L.glossary} />
            </section>
          )}

          {L.quiz && (
            <section id="quiz" className="lsec">
              <SecHead k="08" title="Quick check" sub="Answer in your head first — then tap to check. No pressure." />
              <QuickCheck items={L.quiz} />
            </section>
          )}

          {L.flashcards && (
            <section id="cards" className="lsec">
              <SecHead k="09" title="Revision flashcards" sub="Flip the card. Test yourself before the exam." />
              <Flashcards cards={L.flashcards} />
            </section>
          )}

          {L.takeaways && (
            <section id="takeaways" className="lsec">
              <SecHead k="10" title="Key takeaways" sub="Review these before you close the topic — retrieval beats re-reading." />
              <ul className="takeaways">
                {L.takeaways.map((t, i) => (<li key={i}><span className="take-check">✓</span><span className="body-2">{t}</span></li>))}
              </ul>
            </section>
          )}

          <section id="practice" className="lsec">
            <SecHead k="11" title="Practice — then mark it" sub="The whole point: a real Cambridge question, marked mark-by-mark." />
            <PracticeBlock go={go} L={L} />
          </section>

          {L.faqs && (
            <section className="lsec">
              <SecHead k="·" title="Frequently asked" />
              <div className="faqs">{L.faqs.map((f, i) => <Faq key={i} f={f} />)}</div>
            </section>
          )}

          <div className="lesson-end">
            <button className={'complete-btn' + (done ? ' done' : '')} onClick={() => setDone(d => !d)}>
              <span className="complete-box">{done ? '✓' : ''}</span>
              {done ? 'Topic complete — nice work' : 'Mark topic as complete'}
            </button>
            <div className="prevnext">
              {prev
                ? <button className="pn-btn" onClick={() => go('lesson', { subject: meta.code, topic: prev.n })}><span className="micro">← PREVIOUS</span><span className="pn-t serif">{prev.n} {prev.t}</span></button>
                : <span></span>}
              {next
                ? <button className="pn-btn right" onClick={() => go('lesson', { subject: meta.code, topic: next.n })}><span className="micro">NEXT →</span><span className="pn-t serif">{next.n} {next.t}</span></button>
                : <span></span>}
            </div>
            {related.length > 0 && (
              <div className="related">
                <p className="micro" style={{ marginBottom: 12 }}>KEEP GOING · MORE {meta.code} TOPICS</p>
                <div className="related-grid">
                  {related.map(r => (
                    <button key={r.n} className="related-card" onClick={() => go('lesson', { subject: meta.code, topic: r.n })}>
                      <span className="related-n mono">{r.n}</span><span className="related-t">{r.t}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </article>
      </div>
      )}
    </main>
  );
}

Object.assign(window, { LessonPage });
