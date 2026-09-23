import { NextRequest, NextResponse } from 'next/server'
import { getCreatorByCode } from '@/lib/creators/service'

/**
 * Public lookup: is this code live, and whose is it? The mark page calls it
 * when a follower types or arrives with a code. Only fields the creator's
 * public space already shows.
 */
export async function GET(_request: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params
  const creator = await getCreatorByCode(code)
  if (!creator) {
    return NextResponse.json({ creator: null }, { status: 404 })
  }
  return NextResponse.json(
    {
      creator: {
        handle: creator.handle,
        displayName: creator.displayName,
        code: creator.code,
        giftMarks: creator.giftMarks,
        tagline: creator.tagline,
      },
    },
    { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60' } }
  )
}
