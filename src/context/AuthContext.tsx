import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { useMutation } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import api from '../api/client'
import type { ApiErrorBody, AuthUser } from '../types'

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<AuthUser>
  logout: () => Promise<void>
}

// Contexto global de autenticación.
// Provee: el usuario actual, funciones de login/logout, y un flag de carga.
const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    // Al cargar la app, intenta recuperar el usuario guardado en localStorage.
    const saved = localStorage.getItem('auth_user')
    return saved ? JSON.parse(saved) : null
  })
  const [error, setError] = useState<string | null>(null)

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      // El backend devuelve { token, user }
      const { data } = await api.post<{ token: string; user: AuthUser }>('/login', {
        email,
        password,
      })
      return data
    },
    onSuccess: (data) => {
      localStorage.setItem('auth_token', data.token)
      localStorage.setItem('auth_user', JSON.stringify(data.user))
      setUser(data.user)
      setError(null)
    },
    onError: (err) => {
      const message = isAxiosError<ApiErrorBody>(err)
        ? err.response?.data?.message ?? 'Error al iniciar sesión. Verificá las credenciales.'
        : 'Error al iniciar sesión. Verificá las credenciales.'
      setError(message)
    },
  })

  const logoutMutation = useMutation({
    mutationFn: () => api.post('/logout'),
    onSettled: () => {
      // Si el backend falla (token ya expirado, etc.), igual limpiamos el estado local.
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
      setUser(null)
    },
  })

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await loginMutation.mutateAsync({ email, password })
      return data.user
    },
    [loginMutation],
  )

  const logout = useCallback(async () => {
    await logoutMutation.mutateAsync().catch(() => {})
  }, [logoutMutation])

  return (
    <AuthContext.Provider
      value={{ user, loading: loginMutation.isPending, error, login, logout }}
    >
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
