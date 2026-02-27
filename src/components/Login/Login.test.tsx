import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import Login from './Login'

describe('Login', () => {
  it('should render login form', () => {
    render(<Login onLogin={vi.fn()} />)
    expect(screen.getByText('My Lift')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('ID')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument()
  })

  it('should update id input value', () => {
    render(<Login onLogin={vi.fn()} />)
    const idInput = screen.getByPlaceholderText('ID') as HTMLInputElement
    
    fireEvent.change(idInput, { target: { value: 'test-user' } })
    expect(idInput.value).toBe('test-user')
  })

  it('should update password input value', () => {
    render(<Login onLogin={vi.fn()} />)
    const passwordInput = screen.getByPlaceholderText('Password') as HTMLInputElement
    
    fireEvent.change(passwordInput, { target: { value: 'test-password' } })
    expect(passwordInput.value).toBe('test-password')
  })

  it('should call onLogin with id and password when form is submitted', () => {
    const onLogin = vi.fn()
    render(<Login onLogin={onLogin} />)
    
    const idInput = screen.getByPlaceholderText('ID')
    const passwordInput = screen.getByPlaceholderText('Password')
    const submitButton = screen.getByRole('button', { name: 'Log in' })
    
    fireEvent.change(idInput, { target: { value: 'test-user' } })
    fireEvent.change(passwordInput, { target: { value: 'test-password' } })
    fireEvent.click(submitButton)
    
    expect(onLogin).toHaveBeenCalledWith('test-user', 'test-password')
  })

  it('should not call onLogin when id is empty', () => {
    const onLogin = vi.fn()
    render(<Login onLogin={onLogin} />)
    
    const passwordInput = screen.getByPlaceholderText('Password')
    const submitButton = screen.getByRole('button', { name: 'Log in' })
    
    fireEvent.change(passwordInput, { target: { value: 'test-password' } })
    fireEvent.click(submitButton)
    
    expect(onLogin).not.toHaveBeenCalled()
  })

  it('should not call onLogin when password is empty', () => {
    const onLogin = vi.fn()
    render(<Login onLogin={onLogin} />)
    
    const idInput = screen.getByPlaceholderText('ID')
    const submitButton = screen.getByRole('button', { name: 'Log in' })
    
    fireEvent.change(idInput, { target: { value: 'test-user' } })
    fireEvent.click(submitButton)
    
    expect(onLogin).not.toHaveBeenCalled()
  })

  it('should prevent default form submission', () => {
    const onLogin = vi.fn()
    render(<Login onLogin={onLogin} />)
    
    const form = screen.getByRole('button', { name: 'Log in' }).closest('form')!
    const event = new Event('submit', { bubbles: true, cancelable: true })
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault')
    
    form.dispatchEvent(event)
    
    expect(preventDefaultSpy).toHaveBeenCalled()
  })
})
