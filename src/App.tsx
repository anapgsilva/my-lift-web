import { useState, useEffect, useCallback, useRef } from 'react'
import './App.css'
import { koneApiMapping, NUM_TO_WORD } from './utils/mapping'
import { Status } from './types/speechRecognition'
import { getRequestId, parseNumbers } from './utils/numbers'
import { getAccessTokenForSocket } from './utils/koneApiService'
import { GROUP_ID, TARGET_BUILDING_ID, WEBSOCKET_ENDPOINT, WEBSOCKET_SUBPROTOCOL } from './utils/constants'
import { AccessToken, DestinationCallPayload } from './types/koneApi'
import Header from './components/Header/Header'
import Login from './components/Login/Login'


/** Speak a sentence using the Web Speech Synthesis API */
function speak(text: string): Promise<void> {
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1
    
    const savedVoice = localStorage.getItem('selectedVoice')
    if (savedVoice) {
      const voices = window.speechSynthesis.getVoices()
      const voice = voices.find(v => v.name === savedVoice)
      if (voice) utterance.voice = voice
    }
    
    utterance.onend = () => resolve()
    utterance.onerror = () => resolve()
    window.speechSynthesis.speak(utterance)
  })
}

/** Get the SpeechRecognition constructor (with webkit prefix fallback) */
function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null
}

function App() {
  const [status, setStatus] = useState<Status>('idle')
  const [transcript, setTranscript] = useState('')
  const [numbers, setNumbers] = useState<number[]>([])
  const [spokenText, setSpokenText] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [user, setUser] = useState({ isLoggedIn: false })
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const hasAutoStarted = useRef(false)
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('logout') === 'true') {
      localStorage.removeItem('userId');
      localStorage.removeItem('userPassword');
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    const userId = localStorage.getItem('userId');
    const userPassword = localStorage.getItem('userPassword');
    if (userId && userPassword) {
      setUser({ isLoggedIn: true });
    }
  }, []);


  const openWebSocketConnection = useCallback((accessToken: AccessToken): Promise<WebSocket> => {
    return new Promise((resolve, reject) => {
        let ws: WebSocket

        try {
            // Try to open the connection. Note that we have to set also subprotocol
            ws = new WebSocket(`${WEBSOCKET_ENDPOINT}?accessToken=${accessToken}`, WEBSOCKET_SUBPROTOCOL)
            
            // error and close events are absorbed until connection has been established
            ws.onerror = (error) => {
                reject(new Error(`WebSocket error: ${error}`))
            }
            ws.onclose = (event) => {
                console.error(`WebSocket closed: ${event.code} ${event.reason}`)
                reject(event.code)
            }
            ws.onmessage = (event: MessageEvent) => {
              const response = JSON.parse(event.data)
              console.log('Message received from server:', response)
              let message = ""
              if (response.data.success == true) {
                message = 'Success. Calling your lift now.'
                setSpokenText(message)
              } else if (response.data.error) {
                message = `Lift server responded with error ${response.data.error}`
                setStatus('error')
                setErrorMsg(message)
              }
              speak(message)
            }
            ws.onopen = () => {
                console.log('Web socket connection opened at ', new Date())
                console.log(ws.url.split('?')[0])
                // Once the connection is open, resolve promise with the WebSocket instance
                resolve(ws)
            }    
          } catch (error) {
            console.error('Error while opening WebSocket connection', error)
            reject(error)
        }
    })
  },[])


  const startListening = useCallback(() => {
    const SR = getSpeechRecognition()
    if (!SR) {
      setStatus('unsupported')
      return
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel()

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
      setErrorMsg('')
    }

    recognition.onresult = async (event: SpeechRecognitionEvent) => {
      const text = event.results[0][0].transcript
      setTranscript(text)
      setStatus('processing')

      const nums = parseNumbers(text)
      setNumbers(nums)

      let sentence: string = ''
      if (nums.length === 0) {
        sentence = "Please try again. I didn't detect any numbers in that sentence."
      } else if (nums.length === 1) {
        sentence = `Please try again. I only recognised one floor - floor ${NUM_TO_WORD[nums[0]]}.`
      } else {
        try {
          sendMessage(nums.slice(0, 2))
        } catch {
          sentence = `Please try again. Sorry, there was an error calling the elevator.`
        }
      }

      setSpokenText(sentence)
      setStatus('result')
      setTimeout(() => speak(sentence), 300)
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'no-speech' || event.error === 'aborted') {
        setStatus('idle')
        return
      }
      setErrorMsg(`Speech recognition error: ${event.error}`)
      setStatus('error')
    }

    recognition.onend = () => {
      setStatus((prev) => (prev === 'listening' ? 'idle' : prev))
    }

    recognition.start()
  }, [])

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
  }

  // Auto-start listening on mount if user is logged in
  useEffect(() => {
    if (hasAutoStarted.current || !user.isLoggedIn) return
    hasAutoStarted.current = true
    const timer = setTimeout(() => startListening(), 500)
    return () => clearTimeout(timer)
  }, [startListening, user.isLoggedIn])

  // Open websocket on mount
  useEffect(() => {
    const initWebSocket = async () => {
      // Open the WebSocket connection
      const accessToken = await getAccessTokenForSocket()
      const ws = await openWebSocketConnection(accessToken);
      wsRef.current = ws
    }
    initWebSocket();

    // Clean up the WebSocket connection when the component unmounts
    return () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, [])

  const sendMessage = (floors: number[]) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        const payload: DestinationCallPayload = {
          type: 'lift-call-api-v2',
          buildingId: TARGET_BUILDING_ID,
          callType: 'action',
          groupId: GROUP_ID,
          payload: {
              request_id: getRequestId(),
              area: koneApiMapping[String(floors[0])],
              time: new Date().toISOString(),
              terminal: 1,
              // terminal: 10011,
              call: {
                  action: 2,
                  destination: koneApiMapping[String(floors[1])],
              },
          }
        }
        wsRef.current.send(JSON.stringify(payload));
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : String(error))
      } 
    } else {
      console.warn("WebSocket not connected.");
      setErrorMsg("WebSocket is not connected.")
      setStatus('error')
    }
  };

  const handleLogin = (id: string, password: string) => {
    localStorage.setItem('userId', id);
    localStorage.setItem('userPassword', password);
    setUser({ isLoggedIn: true });
  };

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
            Please try Chrome or Safari.
          </p>
        </>
      ) : (
        <>
          <p className="instructions">
            Say for example "FROM GROUND TO LEVEL 25"
          </p>

          <button
            className="start-btn"
            onClick={status === 'listening' ? stopListening : startListening}
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
