// diagram.jsx — live, step-synced diagram for Density & pressure (the star moment)

function LiveDiagram({ step, setStep }) {
  const [playing, setPlaying] = React.useState(false);
  const [t, setT] = React.useState(0); // 0..1 marker descent in step 4
  const [dragF, setDragF] = React.useState(null); // manual depth fraction
  const svgRef = React.useRef(null);
  const dragging = React.useRef(false);

  React.useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setStep(s => (s >= 4 ? 1 : s + 1)), 2600);
    return () => clearInterval(id);
  }, [playing, setStep]);

  React.useEffect(() => {
    if (step !== 4) { setT(0); setDragF(null); return; }
    let raf, start;
    const loop = (ts) => {
      if (!start) start = ts;
      const p = Math.min(1, (ts - start) / 1500);
      setT(p);
      if (p < 1) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [step]);

  // geometry
  const W = 460, H = 340;
  const tankX = 150, tankW = 248, tankTop = 70, tankBot = 308;
  const waterTop = 104;
  const wallX = tankX + tankW;

  const dots = [];
  for (let r = 0; r < 6; r++) for (let c = 0; c < 5; c++) {
    dots.push({ x: tankX + 30 + c * 42 + (r % 2 ? 12 : 0), y: waterTop + 24 + r * 31 });
  }
  const arrows = [0.22, 0.42, 0.62, 0.82].map(f => ({
    y: waterTop + f * (tankBot - waterTop), len: 16 + f * 58, f,
  }));

  const markerF = dragF != null ? dragF : (0.3 + t * 0.55);
  const markerY = waterTop + markerF * (tankBot - waterTop);
  const depthM = (markerF * 4).toFixed(1);
  const dP = Math.round(1000 * 9.81 * (markerF * 4));

  // drag the depth marker (step 4)
  const fracFromEvent = (e) => {
    const r = svgRef.current.getBoundingClientRect();
    const yView = (e.clientY - r.top) / r.height * H;
    const f = (yView - waterTop) / (tankBot - waterTop);
    return Math.max(0.04, Math.min(0.98, f));
  };
  const onDown = (e) => { if (step !== 4) return; dragging.current = true; setDragF(fracFromEvent(e)); };
  const onMove = (e) => { if (dragging.current) setDragF(fracFromEvent(e)); };
  const onUp = () => { dragging.current = false; };

  const formula = step === 1 ? 'ρ = m / V' : step === 2 ? 'p = F / A' : 'Δp = ρgh';
  const fluid = step === 3 || step === 4;

  return (
    <div className="diagram-wrap" data-screen-label="Lesson — live diagram">
      <div className="diagram-head">
        <span className="micro" style={{ color: 'var(--ink)' }}>LIVE DIAGRAM</span>
        <span className="diagram-step-label mono">STEP {step} / 4 · {LESSON.steps[step-1].title}</span>
        <button className="diagram-play" onClick={() => setPlaying(p => !p)}>{playing ? '❙❙ pause' : '▶ play'}</button>
      </div>

      <svg ref={svgRef} className="diagram-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Fluid pressure diagram"
        style={{ cursor: step === 4 ? 'ns-resize' : 'default', touchAction: 'none' }}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}>
        <defs>
          <pattern id="dg" width="22" height="22" patternUnits="userSpaceOnUse">
            <path d="M22 0H0V22" fill="none" stroke="var(--paper-rule)" strokeWidth="1" />
          </pattern>
          <linearGradient id="waterfill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--acc-violet)" stopOpacity="0.18" />
            <stop offset="1" stopColor="var(--acc-violet)" stopOpacity="0.46" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width={W} height={H} fill="url(#dg)" opacity="0.5" />

        {/* vessel — solid block for density/pressure, open tank for fluid */}
        <rect x={tankX} y={tankTop} width={tankW} height={tankBot - tankTop} rx="4"
          fill={fluid ? 'none' : 'var(--acc-violet)'} fillOpacity={fluid ? 1 : 0.10}
          stroke="var(--border-strong)" strokeWidth="2.5" />

        {/* STEP 1 — density particles */}
        {step === 1 && (
          <g className="dg-layer">
            {dots.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r="7" fill="var(--acc-violet)" opacity="0.85" />)}
            <text x={tankX + tankW/2} y={tankBot + 26} textAnchor="middle" className="dg-cap">mass packed into a volume</text>
          </g>
        )}

        {/* STEP 2 — force on area */}
        {step === 2 && (
          <g className="dg-layer">
            <rect x={tankX} y={tankTop-4} width={tankW} height="8" fill="var(--ink)" opacity="0.9" />
            {[0.25,0.5,0.75].map((f,i)=>{
              const x = tankX + f*tankW;
              return <g key={i}>
                <line x1={x} y1={tankTop-46} x2={x} y2={tankTop-8} stroke="var(--red)" strokeWidth="3" />
                <path d={`M${x-5},${tankTop-17} L${x},${tankTop-7} L${x+5},${tankTop-17}`} fill="none" stroke="var(--red)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </g>;
            })}
            <text x={tankX + tankW/2} y={tankTop-54} textAnchor="middle" className="dg-cap" fill="var(--red)">force F (normal)</text>
            <text x={tankX + tankW + 10} y={tankTop+5} className="dg-cap" textAnchor="start">area A</text>
            <text x={tankX + tankW/2} y={(tankTop+tankBot)/2} textAnchor="middle" className="dg-cap">pressure = force ÷ area</text>
          </g>
        )}

        {/* STEP 3 & 4 — fluid */}
        {fluid && (
          <g className="dg-layer">
            <rect x={tankX+2} y={waterTop} width={tankW-4} height={tankBot - waterTop - 2} fill="url(#waterfill)" />
            <path d={`M${tankX+2},${waterTop} q 20,-7 41,0 t 41,0 t 41,0 t 41,0 t 41,0 t 41,0`}
              fill="none" stroke="var(--acc-violet)" strokeWidth="2.5" opacity="0.7" />
            {arrows.map((a, i) => (
              <g key={i} opacity={step===4 ? 0.3 : 1}>
                <line x1={wallX-6} y1={a.y} x2={wallX-6-a.len} y2={a.y} stroke="var(--ink)" strokeWidth="3" />
                <path d={`M${wallX-6-a.len+9},${a.y-5} L${wallX-6-a.len},${a.y} L${wallX-6-a.len+9},${a.y+5}`}
                  fill="none" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            ))}
            <text x={wallX-6} y={waterTop-10} textAnchor="end" className="dg-cap" fill="var(--ink)">pressure grows with depth ↓</text>
          </g>
        )}

        {/* STEP 4 — live depth marker + readout */}
        {step === 4 && (
          <g className="dg-layer">
            <line x1={tankX+34} y1={waterTop} x2={tankX+34} y2={markerY} stroke="var(--text-2)" strokeWidth="1.5" strokeDasharray="4 4" />
            <text x={tankX+42} y={(waterTop+markerY)/2} className="dg-cap" dominantBaseline="middle">h = {depthM} m</text>
            <line x1={wallX-6} y1={markerY} x2={wallX-6-(16+markerF*64)} y2={markerY} stroke="var(--ink)" strokeWidth="4" />
            <circle cx={tankX+tankW/2} cy={markerY} r="11" fill="var(--ink)" stroke="var(--surface)" strokeWidth="2.5" />
            <text x={tankX+tankW/2} y={markerY+4} textAnchor="middle" fill="var(--surface)" style={{ fontSize: 12, fontWeight: 700 }}>⇅</text>
            <text x={tankX+tankW/2} y={tankBot+24} textAnchor="middle" className="dg-cap" fill="var(--ink)">drag the marker to change depth</text>
            <g transform={`translate(${tankX+tankW/2-2},${markerY})`}>
              <rect x="16" y="-15" width="120" height="28" rx="6" fill="var(--surface)" stroke="var(--ink-border)" strokeWidth="1.5" />
              <text x="26" y="4" className="dg-readout" fill="var(--ink)">Δp ≈ {dP.toLocaleString()} Pa</text>
            </g>
          </g>
        )}

        {/* formula badge */}
        <text x="20" y="30" className="dg-formula">{formula}</text>
      </svg>

      <div className="diagram-dots">
        {[1,2,3,4].map(s => (
          <button key={s} className={'dg-dot' + (step===s ? ' on' : '')} onClick={() => { setPlaying(false); setStep(s); }} aria-label={'step '+s}></button>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   SHM oscillator (9702 · 17.1) — animated mass on a spring + synced sine
   ============================================================ */
function ShmDiagram({ step, setStep }) {
  const [phase, setPhase] = React.useState(0);
  const [playing, setPlaying] = React.useState(true);
  React.useEffect(() => {
    if (!playing) return;
    let raf, last = null;
    const loop = (ts) => {
      if (last == null) last = ts;
      const dt = Math.min(0.05, (ts - last) / 1000); last = ts;
      setPhase(p => p + dt * 1.7);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const W = 460, H = 340;
  const wallX = 24, my = 88, xEq = 252, A = 116, half = 22;
  const massX = xEq + A * Math.cos(phase);
  // spring zigzag
  const segs = 14, x0 = wallX, x1 = massX - half;
  let d = `M${x0},${my} L${x0+10},${my}`;
  for (let i = 0; i < segs; i++) {
    const px = x0 + 14 + (i + 0.5) / segs * (x1 - x0 - 24);
    d += ` L${px},${my + (i % 2 ? 13 : -13)}`;
  }
  d += ` L${x1-6},${my} L${x1},${my}`;
  // graph
  const gx0 = 50, gx1 = 432, gy = 252, gA = 52, cycles = 4 * Math.PI;
  let curve = '';
  for (let i = 0; i <= 120; i++) {
    const tt = i / 120 * cycles;
    const gx = gx0 + (tt / cycles) * (gx1 - gx0);
    const gyy = gy - gA * Math.cos(tt);
    curve += (i === 0 ? 'M' : 'L') + gx.toFixed(1) + ',' + gyy.toFixed(1) + ' ';
  }
  const ph = ((phase % cycles) + cycles) % cycles;
  const dotX = gx0 + (ph / cycles) * (gx1 - gx0);
  const dotY = gy - gA * Math.cos(ph);
  const dispLeft = massX < xEq;
  const formula = step === 1 ? 'a = −ω²x' : step === 2 ? 'x = x₀cos(ωt)' : step === 3 ? 'v_max = ωx₀' : 'T = 2π/ω';

  return (
    <div className="diagram-wrap" data-screen-label="Lesson — SHM diagram">
      <div className="diagram-head">
        <span className="micro" style={{ color: 'var(--ink)' }}>LIVE DIAGRAM</span>
        <span className="diagram-step-label mono">STEP {step} / 4 · {(LESSON_STEP_TITLES.shm[step-1])}</span>
        <button className="diagram-play" onClick={() => setPlaying(p => !p)}>{playing ? '❙❙ pause' : '▶ play'}</button>
      </div>
      <svg className="diagram-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Simple harmonic motion diagram">
        <defs>
          <pattern id="dgs" width="22" height="22" patternUnits="userSpaceOnUse">
            <path d="M22 0H0V22" fill="none" stroke="var(--paper-rule)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect x="0" y="0" width={W} height={H} fill="url(#dgs)" opacity="0.5" />

        {/* wall + ceiling track */}
        <rect x={wallX-10} y={my-40} width="10" height="80" fill="var(--border-strong)" opacity="0.85" />
        <line x1={xEq} y1={my-44} x2={xEq} y2={my+44} stroke="var(--muted)" strokeWidth="1.4" strokeDasharray="4 4" />
        <text x={xEq} y={my-50} textAnchor="middle" className="dg-cap">equilibrium</text>

        {/* spring + mass */}
        <path d={d} fill="none" stroke="var(--acc-violet)" strokeWidth="2.4" strokeLinejoin="round" />
        <rect x={massX-half} y={my-half} width={half*2} height={half*2} rx="4" fill="var(--acc-violet)" fillOpacity="0.9" stroke="var(--border-strong)" strokeWidth="1.5" />
        <text x={massX} y={my+5} textAnchor="middle" fill="var(--surface)" style={{ fontSize: 12, fontWeight: 700 }}>m</text>

        {/* STEP 1 — restoring force arrow */}
        {step === 1 && Math.abs(massX - xEq) > 6 && (
          <g className="dg-layer">
            <line x1={massX} y1={my+38} x2={xEq + (dispLeft ? -4 : 4)} y2={my+38} stroke="var(--red)" strokeWidth="3" />
            <path d={`M${xEq + (dispLeft?-4:4) + (dispLeft?9:-9)},${my+33} L${xEq + (dispLeft?-4:4)},${my+38} L${xEq + (dispLeft?-4:4) + (dispLeft?9:-9)},${my+43}`} fill="none" stroke="var(--red)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <text x={(massX+xEq)/2} y={my+58} textAnchor="middle" className="dg-cap" fill="var(--red)">restoring force → towards equilibrium</text>
          </g>
        )}
        {/* STEP 3 — velocity arrows */}
        {step === 3 && (
          <g className="dg-layer">
            <text x={xEq} y={my+62} textAnchor="middle" className="dg-cap" fill="var(--ink)">fastest at the centre · momentarily still at the ends</text>
          </g>
        )}

        {/* graph axes */}
        <line x1={gx0-6} y1={gy} x2={gx1+6} y2={gy} stroke="var(--muted)" strokeWidth="1.2" />
        <line x1={gx0} y1={gy-gA-14} x2={gx0} y2={gy+gA+14} stroke="var(--muted)" strokeWidth="1.2" />
        <text x={gx1} y={gy+18} textAnchor="end" className="dg-cap">time →</text>
        <text x={gx0+4} y={gy-gA-6} className="dg-cap">x</text>
        <path d={curve} fill="none" stroke="var(--ink)" strokeWidth="2.4" opacity={step===1 ? 0.35 : 1} />
        <circle cx={dotX} cy={dotY} r="6" fill="var(--ink)" stroke="var(--surface)" strokeWidth="2" />

        {/* STEP 4 — period bracket over one cycle */}
        {step === 4 && (
          <g className="dg-layer">
            <line x1={gx0} y1={gy+gA+8} x2={gx0 + (gx1-gx0)/4} y2={gy+gA+8} stroke="var(--amber)" strokeWidth="2.5" />
            <text x={gx0 + (gx1-gx0)/8} y={gy+gA+24} textAnchor="middle" className="dg-cap" fill="var(--amber)">one period T</text>
          </g>
        )}

        <text x="20" y="30" className="dg-formula">{formula}</text>
      </svg>
      <div className="diagram-dots">
        {[1,2,3,4].map(s => (
          <button key={s} className={'dg-dot' + (step===s ? ' on' : '')} onClick={() => setStep(s)} aria-label={'step '+s}></button>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   Velocity–time graph (9702 · 2.1) — gradient = a, area = s
   ============================================================ */
function VtDiagram({ step, setStep }) {
  const W = 460, H = 340;
  const ox = 64, oy = 280, ax = 430, ay = 70; // axes
  const u = 70, v = 200; // pixel heights for u and final v (from axis)
  const yU = oy - u, yV = oy - v;
  const x1 = ax - 10;
  return (
    <div className="diagram-wrap" data-screen-label="Lesson — v-t graph">
      <div className="diagram-head">
        <span className="micro" style={{ color: 'var(--ink)' }}>LIVE DIAGRAM</span>
        <span className="diagram-step-label mono">STEP {step} / 3 · {LESSON_STEP_TITLES.vt[step-1]}</span>
        <span style={{ width: 1 }}></span>
      </div>
      <svg className="diagram-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Velocity-time graph">
        <defs>
          <pattern id="dgv" width="22" height="22" patternUnits="userSpaceOnUse">
            <path d="M22 0H0V22" fill="none" stroke="var(--paper-rule)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect x="0" y="0" width={W} height={H} fill="url(#dgv)" opacity="0.5" />

        {/* STEP 2 — shaded area = displacement */}
        {step === 2 && (
          <polygon points={`${ox},${oy} ${ox},${yU} ${x1},${yV} ${x1},${oy}`} fill="var(--ink)" fillOpacity="0.14" />
        )}

        {/* axes */}
        <line x1={ox} y1={ay} x2={ox} y2={oy} stroke="var(--border-strong)" strokeWidth="1.8" />
        <line x1={ox} y1={oy} x2={ax} y2={oy} stroke="var(--border-strong)" strokeWidth="1.8" />
        <text x={ox-8} y={ay+4} textAnchor="end" className="dg-cap">v</text>
        <text x={ax} y={oy+20} textAnchor="end" className="dg-cap">t</text>

        {/* the velocity line */}
        <line x1={ox} y1={yU} x2={x1} y2={yV} stroke="var(--acc-blue)" strokeWidth="3" />
        <circle cx={ox} cy={yU} r="4" fill="var(--acc-blue)" />
        <circle cx={x1} cy={yV} r="4" fill="var(--acc-blue)" />
        <line x1={ox-5} y1={yU} x2={ox+5} y2={yU} stroke="var(--muted)" strokeWidth="1.4" />
        <text x={ox-10} y={yU+4} textAnchor="end" className="dg-cap">u</text>
        <text x={x1+2} y={yV-6} className="dg-cap" fill="var(--acc-blue)">v</text>

        {/* STEP 1 — gradient triangle */}
        {step === 1 && (
          <g className="dg-layer">
            <line x1={ox} y1={yU} x2={x1} y2={yU} stroke="var(--red)" strokeWidth="2" strokeDasharray="4 3" />
            <line x1={x1} y1={yU} x2={x1} y2={yV} stroke="var(--red)" strokeWidth="2" strokeDasharray="4 3" />
            <text x={(ox+x1)/2} y={yU+18} textAnchor="middle" className="dg-cap" fill="var(--red)">Δt</text>
            <text x={x1+8} y={(yU+yV)/2} className="dg-cap" fill="var(--red)">Δv</text>
            <text x={(ox+x1)/2} y={ay+6} textAnchor="middle" className="dg-cap" fill="var(--red)">gradient = acceleration a = Δv/Δt</text>
          </g>
        )}
        {/* STEP 2 — area label */}
        {step === 2 && (
          <text x={(ox+x1)/2} y={oy-50} textAnchor="middle" className="dg-cap" fill="var(--ink)">area under the line = displacement s</text>
        )}
        {/* STEP 3 — equation */}
        {step === 3 && (
          <text x={(ox+x1)/2} y={ay+6} textAnchor="middle" className="dg-cap">v = u + at · s = ½(u+v)t</text>
        )}

        <text x="20" y="30" className="dg-formula">{step === 1 ? 'a = Δv/Δt' : step === 2 ? 's = area' : 'v = u + at'}</text>
      </svg>
      <div className="diagram-dots">
        {[1,2,3].map(s => (
          <button key={s} className={'dg-dot' + (step===s ? ' on' : '')} onClick={() => setStep(s)} aria-label={'step '+s}></button>
        ))}
      </div>
    </div>
  );
}

const LESSON_STEP_TITLES = {
  shm: ['Restoring force', 'Oscillation', 'Velocity', 'Period'],
  vt: ['Gradient = a', 'Area = s', 'The equations'],
};

function LessonDiagram({ type, step, setStep }) {
  if (type === 'shm') return <ShmDiagram step={step} setStep={setStep} />;
  if (type === 'vt') return <VtDiagram step={step} setStep={setStep} />;
  return <LiveDiagram step={step} setStep={setStep} />;
}

Object.assign(window, { LiveDiagram, ShmDiagram, VtDiagram, LessonDiagram });

