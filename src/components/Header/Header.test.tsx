import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import Header from './Header'

// Mock speechSynthesis
const mockSpeechSynthesis = {
  getVoices: vi.fn(() => [] as SpeechSynthesisVoice[]),
  onvoiceschanged: null
}

Object.defineProperty(window, 'speechSynthesis', {
  writable: true,
  value: mockSpeechSynthesis
})

describe('Header', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    mockSpeechSynthesis.getVoices.mockReturnValue([] as SpeechSynthesisVoice[])
  })

  it('should render title', () => {
    render(<Header />)
    expect(screen.getByText('My Lift')).toBeInTheDocument()
  })

  it('should show login button when user is not logged in', () => {
    render(<Header user={{ isLoggedIn: false }} />)
    expect(screen.getByText('Log in')).toBeInTheDocument()
  })

  it('should show profile circle when user is logged in', () => {
    render(<Header user={{ isLoggedIn: true }} />)
    const profileCircle = document.querySelector('.profile-circle')
    expect(profileCircle).toBeInTheDocument()
  })

  it('should disable profile circle when listening', () => {
    render(<Header user={{ isLoggedIn: true }} isListening={true} />)
    const profileCircle = document.querySelector('.profile-circle')
    expect(profileCircle).toHaveClass('disabled')
  })

  it('should toggle menu when profile circle is clicked', () => {
    render(<Header user={{ isLoggedIn: true }} />)
    const profileCircle = document.querySelector('.profile-circle')
    
    fireEvent.click(profileCircle!)
    expect(screen.getByText('Voice:')).toBeInTheDocument()
    
    fireEvent.click(profileCircle!)
    expect(screen.queryByText('Voice:')).not.toBeInTheDocument()
  })

  it('should not toggle menu when listening', () => {
    render(<Header user={{ isLoggedIn: true }} isListening={true} />)
    const profileCircle = document.querySelector('.profile-circle')
    
    fireEvent.click(profileCircle!)
    expect(screen.queryByText('Voice:')).not.toBeInTheDocument()
  })

  it('should save selected voice to localStorage', () => {
    const mockVoices = [
      { name: 'Voice 1', lang: 'en-US' },
      { name: 'Voice 2', lang: 'en-GB' }
    ] as SpeechSynthesisVoice[]

    mockSpeechSynthesis.getVoices.mockReturnValue(mockVoices)

    render(<Header user={{ isLoggedIn: true }} />)
    const profileCircle = document.querySelector('.profile-circle')
    fireEvent.click(profileCircle!)

    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'Voice 2' } })

    expect(localStorage.setItem).toHaveBeenCalledWith('selectedVoice', 'Voice 2')
  })

  it('should close menu when clicking outside', () => {
    render(<Header user={{ isLoggedIn: true }} />)
    const profileCircle = document.querySelector('.profile-circle')
    
    fireEvent.click(profileCircle!)
    expect(screen.getByText('Voice:')).toBeInTheDocument()
    
    fireEvent.mouseDown(document.body)
    expect(screen.queryByText('Voice:')).not.toBeInTheDocument()
  })
})
