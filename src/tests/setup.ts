import { vi } from 'vitest'

const localStorageMock = {
  getItem: vi.fn((key: string) => localStorageMock.store[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageMock.store[key] = value
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageMock.store[key]
  }),
  clear: vi.fn(() => {
    localStorageMock.store = {}
  }),
  store: {} as Record<string, string>
}

const speechSynthesisMock = {
  cancel: vi.fn(),
  speak: vi.fn(),
  getVoices: vi.fn(() => []),
  onvoiceschanged: null
}

class SpeechSynthesisUtteranceMock {
  text = ''
  rate = 1
  voice: SpeechSynthesisVoice | null = null
  onend: ((event: any) => void) | null = null
  onerror: ((event: any) => void) | null = null
  
  constructor(text: string) {
    this.text = text
  }
}

class SpeechRecognitionMock {}

global.localStorage = localStorageMock as any
global.speechSynthesis = speechSynthesisMock as any
global.SpeechSynthesisUtterance = SpeechSynthesisUtteranceMock as any
;(global as any).SpeechRecognition = SpeechRecognitionMock
;(global as any).webkitSpeechRecognition = SpeechRecognitionMock
