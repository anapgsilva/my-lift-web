import { useCallback, useRef } from 'react'
import { getSpeechRecognition, speak } from '../utils/speech'
import { parseNumbers } from '../utils/numbers'
import { NUM_TO_WORD } from '../utils/mapping'
import { Status } from '../types/speechRecognition'

export function useSpeechRecognition(
  setStatus: (status: Status | ((prev: Status) => Status)) => void,
  setTranscript: (text: string) => void,
  setNumbers: (nums: number[]) => void,
  setSpokenText: (text: string) => void,
  showError: (msg: string) => void,
  sendMessage: (floors: number[]) => void
) {
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  const startListening = useCallback(() => {
    const SR = getSpeechRecognition()
    if (!SR) {
      setStatus('unsupported')
      return
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel()
    speak('') // needed for speechSynthesis to work on mobile

    const recognition = new SR()
    recognitionRef.current = recognition
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.continuous = false

    recognition.onstart = () => {
      setStatus('listening')
      setTranscript('')
      setNumbers([])
      setSpokenText('')
      showError('')
    }

    recognition.onresult = async (event: SpeechRecognitionEvent) => {
      const text = event.results[0][0].transcript
      setTranscript(text)
      setStatus('processing')

      const nums = parseNumbers(text)
      setNumbers(nums)

      let sentence = ''
      if (nums.length === 0) {
        sentence = "Please try again. No numbers were detected."
      } else if (nums.length === 1) {
        sentence = `Please try again. Only one floor detected - floor ${NUM_TO_WORD[nums[0]]}.`
      } else {
        try {
          sendMessage(nums.slice(0, 2))
          setStatus('result')
        } catch {
          sentence = `Please try again with valid floors. Could not call the elevator.`
        }
      }

      if (sentence.length > 0) {
        showError(sentence)
        setTimeout(() => speak(sentence), 300)
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'no-speech' || event.error === 'aborted') {
        setStatus('idle')
        return
      }
      showError(`Speech recognition error: ${event.error}`)
    }

    recognition.onend = () => {
      setStatus((prev) => (prev === 'listening' ? 'idle' : prev))
    }

    recognition.start()
  }, [setStatus, setTranscript, setNumbers, setSpokenText, showError, sendMessage])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
  }, [])

  return { startListening, stopListening, recognitionRef }
}
