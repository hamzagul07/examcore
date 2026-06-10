// page-landing.jsx — reimagined landing in the "Margin Notes" direction

function HeroSheet() {
  return (
    <div className="hero-sheet-wrap">
      <Sheet
        head="Q7 (b) — find and classify the stationary points"
        headRight="9709/12 · p.2"
        tally="4 / 5"
        cite="MS 9709/12/M/J/23 · Q7(b): M1 differentiate · M1 set = 0 · A1 both roots · A1 classification"
      >
        <SheetLine work="dy/dx = 3x² − 12x + 9" mark="M1 ✓" ok />
        <SheetLine work="3x² − 12x + 9 = 0" mark="M1 ✓" ok />
        <SheetLine work="x = 1, x = 3" mark="A1 ✓" ok />
        <SheetLine work="min at x = 1" mark="A0 ✗" note="check d²y/dx² — x = 1 is the maximum ↑" />
      </Sheet>
      <p className="caption">real Examiner's Ink, on your actual handwriting</p>
    </div>
  );
}

function LandingFaqItem({ q, a, open, onToggle }) {
  return (
    <div className="faq-item">
      <button className="faq-q" onClick={onToggle}>
        <span>{q}</span><span className="pm">{open ? '−' : '+'}</span>
      </button>
      <div className="faq-a" style={{ maxHeight: open ? '200px' : '0px' }}>
        <p className="body-2">{a}</p>
      </div>
    </div>
  );
}

