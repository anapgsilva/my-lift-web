import { describe, it, expect, beforeEach, vi } from 'vitest'
import { speak, getSpeechRecognition } from './speech'

describe('speech', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('speak', () => {
    it('should create utterance with text and rate', async () => {
      const speakSpy = vi.spyOn(window.speechSynthesis, 'speak')
      
      speak('test message')
      
      expect(speakSpy).toHaveBeenCalledOnce()
      const utterance = speakSpy.mock.calls[0][0]
      expect(utterance.text).toBe('test message')
      expect(utterance.rate).toBe(1)
    })

    it('should resolve when utterance ends', async () => {
      const speakSpy = vi.spyOn(window.speechSynthesis, 'speak')
      
      const promise = speak('test')
      const utterance = speakSpy.mock.calls[0][0]
      utterance.onend?.(new Event('end') as any)
      
      await expect(promise).resolves.toBeUndefined()
    })

    it('should resolve when utterance errors', async () => {
      const speakSpy = vi.spyOn(window.speechSynthesis, 'speak')
      
      const promise = speak('test')
      const utterance = speakSpy.mock.calls[0][0]
      utterance.onerror?.(new Event('error') as any)
      
      await expect(promise).resolves.toBeUndefined()
    })

    it('should use saved voice from localStorage', () => {
      const mockVoice = { name: 'Test Voice' } as SpeechSynthesisVoice
      vi.spyOn(window.speechSynthesis, 'getVoices').mockReturnValue([mockVoice])
      localStorage.setItem('selectedVoice', 'Test Voice')
      const speakSpy = vi.spyOn(window.speechSynthesis, 'speak')
      
      speak('test')
      
      const utterance = speakSpy.mock.calls[0][0]
      expect(utterance.voice).toBe(mockVoice)
    })

    it('should not set voice when savedVoice not found', () => {
      vi.spyOn(window.speechSynthesis, 'getVoices').mockReturnValue([])
      localStorage.setItem('selectedVoice', 'Nonexistent Voice')
      const speakSpy = vi.spyOn(window.speechSynthesis, 'speak')
      
      speak('test')
      
      const utterance = speakSpy.mock.calls[0][0]
      expect(utterance.voice).toBeNull()
    })
  })

  describe('getSpeechRecognition', () => {
    it('should return SpeechRecognition when available', () => {
      const result = getSpeechRecognition()
      
      expect(result).toBe(window.SpeechRecognition)
    })

    it('should return webkitSpeechRecognition when SpeechRecognition unavailable', () => {
      const original = window.SpeechRecognition
      delete (window as any).SpeechRecognition
      
      const result = getSpeechRecognition()
      
      expect(result).toBe(window.webkitSpeechRecognition)
      window.SpeechRecognition = original
    })

    it('should return null when neither available', () => {
      const originalSR = window.SpeechRecognition
      const originalWSR = window.webkitSpeechRecognition
      delete (window as any).SpeechRecognition
      delete (window as any).webkitSpeechRecognition
      
      const result = getSpeechRecognition()
      
      expect(result).toBeNull()
      window.SpeechRecognition = originalSR
      window.webkitSpeechRecognition = originalWSR
    })
  })
})
