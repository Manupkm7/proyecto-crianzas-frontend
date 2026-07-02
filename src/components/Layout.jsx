import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Layout principal: barra de navegación superior + área de contenido.
// Todas las páginas protegidas usan este componente como contenedor.
export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const role = user?.roles?.[0]

  const roleLabel = {
    admin: 'Administrador',
    coordinador: 'Coordinador',
    institucion: 'Responsable de institución',
    representante: 'Representante',
  }[role] ?? role ?? 'Usuario'

  // Admin, coordinador y responsable de institución acceden a la gestión de usuarios.
  // El representante no tiene acceso (el backend lo rechaza con 403).
  const canSeeUsers = ['admin', 'coordinador', 'institucion'].includes(role)

  return (
    <div className="app">
      <header className="navbar">
        <div className="navbar-brand">
          <Link to="/">Sistema de Apoyo a la Crianza</Link>
        </div>
        <nav className="navbar-links">
          <Link to="/children">Niños</Link>
          {canSeeUsers && <Link to="/users">Usuarios</Link>}
        </nav>
        <div className="navbar-user">
          <span className="user-info">
            {user?.name} · <em>{roleLabel}</em>
          </span>
          <button className="btn-link" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="main-content">{children}</main>
    </div>
  )
}
