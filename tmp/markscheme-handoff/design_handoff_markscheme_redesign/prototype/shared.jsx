// shared.jsx — nav, footer, annotation SVGs, exam-sheet primitives

const PAGES = [
  { id: 'landing', label: 'Home', nav: false },
  { id: 'mark', label: 'Mark', nav: true },
  { id: 'courses', label: 'Courses', nav: true },
  { id: 'subjects', label: 'Subjects', nav: true },
  { id: 'dashboard', label: 'Progress', nav: true },
  { id: 'pricing', label: 'Pricing', nav: true },
];

function Nav({ page, go, theme, onFlipTheme, onSearch }) {
  const [menu, setMenu] = React.useState(false);
  const nav = (p) => { setMenu(false); go(p); };
  return (
    <div className="nav-wrap">
      <nav className="nav">
        <button className="wordmark" onClick={() => nav('landing')}>MarkScheme<i>.</i></button>
        <div className="nav-links">
          {PAGES.filter(p => p.nav).map(p => (
            <button key={p.id} className={'nav-link' + (page === p.id ? ' active' : '')} onClick={() => nav(p.id)}>
              {p.label.toLowerCase()}
            </button>
          ))}
        </div>
        <div className="nav-right">
          <button className="cmdk-btn" onClick={onSearch} title="Search (⌘K)">⌕ <span>search</span> <kbd>⌘K</kbd></button>
          <button className="theme-flip" onClick={onFlipTheme} title="Toggle theme">
            {theme === 'paper' ? '☾' : '☀'}
          </button>
          <button className="nav-link" onClick={() => nav('onboarding')}>sign in</button>
          <button className="avatar-btn" onClick={() => nav('account')} title="Account">H</button>
          <button className="btn-primary sm" onClick={() => nav('mark')}>Mark a question</button>
          <button className="burger" onClick={() => setMenu(m => !m)} title="Menu">{menu ? '✕' : '☰'}</button>
        </div>
      </nav>
      {menu && (
        <div className="mobile-menu">
          {PAGES.filter(p => p.nav).map(p => (
            <button key={p.id} onClick={() => nav(p.id)}>{p.label}</button>
          ))}
          <button onClick={() => nav('account')}>Account</button>
          <button onClick={() => nav('onboarding')}>Sign in</button>
        </div>
      )}
    </div>
  );
}

function Footer({ go }) {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div>
          <button className="wordmark" onClick={() => go('landing')} style={{ marginBottom: 12 }}>MarkScheme<i>.</i></button>
          <p className="body-2" style={{ maxWidth: '34ch' }}>
            Past papers marked the way a real examiner marks — against the official Cambridge scheme.
          </p>
          <p className="micro" style={{ marginTop: 16 }}>IB &amp; MORE BOARDS — COMING LATER</p>
        </div>
        <div className="footer-col">
          <h4>Product</h4>
          <button onClick={() => go('mark')}>Mark a question</button>
          <button onClick={() => go('courses')}>Free courses</button>
          <button onClick={() => go('dashboard')}>Progress</button>
          <button onClick={() => go('pricing')}>Pricing</button>
        </div>
        <div className="footer-col">
          <h4>Subjects</h4>
          <button onClick={() => go('subjects')}>9709 Mathematics</button>
          <button onClick={() => go('subjects')}>9702 Physics</button>
          <button onClick={() => go('subjects')}>9701 Chemistry</button>
          <button onClick={() => go('subjects')}>All 15 subjects</button>
        </div>
        <div className="footer-col">
          <h4>Company</h4>
          <button onClick={() => go('story')}>The story</button>
          <button onClick={() => go('how')}>How it works</button>
          <button onClick={() => go('guides')}>Guides &amp; blog</button>
          <button onClick={() => go('how')}>Honest about AI</button>
          <a href="#">Contact</a>
        </div>
      </div>
      <div className="footer-legal">
        <span>© 2026 MarkScheme — built by a student, for students.</span>
        <span>Not endorsed by Cambridge International.</span>
      </div>
    </footer>
  );
}

/* ---- hand annotations ---- */
function InkCircle({ children }) {
  return (
    <span className="circled">
      {children}
      <svg viewBox="0 0 100 40" preserveAspectRatio="none">
        <path d="M8,22 C10,8 38,2 58,4 C82,6 96,12 95,22 C94,33 70,38 46,37 C22,36 5,32 8,20"
          fill="none" stroke="var(--ink)" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function InkScribble({ children }) {
  return (
    <span className="scribbled">
      {children}
      <svg viewBox="0 0 100 10" preserveAspectRatio="none">
        <path d="M2,6 C20,2 45,8 62,5 C78,2 92,6 98,4" fill="none" stroke="var(--ink)" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function MarginNote({ style, children, flip }) {
  return (
    <span className="margin-note" style={style}>
      {children}
      <svg width="60" height="34" viewBox="0 0 60 34" style={{ display: 'block', marginTop: 2, overflow: 'visible', transform: flip ? 'scaleX(-1)' : 'none' }}>
        <path d="M50,2 C40,18 25,26 6,30" fill="none" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M13,24 L5,31 L15,32" fill="none" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/* ---- exam sheet primitives ---- */
function Sheet({ head, headRight, tally, children, cite, style }) {
  return (
    <div className="sheet" style={style}>
      {tally ? <div className="tally">{tally}</div> : null}
      {head ? <div className="sheet-head"><span>{head}</span><span>{headRight}</span></div> : null}
      {children}
      {cite ? <div className="scheme-cite">{cite}</div> : null}
    </div>
  );
}

function SheetLine({ work, mark, ok, note, noteOk, onClick, active }) {
  return (
    <div>
      <div
        className="sheet-line"
        onClick={onClick}
        style={onClick ? { cursor: 'pointer', background: active ? 'var(--ink-soft)' : 'transparent' } : null}
      >
        <span className="work">{work}</span>
        {mark ? <span className={'stamp ' + (ok ? 'ok' : 'no')}>{mark}</span> : null}
      </div>
      {note ? <span className={noteOk ? 'greennote' : 'rednote'}>{note}</span> : null}
    </div>
  );
}

function TabBar({ page, go }) {
  const tabs = [
    { id: 'mark', label: 'Mark', g: '✎' },
    { id: 'courses', label: 'Learn', g: '∫' },
    { id: 'subjects', label: 'Subjects', g: '§' },
    { id: 'dashboard', label: 'Progress', g: 'A' },
    { id: 'account', label: 'You', g: 'H' },
  ];
  return (
    <nav className="tabbar" data-screen-label="Mobile tab bar">
      {tabs.map(tb => (
        <button key={tb.id} className={page === tb.id ? 'on' : ''} onClick={() => go(tb.id)}>
          <span className="tg">{tb.g}</span>
          <span className="tl">{tb.label}</span>
        </button>
      ))}
    </nav>
  );
}

Object.assign(window, { PAGES, Nav, Footer, TabBar, InkCircle, InkScribble, MarginNote, Sheet, SheetLine });
