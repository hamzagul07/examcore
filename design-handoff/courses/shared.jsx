// shared.jsx — nav, footer, breadcrumb, mastery ring, hand annotations

function Nav({ go, page, theme, onFlipTheme, onSearch }) {
  const [menu, setMenu] = React.useState(false);
  const links = [
    { id: 'mark', label: 'mark', go: () => go('catalog') },
    { id: 'catalog', label: 'courses', go: () => go('catalog') },
    { id: 'subjects', label: 'subjects', go: () => go('subjects') },
    { id: 'progress', label: 'progress', go: () => go('progress') },
    { id: 'guides', label: 'guides & blog', go: () => go('catalog') },
    { id: 'pricing', label: 'pricing', go: () => go('pricing') },
  ];
  const onCourses = page === 'catalog' || page === 'hub' || page === 'lesson';
  const isActive = (id) => (id === 'catalog' && onCourses) || id === page;
  return (
    <div className="nav-wrap">
      <nav className="nav">
        <button className="wordmark" onClick={() => go('catalog')}>MarkScheme<i>.</i></button>
        <div className="nav-links">
          {links.map(l => (
            <button key={l.id} className={'nav-link' + (isActive(l.id) ? ' active' : '')} onClick={l.go}>{l.label}</button>
          ))}
        </div>
        <div className="nav-right">
          <button className="cmdk-btn" onClick={onSearch} title="Search">⌕ <span>search</span> <kbd>⌘K</kbd></button>
          <button className="theme-flip" onClick={onFlipTheme} title="Toggle theme">{theme === 'paper' ? '☾' : '☀'}</button>
          <button className="nav-link signin">sign in</button>
          <button className="btn-primary sm" onClick={() => go('catalog')}>Start free</button>
          <button className="burger" onClick={() => setMenu(m => !m)}>{menu ? '✕' : '☰'}</button>
        </div>
      </nav>
      {menu && (
        <div className="mobile-menu">
          {links.map(l => <button key={l.id} onClick={() => { setMenu(false); l.go(); }}>{l.label}</button>)}
        </div>
      )}
    </div>
  );
}

function Breadcrumb({ items }) {
  return (
    <nav className="crumb">
      {items.map((it, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="crumb-sep">/</span>}
          {it.go
            ? <button className="crumb-link" onClick={it.go}>{it.label}</button>
            : <span className="crumb-cur">{it.label}</span>}
        </React.Fragment>
      ))}
    </nav>
  );
}

// circular mastery ring
function Ring({ pct, size = 44, stroke = 4, color = 'var(--ink)', label }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - pct / 100);
  return (
    <span className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`} style={{ transition: 'stroke-dashoffset 700ms cubic-bezier(.4,0,.2,1)' }} />
      </svg>
      <span className="ring-label">{label != null ? label : pct + '%'}</span>
    </span>
  );
}

function Footer({ go }) {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div>
          <button className="wordmark" onClick={() => go('catalog')} style={{ marginBottom: 12 }}>MarkScheme<i>.</i></button>
          <p className="body-2" style={{ maxWidth: '34ch' }}>Past papers marked the way a real examiner marks — against the official Cambridge scheme.</p>
          <p className="micro" style={{ marginTop: 16 }}>IB &amp; MORE BOARDS — COMING LATER</p>
        </div>
        <div className="footer-col">
          <h4>Product</h4>
          <button>Mark a question</button>
          <button onClick={() => go('catalog')}>Free courses</button>
          <button>Progress</button>
          <button>Pricing</button>
        </div>
        <div className="footer-col">
          <h4>Subjects</h4>
          <button onClick={() => go('hub')}>9702 Physics</button>
          <button onClick={() => go('catalog')}>9709 Mathematics</button>
          <button onClick={() => go('catalog')}>9701 Chemistry</button>
          <button onClick={() => go('catalog')}>All 15 subjects</button>
        </div>
        <div className="footer-col">
          <h4>Company</h4>
          <button>The story</button>
          <button>How it works</button>
          <button>Guides &amp; blog</button>
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

/* ---- hand annotations (the Margin Notes signature) ---- */
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
function MarginNote({ style, children }) {
  return <span className="margin-note" style={style}>{children}</span>;
}

// reading progress bar — width tracks scroll through the document
function ReadingProgress() {
  const [p, setP] = React.useState(0);
  React.useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      const y = window.scrollY || h.scrollTop;
      setP(max > 0 ? Math.min(100, (y / max) * 100) : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return <div className="reading-progress"><span style={{ width: p + '%' }}></span></div>;
}

Object.assign(window, { Nav, Breadcrumb, Ring, Footer, InkCircle, InkScribble, MarginNote, ReadingProgress });
