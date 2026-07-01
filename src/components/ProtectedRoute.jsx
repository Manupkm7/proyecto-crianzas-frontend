import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Guarda de rutas autenticadas.
// Si el usuario no está logueado, redirige a /login.
export default function ProtectedRoute({ children }) {
  const { user } = useAuth()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}
