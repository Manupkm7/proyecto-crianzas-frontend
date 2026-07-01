import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'

export default function ChildrenListPage() {
  const { user } = useAuth()
  const [children, setChildren] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchChildren()
  }, [])

  async function fetchChildren() {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get('/children')
      // El backend devuelve { data: [...], links: {...}, meta: {...} } (paginado)
      setChildren(data.data ?? data)
    } catch (err) {
      setError(err.response?.data?.message ?? 'Error al cargar la lista de niños.')
    } finally {
      setLoading(false)
    }
  }

  // Filtro local por nombre (sin re-request al servidor — la lista es pequeña en desarrollo)
  const filtered = children.filter((child) => {
    if (!search) return true
    const full = `${child.first_name} ${child.last_name}`.toLowerCase()
    return full.includes(search.toLowerCase())
  })

  const role = user?.roles?.[0]
  const canCreate = role !== 'coordinador'

  return (
    <Layout>
      <div className="page-header">
        <h1>Niños</h1>
        {canCreate && (
          <Link to="/children/new" className="btn btn-primary">
            + Registrar niño
          </Link>
        )}
      </div>

      <div className="toolbar">
        <input
          type="search"
          placeholder="Buscar por nombre o apellido…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
      </div>

      {loading && <p className="text-muted">Cargando…</p>}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && !error && filtered.length === 0 && (
        <div className="empty-state">
          <p>No hay niños registrados{search ? ' que coincidan con la búsqueda' : ''}.</p>
          {canCreate && !search && (
            <Link to="/children/new" className="btn btn-secondary">
              Registrar el primero
            </Link>
          )}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Apellido</th>
              <th>Edad</th>
              <th>Registro educativo</th>
              <th>Registro de salud</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((child) => (
              <tr key={child.id}>
                <td>{child.first_name}</td>
                <td>{child.last_name}</td>
                <td>{child.age ?? '—'} años</td>
                <td>
                  {child.education_record ? (
                    <span className="badge badge-blue">{child.education_record.school_name}</span>
                  ) : (
                    <span className="badge badge-gray">Sin registro</span>
                  )}
                </td>
                <td>
                  {child.health_record ? (
                    <span className="badge badge-green">{child.health_record.health_center_name}</span>
                  ) : (
                    <span className="badge badge-gray">Sin registro</span>
                  )}
                </td>
                <td>
                  <Link to={`/children/${child.id}`} className="btn btn-sm">
                    Ver detalle
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Layout>
  )
}
