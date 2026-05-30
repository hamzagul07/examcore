import type { Metadata } from 'next'
import { SITE_NAME, SITE_URL } from '@/lib/site-config'

type PageMetadataOptions = {
  title: string
  description: string
  path: string
}

export function createPageMetadata({
  title,
  description,
  path,
}: PageMetadataOptions): Metadata {
  const pageTitle = title.includes(SITE_NAME)
    ? title.replace(new RegExp(`\\s*—\\s*${SITE_NAME}\\s*$`), '')
    : title
  const url = `${SITE_URL}${path}`

  return {
    title: pageTitle,
    description,
    openGraph: {
      title: pageTitle.includes(SITE_NAME) ? pageTitle : `${pageTitle} — ${SITE_NAME}`,
      description,
      url,
      siteName: SITE_NAME,
      type: 'website',
      locale: 'en_GB',
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle.includes(SITE_NAME) ? pageTitle : `${pageTitle} — ${SITE_NAME}`,
      description,
    },
    alternates: {
      canonical: url,
    },
  }
}
