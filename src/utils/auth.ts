export function checkLogoutParam(): boolean {
  const params = new URLSearchParams(window.location.search)
  if (params.get('logout') === 'true') {
    logout()
    window.history.replaceState({}, '', window.location.pathname)
    return true
  }
  return false
}

export function isUserLoggedIn(): boolean {
  const userId = localStorage.getItem('userId')
  const userPassword = localStorage.getItem('userPassword')
  return !!(userId && userPassword)
}

export function login(id: string, password: string): void {
  localStorage.setItem('userId', id)
  localStorage.setItem('userPassword', password)
}

export function logout(): void {
  localStorage.removeItem('userId')
  localStorage.removeItem('userPassword')
}
