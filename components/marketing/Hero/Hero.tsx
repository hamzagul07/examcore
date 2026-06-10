import { HeroCopy } from './HeroCopy'
import { HeroHeadline } from './HeroHeadline'
import { HeroSubhead } from './HeroSubhead'
import { HeroCTAs } from './HeroCTAs'
import { ExaminerInkDemoLazy } from './ExaminerInkDemoLazy'

interface HeroProps {
  primaryHref: string
  /** When true, renders inside another section (e.g. how-it-works) without full-page hero chrome */
  embedded?: boolean
}

export function Hero({ primaryHref, embedded = false }: HeroProps) {
  const Root = embedded ? 'div' : 'section'
  return (
    <Root
      aria-labelledby="hero-headline"
      className={
        embedded
          ? 'pt-4'
          : 'pt-24 pb-24 md:pt-32 md:pb-36'
      }
    >
      <div className="mx-auto max-w-[640px] px-6 text-center md:max-w-[720px] md:px-8 lg:max-w-[860px]">
        <HeroCopy
          headline={
            <HeroHeadline text="Past papers, marked like an examiner. In minutes." />
          }
          subhead={
            <HeroSubhead>
              Trained on real Cambridge mark schemes. Returns red-pen annotations
              and structured feedback in under a minute. Five questions free, no
              card.
            </HeroSubhead>
          }
          ctas={
            <HeroCTAs
              primary={{
                label: 'Mark your first question free',
                href: primaryHref,
              }}
              secondary={{
                label: 'See how marking works',
                targetId: 'how-it-works',
              }}
            />
          }
        />
      </div>
      <div className="mx-auto mt-16 max-w-[920px] px-4 md:mt-24 md:px-8">
        <ExaminerInkDemoLazy />
      </div>
    </Root>
  )
}
