import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getInstitutions, deleteInstitution } from '../api/institutions'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'

/**
 * InstitutionsListPage — Lista de instituciones del sistema.
 *
 * Lo que ve cada rol:
 * - Admin: todas las instituciones, con botones crear, editar y desactivar.
 * - Coordinador: todas las instituciones, solo lectura.
 * - Responsable de institución: solo la suya (el backend filtra el resultado),
 *   redirigido directamente al formulario de edición de contacto.
 */
export default function InstitutionsListPage() {
  const { user: authUser } = useAuth()
  const [institutions, setInstitutions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')

  const authRole = authUser?.roles?.[0]
  const isAdmin = authRole === 'admin'

  useEffect(() => {
    fetchInstitutions()
  }, [])

  async function fetchInstitutions() {
    setLoading(true)
    setError(null)
    try {
      const { data } = await getInstitutions()
      setInstitutions(data.data ?? data)
    } catch (err) {
      setError(err.response?.data?.message ?? 'Error al cargar las instituciones.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDeactivate(id, name) {
    if (
      !confirm(
        `¿Desactivar la institución "${name}"?\n` +
        'Sus registros históricos se conservan. Los usuarios asociados no podrán iniciar sesión.'
      )
    )
      return

    try {
      await deleteInstitution(id)
      await fetchInstitutions()
    } catch (err) {
      alert(err.response?.data?.message ?? 'No se pudo desactivar la institución.')
    }
  }

  const TYPE_LABELS = {
    salud: 'Salud',
    educacion: 'Educación',
    desarrollo_social: 'Desarrollo Social',
    justicia: 'Justicia',
    otro: 'Otro',
  }

  const filtered = institutions.filter((inst) => {
    if (!search) return true
    return inst.name.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <Layout>
      <div className="page-header">
        <h1>Instituciones</h1>
        {isAdmin && (
          <Link to="/institutions/new" className="btn btn-primary">
            + Nueva institución
          </Link>
        )}
      </div>

      <div className="toolbar">
        <input
          type="search"
          placeholder="Buscar por nombre…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
      </div>

      {loading && <p className="text-muted">Cargando…</p>}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && !error && filtered.length === 0 && (
        <div className="empty-state">
          <p>No hay instituciones{search ? ' que coincidan con la búsqueda' : ''}.</p>
          {isAdmin && !search && (
            <Link to="/institutions/new" className="btn btn-secondary">
              Registrar la primera
            </Link>
          )}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Dirección</th>
              <th>Teléfono</th>
              {isAdmin && <th>Usuarios activos</th>}
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((inst) => (
              <tr key={inst.id}>
                <td style={{ fontWeight: 500 }}>{inst.name}</td>
                <td>
                  <span className="badge badge-blue">
                    {inst.type_label ?? TYPE_LABELS[inst.type] ?? inst.type}
                  </span>
                </td>
                <td style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>
                  {inst.address ?? <span className="text-muted">—</span>}
                </td>
                <td style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>
                  {inst.phone ?? <span className="text-muted">—</span>}
                </td>
                {isAdmin && (
                  <td style={{ textAlign: 'center' }}>
                    {inst.users_count ?? 0}
                  </td>
                )}
                <td>
                  {inst.is_active ? (
                    <span className="badge badge-green">Activa</span>
                  ) : (
                    <span className="badge badge-red">Inactiva</span>
                  )}
                </td>
                <td>
                  <div className="action-group">
                    <Link
                      to={`/institutions/${inst.id}`}
                      className="btn btn-sm btn-secondary"
                    >
                      {isAdmin ? 'Editar' : 'Ver / Editar contacto'}
                    </Link>
                    {isAdmin && inst.is_active && (
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDeactivate(inst.id, inst.name)}
                      >
                        Desactivar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Layout>
  )
}
