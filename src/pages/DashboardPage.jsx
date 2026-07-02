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
            ? 'Coordinación — acceso de lectura'
            : user?.institution?.type_label ?? institutionType ?? 'Sin institución asignada'}
        </p>
      </div>

      <div className="card-grid">
        {/* Niños — visible para todos */}
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

        {/* Registrar niño — no disponible para coordinador (solo lectura) */}
        {canCreateChildren && (
          <div className="card">
            <h2>Registrar nuevo niño</h2>
            <p>Agregar un nuevo niño al sistema e ingresar sus datos.</p>
            <Link to="/children/new" className="btn btn-secondary">
              Registrar niño
            </Link>
          </div>
        )}

        {/* Usuarios — admin y responsable de institución */}
        {canManageUsers && (
          <div className="card">
            <h2>Gestión de usuarios</h2>
            <p>
              {isAdmin
                ? 'Administrá todos los usuarios del sistema: roles, instituciones y accesos.'
                : 'Gestioná los representantes de tu institución y revisá su actividad.'}
            </p>
            <Link to="/users" className="btn btn-secondary">
              Ver usuarios
            </Link>
          </div>
        )}

        {/* Instituciones — admin y coordinador ven la lista; responsable edita la suya */}
        {(isAdmin || isCoordinador) && (
          <div className="card">
            <h2>Instituciones</h2>
            <p>
              {isAdmin
                ? 'Creá, modificá o desactivá instituciones del sistema.'
                : 'Consultá el listado de instituciones registradas.'}
            </p>
            <Link to="/institutions" className="btn btn-secondary">
              Ver instituciones
            </Link>
          </div>
        )}

        {/* Mi institución — acceso rápido para el responsable */}
        {isInstitucion && user?.institution?.id && (
          <div className="card">
            <h2>Mi institución</h2>
            <p>Consultá y actualizá los datos de contacto de tu institución.</p>
            <Link to={`/institutions/${user.institution.id}`} className="btn btn-secondary">
              Ver mi institución
            </Link>
          </div>
        )}

        {/* Mi perfil — acceso rápido para representantes */}
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

      {(isAdmin || isCoordinador) && (
        <div className="info-box mt-4">
          <strong>Acceso ampliado:</strong> podés ver todos los niños e instituciones del sistema,
          independientemente de quién los registró.
          {isCoordinador && ' Como coordinador, tenés acceso de solo lectura.'}
        </div>
      )}

      {isRepresentante && institutionType && (
        <div className="info-box mt-4">
          <strong>Acceso restringido:</strong> solo ves los niños y registros vinculados
          a tu institución ({institutionName}).
          {institutionType === 'educacion' && ' Podés gestionar registros educativos.'}
          {institutionType === 'salud' && ' Podés gestionar registros de salud.'}
        </div>
      )}
    </Layout>
  )
}
