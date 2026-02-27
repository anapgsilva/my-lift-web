/** Speak a sentence using the Web Speech Synthesis API */
export function speak(text: string): Promise<void> {
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
export function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null
}
