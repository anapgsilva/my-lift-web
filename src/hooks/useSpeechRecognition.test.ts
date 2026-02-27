import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import * as speech from '../utils/speech'
import * as numbers from '../utils/numbers'

vi.mock('../utils/speech')
vi.mock('../utils/numbers')

describe('useSpeechRecognition', () => {
  let mockRecognition: any
  let setStatus: any
  let setTranscript: any
  let setNumbers: any
  let setSpokenText: any
  let showError: any
  let sendMessage: any

  beforeEach(() => {
    setStatus = vi.fn()
    setTranscript = vi.fn()
    setNumbers = vi.fn()
    setSpokenText = vi.fn()
    showError = vi.fn()
    sendMessage = vi.fn()

    mockRecognition = {
      lang: '',
      interimResults: false,
      maxAlternatives: 1,
      continuous: false,
      onstart: null,
      onresult: null,
      onerror: null,
      onend: null,
      start: vi.fn(),
      stop: vi.fn(),
    }

    const MockSpeechRecognition = vi.fn(() => mockRecognition) as any
    
    vi.mocked(speech.getSpeechRecognition).mockReturnValue(MockSpeechRecognition)
    vi.mocked(speech.speak).mockResolvedValue()
    vi.mocked(numbers.parseNumbers).mockReturnValue([0, 5])
  })

  it('should return startListening and stopListening functions', () => {
    const { result } = renderHook(() =>
      useSpeechRecognition(setStatus, setTranscript, setNumbers, setSpokenText, showError, sendMessage)
    )

    expect(result.current.startListening).toBeDefined()
    expect(result.current.stopListening).toBeDefined()
  })

  it('should set status to unsupported when speech recognition is not available', () => {
    vi.mocked(speech.getSpeechRecognition).mockReturnValue(null)

    const { result } = renderHook(() =>
      useSpeechRecognition(setStatus, setTranscript, setNumbers, setSpokenText, showError, sendMessage)
    )

    act(() => {
      result.current.startListening()
    })

    expect(setStatus).toHaveBeenCalledWith('unsupported')
  })

  it('should start speech recognition when startListening is called', () => {
    const { result } = renderHook(() =>
      useSpeechRecognition(setStatus, setTranscript, setNumbers, setSpokenText, showError, sendMessage)
    )

    act(() => {
      result.current.startListening()
    })

    expect(mockRecognition.start).toHaveBeenCalled()
    expect(mockRecognition.lang).toBe('en-US')
  })

  it('should set status to listening when recognition starts', () => {
    const { result } = renderHook(() =>
      useSpeechRecognition(setStatus, setTranscript, setNumbers, setSpokenText, showError, sendMessage)
    )

    act(() => {
      result.current.startListening()
    })

    act(() => {
      mockRecognition.onstart()
    })

    expect(setStatus).toHaveBeenCalledWith('listening')
    expect(setTranscript).toHaveBeenCalledWith('')
    expect(setNumbers).toHaveBeenCalledWith([])
  })

  it('should process transcript and send message when two numbers detected', () => {
    vi.mocked(numbers.parseNumbers).mockReturnValue([0, 25])

    const { result } = renderHook(() =>
      useSpeechRecognition(setStatus, setTranscript, setNumbers, setSpokenText, showError, sendMessage)
    )

    act(() => {
      result.current.startListening()
    })

    const mockEvent = {
      results: [[{ transcript: 'from ground to 25' }]]
    } as any

    act(() => {
      mockRecognition.onresult(mockEvent)
    })

    expect(setTranscript).toHaveBeenCalledWith('from ground to 25')
    expect(setStatus).toHaveBeenCalledWith('processing')
    expect(sendMessage).toHaveBeenCalledWith([0, 25])
  })

  it('should set error when no numbers detected', () => {
    vi.mocked(numbers.parseNumbers).mockReturnValue([])

    const { result } = renderHook(() =>
      useSpeechRecognition(setStatus, setTranscript, setNumbers, setSpokenText, showError, sendMessage)
    )

    act(() => {
      result.current.startListening()
    })

    const mockEvent = {
      results: [[{ transcript: 'hello world' }]]
    } as any

    act(() => {
      mockRecognition.onresult(mockEvent)
    })

    expect(showError).toHaveBeenCalledWith('Please try again. No numbers were detected.')
  })

  it('should set error when only one number detected', () => {
    vi.mocked(numbers.parseNumbers).mockReturnValue([5])

    const { result } = renderHook(() =>
      useSpeechRecognition(setStatus, setTranscript, setNumbers, setSpokenText, showError, sendMessage)
    )

    act(() => {
      result.current.startListening()
    })

    const mockEvent = {
      results: [[{ transcript: 'go to five' }]]
    } as any

    act(() => {
      mockRecognition.onresult(mockEvent)
    })

    expect(showError).toHaveBeenCalledWith(expect.stringContaining('Only one floor detected'))
  })

  it('should stop recognition when stopListening is called', () => {
    const { result } = renderHook(() =>
      useSpeechRecognition(setStatus, setTranscript, setNumbers, setSpokenText, showError, sendMessage)
    )

    act(() => {
      result.current.startListening()
    })

    act(() => {
      result.current.stopListening()
    })

    expect(mockRecognition.stop).toHaveBeenCalled()
  })

  it('should handle recognition errors', () => {
    const { result } = renderHook(() =>
      useSpeechRecognition(setStatus, setTranscript, setNumbers, setSpokenText, showError, sendMessage)
    )

    act(() => {
      result.current.startListening()
    })

    const mockError = { error: 'network' } as any

    act(() => {
      mockRecognition.onerror(mockError)
    })

    expect(showError).toHaveBeenCalledWith('Speech recognition error: network')
  })

  it('should set status to idle on no-speech error', () => {
    const { result } = renderHook(() =>
      useSpeechRecognition(setStatus, setTranscript, setNumbers, setSpokenText, showError, sendMessage)
    )

    act(() => {
      result.current.startListening()
    })

    const mockError = { error: 'no-speech' } as any

    act(() => {
      mockRecognition.onerror(mockError)
    })

    expect(setStatus).toHaveBeenCalledWith('idle')
  })
})
