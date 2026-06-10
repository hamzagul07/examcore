// page-content.jsx — How it works + Guides hub

function HowItWorksPage({ go }) {
  return (
    <main className="pg" style={{ paddingTop: 56 }} data-screen-label="How it works">
      <p className="overline">How it works</p>
      <h2 className="h2" style={{ fontSize: 'clamp(36px, 5vw, 56px)' }}>From photo to marked script, <em>in four honest steps.</em></h2>
      <p className="lead">No magic claimed. Here's exactly what happens to your work — and where the limits are.</p>

      <div className="hiw-step" data-screen-label="HIW — step 1">
        <div>
          <div className="hiw-num">1.</div>
          <h3 className="h3" style={{ fontSize: 26 }}>You upload your working</h3>
          <p className="body-2" style={{ fontSize: 16 }}>
            Photos, camera, or PDF — single question or the whole script. Multi-page uploads can be
            reordered and assigned to questions. Messy handwriting is expected; that's what students write.
          </p>
        </div>
        <div className="card card-pad">
          <div className="upload-thumbs" style={{ marginTop: 0 }}>
            {[1, 2, 3].map(p => (
              <div key={p} className="uthumb">
                <div className="scrib" style={{ width: '85%' }}></div>
                <div className="scrib" style={{ width: '70%' }}></div>
                <div className="scrib" style={{ width: '90%' }}></div>
                <span className="pg-no">p.{p}</span>
              </div>
            ))}
          </div>
          <p className="micro" style={{ marginTop: 14 }}>IMG_0231.JPG · IMG_0232.JPG · 9702_S23_QP_22.PDF</p>
        </div>
      </div>

      <div className="hiw-step flip" data-screen-label="HIW — step 2">
        <div>
          <div className="hiw-num">2.</div>
          <h3 className="h3" style={{ fontSize: 26 }}>We fetch the real scheme</h3>
          <p className="body-2" style={{ fontSize: 16 }}>
            Your paper code, session and question pin down the exact official Cambridge mark scheme.
            The marking style follows the paper: B1/M1/A1 for maths and sciences, MCQ keys, band
            descriptors for essays.
          </p>
        </div>
        <div className="card card-pad">
          <p className="overline" style={{ marginBottom: 10 }}>Matched scheme</p>
          <div className="scheme-cite" style={{ marginTop: 0 }}>
            MS 9702/22/M/J/23 · Q3: C1 ω = 2π/T · M1 substitution · A1 ω = 16 rad s⁻¹ · M1 v_max = ωx₀ · B1 a–x sketch
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <span className="chip ok">B1 · M1 · A1</span>
            <span className="chip dim">MCQ keys</span>
            <span className="chip warn">essay bands</span>
          </div>
        </div>
      </div>

      <div className="hiw-step" data-screen-label="HIW — step 3">
        <div>
          <div className="hiw-num">3.</div>
          <h3 className="h3" style={{ fontSize: 26 }}>Marked line by line — with Examiner's Ink</h3>
          <p className="body-2" style={{ fontSize: 16 }}>
            Each line of your working is checked against a criterion. Stamps land where marks were
            earned; notes explain the ones that got away. Click any mark to see the scheme line it
            came from.
          </p>
        </div>
        <Sheet head="Q3 — your script" headRight="EXAMINER'S INK" tally="4 / 5">
          <SheetLine work="ω = 2π / 0.40 = 15.7 rad/s" mark="C1 ✓" ok />
          <SheetLine work="v = ω²x₀ = 4.9 m/s" mark="M0 ✗" note="v_max = ωx₀ — one power of ω ↓" />
          <SheetLine work="a–x graph: straight line ↓" mark="B1 ✓" ok />
        </Sheet>
      </div>

      <div className="hiw-step flip" data-screen-label="HIW — step 4">
        <div>
          <div className="hiw-num">4.</div>
          <h3 className="h3" style={{ fontSize: 26 }}>Every lost mark becomes a fix</h3>
          <p className="body-2" style={{ fontSize: 16 }}>
            Dropped marks map to syllabus points, which map to free lessons with a real past-paper
            question each. Learn → practise → mark → fix, in one loop.
          </p>
        </div>
        <div className="card card-pad">
          <p className="overline" style={{ marginBottom: 8 }}>Fix next</p>
          <div className="fix-item"><span className="chip no">−1</span><span><b>SHM — v_max relation</b></span><button className="btn-underline" style={{ marginLeft: 'auto', fontSize: 14, flexShrink: 0 }} onClick={() => go('courses')}>lesson →</button></div>
          <div className="fix-item"><span className="chip warn">drill</span><span><b>ω relations</b> — 3 practice questions queued</span><button className="btn-underline" style={{ marginLeft: 'auto', fontSize: 14, flexShrink: 0 }} onClick={() => go('mark')}>practise →</button></div>
        </div>
      </div>

      <section className="sec-tight" data-screen-label="HIW — honesty">
        <h2 className="h2" style={{ marginTop: 40 }}>Honest about <em>the AI.</em></h2>
        <div className="canct">
          <div className="card card-pad">
            <h3 className="h3" style={{ color: 'var(--ink)' }}>What it does well</h3>
            <div className="canct-item"><span className="m" style={{ color: 'var(--ink)' }}>✓</span>Applies the official scheme criteria, mark by mark, with citations</div>
            <div className="canct-item"><span className="m" style={{ color: 'var(--ink)' }}>✓</span>Reads most handwriting, including multi-page working</div>
            <div className="canct-item"><span className="m" style={{ color: 'var(--ink)' }}>✓</span>Spots recurring error patterns across your attempts</div>
          </div>
          <div className="card card-pad">
            <h3 className="h3" style={{ color: 'var(--red)' }}>Where it's limited</h3>
            <div className="canct-item"><span className="m" style={{ color: 'var(--red)' }}>✗</span>Genuinely illegible lines are flagged, not guessed</div>
            <div className="canct-item"><span className="m" style={{ color: 'var(--red)' }}>✗</span>Essay band judgements are approximate — a human examiner may differ by a band</div>
            <div className="canct-item"><span className="m" style={{ color: 'var(--red)' }}>✗</span>Grade estimates are boundary-pattern approximations, not predictions</div>
          </div>
        </div>
      </section>

      <div style={{ textAlign: 'center', marginTop: 64 }}>
        <button className="btn-primary" onClick={() => go('mark')}>Try it on one question</button>
        <p className="micro" style={{ marginTop: 18 }}>FREE TIER · ABOUT A MINUTE · NOT ENDORSED BY CAMBRIDGE INTERNATIONAL</p>
      </div>
    </main>
  );
}

