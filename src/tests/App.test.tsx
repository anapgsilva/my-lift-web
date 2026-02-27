import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import App from '../App'
import * as auth from '../utils/auth'
import * as liftService from '../utils/liftService'
import * as websocket from '../utils/websocket'
import * as speech from '../utils/speech'

vi.mock('../utils/auth')
vi.mock('../utils/liftService')
vi.mock('../utils/websocket')
vi.mock('../utils/speech')
vi.mock('../hooks/useSpeechRecognition', () => ({
  useSpeechRecognition: vi.fn(() => ({
    startListening: vi.fn(),
    stopListening: vi.fn(),
    recognitionRef: { current: null }
  }))
}))

describe('App', () => {
  let mockWs: any
  let onMessageCallback: any

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    mockWs = { readyState: WebSocket.OPEN, close: vi.fn() }
    vi.mocked(auth.checkLogoutParam).mockReturnValue(false)
    vi.mocked(liftService.getAccessTokenForSocket).mockResolvedValue('test-token')
    vi.mocked(websocket.openWebSocketConnection).mockImplementation(
      async (_: any, onMessage: any) => {
        onMessageCallback = onMessage
        return mockWs
      }
    )
    vi.mocked(speech.speak).mockResolvedValue()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('authentication', () => {
    it('should show login when user not logged in', () => {
      vi.mocked(auth.isUserLoggedIn).mockReturnValue(false)
      
      render(<App />)
      
      expect(screen.getByText(/log in/i)).toBeInTheDocument()
    })

    it('should show main app when user logged in', () => {
      vi.mocked(auth.isUserLoggedIn).mockReturnValue(true)
      
      render(<App />)
      
      expect(screen.getByText(/Say your starting and destination floors/i)).toBeInTheDocument()
    })

    it('should call login and show app on successful login', async () => {
      vi.mocked(auth.isUserLoggedIn).mockReturnValue(false)
      const user = userEvent.setup()
      
      render(<App />)
      const idInput = screen.getByPlaceholderText(/id/i)
      const passwordInput = screen.getByPlaceholderText(/password/i)
      const loginButton = screen.getByRole('button', { name: /log in/i })
      
      await user.type(idInput, 'test-user')
      await user.type(passwordInput, 'test-pass')
      await user.click(loginButton)
      
      expect(auth.login).toHaveBeenCalledWith('test-user', 'test-pass')
      expect(screen.getByText(/Say your starting and destination floors/i)).toBeInTheDocument()
    })

    it('should not initialize when logout param present', () => {
      vi.mocked(auth.checkLogoutParam).mockReturnValue(true)
      vi.mocked(auth.isUserLoggedIn).mockReturnValue(false)
      
      render(<App />)
      
      expect(screen.getByText(/log in/i)).toBeInTheDocument()
    })
  })

  describe('websocket initialization', () => {
    it('should initialize WebSocket on mount when logged in', async () => {
      vi.mocked(auth.isUserLoggedIn).mockReturnValue(true)
      
      render(<App />)
      
      await waitFor(() => {
        expect(liftService.getAccessTokenForSocket).toHaveBeenCalled()
        expect(websocket.openWebSocketConnection).toHaveBeenCalled()
      })
    })

    it('should call startListening on mount when logged in', async () => {
      vi.mocked(auth.isUserLoggedIn).mockReturnValue(true)
      const { useSpeechRecognition } = await import('../hooks/useSpeechRecognition')
      const mockStartListening = vi.fn()
      let capturedSetStatus: any
      vi.mocked(useSpeechRecognition).mockImplementation((setStatus: any) => {
        capturedSetStatus = setStatus
        return {
          startListening: () => {
            mockStartListening()
            setStatus('listening')
          },
          stopListening: vi.fn(),
          recognitionRef: { current: null }
        }
      })
      
      render(<App />)
      
      await waitFor(() => {
        expect(mockStartListening).toHaveBeenCalled()
      }, { timeout: 1000 })
      
      expect(screen.getByText(/Listening… speak now/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /stop listening/i })).toBeInTheDocument()
    })

    it('should logout user if access token fails', async () => {
      vi.mocked(auth.isUserLoggedIn).mockReturnValue(true)
      vi.mocked(liftService.getAccessTokenForSocket).mockRejectedValue(new Error('Auth failed'))
      
      render(<App />)
      
      await waitFor(() => {
        expect(auth.logout).toHaveBeenCalled()
      })
    })

    it('should close WebSocket on unmount', async () => {
      vi.mocked(auth.isUserLoggedIn).mockReturnValue(true)
      
      const { unmount } = render(<App />)
      await waitFor(() => expect(websocket.openWebSocketConnection).toHaveBeenCalled())
      
      unmount()
      
      expect(mockWs.close).toHaveBeenCalled()
    })
  })

  describe('UI rendering', () => {
    it('should show start listening button', () => {
      vi.mocked(auth.isUserLoggedIn).mockReturnValue(true)
      
      render(<App />)
      
      expect(screen.getByRole('button', { name: /start listening/i })).toBeInTheDocument()
    })

    it('should show instructions', () => {
      vi.mocked(auth.isUserLoggedIn).mockReturnValue(true)
      
      render(<App />)
      
      expect(screen.getByText(/FROM GROUND TO LEVEL 25/i)).toBeInTheDocument()
    })

    it('should display transcript when set', async () => {
      vi.mocked(auth.isUserLoggedIn).mockReturnValue(true)
      const { useSpeechRecognition } = await import('../hooks/useSpeechRecognition')
      let capturedSetTranscript: any
      vi.mocked(useSpeechRecognition).mockImplementation(
        (_: any, setTranscript: any) => {
          capturedSetTranscript = setTranscript
          return { startListening: vi.fn(), stopListening: vi.fn(), recognitionRef: { current: null } }
        }
      )
      
      render(<App />)
      await waitFor(() => capturedSetTranscript('from ground to level 25'))
      
      await waitFor(() => {
        expect(screen.getByText('You said:')).toBeInTheDocument()
        expect(screen.getByText('"from ground to level 25"')).toBeInTheDocument()
      })
    })

    it('should display detected numbers when set', async () => {
      vi.mocked(auth.isUserLoggedIn).mockReturnValue(true)
      const { useSpeechRecognition } = await import('../hooks/useSpeechRecognition')
      let capturedSetNumbers: any
      let capturedSendMessage: any
      vi.mocked(useSpeechRecognition).mockImplementation(
        (_: any, __: any, setNumbers: any, ___: any, ____: any, sendMessage: any) => {
          capturedSetNumbers = setNumbers
          capturedSendMessage = sendMessage
          return { startListening: vi.fn(), stopListening: vi.fn(), recognitionRef: { current: null } }
        }
      )
      
      render(<App />)
      await waitFor(() => expect(websocket.openWebSocketConnection).toHaveBeenCalled())
      
      await waitFor(() => {
        capturedSetNumbers([0, 25])
        capturedSendMessage([0, 25])
        onMessageCallback({ data: { success: true } })
      })

      expect(screen.getByText('Detected numbers:')).toBeInTheDocument()
      expect(screen.getByText('0')).toBeInTheDocument()
      expect(screen.getByText('25')).toBeInTheDocument()
      await waitFor(() => {
        expect(screen.getByText('Calling your lift now.')).toBeInTheDocument()
      })
    })
  })

  describe('error handling', () => {
    it('should display error from WebSocket response', async () => {
      vi.mocked(auth.isUserLoggedIn).mockReturnValue(true)
      
      render(<App />)
      await waitFor(() => expect(websocket.openWebSocketConnection).toHaveBeenCalled())
      
      onMessageCallback({ data: { error: 'Invalid floor' } })
      
      await waitFor(() => {
        expect(screen.getByText(/Lift server responded with Invalid floor/i)).toBeInTheDocument()
      })
    })

    it('should display error from WebSocket connection failure', async () => {
      vi.mocked(auth.isUserLoggedIn).mockReturnValue(true)
      const { useSpeechRecognition } = await import('../hooks/useSpeechRecognition')
      const mockShowError = vi.fn()
      vi.mocked(useSpeechRecognition).mockImplementation(
        (_: any, __: any, ___: any, ____: any, showError: any) => {
          mockShowError.mockImplementation(showError)
          return { startListening: vi.fn(), stopListening: vi.fn(), recognitionRef: { current: null } }
        }
      )
      let capturedOnError: any
      vi.mocked(websocket.openWebSocketConnection).mockImplementation(
        async (_: any, __: any, onError: any) => {
          capturedOnError = onError
          return mockWs
        }
      )
      
      render(<App />)
      await waitFor(() => expect(websocket.openWebSocketConnection).toHaveBeenCalled())
      
      capturedOnError('Connection failed')
      
      await waitFor(() => {
        expect(screen.getByText('Connection failed')).toBeInTheDocument()
      })
    })

    it('should display error from speech recognition', async () => {
      vi.mocked(auth.isUserLoggedIn).mockReturnValue(true)
      const { useSpeechRecognition } = await import('../hooks/useSpeechRecognition')
      let capturedSetErrorMsg: any
      let capturedSetStatus: any
      vi.mocked(useSpeechRecognition).mockImplementation(
        (setStatus: any, _: any, __: any, ___: any, setErrorMsg: any) => {
          capturedSetStatus = setStatus
          capturedSetErrorMsg = setErrorMsg
          return { startListening: vi.fn(), stopListening: vi.fn(), recognitionRef: { current: null } }
        }
      )
      
      render(<App />)
      await waitFor(() => {
        capturedSetStatus('error')
        capturedSetErrorMsg('Microphone not available')
      })
      
      await waitFor(() => {
        expect(screen.getByText('Microphone not available')).toBeInTheDocument()
      })
    })

    it('should display unsupported message when status is unsupported', async () => {
      vi.mocked(auth.isUserLoggedIn).mockReturnValue(true)
      const { useSpeechRecognition } = await import('../hooks/useSpeechRecognition')
      let capturedSetStatus: any
      vi.mocked(useSpeechRecognition).mockImplementation(
        (setStatus: any) => {
          capturedSetStatus = setStatus
          return { startListening: vi.fn(), stopListening: vi.fn(), recognitionRef: { current: null } }
        }
      )
      
      render(<App />)
      await waitFor(() => capturedSetStatus('unsupported'))
      
      await waitFor(() => {
        expect(screen.getByText(/your browser does not support the Web Speech Recognition API/i)).toBeInTheDocument()
      })
    })

    it('should display listening status message', async () => {
      vi.mocked(auth.isUserLoggedIn).mockReturnValue(true)
      const { useSpeechRecognition } = await import('../hooks/useSpeechRecognition')
      let capturedSetStatus: any
      vi.mocked(useSpeechRecognition).mockImplementation(
        (setStatus: any) => {
          capturedSetStatus = setStatus
          return { startListening: vi.fn(), stopListening: vi.fn(), recognitionRef: { current: null } }
        }
      )
      
      render(<App />)
      await waitFor(() => capturedSetStatus('listening'))
      
      await waitFor(() => {
        expect(screen.getByText(/Listening… speak now/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /stop listening/i })).toBeInTheDocument()
      })
    })

    it('should display processing status message', async () => {
      vi.mocked(auth.isUserLoggedIn).mockReturnValue(true)
      const { useSpeechRecognition } = await import('../hooks/useSpeechRecognition')
      let capturedSetStatus: any
      vi.mocked(useSpeechRecognition).mockImplementation(
        (setStatus: any) => {
          capturedSetStatus = setStatus
          return { startListening: vi.fn(), stopListening: vi.fn(), recognitionRef: { current: null } }
        }
      )
      
      render(<App />)
      await waitFor(() => capturedSetStatus('processing'))
      
      await waitFor(() => {
        expect(screen.getByText(/Processing…/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /start listening/i })).toBeInTheDocument()
      })
    })

    it('should display error when sendLiftCall fails', async () => {
      vi.mocked(auth.isUserLoggedIn).mockReturnValue(true)
      const { useSpeechRecognition } = await import('../hooks/useSpeechRecognition')
      let capturedSendMessage: any
      vi.mocked(useSpeechRecognition).mockImplementation(
        (_: any, __: any, ___: any, ____: any, _____: any, sendMessage: any) => {
          capturedSendMessage = sendMessage
          return { startListening: vi.fn(), stopListening: vi.fn(), recognitionRef: { current: null } }
        }
      )
      vi.mocked(liftService.sendLiftCall).mockImplementation(
        (_: any, __: any, onError: any) => {
          onError("Failed to call the lift because the connection to the lift server was interrupted. Please refresh page.")
        }
      )
      
      render(<App />)
      await waitFor(() => expect(websocket.openWebSocketConnection).toHaveBeenCalled())
      
      capturedSendMessage([0, 25])
      
      await waitFor(() => {
        expect(screen.getByText("Failed to call the lift because the connection to the lift server was interrupted. Please refresh page.")).toBeInTheDocument()
      })
    })
  })
})
