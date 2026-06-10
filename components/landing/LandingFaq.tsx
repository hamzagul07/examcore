'use client'

import { useState } from 'react'

const FAQS = [
  {
    q: 'Is this just ChatGPT grading my work?',
    a: "No. Every question is marked against the official Cambridge mark scheme for that exact paper — B1/M1/A1 codes, MCQ keys, essay band descriptors. The AI applies the scheme; it doesn't invent a grade. We're honest about its limits, too.",
  },
  {
    q: 'Does it read handwriting?',
    a: 'Yes — photos, camera captures, and PDFs of handwritten work, including multi-page scripts. Messy working is fine; if a line is genuinely illegible we tell you instead of guessing.',
  },
  {
    q: 'Which subjects are covered?',
    a: '15 Cambridge syllabuses across A-Level and O-Level: maths (9709), physics (9702), chemistry (9701), biology (9700), economics, business, computer science, English and more.',
  },
  {
    q: 'What does it cost?',
    a: 'Single-question marking has a free tier — no card. Paid plans add whole-paper marking and deeper analytics. The courses are 100% free, forever.',
  },
  {
    q: 'Is MarkScheme affiliated with Cambridge?',
    a: "No. It's an independent study tool built by a student. Mark schemes are used for educational reference; we're not endorsed by Cambridge International.",
  },
]

export function LandingFaq() {
  const [openIndex, setOpenIndex] = useState(0)

  return (
    <section id="faq" className="ms-sec scroll-mt-20">
      <div className="ms-pg" style={{ maxWidth: 860 }}>
      <p className="ms-overline">Questions</p>
      <h2 className="ms-h2">
        Fair questions, <em>straight answers.</em>
      </h2>
      <div className="ms-faq-list">
        {FAQS.map((item, i) => {
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
                style={{ maxHeight: open ? '200px' : '0px' }}
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
