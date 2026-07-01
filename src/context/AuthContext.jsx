import { createContext, useContext, useState, useCallback } from 'react'
import api from '../api/client'

// Contexto global de autenticación.
// Provee: el usuario actual, funciones de login/logout, y un flag de carga.
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    // Al cargar la app, intenta recuperar el usuario guardado en localStorage.
    const saved = localStorage.getItem('auth_user')
    return saved ? JSON.parse(saved) : null
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const login = useCallback(async (email, password) => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.post('/login', { email, password })
      // El backend devuelve { token, user }
      localStorage.setItem('auth_token', data.token)
      localStorage.setItem('auth_user', JSON.stringify(data.user))
      setUser(data.user)
      return data.user
    } catch (err) {
      const message =
        err.response?.data?.message || 'Error al iniciar sesión. Verificá las credenciales.'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/logout')
    } catch {
      // Si el backend falla (token ya expirado, etc.), igual limpiamos el estado local.
    } finally {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
      setUser(null)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook de acceso rápido: const { user, login, logout } = useAuth()
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
