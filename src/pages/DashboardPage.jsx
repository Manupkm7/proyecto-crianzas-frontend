import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'

export default function DashboardPage() {
  const { user } = useAuth()

  const role = user?.roles?.[0]
  const isAdmin = role === 'admin'
  const isCoordinador = role === 'coordinador'
  const institutionType = user?.institution?.type

  return (
    <Layout>
      <div className="page-header">
        <h1>Bienvenido/a, {user?.name}</h1>
        <p className="text-muted">
          {user?.institution?.name ?? 'Administración Central'} ·{' '}
          {isAdmin ? 'Acceso total al sistema' : `Tipo de institución: ${institutionType ?? '—'}`}
        </p>
      </div>

      <div className="card-grid">
        <div className="card">
          <h2>Niños registrados</h2>
          <p>
            {isAdmin || isCoordinador
              ? 'Todos los niños del sistema, con sus registros educativos y de salud.'
              : institutionType === 'educacion'
              ? 'Niños vinculados a tu institución educativa, con sus registros escolares.'
              : institutionType === 'salud'
              ? 'Niños vinculados a tu institución de salud, con sus controles y vacunas.'
              : 'Niños vinculados a tu institución.'}
          </p>
          <Link to="/children" className="btn btn-primary">
            Ver listado de niños
          </Link>
        </div>

        {(isAdmin || institutionType === 'educacion' || institutionType === 'salud') && (
          <div className="card">
            <h2>Registrar nuevo niño</h2>
            <p>Agregar un nuevo niño al sistema e ingresar sus datos de dominio.</p>
            <Link to="/children/new" className="btn btn-secondary">
              Registrar niño
            </Link>
          </div>
        )}
      </div>

      {(isAdmin || isCoordinador) && (
        <div className="info-box mt-4">
          <strong>Acceso administrativo:</strong> podés ver todos los niños del sistema,
          independientemente de la institución que los registró.
        </div>
      )}
    </Layout>
  )
}
