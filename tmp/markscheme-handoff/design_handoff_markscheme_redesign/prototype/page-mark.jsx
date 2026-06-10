// page-mark.jsx — upload → marking → Examiner's Ink results

const MARK_AUDIT = [
  { code: 'C1', desc: 'ω = 2π / T stated or implied', pts: '+1', earn: true, line: 0,
    cite: 'Scheme: "ω = 2π/T or ω = 2πf — allow either form. C1."',
    note: 'Correct relation chosen — this is the compensation mark.' },
  { code: 'M1', desc: 'Substitution of T = 0.40 s', pts: '+1', earn: true, line: 1,
    cite: 'Scheme: "Substitutes candidate T into ω expression. M1."',
    note: 'Substitution shown explicitly — never skip this line in exams.' },
  { code: 'A1', desc: 'ω = 16 rad s⁻¹ (accept 15.7)', pts: '+1', earn: true, line: 2,
    cite: 'Scheme: "ω = 15.7 ≈ 16 rad s⁻¹. A1. Accept 2 s.f."',
    note: 'Within accepted range.' },
  { code: 'M0', desc: 'v_max — used a = ω²x₀, not v = ωx₀', pts: '0', earn: false, line: 3,
    cite: 'Scheme: "v_max = ωx₀ — M1 for correct relation with candidate ω."',
    note: 'You used the acceleration formula. v_max = ωx₀ — one power of ω.' },
  { code: 'B1', desc: 'Acceleration–displacement sketch', pts: '+1', earn: true, line: 4,
    cite: 'Scheme: "Straight line through origin, negative gradient. B1."',
    note: 'Sketch has correct gradient and intercept.' },
];

const SHEET_LINES = [
  { work: 'ω = 2π / 0.40 = 15.7 rad/s', mark: 'C1 ✓', ok: true },
  { work: 'sub T = 0.40 s', mark: 'M1 ✓', ok: true },
  { work: 'ω = 16 rad s⁻¹', mark: 'A1 ✓', ok: true },
  { work: 'v = ω²x₀ = 15.7² × 0.02 = 4.9 m/s', mark: 'M0 ✗', ok: false, note: 'v_max = ωx₀ — that\u2019s the acceleration formula. ↓' },
  { work: 'a–x graph: straight line, negative slope', mark: 'B1 ✓', ok: true },
];

function StepsBar({ stage }) {
  const steps = ['Upload', 'Marking', "Examiner's Ink"];
  return (
    <div className="mark-steps-bar">
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          {i > 0 && <span className="mstep-sep"></span>}
          <span className={'mstep' + (stage === i ? ' on' : '') + (stage > i ? ' done' : '')}>
            <span className="dot">{stage > i ? '✓' : i + 1}</span>{s}
          </span>
        </React.Fragment>
      ))}
    </div>
  );
}

