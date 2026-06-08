'use client'

import { Columns2 } from 'lucide-react'
import { CourseRichText } from '@/components/courses/CourseRichText'
import { VisualSectionFrame } from '@/components/courses/visuals/VisualSectionFrame'

type Row = { property: string; cells: string[] }

export function ComparisonTableVisual({
  title,
  caption,
  columns,
  rows,
}: {
  title: string
  caption?: string
  columns: string[]
  rows: Row[]
}) {
  const dataCols = columns.slice(1)

  return (
    <VisualSectionFrame
      title={title}
      hint="Compare key properties side by side — ideal for exam contrasts."
      icon={Columns2}
      accent="brand"
      className="course-comparison-table-section"
    >
      {caption ? (
        <p className="course-comparison-caption">{caption}</p>
      ) : null}

      <div className="course-comparison-table-wrap">
        <table className="course-comparison-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col} scope="col">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.property}>
                <th scope="row" className="course-comparison-property">
                  {row.property}
                </th>
                {row.cells.map((cell, i) => (
                  <td key={`${row.property}-${i}`}>
                    <CourseRichText content={cell} variant="inline" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="course-comparison-cards">
        {rows.map((row) => (
          <article key={row.property} className="course-comparison-card">
            <h3 className="course-comparison-card-title">{row.property}</h3>
            {dataCols.map((col, i) => (
              <div key={`${row.property}-${col}`} className="course-comparison-card-row">
                <p className="course-comparison-card-label">{col}</p>
                <div className="course-comparison-card-value">
                  <CourseRichText content={row.cells[i] ?? ''} variant="inline" />
                </div>
              </div>
            ))}
          </article>
        ))}
      </div>
    </VisualSectionFrame>
  )
}
