import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { useMutation } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import api from '../api/client'
import type { ApiErrorBody, AuthUser, InstitutionType } from '../types'

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<AuthUser>
  loginByDni: (dni: string, password: string) => Promise<AuthUser>
  loginInstitution: (institutionId: string, password: string) => Promise<AuthUser>
  logout: () => Promise<void>
}

// Forma de la respuesta de POST /institution-login (ver InstitutionAuthController::login).
interface InstitutionLoginResponse {
  token: string
  institution: {
    id: string
    name: string
    type: InstitutionType
    roles: string[]
    permissions: string[]
    password_must_change: boolean
  }
}

// El backend devuelve { token, institution } en vez de { token, user }: se
// normaliza a AuthUser para que el resto de la app (roles, institución
// asociada, ProtectedRoute) funcione igual sea cual sea el tipo de login.
function institutionToAuthUser(data: InstitutionLoginResponse): AuthUser {
  return {
    id: data.institution.id,
    name: data.institution.name,
    roles: data.institution.roles as AuthUser['roles'],
    permissions: data.institution.permissions,
    institution: {
      id: data.institution.id,
      name: data.institution.name,
      type: data.institution.type,
      is_active: true,
    },
    is_institution_actor: true,
  }
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
    // POST /login acepta email O dni (uno de los dos) — ver AuthController::login.
    mutationFn: async (credentials: { email: string; password: string } | { dni: string; password: string }) => {
      // El backend devuelve { token, user }
      const { data } = await api.post<{ token: string; user: AuthUser }>('/login', credentials)
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

  const loginInstitutionMutation = useMutation({
    mutationFn: async ({ institutionId, password }: { institutionId: string; password: string }) => {
      const { data } = await api.post<InstitutionLoginResponse>('/institution-login', {
        institution_id: institutionId,
        password,
      })
      return data
    },
    onSuccess: (data) => {
      const user = institutionToAuthUser(data)
      localStorage.setItem('auth_token', data.token)
      localStorage.setItem('auth_user', JSON.stringify(user))
      setUser(user)
      setError(null)
    },
    onError: (err) => {
      const message = isAxiosError<ApiErrorBody>(err)
        ? err.response?.data?.message ?? 'Error al iniciar sesión. Verificá la contraseña de la institución.'
        : 'Error al iniciar sesión. Verificá la contraseña de la institución.'
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

  const loginByDni = useCallback(
    async (dni: string, password: string) => {
      const data = await loginMutation.mutateAsync({ dni, password })
      return data.user
    },
    [loginMutation],
  )

  const loginInstitution = useCallback(
    async (institutionId: string, password: string) => {
      const data = await loginInstitutionMutation.mutateAsync({ institutionId, password })
      return institutionToAuthUser(data)
    },
    [loginInstitutionMutation],
  )

  const logout = useCallback(async () => {
    await logoutMutation.mutateAsync().catch(() => {})
  }, [logoutMutation])

  return (
    <AuthContext.Provider
      value={{
        user,
        loading: loginMutation.isPending || loginInstitutionMutation.isPending,
        error,
        login,
        loginByDni,
        loginInstitution,
        logout,
      }}
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
