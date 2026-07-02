import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'

export default function DashboardPage() {
  const { user } = useAuth()

  const role = user?.roles?.[0]
  const isAdmin = role === 'admin'
  const isCoordinador = role === 'coordinador'
  const isInstitucion = role === 'institucion'
  const isRepresentante = role === 'representante'
  const institutionType = user?.institution?.type
  const institutionName = user?.institution?.name

  const canManageUsers = isAdmin || isInstitucion
  const canCreateChildren = !isCoordinador

  return (
    <Layout>
      <div className="page-header">
        <h1>Bienvenido/a, {user?.name}</h1>
        <p className="text-muted">
          {institutionName ?? 'Administración Central'} ·{' '}
          {isAdmin
            ? 'Acceso total al sistema'
            : isCoordinador
            ? 'Coordinación — acceso de lectura a todos los datos'
            : institutionType === 'educacion'
            ? 'Institución educativa'
            : institutionType === 'salud'
            ? 'Institución de salud'
            : institutionType
            ? user?.institution?.type_label ?? institutionType
            : 'Sin institución asignada'}
        </p>
      </div>

      <div className="card-grid">
        {/* Tarjeta de niños: visible para todos */}
        <div className="card">
          <h2>Niños registrados</h2>
          <p>
            {isAdmin || isCoordinador
              ? 'Todos los niños del sistema, con sus registros educativos y de salud.'
              : institutionType === 'educacion'
              ? 'Niños vinculados a tu institución, con sus registros escolares.'
              : institutionType === 'salud'
              ? 'Niños vinculados a tu institución, con sus controles y vacunas.'
              : 'Niños vinculados a tu institución.'}
          </p>
          <Link to="/children" className="btn btn-primary">
            Ver listado de niños
          </Link>
        </div>

        {/* Tarjeta de nuevo niño: no disponible para coordinador (solo lectura) */}
        {canCreateChildren && (
          <div className="card">
            <h2>Registrar nuevo niño</h2>
            <p>Agregar un nuevo niño al sistema e ingresar sus datos.</p>
            <Link to="/children/new" className="btn btn-secondary">
              Registrar niño
            </Link>
          </div>
        )}

        {/* Tarjeta de usuarios: admin y responsable de institución */}
        {canManageUsers && (
          <div className="card">
            <h2>Gestión de usuarios</h2>
            <p>
              {isAdmin
                ? 'Administrá todos los usuarios del sistema: sus roles, instituciones y accesos.'
                : 'Gestioná los representantes de tu institución y revisá su actividad.'}
            </p>
            <Link to="/users" className="btn btn-secondary">
              Ver usuarios
            </Link>
          </div>
        )}

        {/* Tarjeta "Mi perfil": acceso rápido para representantes */}
        {isRepresentante && (
          <div className="card">
            <h2>Mi perfil</h2>
            <p>Consultá y actualizá tu nombre, email o contraseña.</p>
            <Link to={`/users/${user?.id}`} className="btn btn-secondary">
              Ver mi perfil
            </Link>
          </div>
        )}
      </div>

      {/* Nota informativa para admin y coordinador */}
      {(isAdmin || isCoordinador) && (
        <div className="info-box mt-4">
          <strong>Acceso ampliado:</strong> podés ver todos los niños del sistema,
          independientemente de la institución que los registró.
          {isCoordinador && ' Como coordinador, tenés acceso de solo lectura.'}
        </div>
      )}

      {/* Nota para representantes sobre lo que pueden ver */}
      {isRepresentante && institutionType && (
        <div className="info-box mt-4">
          <strong>Acceso restringido:</strong> solo ves los niños y registros vinculados
          a tu institución ({user?.institution?.name}).
          {institutionType === 'educacion' && ' Podés gestionar registros educativos.'}
          {institutionType === 'salud' && ' Podés gestionar registros de salud.'}
        </div>
      )}
    </Layout>
  )
}
