type Props = {
  label?: string
}

/** Ruled filing divider between Google and email methods. */
export function AuthDivider({ label = 'or continue with email' }: Props) {
  return <p className="ms-auth-divider">{label}</p>
}
