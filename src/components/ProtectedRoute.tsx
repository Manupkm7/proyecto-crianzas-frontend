import { type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { AppContainer } from './Layout/Container'
import type { Role } from '../types'

/**
 * Guarda de rutas autenticadas.
 * - Sin sesión → redirige a /login.
 * - Con allowedRoles y el rol del usuario no está en la lista → redirige a /.
 */
export default function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: ReactNode
  allowedRoles?: Role[]
}) {
  const { user } = useAuth()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = user.roles?.[0]
    if (!userRole || !allowedRoles.includes(userRole)) {
      return <Navigate to="/" replace />
    }
  }

  return <AppContainer>{children}</AppContainer>
}
