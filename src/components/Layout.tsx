import { type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { Role } from '../types'

// Layout principal: barra de navegación superior + área de contenido.
// Todas las páginas protegidas usan este componente como contenedor.
export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const role = user?.roles?.[0]

  const roleLabel =
    ({
      admin: 'Administrador',
      coordinador: 'Coordinador',
      institucion: 'Responsable de institución',
      representante: 'Representante',
    } as Record<Role, string>)[role as Role] ?? role ?? 'Usuario'

  const isAdmin = role === 'admin'
  const isCoordinador = role === 'coordinador'
  const isInstitucion = role === 'institucion'

  // Enlace de instituciones: admin y coordinador ven la lista completa;
  // el responsable va directo a editar la suya propia.
  const institutionLink = isInstitucion
    ? `/institutions/${user?.institution?.id}`
    : '/institutions'

  const canSeeInstitutions = isAdmin || isCoordinador || isInstitucion
  const canSeeUsers = isAdmin || isCoordinador || isInstitucion

  return (
    <div className="app">
      <header className="navbar">
        <div className="navbar-brand">
          <Link to="/">Sistema de Apoyo a la Crianza</Link>
        </div>
        <nav className="navbar-links">
          <Link to="/children">Niños</Link>
          {canSeeUsers && <Link to="/users">Usuarios</Link>}
          {canSeeInstitutions && (
            <Link to={institutionLink}>
              {isInstitucion ? 'Mi institución' : 'Efectores'}
            </Link>
          )}
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
