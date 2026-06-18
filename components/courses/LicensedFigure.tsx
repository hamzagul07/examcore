import Image from 'next/image'

/**
 * Renders an openly-licensed figure (OpenStax, Wikimedia Commons, PLOS, etc.)
 * with a required attribution line. Use ONLY for content under a license that
 * permits reuse (CC0, CC BY, CC BY-SA, public domain). Never for copyrighted
 * material (textbooks, Save My Exams, PMT, Google Images).
 */
export type FigureLicense = {
  /** e.g. "CC BY 4.0", "CC BY-SA 3.0", "CC0", "Public domain" */
  name: string
  /** Link to the license deed. */
  href?: string
}

export type LicensedFigureProps = {
  src: string
  alt: string
  /** Caption describing the figure (what it shows). */
  caption?: string
  /** Where it came from, e.g. "OpenStax Biology 2e". */
  source: string
  sourceHref?: string
  /** Original author/creator, if named. */
  author?: string
  license: FigureLicense
  width?: number
  height?: number
  /** Tweaks applied to the source figure, required to disclose under CC BY-SA. */
  modified?: boolean
}

export function LicensedFigure({
  src,
  alt,
  caption,
  source,
  sourceHref,
  author,
  license,
  width = 960,
  height = 600,
  modified,
}: LicensedFigureProps) {
  return (
    <figure className="licensed-figure" data-screen-label="Lesson — figure">
      <div className="licensed-figure-frame">
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          className="licensed-figure-img"
          sizes="(max-width: 760px) 100vw, 760px"
        />
      </div>
      {caption ? <figcaption className="licensed-figure-caption body-2">{caption}</figcaption> : null}
      <p className="licensed-figure-credit micro">
        {modified ? 'Adapted from ' : 'Source: '}
        {sourceHref ? (
          <a href={sourceHref} target="_blank" rel="noopener noreferrer">{source}</a>
        ) : (
          source
        )}
        {author ? ` by ${author}` : ''}
        {' · '}
        {license.href ? (
          <a href={license.href} target="_blank" rel="noopener noreferrer">{license.name}</a>
        ) : (
          license.name
        )}
      </p>
    </figure>
  )
}
