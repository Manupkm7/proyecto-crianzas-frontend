import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getUsers, deleteUser } from '../api/users'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'

const ROLE_LABELS = {
  admin: 'Administrador',
  coordinador: 'Coordinador',
  institucion: 'Responsable',
  representante: 'Representante',
}

/**
 * UsersListPage — Lista de usuarios del sistema.
 *
 * Lo que ve cada rol:
 * - Admin / Coordinador: todos los usuarios con institución y rol.
 * - Responsable de institución: solo sus representantes.
 * - Representante: no tiene acceso (redirigido por la política del backend).
 */
export default function UsersListPage() {
  const { user: authUser } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')

  const authRole = authUser?.roles?.[0]
  const isAdmin = authRole === 'admin'
  const isCoordinador = authRole === 'coordinador'
  const isInstitucion = authRole === 'institucion'
  const canCreate = isAdmin || isInstitucion

  useEffect(() => {
    fetchUsers()
  }, [])

  async function fetchUsers() {
    setLoading(true)
    setError(null)
    try {
      const { data } = await getUsers()
      setUsers(data.data ?? data)
    } catch (err) {
      setError(err.response?.data?.message ?? 'Error al cargar la lista de usuarios.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDeactivate(userId, userName) {
    if (!confirm(`¿Desactivar al usuario "${userName}"?\nNo podrá iniciar sesión hasta que sea reactivado.`)) return
    try {
      await deleteUser(userId)
      // Recargamos la lista para reflejar el cambio
      await fetchUsers()
    } catch (err) {
      alert(err.response?.data?.message ?? 'No se pudo desactivar el usuario.')
    }
  }

  const filtered = users.filter((u) => {
    if (!search) return true
    const haystack = `${u.name} ${u.email}`.toLowerCase()
    return haystack.includes(search.toLowerCase())
  })

  return (
    <Layout>
      <div className="page-header">
        <h1>Usuarios</h1>
        {canCreate && (
          <Link to="/users/new" className="btn btn-primary">
            + Nuevo usuario
          </Link>
        )}
      </div>

      <div className="toolbar">
        <input
          type="search"
          placeholder="Buscar por nombre o email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
      </div>

      {loading && <p className="text-muted">Cargando…</p>}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && !error && filtered.length === 0 && (
        <div className="empty-state">
          <p>No hay usuarios{search ? ' que coincidan con la búsqueda' : ''}.</p>
          {canCreate && !search && (
            <Link to="/users/new" className="btn btn-secondary">
              Crear el primero
            </Link>
          )}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
              {(isAdmin || isCoordinador) && <th>Institución</th>}
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => {
              const userRole = u.roles?.[0]
              const isSelf = u.id === authUser?.id
              const isRepresentante = userRole === 'representante'

              return (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>{u.email}</td>
                  <td>
                    <span className="badge badge-blue">
                      {ROLE_LABELS[userRole] ?? userRole ?? '—'}
                    </span>
                  </td>
                  {(isAdmin || isCoordinador) && (
                    <td>
                      {u.institution?.name ?? <span className="text-muted">Sin institución</span>}
                      {u.institution?.type_label && (
                        <span className="text-muted" style={{ fontSize: '0.8rem', marginLeft: '0.4rem' }}>
                          ({u.institution.type_label})
                        </span>
                      )}
                    </td>
                  )}
                  <td>
                    {u.is_active ? (
                      <span className="badge badge-green">Activo</span>
                    ) : (
                      <span className="badge badge-red">Inactivo</span>
                    )}
                  </td>
                  <td>
                    <div className="action-group">
                      <Link to={`/users/${u.id}`} className="btn btn-sm btn-secondary">
                        {isSelf ? 'Mi perfil' : 'Ver / Editar'}
                      </Link>
                      {/* El responsable puede ver la actividad de sus representantes */}
                      {isInstitucion && isRepresentante && (
                        <Link to={`/users/${u.id}/activity`} className="btn btn-sm btn-secondary">
                          Actividad
                        </Link>
                      )}
                      {/* Admin también puede ver la actividad de cualquier usuario */}
                      {isAdmin && (
                        <Link to={`/users/${u.id}/activity`} className="btn btn-sm btn-secondary">
                          Actividad
                        </Link>
                      )}
                      {/* Desactivar: no aparece si es el propio usuario o ya está inactivo */}
                      {canCreate && !isSelf && u.is_active && (
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDeactivate(u.id, u.name)}
                        >
                          Desactivar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </Layout>
  )
}
