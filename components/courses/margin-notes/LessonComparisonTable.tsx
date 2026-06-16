'use client'

import { CourseRichText } from '@/components/courses/CourseRichText'
import type { LessonComparisonTable } from '@/lib/courses/margin-notes/types'

export function LessonComparisonTable({ table }: { table: LessonComparisonTable }) {
  const dataCols = table.columns.slice(1)

  return (
    <div className="cmp-table-block">
      {table.caption ? (
        <div className="body-2 cmp-caption">
          <CourseRichText content={table.caption} variant="prose" breakAnywhere={false} />
        </div>
      ) : null}
      <div className="cmp-table-wrap">
        <table className="cmp-table">
          <thead>
            <tr>
              {table.columns.map((col) => (
                <th key={col} scope="col">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row) => (
              <tr key={row.property}>
                <th scope="row" className="cmp-prop">
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
      <div className="cmp-cards">
        {table.rows.map((row) => (
          <article key={row.property} className="cmp-card card card-pad">
            <h3 className="cmp-card-title serif">{row.property}</h3>
            {dataCols.map((col, i) => (
              <div key={`${row.property}-${col}`} className="cmp-card-row">
                <p className="micro cmp-card-label">{col}</p>
                <div className="body-2 cmp-card-value">
                  <CourseRichText content={row.cells[i] ?? ''} variant="inline" />
                </div>
              </div>
            ))}
          </article>
        ))}
      </div>
    </div>
  )
}
