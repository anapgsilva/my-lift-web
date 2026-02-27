import { describe, it, expect } from 'vitest'
import { WORD_TO_NUM, NUM_TO_WORD, koneApiMapping } from './mapping'

describe('mapping', () => {
  describe('WORD_TO_NUM', () => {
    it('should map word to number correctly', () => {
      expect(WORD_TO_NUM['ground']).toBe(0)
      expect(WORD_TO_NUM['one']).toBe(1)
      expect(WORD_TO_NUM['ten']).toBe(10)
      expect(WORD_TO_NUM['twenty']).toBe(20)
      expect(WORD_TO_NUM['basement']).toBe(-1)
    })

    it('should handle special cases', () => {
      expect(WORD_TO_NUM['P1']).toBe(-1)
      expect(WORD_TO_NUM['-1']).toBe(-1)
      expect(WORD_TO_NUM['zero']).toBe(0)
    })
  })

  describe('NUM_TO_WORD', () => {
    it('should map number to word correctly', () => {
      expect(NUM_TO_WORD[0]).toBeDefined()
      expect(NUM_TO_WORD[1]).toBe('one')
      expect(NUM_TO_WORD[10]).toBe('ten')
      expect(NUM_TO_WORD[-1]).toBeDefined()
    })
  })

  describe('koneApiMapping', () => {
    it('should map floor numbers to API values', () => {
      expect(koneApiMapping['-1']).toBe(1000)
      expect(koneApiMapping['0']).toBe(2000)
      expect(koneApiMapping['1']).toBe(3000)
      expect(koneApiMapping['25']).toBe(27000)
    })

    it('should have sequential mapping', () => {
      expect(koneApiMapping['1']).toBe(3000)
      expect(koneApiMapping['2']).toBe(4000)
      expect(koneApiMapping['3']).toBe(5000)
    })
  })
})
