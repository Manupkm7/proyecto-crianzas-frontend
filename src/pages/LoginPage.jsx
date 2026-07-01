import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { user, login, loading, error } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('admin@crianza.local')
  const [password, setPassword] = useState('')

  // Si ya está logueado, lo mandamos directo al inicio.
  if (user) return <Navigate to="/" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      await login(email, password)
      navigate('/')
    } catch {
      // El error ya está en el estado del contexto (AuthContext.error)
    }
  }

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <h1 className="login-title">Sistema de Apoyo a la Crianza</h1>
        <p className="login-subtitle">Municipalidad — Panel de gestión</p>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="alert alert-error">{error}</div>}

          <div className="field">
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
            />
          </div>

          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Iniciando sesión…' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="login-hint">
          Credenciales de prueba: <code>admin@crianza.local</code> / <code>Crianza2026!Admin#</code>
        </p>
      </div>
    </div>
  )
}
