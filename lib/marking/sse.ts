export function formatSseEvent(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`
}

export const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
} as const