function LandingPage({ go }) {
  const [faqOpen, setFaqOpen] = React.useState(0);
  const faqs = [
    { q: 'Is this just ChatGPT grading my work?', a: 'No. Every question is marked against the official Cambridge mark scheme for that exact paper — B1/M1/A1 codes, MCQ keys, essay band descriptors. The AI applies the scheme; it doesn\u2019t invent a grade. We\u2019re honest about its limits, too.' },
    { q: 'Does it read handwriting?', a: 'Yes — photos, camera captures, and PDFs of handwritten work, including multi-page scripts. Messy working is fine; if a line is genuinely illegible we tell you instead of guessing.' },
    { q: 'Which subjects are covered?', a: '15 Cambridge syllabuses across A-Level and O-Level: maths (9709), physics (9702), chemistry (9701), biology (9700), economics, business, computer science, English and more.' },
    { q: 'What does it cost?', a: 'Single-question marking has a free tier — no card. Paid plans add whole-paper marking and deeper analytics. The courses are 100% free, forever.' },
    { q: 'Is MarkScheme affiliated with Cambridge?', a: 'No. It\u2019s an independent study tool built by a student. Mark schemes are used for educational reference; we\u2019re not endorsed by Cambridge International.' },
  ];

  return (
    <main>
      {/* ---- hero ---- */}
      <section className="pg hero" data-screen-label="Landing — hero">
        <div className="fade-in">
          <p className="hero-kicker">Cambridge A-Level &amp; O-Level</p>
          <h1 className="h-display">
            Your past papers, <InkCircle>marked</InkCircle> like the <em><InkScribble>real exam</InkScribble></em>.
            <MarginNote style={{ top: '-44px', right: '-10px' }}>this step earns M1!</MarginNote>
          </h1>
          <p className="lead hero-lead">
            Photograph your handwritten answer. We mark it point by point against the official
            Cambridge scheme — and write the examiner's notes right in your margins.
          </p>
          <div className="hero-ctas">
            <button className="btn-primary" onClick={() => go('mark')}>Mark your first question</button>
            <button className="btn-underline" onClick={() => go('how')}>Watch it mark a real script</button>
          </div>
          <p className="micro hero-micro">FREE TIER · NO CARD · B1 / M1 / A1 / MCQ / ESSAY BANDS</p>
        </div>
        <div className="fade-in stag-2"><HeroSheet /></div>
      </section>

      {/* ---- trust strip ---- */}
      <section className="pg">
        <div className="trust">
          <div><b>15</b><span>Cambridge syllabuses</span></div>
          <div><b>B1 · M1 · A1</b><span>Real marking codes</span></div>
          <div><b>~60 sec</b><span>Photo to feedback</span></div>
          <div><b>100% free</b><span>Premium courses</span></div>
        </div>
      </section>

      {/* ---- features ---- */}
      <section className="pg sec" data-screen-label="Landing — features">
        <p className="overline">What you get</p>
        <h2 className="h2">Real schemes. <em>Real standards.</em></h2>
        <p className="lead">Not a chatbot's opinion — feedback tied to the actual mark scheme for that paper and question.</p>
        <div className="feat-grid">
          <div className="card feat wide">
            <span className="glyph">MS</span>
            <h3 className="h3">Official mark schemes</h3>
            <p className="body-2">Each question pulls criteria from the real Cambridge paper — method marks, accuracy marks, MCQ keys and essay bands, cited line by line.</p>
            <div className="chips">
              <span className="chip ok">B1 · M1 · A1</span>
              <span className="chip dim">MCQ keys</span>
              <span className="chip warn">Essay bands</span>
            </div>
          </div>
          <div className="card feat">
            <span className="glyph">✎</span>
            <h3 className="h3">Examiner's Ink</h3>
            <p className="body-2">Stamps and notes overlaid on your working — see which line earned or lost each mark.</p>
          </div>
          <div className="card feat">
            <span className="glyph">Q·P</span>
            <h3 className="h3">One question or whole paper</h3>
            <p className="body-2">Quick check on a single part, or the full script with a projected grade.</p>
          </div>
          <div className="card feat">
            <span className="glyph">IMG</span>
            <h3 className="h3">Photos, camera, PDF</h3>
            <p className="body-2">Multi-page uploads with reorder — assign pages to questions on whole papers.</p>
          </div>
          <div className="card feat">
            <span className="glyph">A*</span>
            <h3 className="h3">Grade boundaries</h3>
            <p className="body-2">Rough A*–E estimates from real boundary patterns — honest approximations, not a crystal ball.</p>
          </div>
        </div>
      </section>

      {/* ---- how it works ---- */}
      <section className="pg sec" data-screen-label="Landing — how it works">
        <p className="overline">How it works</p>
        <h2 className="h2">Upload. Mark. <em>Fix.</em></h2>
        <p className="body-2" style={{ marginTop: 4 }}><button className="btn-underline" style={{ fontSize: 15 }} onClick={() => go('how')}>Full walkthrough — honest about the AI →</button></p>
        <div className="steps">
          <div className="card step">
            <div className="num">1.</div>
            <h3 className="h3">Upload your working</h3>
            <p className="body-2">Snap your handwritten answer or drop a PDF. Pick the paper code so we fetch the right scheme.</p>
            <div className="step-art">
              <span className="chip outline">9702_s23_qp_22.pdf</span>
              <span className="chip outline">IMG_0231.jpg · Q3 (a)–(c)</span>
            </div>
          </div>
          <div className="card step">
            <div className="num">2.</div>
            <h3 className="h3">Marked mark-by-mark</h3>
            <p className="body-2">Each line of working is checked against the scheme's criteria — and stamped where the mark lands.</p>
            <div className="step-art">
              <span className="chip ok">C1 ✓ ω = 2π/T</span>
              <span className="chip no">M0 ✗ wrong relation</span>
              <span className="chip ok">B1 ✓ sketch correct</span>
            </div>
          </div>
          <div className="card step">
            <div className="num">3.</div>
            <h3 className="h3">Fix what lost marks</h3>
            <p className="body-2">Every dropped mark links to the syllabus point and a free lesson — so the same mistake doesn't repeat.</p>
            <div className="step-art">
              <span className="chip warn">Fix next: SHM equations</span>
              <span className="chip dim">→ free lesson · 9702 unit 17</span>
            </div>
          </div>
        </div>
      </section>

      {/* ---- courses promo ---- */}
      <section className="pg sec" data-screen-label="Landing — courses promo">
        <div className="courses-promo">
          <div>
            <p className="overline" style={{ color: 'var(--ink)' }}>100% free · forever</p>
            <h2 className="h2">Premium courses, <em>without the premium</em>.</h2>
            <p className="body-2" style={{ margin: '12px 0 24px' }}>
              Syllabus-aligned lessons with worked examples, exam tips, flashcards — and a real
              past-paper question for every syllabus point. Learn it, practise it, then one-click
              into marking.
            </p>
            <button className="btn-ghost sm" onClick={() => go('courses')}>Browse the courses →</button>
          </div>
          <div className="course-mini">
            {[
              ['9709', 'Mathematics', '54 lessons · 312 questions'],
              ['9702', 'Physics', '48 lessons · 280 questions'],
              ['9701', 'Chemistry', '46 lessons · 265 questions'],
              ['9700', 'Biology', '50 lessons · 240 questions'],
            ].map(([code, name, meta]) => (
              <div key={code} className="course-card" onClick={() => go('courses')}>
                <span className="code">{code}</span>
                <div className="name">{name}</div>
                <div className="meta">{meta}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- subjects ---- */}
      <section className="pg sec" data-screen-label="Landing — subjects">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 18, flexWrap: 'wrap' }}>
          <div>
            <p className="overline">Subjects</p>
            <h2 className="h2">Fifteen papers. <em>One place.</em></h2>
          </div>
          <button className="btn-ghost sm" onClick={() => go('subjects')}>All subjects &amp; levels →</button>
        </div>
        <div className="scard-grid">
          {SUBJECTS.alevel.slice(0, 8).map(s => <SubjectCard key={s.code} s={s} go={go} />)}
        </div>
        <p className="micro" style={{ marginTop: 22 }}>+ O-LEVEL SYLLABUSES · IB &amp; OTHER BOARDS COMING LATER</p>
      </section>

      {/* ---- founder ---- */}
      <section className="pg sec" data-screen-label="Landing — story">
        <div className="founder">
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--ink-soft)', border: '1.5px solid var(--ink-border)', display: 'grid', placeItems: 'center', fontFamily: 'Caveat, cursive', fontSize: 28, color: 'var(--ink)' }}>H</div>
          <div>
            <p className="founder-quote">
              "I built this because I couldn't tell whether my working would actually score.
              Past papers without the examiner's eye are half the loop — this closes it."
            </p>
            <p className="micro">BUILT BY A STUDENT · HONEST ABOUT AI LIMITS · NOT ENDORSED BY CAMBRIDGE INTERNATIONAL · <button className="btn-underline" style={{ fontSize: 12, fontFamily: 'IBM Plex Mono, monospace' }} onClick={() => go('story')}>READ THE STORY →</button></p>
          </div>
        </div>
      </section>

      {/* ---- comparison ---- */}
      <section className="pg sec" data-screen-label="Landing — comparison">
        <p className="overline">Why not just ask a chatbot?</p>
        <h2 className="h2">Generic AI guesses. <em>This one cites.</em></h2>
        <div className="card cmp">
          <div className="cmp-row cmp-head">
            <div></div>
            <div className="us" style={{ textAlign: 'center' }}>MarkScheme</div>
            <div style={{ textAlign: 'center' }}>Generic AI chat</div>
            <div style={{ textAlign: 'center' }}>Private tutor</div>
          </div>
          {[
            ['Uses the official scheme for your exact paper', 'y:✓ always', 'n:✗ guesses', 'mid:~ sometimes'],
            ['Mark-by-mark B1/M1/A1 with citations', 'y:✓', 'n:✗', 'y:✓'],
            ['Feedback written on your actual script', 'y:✓ Examiner\u2019s Ink', 'n:✗ wall of text', 'y:✓'],
            ['Available at 1am before the mock', 'y:✓ ~60 sec', 'y:✓', 'n:✗'],
            ['Tracks error patterns across attempts', 'y:✓', 'n:✗', 'mid:~ in their head'],
            ['Cost per marked paper', 'y:from free', 'y:free-ish', 'n:£30–60/hr'],
          ].map(([lab, a, b, c]) => {
            const cell = (s, us) => {
              const [cls, ...rest] = s.split(':');
              return <div className={'cmp-cell ' + cls + (us ? ' us-col' : '')}>{rest.join(':')}</div>;
            };
            return (
              <div key={lab} className="cmp-row">
                <div className="lab">{lab}</div>
                {cell(a, true)}{cell(b)}{cell(c)}
              </div>
            );
          })}
        </div>
        <p className="micro" style={{ marginTop: 18 }}>HONEST FOOTNOTE: A GOOD TUTOR ALSO TEACHES — WE JUST MARK LIKE ONE, AT 1AM, FOR FREE</p>
      </section>

      {/* ---- faq ---- */}
      <section className="pg sec" data-screen-label="Landing — FAQ" style={{ maxWidth: 860 }}>
        <p className="overline">Questions</p>
        <h2 className="h2">Fair questions, <em>straight answers.</em></h2>
        <div className="faq-list">
          {faqs.map((f, i) => (
            <LandingFaqItem key={i} q={f.q} a={f.a} open={faqOpen === i} onToggle={() => setFaqOpen(faqOpen === i ? -1 : i)} />
          ))}
        </div>
      </section>

      {/* ---- final cta ---- */}
      <section className="pg sec" data-screen-label="Landing — final CTA">
        <div className="final-cta">
          <h2 className="h2" style={{ fontSize: 'clamp(34px, 4.5vw, 52px)' }}>
            Try one question. <em><InkScribble>About a minute.</InkScribble></em>
          </h2>
          <p className="lead" style={{ margin: '18px auto 34px' }}>
            No card, no commitment. Mark something you already wrote and see what
            examiner-style feedback looks like.
          </p>
          <button className="btn-primary" onClick={() => go('mark')}>Mark your first question</button>
          <p className="micro" style={{ marginTop: 26 }}>FREE TIER · FOUNDING MEMBERS GET 50% OFF FOREVER</p>
        </div>
      </section>
    </main>
  );
}

Object.assign(window, { LandingPage });
