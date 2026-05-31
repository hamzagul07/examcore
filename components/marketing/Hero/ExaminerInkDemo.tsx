'use client'

import { demoQuestion } from './demo-data'

export function ExaminerInkDemo() {
  return (
    <figure
      role="img"
      aria-label="Demonstration of Examcore marking a Physics past paper question, earning 3 out of 4 marks"
      className="relative rounded-[16px] border border-[var(--ec-border)] bg-[var(--ec-surface-raised)] p-6 md:p-10"
    >
      <p className="text-[var(--ec-text-secondary)]">{demoQuestion.subjectCode}</p>
      <p className="mt-3 text-[var(--ec-text-primary)]">{demoQuestion.question}</p>
      <ul className="mt-6 space-y-[1.05em]">
        {demoQuestion.answer.map((line) => (
          <li
            key={line.id}
            className="font-[family-name:var(--ec-font-handwriting)] text-[var(--ec-text-primary)]"
          >
            {line.text}
          </li>
        ))}
      </ul>
    </figure>
  )
}
