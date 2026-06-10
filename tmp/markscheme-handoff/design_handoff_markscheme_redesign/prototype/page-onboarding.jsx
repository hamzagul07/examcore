// page-onboarding.jsx — 3-step onboarding: level → subjects → exam session

function OnboardingPage({ go }) {
  const [step, setStep] = React.useState(0);
  const [level, setLevel] = React.useState(null);
  const [picked, setPicked] = React.useState(['9709', '9702']);
  const [session, setSession] = React.useState('mj26');
  const [goal, setGoal] = React.useState('A');

  const togglePick = (code) => setPicked(p => p.includes(code) ? p.filter(c => c !== code) : [...p, code]);
  const subjectPool = level === 'olevel' ? SUBJECTS.olevel : SUBJECTS.alevel;

  return (
    <main className="ob-shell" data-screen-label="Onboarding">
      <div className="ob-dots">
        {[0, 1, 2].map(i => <span key={i} className={i <= step ? 'on' : ''}></span>)}
      </div>

      {step === 0 && (
        <div className="fade-in">
          <h2 className="h2">What are you <em><InkScribble>studying</InkScribble></em>?</h2>
          <p className="lead" style={{ margin: '12px auto 0' }}>So we fetch the right papers and the right schemes.</p>
          <div className="ob-choices">
            <button className={'ob-choice' + (level === 'alevel' ? ' on' : '')} onClick={() => setLevel('alevel')}>
              <b>AS &amp; A Level</b><span>CAIE 9000-series syllabuses</span>
            </button>
            <button className={'ob-choice' + (level === 'olevel' ? ' on' : '')} onClick={() => setLevel('olevel')}>
              <b>O Level</b><span>CAIE 4000/5000-series syllabuses</span>
            </button>
            <button className="ob-choice" disabled>
              <b>IB</b><span className="hand" style={{ color: 'var(--ink)', fontSize: 16 }}>coming soon!</span>
            </button>
            <button className="ob-choice" disabled>
              <b>Other boards</b><span>AQA, Edexcel… later</span>
            </button>
          </div>
          <div className="ob-nav">
            <button className="btn-primary" disabled={!level} style={{ opacity: level ? 1 : 0.5 }} onClick={() => setStep(1)}>Continue →</button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="fade-in">
          <h2 className="h2">Pick your <em><InkScribble>subjects</InkScribble></em>.</h2>
          <p className="lead" style={{ margin: '12px auto 0' }}>Choose as many as you like — you can change this anytime.</p>
          <div className="ob-subjects">
            {subjectPool.map(s => (
              <button key={s.code} className={'ob-chip' + (picked.includes(s.code) ? ' on' : '')} onClick={() => togglePick(s.code)}>
                {picked.includes(s.code) ? '✓ ' : ''}{s.code} {s.name}
              </button>
            ))}
          </div>
          <div className="ob-nav">
            <button className="btn-underline" onClick={() => setStep(0)}>← Back</button>
            <button className="btn-primary" disabled={picked.length === 0} style={{ opacity: picked.length ? 1 : 0.5 }} onClick={() => setStep(2)}>Continue with {picked.length} subject{picked.length === 1 ? '' : 's'} →</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="fade-in">
          <h2 className="h2">When's the <em><InkScribble>real exam</InkScribble></em>?</h2>
          <p className="lead" style={{ margin: '12px auto 0' }}>We pace your revision plan and boundary estimates around it.</p>
          <div className="ob-choices">
            <button className={'ob-choice' + (session === 'mj26' ? ' on' : '')} onClick={() => setSession('mj26')}>
              <b>May/June 2026</b><span>≈ 11 months away</span>
            </button>
            <button className={'ob-choice' + (session === 'on26' ? ' on' : '')} onClick={() => setSession('on26')}>
              <b>Oct/Nov 2026</b><span>≈ 16 months away</span>
            </button>
          </div>
          <div style={{ marginTop: 30 }}>
            <p className="overline" style={{ marginBottom: 12 }}>Goal grade</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              {['A*', 'A', 'B', 'C'].map(g => (
                <button key={g} className={'ob-chip' + (goal === g ? ' on' : '')} style={{ minWidth: 56 }} onClick={() => setGoal(g)}>{g}</button>
              ))}
            </div>
          </div>
          <div className="ob-nav">
            <button className="btn-underline" onClick={() => setStep(1)}>← Back</button>
            <button className="btn-primary" onClick={() => go('dashboard')}>Set up my revision →</button>
          </div>
          <p className="micro" style={{ marginTop: 22 }}>YOU CAN MARK YOUR FIRST QUESTION FREE — NO CARD</p>
        </div>
      )}
    </main>
  );
}

Object.assign(window, { OnboardingPage });
