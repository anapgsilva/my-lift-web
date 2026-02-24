// Word-to-number mapping for 0–20
export const WORD_TO_NUM: Record<string, number> = {
  P1: -1, '-1': -1, basement: -1, ground: 0, zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20, 'twenty one': 21,
  'twenty two': 22, 'twenty three': 23, 'twenty four': 24,
  'twenty five': 25, 'twenty six': 26, 'twenty seven': 27,
  'twenty eight': 28, 'twenty nine': 29, 'thirty': 30
}

export const NUM_TO_WORD: Record<number, string> = Object.fromEntries(
  Object.entries(WORD_TO_NUM).map(([w, n]) => [n, w])
)

export const koneApiMapping: Record<string, number> = {
  '-1': 1000,
  '0': 2000,
  '1': 3000,
  '2': 4000,
  '3': 5000,
  '4': 6000,
  '5': 7000,
  '6': 8000,
  '7': 9000,
  '8': 10000,
  '9': 11000,
  '10': 12000,
  '11': 13000,
  '12': 14000,
  '13': 15000,
  '14': 16000,
  '15': 17000,
  '16': 18000,
  '17': 19000,
  '18': 20000,
  '19': 21000,
  '20': 22000,
  '21': 23000,
  '22': 24000,
  '23': 25000,
  '24': 26000,
  '25': 27000,
  '26': 28000,
  '27': 29000,
  '28': 30000,
  '29': 31000,
  '30': 32000,
}