const GUIDES = [
  { t: 'SHM: every way Cambridge asks it', tag: 'Topic deep-dive', time: '9 min', c: 'var(--acc-violet)' },
  { t: 'Decoding B1, M1, A1 — what each mark actually rewards', tag: 'Scheme decoded', time: '6 min', c: 'var(--ink)' },
  { t: 'Why "show that" questions score zero for quoting', tag: 'Exam technique', time: '4 min', c: 'var(--amber)' },
  { t: 'Premature rounding: the quietest mark killer', tag: 'Exam technique', time: '5 min', c: 'var(--acc-rose)' },
  { t: 'Stationary waves vs progressive: the 6-mark comparison', tag: 'Topic deep-dive', time: '8 min', c: 'var(--acc-teal)' },
  { t: 'How grade boundaries actually move (2019–2025)', tag: 'Scheme decoded', time: '7 min', c: 'var(--acc-blue)' },
];

function GuidesPage({ go }) {
  return (
    <main className="pg" style={{ paddingTop: 56 }} data-screen-label="Guides hub">
      <p className="overline">Guides &amp; blog</p>
      <h2 className="h2" style={{ fontSize: 'clamp(36px, 5vw, 56px)' }}>Read the examiner's <em>mind.</em></h2>
      <p className="lead">Short, specific guides on how Cambridge actually marks — written from the schemes, not vibes.</p>

      <div className="card guide-feature" style={{ marginTop: 40 }} data-screen-label="Guides — featured">
        <div>
          <span className="chip ok">featured</span>
          <h3 className="h3" style={{ fontSize: 30, margin: '14px 0 10px' }}>The anatomy of a method mark</h3>
          <p className="body-2" style={{ fontSize: 16 }}>
            M1 is not "working shown". It's a specific, citable criterion — and once you can predict
            it, you can bank it. A walkthrough of 12 real M1 lines from June 2023 schemes.
          </p>
          <div style={{ display: 'flex', gap: 14, marginTop: 20, alignItems: 'center' }}>
            <button className="btn-ghost sm">Read the guide →</button>
            <span className="micro">11 MIN · UPDATED THIS WEEK</span>
          </div>
        </div>
        <Sheet head="from the guide" headRight="M1 SPOTTING">
          <SheetLine work="3x² − 12x + 9 = 0" mark="M1 ✓" ok />
          <SheetLine work="(why? — setting derivative to zero IS the method)" />
        </Sheet>
      </div>

      <div className="guide-grid">
        {GUIDES.map(g => (
          <div key={g.t} className="card guide-card" style={{ '--sc': g.c }}>
            <span className="chip outline" style={{ alignSelf: 'flex-start', color: g.c, borderColor: 'color-mix(in srgb, ' + g.c + ' 45%, transparent)' }}>{g.tag}</span>
            <h3 className="gt">{g.t}</h3>
            <div className="gmeta">
              <span className="micro">{g.time.toUpperCase()} READ</span>
              <button className="btn-underline" style={{ marginLeft: 'auto', fontSize: 13.5 }}>read →</button>
            </div>
          </div>
        ))}
      </div>

      <div className="card card-pad" style={{ marginTop: 40, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <p className="greennote" style={{ fontSize: 21, margin: 0, flex: 1, minWidth: 240 }}>guides tell you how marks work — the courses make you earn them ↓</p>
        <button className="btn-primary sm" onClick={() => go('courses')}>Free courses</button>
      </div>
    </main>
  );
}

Object.assign(window, { HowItWorksPage, GuidesPage });
