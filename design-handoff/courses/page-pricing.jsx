// page-pricing.jsx — /pricing : free vs founding plan

const PLANS = [
  {
    name: 'Free', price: '£0', per: 'forever', tag: 'No card required',
    blurb: 'Everything you need to start marking and learning.',
    cta: 'Start free', primary: false,
    features: [
      ['All 15 free courses', true],
      ['Visual lessons + flashcards', true],
      ['Mark up to 10 questions / day', true],
      ['Whole paper: first 3 questions', true],
      ['Mark-by-mark official scheme', true],
      ['Projected grade estimates', false],
      ['Unlimited whole-paper marking', false],
    ],
  },
  {
    name: 'Plus', price: '£3.50', was: '£7', per: '/ month', tag: 'Founding members · 50% off forever',
    blurb: 'For students sitting real exams who want every mark.',
    cta: 'Become a founding member', primary: true,
    features: [
      ['All 15 free courses', true],
      ['Visual lessons + flashcards', true],
      ['Unlimited daily marking', true],
      ['Whole paper: up to 15 questions', true],
      ['Mark-by-mark official scheme', true],
      ['Projected grade estimates', true],
      ['Priority marking + study chat', true],
    ],
  },
];

function PricingPage({ go }) {
  return (
    <main className="pricing-page" data-screen-label="Pricing">
      <div className="pg">
        <Breadcrumb items={[{ label: 'Home', go: () => go('catalog') }, { label: 'Pricing' }]} />
        <header className="pricing-hero">
          <p className="overline">Pricing · honest &amp; student-first</p>
          <h1 className="h-display" style={{ fontSize: 'clamp(38px,5vw,64px)' }}>The courses are <em>free.</em><br/>Always.</h1>
          <p className="lead" style={{ marginTop: 16 }}>
            Every course, lesson and flashcard is free forever. Plus unlocks unlimited marking and projected
            grades — and founding members lock in <InkScribble>50% off, forever</InkScribble>.
          </p>
        </header>

        <div className="plans">
          {PLANS.map(p => (
            <div key={p.name} className={'plan card' + (p.primary ? ' featured' : '')} data-screen-label={'Pricing — ' + p.name}>
              {p.primary && <span className="plan-ribbon mono">MOST POPULAR</span>}
              <p className="plan-tag mono">{p.tag}</p>
              <h3 className="plan-name serif">{p.name}</h3>
              <div className="plan-price">
                {p.was && <span className="plan-was">{p.was}</span>}
                <span className="plan-now serif">{p.price}</span>
                <span className="plan-per">{p.per}</span>
              </div>
              <p className="body-2 plan-blurb">{p.blurb}</p>
              <button className={p.primary ? 'btn-primary' : 'btn-ghost'} style={{ width: '100%', justifyContent: 'center' }} onClick={() => go('catalog')}>{p.cta}</button>
              <ul className="plan-feats">
                {p.features.map((f, i) => (
                  <li key={i} className={f[1] ? 'yes' : 'no'}>
                    <span className="feat-mark">{f[1] ? '✓' : '—'}</span><span>{f[0]}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pricing-faqs">
          <h2 className="h3" style={{ marginBottom: 14 }}>Honest answers</h2>
          {[
            { q: 'Are the courses really free?', a: 'Yes — all 15 courses, every lesson, flashcards and exam tips are free forever, no card required. Plus only adds unlimited marking and projected grades.' },
            { q: 'What does “founding member” mean?', a: 'Sign up while we’re young and your 50% discount is locked in for as long as you keep your subscription — even after prices rise.' },
            { q: 'Is the marking really the official scheme?', a: 'We mark against the real Cambridge mark scheme for that exact question — B1/M1/A1, MCQ keys, essay bands — not a generic AI guess. We’re honest where AI is uncertain.' },
          ].map((f, i) => <Faq key={i} f={f} />)}
        </div>

        <p className="micro" style={{ textAlign: 'center', marginTop: 30 }}>FREE TIER AVAILABLE · FOUNDING MEMBERS GET 50% OFF FOREVER · NOT ENDORSED BY CAMBRIDGE INTERNATIONAL</p>
      </div>
    </main>
  );
}

Object.assign(window, { PricingPage });
