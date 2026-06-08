import { CheckCircle2 } from 'lucide-react'
import { CourseRichText } from '@/components/courses/CourseRichText'

export function CourseKeyTakeaways({ items }: { items: string[] }) {
  if (!items.length) return null

  return (
    <section className="course-key-takeaways" aria-labelledby="key-takeaways-heading">
      <div className="course-key-takeaways-header">
        <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden />
        <div>
          <h2 id="key-takeaways-heading" className="course-key-takeaways-title">
            Key takeaways
          </h2>
          <p className="course-key-takeaways-hint">
            Review these before you close the topic — retrieval beats re-reading.
          </p>
        </div>
      </div>
      <ul className="course-key-takeaways-list">
        {items.map((item, i) => (
          <li key={`${item.slice(0, 32)}-${i}`}>
            <CourseRichText content={item} variant="inline" />
          </li>
        ))}
      </ul>
    </section>
  )
}
