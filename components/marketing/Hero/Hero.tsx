import { HeroHeadline } from './HeroHeadline'
import { HeroSubhead } from './HeroSubhead'
import { HeroCTAs } from './HeroCTAs'
import { ExaminerInkDemoLazy } from './ExaminerInkDemoLazy'

interface HeroProps {
  primaryHref: string
}

export function Hero({ primaryHref }: HeroProps) {
  return (
    <section aria-labelledby="hero-headline">
      <div>
        <HeroHeadline text="Past papers, marked like an examiner. In minutes." />
        <HeroSubhead>
          Trained on real Cambridge mark schemes. Returns red-pen annotations and
          structured feedback in under a minute. Five questions free, no card.
        </HeroSubhead>
        <HeroCTAs
          primary={{ label: 'Mark your first question free', href: primaryHref }}
          secondary={{ label: 'See how marking works', targetId: 'how-it-works' }}
        />
      </div>
      <div>
        <ExaminerInkDemoLazy />
      </div>
    </section>
  )
}
