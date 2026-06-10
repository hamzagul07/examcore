// page-account.jsx — account & settings

function AccountPage({ go }) {
  const [subs, setSubs] = React.useState(['9709 Mathematics', '9702 Physics']);
  const [emails, setEmails] = React.useState({ weekly: true, marked: true, tips: false });
  const flip = (k) => setEmails(e => ({ ...e, [k]: !e[k] }));

  return (
    <main className="pg" style={{ paddingTop: 56, maxWidth: 980 }} data-screen-label="Account settings">
      <p className="overline">Account</p>
      <h2 className="h2">Your account, <em>your terms.</em></h2>

      <div className="acct-grid">
        <div className="card card-pad" data-screen-label="Account — profile">
          <p className="overline" style={{ marginBottom: 14 }}>Profile</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="field"><label>Name</label><input className="input" defaultValue="Hamza" /></div>
            <div className="field"><label>Email</label><input className="input" defaultValue="hamza@example.com" /></div>
            <div className="field">
              <label>Exam session</label>
              <select className="select" defaultValue="mj26"><option value="mj26">May/June 2026</option><option value="on26">Oct/Nov 2026</option></select>
            </div>
          </div>
        </div>

        <div className="card card-pad" data-screen-label="Account — plan">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <p className="overline" style={{ marginBottom: 14 }}>Plan</p>
            <span className="chip ok">Student · £4.99/mo</span>
          </div>
          <p className="body-2">Founding member — 50% off forever is locked in.</p>
          <div className="usage">
            <div className="u-row"><span>Whole papers this month</span><span className="mono" style={{ fontSize: 12 }}>2 / 4</span></div>
            <div className="prog-track" style={{ marginTop: 0 }}><div className="prog-fill" style={{ width: '50%' }}></div></div>
            <div className="u-row" style={{ marginTop: 12 }}><span>Single questions</span><span className="mono" style={{ fontSize: 12 }}>UNLIMITED ✓</span></div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
            <button className="btn-ghost sm" onClick={() => go('pricing')}>Change plan</button>
            <button className="btn-underline" style={{ fontSize: 14 }}>Billing history</button>
          </div>
        </div>

        <div className="card card-pad" data-screen-label="Account — subjects">
          <p className="overline" style={{ marginBottom: 6 }}>Your subjects</p>
          <p className="body-2">These drive your dashboard, courses and paper suggestions.</p>
          <div className="acct-chiprow">
            {subs.map(s => (
              <button key={s} className="ob-chip on" onClick={() => setSubs(x => x.filter(y => y !== s))}>{s} ✕</button>
            ))}
            <button className="ob-chip" onClick={() => go('subjects')}>+ add subject</button>
          </div>
        </div>

        <div className="card card-pad" data-screen-label="Account — emails">
          <p className="overline" style={{ marginBottom: 6 }}>Email me about</p>
          {[
            ['weekly', 'Weekly progress digest'],
            ['marked', 'When a whole paper finishes marking'],
            ['tips', 'Exam-technique tips from the guides'],
          ].map(([k, label]) => (
            <div key={k} className="canct-item" style={{ cursor: 'pointer' }} onClick={() => flip(k)}>
              <span className="m" style={{ color: emails[k] ? 'var(--ink)' : 'var(--muted)' }}>{emails[k] ? '✓' : '○'}</span>
              <span style={{ color: emails[k] ? 'var(--text)' : 'var(--text-2)' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card card-pad" style={{ marginTop: 18, background: 'var(--bg-soft)' }}>
        <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
          <p className="body-2" style={{ flex: 1, minWidth: 260 }}>
            <b style={{ color: 'var(--text)' }}>Your data:</b> uploaded scripts are yours. Delete any attempt — or everything — anytime.
            We never train models on your work without asking.
          </p>
          <button className="btn-underline" style={{ fontSize: 14 }}>Export my data</button>
          <button className="btn-underline" style={{ fontSize: 14, borderBottomColor: 'var(--red)', color: 'var(--red)' }}>Delete account</button>
        </div>
      </div>

      <p className="micro" style={{ marginTop: 26 }}>SIGNED IN AS HAMZA · <button className="btn-underline" style={{ fontSize: 12, fontFamily: 'IBM Plex Mono, monospace' }} onClick={() => go('landing')}>SIGN OUT</button></p>
    </main>
  );
}

Object.assign(window, { AccountPage });
