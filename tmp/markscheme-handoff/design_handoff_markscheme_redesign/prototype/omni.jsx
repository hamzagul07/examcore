// omni.jsx — Ask MarkScheme (Omni AI) floating widget

const OMNI_CANNED = [
  { q: /m1|method|lost/i, a: 'You lost the M1 on line 2 because the scheme requires v_max = ωx₀ — you used a = ω²x₀, the acceleration relation. One power of ω too many.', cite: 'MS 9702/22/M/J/23 · Q3(b) · "v_max = ωx₀ with candidate ω — M1"' },
  { q: /grade|boundary/i, a: 'At your current average (81%) you\u2019re sitting above the typical A boundary (~78%) for 9709. A* usually lands near 90% — mechanics is where you\u2019re leaking marks.', cite: 'Boundary patterns: June 2022–2024 series, honest approximation' },
  { q: /.*/, a: 'I can explain any mark on your script, quote the scheme line it came from, or point you at the free lesson that fixes it. Try asking about a specific mark — like the M1 on Q3.', cite: null },
];

function OmniWidget({ go }) {
  const [open, setOpen] = React.useState(false);
  const [msgs, setMsgs] = React.useState([
    { who: 'bot', text: 'Hi! I\u2019m looking at your 9702/22 Q3 attempt. Ask me about any mark, the scheme, or what to revise next.', cite: null },
  ]);
  const [typing, setTyping] = React.useState(false);
  const [val, setVal] = React.useState('');
  const bodyRef = React.useRef(null);

  React.useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [msgs, typing, open]);

  const ask = (text) => {
    if (!text.trim()) return;
    setMsgs(m => [...m, { who: 'user', text }]);
    setVal('');
    setTyping(true);
    const hit = OMNI_CANNED.find(c => c.q.test(text));
    setTimeout(() => {
      setTyping(false);
      setMsgs(m => [...m, { who: 'bot', text: hit.a, cite: hit.cite }]);
    }, 900);
  };

  return (
    <div>
      {open && (
        <div className="omni-panel" data-screen-label="Ask MarkScheme widget">
          <div className="omni-head">
            <span className="t">Ask MarkScheme<i>.</i></span>
            <button onClick={() => setOpen(false)}>✕</button>
          </div>
          <div className="omni-body" ref={bodyRef}>
            {msgs.map((m, i) => (
              <div key={i} className={'omni-msg ' + m.who}>
                {m.text}
                {m.cite ? <span className="cite">{m.cite}</span> : null}
              </div>
            ))}
            {typing && <span className="omni-typing">examiner is writing…</span>}
            {!typing && msgs.length <= 2 && (
              <div className="omni-suggest">
                <button onClick={() => ask('Why did I lose the M1?')}>Why did I lose the M1?</button>
                <button onClick={() => ask('Am I on track for my grade?')}>Am I on track for my grade?</button>
              </div>
            )}
          </div>
          <div className="omni-input">
            <input
              className="input"
              placeholder="Ask about your paper or scheme…"
              value={val}
              onChange={e => setVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') ask(val); }}
            />
            <button className="btn-primary sm" onClick={() => ask(val)}>Ask</button>
          </div>
        </div>
      )}
      <button className="omni-fab" onClick={() => setOpen(o => !o)}>✎ ask MarkScheme</button>
    </div>
  );
}

Object.assign(window, { OmniWidget });
