import {
  ExamSheet,
  ExamSheetLine,
  MarginNote,
} from '@/components/margin-notes'

/**
 * Full-bleed marked-paper moment between the interactive demo and pillars.
 * Keeps the story on ink-on-work before feature columns take over.
 */
export function LandingArtefactBeat() {
  return (
    <section className="ms-artefact-beat" aria-labelledby="artefact-beat-heading">
      <div className="ms-artefact-beat__inner">
        <div className="ms-artefact-beat__copy">
          <p className="ms-overline">The artefact</p>
          <h2 id="artefact-beat-heading" className="ms-h2">
            Not a chat transcript. <em>Your script,</em> with ink in the margins.
          </h2>
          <p className="ms-lead">
            Green stamps when the method earns. Crimson when it doesn&apos;t. The same object you
            would get back from a real examiner — except it lands in about a minute.
          </p>
        </div>

        <div className="ms-artefact-beat__stage">
          <div className="ms-artefact-beat__sheet-wrap">
            <MarginNote className="ms-artefact-beat__note" style={{ top: '-28px', left: '8%' }}>
              this is what you keep
            </MarginNote>
            <ExamSheet
              className="ms-artefact-beat__sheet"
              head="Q3 — show that the integral equals 4"
              headRight="9709/11 · p.1"
              tally="3 / 4"
              cite="MS 9709/11 · Q3: M1 substitute · M1 integrate · A1 evaluate · A0 limits"
            >
              <ExamSheetLine work="let u = 2x + 1 → du = 2 dx" mark="M1 ✓" ok stampDelayMs={200} />
              <ExamSheetLine work="∫ (1/2) u⁻¹ du" mark="M1 ✓" ok stampDelayMs={480} />
              <ExamSheetLine work="[½ ln|u|] from 0 to 1" mark="A1 ✓" ok stampDelayMs={760} />
              <ExamSheetLine
                work="= ½ ln 3"
                mark="A0 ✗"
                ok={false}
                note="limits on u: when x=0, u=1 · when x=1, u=3 — but the answer asked was 4"
                stampDelayMs={1040}
              />
            </ExamSheet>
          </div>
        </div>
      </div>
    </section>
  )
}
