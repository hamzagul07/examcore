/**
 * Static “boundary slip” artefact for the /tools desk hero.
 * Visual cousin of ScoreReveal’s tally — no fitness rings, no Lucide.
 */
export function ToolsDeskArtefact() {
  return (
    <aside
      className="ms-tools-artefact"
      aria-label="Example: raw mark 68 holds grade A, two marks from A-star"
    >
      <div className="ms-tools-artefact__head">
        <span className="ms-tools-artefact__kicker">9709 · P1 · MJ26</span>
        <span className="ms-tools-artefact__stamp" aria-hidden>
          A
        </span>
      </div>

      <div className="ms-tools-artefact__figure">
        <span className="ms-tools-artefact__raw">68</span>
        <span className="ms-tools-artefact__of">/ 75</span>
        <span className="ms-tools-artefact__grade">A</span>
      </div>

      <dl className="ms-tools-artefact__rows">
        <div className="ms-tools-artefact__row">
          <dt>Holds</dt>
          <dd>Grade A</dd>
        </div>
        <div className="ms-tools-artefact__row ms-tools-artefact__row--gap">
          <dt>To A*</dt>
          <dd>+2 marks</dd>
        </div>
        <div className="ms-tools-artefact__row">
          <dt>A floor</dt>
          <dd>63</dd>
        </div>
      </dl>

      <p className="ms-tools-artefact__cite" aria-hidden>
        thresholds are ink — grades are earned
      </p>
    </aside>
  )
}
