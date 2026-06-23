/** Turn @user and u/user into markdown profile links before render. */
export function linkifyMentions(md: string): string {
  let out = md.replace(/(?:^|[\s(,])@([a-zA-Z0-9_]{3,20})\b/g, (match, user: string) => {
    const lead = match.slice(0, match.length - user.length - 1)
    return `${lead}[@${user}](/u/${user.toLowerCase()})`
  })
  out = out.replace(/(?:^|[\s(,])u\/([a-zA-Z0-9_]{3,20})\b/gi, (match, user: string) => {
    const lead = match.slice(0, match.length - user.length - 2)
    return `${lead}[u/${user}](/u/${user.toLowerCase()})`
  })
  return out
}
