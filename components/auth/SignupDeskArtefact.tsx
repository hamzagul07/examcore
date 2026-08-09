type Props = {
  /** signup = preview ink; signin = return; reset = key slip */
  variant?: 'signup' | 'signin' | 'reset'
}

/** Pinned script slip for the auth desk — ScoreReveal cousin, static. */
export function SignupDeskArtefact({ variant = 'signup' }: Props) {
  const isReturn = variant === 'signin'
  const isReset = variant === 'reset'

  const label = isReset ? 'Key · slip' : isReturn ? 'Return · slip' : 'Preview · ink'
  const stamp = isReset ? 'PW' : isReturn ? 'IN' : 'B1'
  const note = isReset
    ? 'same email — new key for the desk'
    : isReturn
      ? 'pick up the ink where you left it'
      : 'marks land on the line — not a paragraph below'
  const aria = isReset
    ? 'Password reset slip: same email, new key'
    : isReturn
      ? 'Return slip: pick up marking where you left off'
      : 'Sample marked script: method awarded, accuracy missed'

  return (
    <aside className="ms-signup-artefact" aria-label={aria}>
      <div className="ms-signup-artefact__cap">
        <span className="ms-signup-artefact__label">{label}</span>
        <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
          {stamp}
        </span>
      </div>
      <div className="ms-signup-artefact__row">
        <span className="ms-signup-artefact__work" aria-hidden />
        <span className="ms-signup-artefact__badge">{isReset ? 'KEY' : 'M1'}</span>
      </div>
      {isReturn || isReset ? null : (
        <div className="ms-signup-artefact__row">
          <span className="ms-signup-artefact__work short" aria-hidden />
          <span className="ms-signup-artefact__badge ms-signup-artefact__badge--bad">A0</span>
        </div>
      )}
      <p className="ms-signup-artefact__note" aria-hidden>
        {note}
      </p>
    </aside>
  )
}
