import { useState, useEffect, useRef, useCallback } from 'react'
import { Status } from './types/speechRecognition'
import { getAccessTokenForSocket } from './utils/liftService'
import Header from './components/Header/Header'
import Login from './components/Login/Login'
import { speak } from './utils/speech'
import { openWebSocketConnection } from './utils/websocket'
import { checkLogoutParam, isUserLoggedIn, login, logout } from './utils/auth'
import { useSpeechRecognition } from './hooks/useSpeechRecognition'
import { sendLiftCall } from './utils/liftService'
import './App.css'

function App() {
  const [status, setStatus] = useState<Status>('idle')
  const [transcript, setTranscript] = useState('')
  const [numbers, setNumbers] = useState<number[]>([])
  const [spokenText, setSpokenText] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [user, setUser] = useState({ isLoggedIn: false })
  const hasAutoStarted = useRef(false)
  const wsRef = useRef<WebSocket | null>(null)

  const showError = useCallback((error: string) => {
    if (error) {
      setStatus('error')
    }
    setErrorMsg(error)
  }, [])

  const sendMessage = (floors: number[]) => {
    sendLiftCall(wsRef.current, floors, (msg) => {
      showError(msg)
    })
  }

  const { startListening, stopListening } = useSpeechRecognition(
    setStatus,
    setTranscript,
    setNumbers,
    setSpokenText,
    showError,
    sendMessage
  )

  useEffect(() => {
    if (checkLogoutParam()) {
      return
    }

    if (isUserLoggedIn()) {
      setUser({ isLoggedIn: true })
    }
  }, [])

  const initWebSocket = useCallback(async () => {
    let messageHandledError = false
    try {
      const accessToken = await getAccessTokenForSocket()
      const ws = await openWebSocketConnection(
        accessToken,
        (response) => {
          if (response?.statusCode === 201) {
            // First response: call received by server, wait for the result response
            return
          }
          let message = ""
          if (response?.data?.success == true) {
            message = 'Calling your lift now.'
            setSpokenText(message)
          } else if (response?.data?.error) {
            message = `Sorry, something went wrong. Lift server responded with ${response.data.error}. Please try again or refresh page.`
            messageHandledError = true
            showError(message)
          } else {
            if (response?.status) {
              message = `Sorry, something went wrong. ${response.status}. Please try again later.`
            } else {
              message = `Sorry, something went wrong. Received an unexpected response from the lift server. Please try again or refresh page`
            }
            messageHandledError = true
            showError(message)
          }
          speak(message).catch(() => {})
        },
        (error) => {
          if (!messageHandledError) showError(error)
          messageHandledError = false
        }
      )
      wsRef.current = ws
    } catch (error) {
      console.error('Failed to get access token:', error)
      // Logout user if credentials are invalid
      logout()
      setUser({ isLoggedIn: false })
    }
  }, [showError])

  useEffect(() => {
    // Open websocket only when logged in, and skip if already open
    if (!user.isLoggedIn) return
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return

    initWebSocket()

    // Clean up the WebSocket connection when the component unmounts
    return () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, [user.isLoggedIn, initWebSocket])



  // Auto-start listening on mount if user is logged in
  useEffect(() => {
    if (hasAutoStarted.current || !user.isLoggedIn) return
    hasAutoStarted.current = true
    const listeningTimer = setTimeout(() => startListening(), 500)
    return () => {clearTimeout(listeningTimer)}
  }, [startListening, user.isLoggedIn])



  const handleStartListening = async () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      await initWebSocket()
    }
    startListening()
  }

  const handleLogin = (id: string, password: string) => {
    login(id, password)
    setUser({ isLoggedIn: true })
  }

  if (!user.isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app">
      <Header user={user} isListening={status === 'listening'} />
      
      {status === 'unsupported' ? (
        <>
          <p className="error" role="alert">
            Sorry, your browser does not support the Web Speech Recognition API.
            Please check that your browser has microphone permissions.
          </p>
        </>
      ) : (
        <>
          <div>
            <h3>Say your starting and destination floors</h3>
            <p className="instructions">
              For example <i>"FROM GROUND TO LEVEL 25"</i>
            </p>
          </div>

          <button
            id="listening-btn"
            className="start-btn"
            onClick={status === 'listening' ? stopListening : handleStartListening}
            aria-label={status === 'listening' ? 'Stop listening' : 'Start listening for speech'}
          >
            {status === 'listening' ? '🛑 Stop Listening' : '🎤 Start Listening'}
          </button>

          {status === 'listening' && (
            <p className="status" aria-live="polite">Listening… speak now.</p>
          )}

          {status === 'processing' && (
            <p className="status" aria-live="polite">Processing…</p>
          )}

          {transcript && (
            <div className="result-section">
              <h2>You said:</h2>
              <p className="transcript">"{transcript}"</p>
            </div>
          )}

          {numbers.length > 0 && (
            <div className="result-section">
              <h2>Detected numbers:</h2>
              <div className="numbers" aria-live="polite">
                {numbers.map((n, i) => (
                  <span key={i} className="number-badge">{n}</span>
                ))}
              </div>
            </div>
          )}

          {spokenText && (
            <div className="result-section">
              <h2>Response:</h2>
              <p className="spoken-text" aria-live="polite">{spokenText}</p>
            </div>
          )}

          {status === 'error' && (
            <p className="error" role="alert">{errorMsg}</p>
          )}
        </>
      )}
    </div>
  )
}

export default App
