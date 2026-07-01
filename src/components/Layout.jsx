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

  // Determina la etiqueta del rol para mostrar en el encabezado.
  const roleLabel = {
    admin: 'Administrador',
    coordinador: 'Coordinador',
    institucion: 'Responsable de institución',
    representante: 'Representante',
  }[user?.roles?.[0]] ?? user?.roles?.[0] ?? 'Usuario'

  return (
    <div className="app">
      <header className="navbar">
        <div className="navbar-brand">
          <Link to="/">Sistema de Apoyo a la Crianza</Link>
        </div>
        <nav className="navbar-links">
          <Link to="/children">Niños</Link>
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
