/** Reset window scroll — run again on the next frames to beat browser / Next.js restoration. */
export function scrollPageToTop() {
  if (typeof window === 'undefined') return

  const reset = () => {
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }

  reset()
  requestAnimationFrame(() => {
    reset()
    requestAnimationFrame(reset)
  })
}
