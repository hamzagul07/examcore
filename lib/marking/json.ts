import { jsonrepair } from 'jsonrepair'

export function extractJSON(text: string): unknown {
  const jsonMatch =
    text.match(/```json\n([\s\S]*?)\n```/) ||
    text.match(/```\n([\s\S]*?)\n```/) ||
    text.match(/{[\s\S]*}/)

  const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text

  try {
    return JSON.parse(jsonString)
  } catch (firstError) {
    try {
      const repaired = jsonrepair(jsonString)
      return JSON.parse(repaired)
    } catch {
      throw firstError
    }
  }
}
