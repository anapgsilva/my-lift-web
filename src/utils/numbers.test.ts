import { describe, it, expect } from 'vitest'
import { parseNumbers, getRequestId } from './numbers'

describe('numbers', () => {
  describe('parseNumbers', () => {
    it('should extract two numbers from text', () => {
      expect(parseNumbers('from ground to level 25')).toEqual([0, 25])
      expect(parseNumbers('from 5 to 10')).toEqual([5, 10])
      expect(parseNumbers('go from one to twenty')).toEqual([1, 20])
    })

    it('should handle word numbers', () => {
      expect(parseNumbers('from ground to five')).toEqual([0, 5])
      expect(parseNumbers('basement to ten')).toEqual([-1, 10])
      expect(parseNumbers('zero to fifteen')).toEqual([0, 15])
    })

    it('should handle digit numbers', () => {
      expect(parseNumbers('from 0 to 25')).toEqual([0, 25])
    })

    it('should return only first two numbers', () => {
      expect(parseNumbers('from 1 to 2 to 3')).toEqual([1, 2])
    })

    it('should return empty array when no numbers found', () => {
      expect(parseNumbers('hello world')).toEqual([])
    })

    it('should return single number when only one found', () => {
      expect(parseNumbers('go to five')).toEqual([5])
      expect(parseNumbers('level 10')).toEqual([10])
    })

    it('should handle mixed word and digit numbers', () => {
      expect(parseNumbers('from ground to 25')).toEqual([0, 25])
      expect(parseNumbers('from 5 to twenty')).toEqual([5, 20])
    })
  })

  describe('getRequestId', () => {
    it('should return a number', () => {
      const id = getRequestId()
      expect(typeof id).toBe('number')
    })

    it('should return different values on multiple calls', () => {
      const id1 = getRequestId()
      const id2 = getRequestId()
      expect(id1).not.toBe(id2)
    })

    it('should return value within expected range', () => {
      const id = getRequestId()
      expect(id).toBeGreaterThanOrEqual(0)
      expect(id).toBeLessThanOrEqual(4294967295) // Uint32 max (2^32 - 1)
    })
  })
})
