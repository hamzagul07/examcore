import * as Sentry from '@sentry/nextjs'
import { sentryBaseOptions } from '@/lib/sentry/options'

Sentry.init({
  ...sentryBaseOptions,
  integrations: [Sentry.replayIntegration()],
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: process.env.NODE_ENV === 'production' ? 0.25 : 0,
})
