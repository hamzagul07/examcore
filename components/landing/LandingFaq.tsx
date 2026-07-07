'use client'

import { useState } from 'react'
import { LANDING_PAGE_FAQ } from '@/lib/seo/landing-faq'

export function LandingFaq() {
  const [openIndex, setOpenIndex] = useState(0)

  return (
    <section id="faq" className="ms-sec scroll-mt-20">
      <div className="ms-pg" style={{ maxWidth: 860 }}>
        <p className="ms-overline">Questions</p>
        <h2 className="ms-h2">
          Fair questions, <em>straight answers.</em>
        </h2>
        <div className="ms-faq-list landing-faq">
          {LANDING_PAGE_FAQ.map((item, i) => {
            const open = openIndex === i
            return (
              <div key={item.q} className="ms-faq-item">
                <button
                  type="button"
                  className="ms-faq-q"
                  aria-expanded={open}
                  onClick={() => setOpenIndex(open ? -1 : i)}
                >
                  <span>{item.q}</span>
                  <span className="ms-pm">{open ? '−' : '+'}</span>
                </button>
                <div
                  className="ms-faq-a"
                  style={{ maxHeight: open ? '320px' : '0px' }}
                  hidden={!open}
                >
                  {open ? <p className="ms-body-2">{item.a}</p> : null}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
