// command-bar.jsx — global ⌘K navigation

function CommandBar({ go, open, setOpen }) {
  const [q, setQ] = React.useState('');
  const [sel, setSel] = React.useState(0);
  const inputRef = React.useRef(null);

  const items = React.useMemo(() => {
    const pages = [
      { label: 'Mark a question', kind: 'PAGE', g: '✎', do: () => go('mark') },
      { label: 'Free courses', kind: 'PAGE', g: '∫', do: () => go('courses') },
      { label: 'All subjects', kind: 'PAGE', g: '§', do: () => go('subjects') },
      { label: 'Progress dashboard', kind: 'PAGE', g: 'A', do: () => go('dashboard') },
      { label: 'Pricing', kind: 'PAGE', g: '£', do: () => go('pricing') },
      { label: 'How it works', kind: 'PAGE', g: '?', do: () => go('how') },
      { label: 'Guides & blog', kind: 'PAGE', g: '¶', do: () => go('guides') },
      { label: 'The story', kind: 'PAGE', g: 'i', do: () => go('story') },
      { label: 'Account settings', kind: 'PAGE', g: 'H', do: () => go('account') },
    ];
    const subs = [...SUBJECTS.alevel, ...SUBJECTS.olevel].map(s => ({
      label: s.name + ' · ' + s.code, kind: 'SUBJECT', g: s.glyph, do: () => go('subject', s.code),
    }));
    return [...pages, ...subs];
  }, [go]);

  const filtered = items.filter(i => i.label.toLowerCase().includes(q.toLowerCase()));

  React.useEffect(() => { setSel(0); }, [q, open]);
  React.useEffect(() => {
    if (open && inputRef.current) { inputRef.current.focus(); setQ(''); }
  }, [open]);

  React.useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen(o => !o); }
      else if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setOpen]);

  if (!open) return null;

  const pick = (item) => { setOpen(false); item.do(); };
  const onInputKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(s - 1, 0)); }
    else if (e.key === 'Enter' && filtered[sel]) pick(filtered[sel]);
  };

  return (
    <div className="cmdk-overlay" onClick={() => setOpen(false)}>
      <div className="cmdk" onClick={e => e.stopPropagation()} data-screen-label="Command bar">
        <input
          ref={inputRef}
          placeholder="Jump to a subject, page, or paper…"
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={onInputKey}
        />
        <div className="cmdk-list">
          {filtered.length === 0 && <div className="cmdk-empty">nothing matches "{q}" — try a subject code like 9709</div>}
          {filtered.map((item, i) => (
            <button key={item.label} className={'cmdk-item' + (i === sel ? ' sel' : '')} onClick={() => pick(item)} onMouseEnter={() => setSel(i)}>
              <span className="g">{item.g}</span>
              <span>{item.label}</span>
              <span className="k">{item.kind}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { CommandBar });
