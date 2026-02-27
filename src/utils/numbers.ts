import { FoundNumber } from "../types/speechRecognition"
import { WORD_TO_NUM } from "./mapping"

/** Extract up to two numbers (0–20) from a transcript string */
export function parseNumbers(text: string): number[] {
  const lower = text.toLowerCase()
  const found: FoundNumber[] = []

  // Match written-out number words
  const wordPattern = /\b(basement|ground|zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|twenty-one|twenty-two|twenty-three|twenty-four|twenty-five|twenty-six|twenty-seven|twenty-eight|twenty-nine|thirty)\b/g
  let match: RegExpExecArray | null
  while ((match = wordPattern.exec(lower)) !== null) {
    found.push({ index: match.index, value: WORD_TO_NUM[match[1]] })
  }

  // Match digit numbers -1 to 30
  const digitPattern = /\b(-1|[0-9]|[12][0-9]|30)\b/g
  while ((match = digitPattern.exec(lower)) !== null) {
    const num = parseInt(match[1], 10)
    if (num >= -1 && num <= 30) {
      if (!found.some((f) => f.index === match!.index)) {
        found.push({ index: match.index, value: num })
      }
    }
  }
  found.sort((a, b) => a.index - b.index)
  return found.slice(0, 2).map((f) => f.value)
}

export function getRequestId() {
  return Math.floor(Math.random() * 1000000000)
}