function UploadStage({ onStart, mode }) {
  const [pages, setPages] = React.useState([1, 2]);
  return (
    <div className="upload-grid fade-in">
      <div>
        <div className="dropzone" onClick={() => setPages(p => p.length < 6 ? [...p, p.length + 1] : p)}>
          <span style={{ fontSize: 34 }}>✎</span>
          <div className="big">Drop your working here</div>
          <p className="body-2">photos · camera · PDF — multi-page is fine (click to add a page)</p>
        </div>
        {pages.length > 0 && (
          <div className="upload-thumbs">
            {pages.map((p, i) => (
              <div key={p} className="uthumb">
                <button className="x" onClick={(e) => { e.stopPropagation(); setPages(ps => ps.filter(x => x !== p)); }}>×</button>
                <div className="scrib" style={{ width: '85%' }}></div>
                <div className="scrib" style={{ width: '70%' }}></div>
                <div className="scrib" style={{ width: '90%' }}></div>
                <div className="scrib" style={{ width: '55%' }}></div>
                {mode === 'paper'
                  ? <select defaultValue={'Q' + Math.min(i + 1, 6)} onClick={e => e.stopPropagation()}>
                      {['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6'].map(q => <option key={q} value={q}>{q}</option>)}
                    </select>
                  : <span className="pg-no">p.{i + 1}</span>}
              </div>
            ))}
          </div>
        )}
        {mode === 'paper' && pages.length > 0 && <p className="micro" style={{ marginTop: 10 }}>ASSIGN EACH PAGE TO ITS QUESTION — WE'LL STITCH MULTI-PAGE WORKING</p>}
      </div>
      <div className="card card-pad">
        <h3 className="h3" style={{ marginBottom: 18 }}>Which paper is this?</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="field">
            <label>Subject</label>
            <select className="select" defaultValue="9702">
              <option value="9702">9702 — Physics (A-Level)</option>
              <option value="9709">9709 — Mathematics (A-Level)</option>
              <option value="9701">9701 — Chemistry (A-Level)</option>
              <option value="9700">9700 — Biology (A-Level)</option>
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label>Session</label>
              <select className="select" defaultValue="s23"><option value="s23">May/June 2023</option><option value="w23">Oct/Nov 2023</option></select>
            </div>
            <div className="field">
              <label>Paper</label>
              <select className="select" defaultValue="22"><option value="22">Paper 22</option><option value="21">Paper 21</option></select>
            </div>
          </div>
          {mode === 'question' && (
            <div className="field">
              <label>Question</label>
              <input className="input" defaultValue="Q3 — simple harmonic motion" />
            </div>
          )}
          <button className="btn-primary" style={{ justifyContent: 'center', marginTop: 6 }} onClick={onStart} disabled={pages.length === 0}>
            Mark {mode === 'question' ? 'this question' : 'the whole paper'} →
          </button>
          <p className="micro" style={{ textAlign: 'center' }}>USES THE OFFICIAL 9702/22/M/J/23 MARK SCHEME</p>
        </div>
      </div>
    </div>
  );
}

function MarkingStage() {
  const [log, setLog] = React.useState(0);
  const lines = ['reading handwriting…', 'fetching 9702/22/M/J/23 mark scheme…', 'matching working to criteria…', 'placing Examiner\u2019s Ink…'];
  React.useEffect(() => {
    const t = setInterval(() => setLog(l => Math.min(l + 1, lines.length)), 850);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="marking-stage fade-in">
      <h2 className="h2">Marking <em>against the scheme…</em></h2>
      <div className="marking-paper">
        <Sheet head="9702/22 · Q3" headRight="SCANNING">
          <div style={{ position: 'relative' }}>
            <SheetLine work="ω = 2π / 0.40 = 15.7 rad/s" />
            <SheetLine work="v = ω²x₀ = 15.7² × 0.02" />
            <SheetLine work="v = 4.9 m/s" />
            <SheetLine work="a–x graph: straight line ↓" />
            <div className="scan-line" style={{ position: 'absolute', top: 6, left: 0, right: 0 }}></div>
          </div>
        </Sheet>
      </div>
      <div className="marking-log">
        {lines.map((l, i) => (
          <span key={i} className={i < log ? 'on' : ''} style={{ opacity: i <= log ? 1 : 0.35 }}>
            {i < log ? '✓ ' : '· '}{l}
          </span>
        ))}
      </div>
    </div>
  );
}

function ResultStage({ go }) {
  const [sel, setSel] = React.useState(3);
  const selected = MARK_AUDIT[sel];
  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 38, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <p className="overline" style={{ marginBottom: 8 }}>9702/22 · May/June 2023 · Q3 — SHM</p>
          <h2 className="h2" style={{ marginBottom: 0 }}>4 / 5 — <em>one mark got away.</em></h2>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn-ghost sm" onClick={() => go('courses')}>Fix it: SHM lesson →</button>
          <button className="btn-primary sm" onClick={() => go('dashboard')}>See progress</button>
        </div>
      </div>

      <div className="result-grid">
        <div data-screen-label="Mark — Examiner's Ink sheet">
          <Sheet
            head="Q3 — your script, with Examiner's Ink"
            headRight="tap a line"
            tally="4 / 5"
            cite={selected.cite}
          >
            {SHEET_LINES.map((l, i) => (
              <SheetLine key={i} {...l} onClick={() => setSel(MARK_AUDIT.findIndex(m => m.line === i))} active={selected.line === i} />
            ))}
          </Sheet>
          <p className="micro" style={{ marginTop: 14 }}>CLICK ANY LINE — THE AUDIT AND SCHEME CITATION FOLLOW IT</p>
        </div>

        <div className="audit" data-screen-label="Mark — audit panel">
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
              <span className="micro">MARK AUDIT</span><span className="micro">9702/22/M/J/23</span>
            </div>
            {MARK_AUDIT.map((m, i) => (
              <div key={i} className={'audit-row ' + (m.earn ? 'earn' : 'lost') + (sel === i ? ' sel' : '')} onClick={() => setSel(i)}>
                <span className="code">{m.code}</span>
                <span style={{ color: 'var(--text-2)' }}>{m.desc}</span>
                <span className="pts">{m.pts}</span>
              </div>
            ))}
            <div className="audit-total">
              <span className="mono" style={{ fontWeight: 700, color: 'var(--ink)' }}>TOTAL 4 / 5</span>
              <span className="grade-pill">running estimate: grade A</span>
            </div>
          </div>
          <div className="card card-pad" style={{ marginTop: 16 }}>
            <p className="overline" style={{ marginBottom: 10 }}>Examiner's note — {selected.code}</p>
            <p className="greennote" style={{ fontSize: 21, color: selected.earn ? 'var(--ink)' : 'var(--red)', transform: 'rotate(-1deg)' }}>{selected.note}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PaperResultStage({ go }) {
  const qs = [
    { n: 'Q1', t: 'Kinematics — graph analysis', got: 6, of: 7 },
    { n: 'Q2', t: 'Forces — equilibrium', got: 5, of: 6 },
    { n: 'Q3', t: 'Simple harmonic motion', got: 4, of: 5 },
    { n: 'Q4', t: 'Waves — stationary waves', got: 3, of: 6 },
    { n: 'Q5', t: 'Electricity — potential dividers', got: 7, of: 8 },
    { n: 'Q6', t: 'Nuclear physics', got: null, of: 8 },
  ];
  const attempted = qs.filter(q => q.got !== null);
  const got = attempted.reduce((s, q) => s + q.got, 0);
  const of = attempted.reduce((s, q) => s + q.of, 0);
  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 38, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <p className="overline" style={{ marginBottom: 8 }}>9702/22 · May/June 2023 · whole paper</p>
          <h2 className="h2" style={{ marginBottom: 0 }}>{got} / {of} attempted — <em>projected grade A.</em></h2>
        </div>
        <button className="btn-primary sm" onClick={() => go('dashboard')}>See progress</button>
      </div>
      <div className="wp-grid">
        <div>
          <div className="card wp-grade-card" data-screen-label="Mark — projected grade">
            <p className="overline" style={{ marginBottom: 4 }}>Projected grade</p>
            <div className="big-grade">A</div>
            <p className="body-2" style={{ marginTop: 10 }}>
              {got}/{of} on attempted questions (78%). Scaled to the full paper with June-series
              boundaries — an honest approximation, not a promise.
            </p>
            <p className="greennote" style={{ fontSize: 20, marginTop: 12 }}>Q4 waves is the cheapest place to find 3 marks ↓</p>
          </div>
          <div className="card card-pad" style={{ marginTop: 16 }}>
            <p className="overline" style={{ marginBottom: 10 }}>Fix next</p>
            <div className="fix-item"><span className="chip no">−3</span><span><b>Stationary waves — node spacing</b></span><button className="btn-underline" style={{ marginLeft: 'auto', fontSize: 14, flexShrink: 0 }} onClick={() => go('courses')}>lesson →</button></div>
            <div className="fix-item"><span className="chip no">−1</span><span><b>SHM — v_max relation</b></span><button className="btn-underline" style={{ marginLeft: 'auto', fontSize: 14, flexShrink: 0 }} onClick={() => go('courses')}>lesson →</button></div>
          </div>
        </div>
        <div className="card" style={{ overflow: 'hidden' }} data-screen-label="Mark — per-question breakdown">
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
            <span className="micro">QUESTION BY QUESTION</span><span className="micro">TAP FOR EXAMINER'S INK</span>
          </div>
          {qs.map(q => {
            const pct = q.got === null ? 0 : (q.got / q.of) * 100;
            const col = q.got === null ? 'var(--muted)' : pct >= 80 ? 'var(--ink)' : pct >= 55 ? 'var(--amber)' : 'var(--red)';
            return (
              <div key={q.n} className={'wp-qrow' + (q.got === null ? ' wp-skipped' : '')}>
                <span className="qn" style={{ color: col }}>{q.n}</span>
                <span className="qt">{q.t}</span>
                <span className="wp-qbar"><i style={{ width: pct + '%', background: col }}></i></span>
                <span className="qs" style={{ color: col }}>{q.got === null ? 'skipped' : q.got + ' / ' + q.of}</span>
              </div>
            );
          })}
          <div className="audit-total">
            <span className="mono" style={{ fontWeight: 700, color: 'var(--ink)' }}>TOTAL {got} / {of} ATTEMPTED</span>
            <span className="grade-pill">projected: grade A</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function EssayResultStage({ go }) {
  const crits = [
    { m: 'AO1', ok: 'y', t: 'Knowledge — price elasticity defined precisely, formula used' },
    { m: 'AO2', ok: 'y', t: 'Analysis — chain of reasoning from PED to revenue is complete' },
    { m: 'AO3', ok: 'mid', t: 'Evaluation — one developed counterpoint; scheme wants a weighted judgement' },
    { m: 'L4', ok: 'n', t: 'Top band needs context: the question’s airline example never appears' },
  ];
  const col = { y: 'var(--ink)', mid: 'var(--amber)', n: 'var(--red)' };
  const sym = { y: '✓', mid: '∼', n: '✗' };
  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 38, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <p className="overline" style={{ marginBottom: 8 }}>9708/22 · May/June 2023 · Q2(b) — essay, 12 marks</p>
          <h2 className="h2" style={{ marginBottom: 0 }}>Level 3 — <em>9 / 12. Context is the gap.</em></h2>
        </div>
        <button className="btn-ghost sm" onClick={() => go('courses')}>Fix it: evaluation technique →</button>
      </div>
      <div className="result-grid">
        <div data-screen-label="Mark — essay with ink">
          <Sheet head="Q2(b) — your essay, with Examiner's Ink" headRight="para by para" tally="9 / 12"
            cite="MS 9708/22/M/J/23 · Q2(b): L1 1–3 · L2 4–6 · L3 7–9 · L4 10–12 (requires contextual evaluation)">
            <SheetLine work="PED measures responsiveness of demand to price…" mark="AO1 ✓" ok />
            <SheetLine work="…inelastic demand → raising price raises revenue…" mark="AO2 ✓" ok />
            <SheetLine work="…however in the long run substitutes emerge…" mark="AO3 ∼" ok note="good counterpoint — now weigh it and conclude ↓" noteOk />
            <SheetLine work="(no reference to the airline in the question)" mark="L4 ✗" note="top band needs the case context — use the airline" />
          </Sheet>
        </div>
        <div className="audit" data-screen-label="Mark — band panel">
          <div className="card card-pad">
            <p className="overline" style={{ marginBottom: 4 }}>Band placement</p>
            <div className="band-meter">{[1, 2, 3, 4].map(b => <span key={b} className={b <= 3 ? 'on' : ''}></span>)}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="micro">L1 · L2 · L3 · L4</span>
              <span className="grade-pill">Level 3 — 9/12</span>
            </div>
            <div style={{ marginTop: 16 }}>
              {crits.map(c => (
                <div key={c.m} className="crit">
                  <span className="m" style={{ color: col[c.ok] }}>{sym[c.ok]} {c.m}</span>
                  <span style={{ color: 'var(--text-2)' }}>{c.t}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card card-pad" style={{ marginTop: 16 }}>
            <p className="overline" style={{ marginBottom: 10 }}>Examiner's note</p>
            <p className="greennote" style={{ fontSize: 21, transform: 'rotate(-1deg)' }}>One paragraph applying this to the airline = Level 4. The analysis is already there.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MCQResultStage({ go }) {
  const letters = ['A', 'B', 'C', 'D'];
  const wrong = { 7: 'D', 13: 'A', 19: 'C', 23: 'B', 31: 'D', 36: 'A', 38: 'C', 40: 'B' };
  const cells = Array.from({ length: 40 }, (_, i) => {
    const n = i + 1;
    const yours = letters[(i * 7 + 2) % 4];
    return { n, yours, correct: wrong[n] || yours, ok: !wrong[n] };
  });
  const review = [
    { q: 'Q7, Q23', t: 'Moments — taking the wrong pivot', pts: 2 },
    { q: 'Q13, Q31, Q40', t: 'Unit prefixes — nano vs micro slips', pts: 3 },
    { q: 'Q19, Q36, Q38', t: 'Vector vs scalar classification', pts: 3 },
  ];
  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 38, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <p className="overline" style={{ marginBottom: 8 }}>9702/11 · May/June 2023 · multiple choice, 40 marks</p>
          <h2 className="h2" style={{ marginBottom: 0 }}>32 / 40 — <em>three patterns, eight marks.</em></h2>
        </div>
        <button className="btn-primary sm" onClick={() => go('dashboard')}>See progress</button>
      </div>
      <div className="result-grid">
        <div className="card card-pad" data-screen-label="Mark — MCQ key grid">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <span className="micro">YOUR ANSWERS VS THE OFFICIAL KEY</span>
            <span className="micro" style={{ color: 'var(--ink)' }}>32 ✓ · 8 ✗</span>
          </div>
          <div className="mcq-grid">
            {cells.map(c => (
              <div key={c.n} className={'mcq-cell ' + (c.ok ? 'ok' : 'no')} title={c.ok ? 'correct' : 'key: ' + c.correct}>
                <span className="n">{c.n}</span>
                <span className="a">{c.yours}</span>
                {!c.ok && <span className="c">{c.correct} ✓</span>}
              </div>
            ))}
          </div>
          <div className="scheme-cite" style={{ marginTop: 16 }}>KEY: 9702/11/M/J/23 · official answer key, all 40 items</div>
        </div>
        <div className="audit" data-screen-label="Mark — MCQ review panel">
          <div className="card card-pad">
            <p className="overline" style={{ marginBottom: 10 }}>The 8 marks, grouped</p>
            {review.map(r => (
              <div key={r.q} className="fix-item">
                <span className="chip no">−{r.pts}</span>
                <span><b>{r.t}</b><br /><span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{r.q}</span></span>
                <button className="btn-underline" style={{ marginLeft: 'auto', fontSize: 14, flexShrink: 0 }} onClick={() => go('courses')}>fix →</button>
              </div>
            ))}
          </div>
          <div className="card card-pad" style={{ marginTop: 16 }}>
            <p className="overline" style={{ marginBottom: 10 }}>Examiner's note</p>
            <p className="greennote" style={{ fontSize: 21, transform: 'rotate(-1deg)' }}>32/40 is already an A — the unit-prefix slips alone get you to A*.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MockSetup({ onStart }) {
  return (
    <div className="mock-setup fade-in" data-screen-label="Mock — setup">
      <h2 className="h2">Sit it like <em>the real thing.</em></h2>
      <p className="lead" style={{ margin: '12px auto 30px' }}>Full paper, real timing, no pausing for answers. Upload your script when the clock runs out — or hand in early.</p>
      <div className="card card-pad" style={{ textAlign: 'left' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="field">
            <label>Paper</label>
            <select className="select" defaultValue="9702-22"><option value="9702-22">9702/22 · M/J 2023</option><option value="9709-12">9709/12 · M/J 2023</option></select>
          </div>
          <div className="field">
            <label>Time allowed</label>
            <select className="select" defaultValue="75"><option value="75">1 h 15 min (official)</option><option value="60">1 h — pressure run</option></select>
          </div>
        </div>
        <button className="btn-primary" style={{ justifyContent: 'center', width: '100%', marginTop: 18 }} onClick={onStart}>Start the clock →</button>
        <p className="micro" style={{ textAlign: 'center', marginTop: 12 }}>WORK ON PAPER — THIS TAB BECOMES YOUR INVIGILATOR</p>
      </div>
    </div>
  );
}

function MockTimerStage({ onHandIn }) {
  const [secs, setSecs] = React.useState(75 * 60);
  const [done, setDone] = React.useState({});
  React.useEffect(() => {
    const t = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  const low = secs < 600;
  return (
    <div className="mock-timer-stage fade-in" data-screen-label="Mock — timer">
      <p className="overline">9702/22 · mock in progress</p>
      <div className={'mock-clock' + (low ? ' low' : '')}>{mm}:{ss}</div>
      <p className="body-2" style={{ marginTop: 10 }}>tick off questions as you finish them — on paper, like exam day</p>
      <div className="mock-palette">
        {['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6'].map(q => (
          <button key={q} className={'mock-q' + (done[q] ? ' done' : '')} onClick={() => setDone(d => ({ ...d, [q]: !d[q] }))}>{done[q] ? '✓' : q}</button>
        ))}
      </div>
      <p className="greennote" style={{ fontSize: 20 }}>{Object.values(done).filter(Boolean).length} of 6 ticked off</p>
      <div style={{ marginTop: 26, display: 'flex', gap: 16, justifyContent: 'center', alignItems: 'center' }}>
        <button className="btn-primary" onClick={onHandIn}>Hand in &amp; mark →</button>
      </div>
      <p className="micro" style={{ marginTop: 18 }}>HANDING IN TAKES YOU TO UPLOAD — THEN THE WHOLE PAPER IS MARKED AS USUAL</p>
    </div>
  );
}

function MarkPage({ go }) {
  const [stage, setStage] = React.useState(0);
  const [mode, setMode] = React.useState('question');
  const [demo, setDemo] = React.useState('structured');
  React.useEffect(() => {
    if (stage === 1) {
      const t = setTimeout(() => setStage(2), 3800);
      return () => clearTimeout(t);
    }
  }, [stage]);
  return (
    <main className="pg mark-shell" data-screen-label="Mark flow">
      <p className="overline" style={{ marginBottom: 6 }}>Mark a question</p>
      <StepsBar stage={typeof stage === 'number' ? stage : 0} />
      {stage === 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 26, flexWrap: 'wrap' }}>
          <button className={mode === 'question' ? 'btn-primary sm' : 'btn-ghost sm'} onClick={() => setMode('question')}>Single question</button>
          <button className={mode === 'paper' ? 'btn-primary sm' : 'btn-ghost sm'} onClick={() => setMode('paper')}>Whole paper</button>
          <button className={mode === 'mock' ? 'btn-primary sm' : 'btn-ghost sm'} onClick={() => setMode('mock')}>Mock exam ⏱</button>
        </div>
      )}
      {stage === 0 && mode !== 'mock' && <UploadStage onStart={() => setStage(1)} mode={mode} />}
      {stage === 0 && mode === 'mock' && <MockSetup onStart={() => setStage('timer')} />}
      {stage === 'timer' && <MockTimerStage onHandIn={() => setStage(1)} />}
      {stage === 1 && <MarkingStage />}
      {stage === 2 && mode === 'question' && (
        <div style={{ marginBottom: 22 }}>
          <span className="micro" style={{ marginRight: 10 }}>DEMO TYPE</span>
          <span className="demo-switch">
            <button className={demo === 'structured' ? 'on' : ''} onClick={() => setDemo('structured')}>9702 STRUCTURED</button>
            <button className={demo === 'essay' ? 'on' : ''} onClick={() => setDemo('essay')}>9708 ESSAY</button>
            <button className={demo === 'mcq' ? 'on' : ''} onClick={() => setDemo('mcq')}>9702 MCQ</button>
          </span>
        </div>
      )}
      {stage === 2 && ((mode === 'paper' || mode === 'mock') ? <PaperResultStage go={go} /> : demo === 'essay' ? <EssayResultStage go={go} /> : demo === 'mcq' ? <MCQResultStage go={go} /> : <ResultStage go={go} />)}
      {stage === 2 && (
        <div style={{ marginTop: 28 }}>
          <button className="btn-underline" onClick={() => setStage(0)}>← Mark another {mode === 'question' ? 'question' : 'paper'}</button>
        </div>
      )}
    </main>
  );
}

Object.assign(window, { MarkPage });
