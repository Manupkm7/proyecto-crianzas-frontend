import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { getUser, createUser, updateUser } from '../api/users'
import { getInstitutions } from '../api/institutions'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'

/**
 * UserFormPage — Formulario para crear o editar un usuario.
 *
 * Modo creación: /users/new
 * Modo edición:  /users/:id
 *
 * El formulario se adapta al rol del usuario autenticado:
 * - Admin: puede asignar cualquier rol y cualquier institución.
 * - Responsable de institución: solo puede crear representantes en su propia institución.
 * - Cualquier usuario: puede editar su propio nombre, email y contraseña.
 */
export default function UserFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user: authUser } = useAuth()
  const isEdit = Boolean(id)
  const isSelf = id === authUser?.id

  const [institutions, setInstitutions] = useState([])
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'representante',
    institution_id: '',
    is_active: true,
  })

  const authRole = authUser?.roles?.[0]
  const isAdmin = authRole === 'admin'
  const isInstitucion = authRole === 'institucion'

  // Roles disponibles según quién está creando el usuario
  const availableRoles = isAdmin
    ? [
        { value: 'admin', label: 'Administrador' },
        { value: 'coordinador', label: 'Coordinador' },
        { value: 'institucion', label: 'Responsable de institución' },
        { value: 'representante', label: 'Representante' },
      ]
    : [{ value: 'representante', label: 'Representante' }]

  // Estos roles requieren que el usuario pertenezca a una institución
  const roleNeedsInstitution = ['institucion', 'representante'].includes(form.role)

  useEffect(() => {
    // Admin necesita la lista de instituciones para el selector
    if (isAdmin) {
      getInstitutions()
        .then(({ data }) => setInstitutions(data.data ?? data))
        .catch(() => {})
    }

    if (isEdit) {
      getUser(id)
        .then(({ data }) => {
          const u = data.data
          setForm({
            name: u.name ?? '',
            email: u.email ?? '',
            password: '',
            role: u.roles?.[0] ?? 'representante',
            institution_id: u.institution?.id ?? '',
            is_active: u.is_active ?? true,
          })
        })
        .catch(() => setError('No se pudo cargar el usuario.'))
        .finally(() => setLoading(false))
    }
  }, [id, isAdmin, isEdit])

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
    // Limpia el error de campo al editar
    setFieldErrors((fe) => ({ ...fe, [name]: null }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)
    setFieldErrors({})

    try {
      const payload = { ...form }

      // En edición, no enviar password si está vacío
      if (isEdit && !payload.password) {
        delete payload.password
      }

      // No enviar institution_id si el rol no lo requiere
      if (!roleNeedsInstitution) {
        delete payload.institution_id
      }

      // Si es responsable de institución, siempre asigna su propia institución
      if (isInstitucion && roleNeedsInstitution) {
        payload.institution_id = authUser.institution?.id ?? form.institution_id
      }

      if (isEdit) {
        await updateUser(id, payload)
        setSuccess('Usuario actualizado correctamente.')
      } else {
        await createUser(payload)
        navigate('/users')
      }
    } catch (err) {
      if (err.response?.status === 422) {
        const errs = err.response.data.errors ?? {}
        setFieldErrors(errs)
        setError('Hay errores en el formulario. Revisá los campos marcados en rojo.')
      } else {
        setError(err.response?.data?.message ?? 'Error al guardar el usuario.')
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <p className="text-muted">Cargando…</p>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="page-header">
        <div>
          <Link to="/users" className="back-link">← Volver a usuarios</Link>
          <h1>
            {isSelf ? 'Mi perfil' : isEdit ? 'Editar usuario' : 'Nuevo usuario'}
          </h1>
        </div>
        {isEdit && isInstitucion && !isSelf && (
          <Link to={`/users/${id}/activity`} className="btn btn-secondary">
            Ver actividad
          </Link>
        )}
        {isEdit && isAdmin && (
          <Link to={`/users/${id}/activity`} className="btn btn-secondary">
            Ver actividad
          </Link>
        )}
      </div>

      <div className="form-card">
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form className="form" onSubmit={handleSubmit}>
          {/* Datos básicos */}
          <div className="form-row">
            <div className="field">
              <label htmlFor="name">Nombre completo *</label>
              <input
                id="name"
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                autoComplete="name"
              />
              {fieldErrors.name && (
                <span className="field-error">{fieldErrors.name[0]}</span>
              )}
            </div>

            <div className="field">
              <label htmlFor="email">Correo electrónico *</label>
              <input
                id="email"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                autoComplete="email"
              />
              {fieldErrors.email && (
                <span className="field-error">{fieldErrors.email[0]}</span>
              )}
            </div>
          </div>

          {/* Contraseña */}
          <div className="field">
            <label htmlFor="password">
              {isEdit ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}
            </label>
            <input
              id="password"
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required={!isEdit}
              autoComplete="new-password"
            />
            {!isEdit && (
              <span className="field-error" style={{ color: 'var(--color-muted)', fontWeight: 'normal' }}>
                Mínimo 12 caracteres, con mayúsculas, minúsculas, números y símbolos.
              </span>
            )}
            {fieldErrors.password && (
              <span className="field-error">{fieldErrors.password[0]}</span>
            )}
          </div>

          {/* Rol e institución: solo para admin/responsable gestionando otros usuarios */}
          {!isSelf && (
            <div className="form-row">
              <div className="field">
                <label htmlFor="role">Rol *</label>
                <select
                  id="role"
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  disabled={isEdit && !isAdmin}
                >
                  {availableRoles.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                {fieldErrors.role && (
                  <span className="field-error">{fieldErrors.role[0]}</span>
                )}
              </div>

              {roleNeedsInstitution && (
                <div className="field">
                  <label htmlFor="institution_id">Institución *</label>
                  {isAdmin ? (
                    <select
                      id="institution_id"
                      name="institution_id"
                      value={form.institution_id}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Seleccionar institución…</option>
                      {institutions.map((inst) => (
                        <option key={inst.id} value={inst.id}>
                          {inst.name} ({inst.type_label})
                        </option>
                      ))}
                    </select>
                  ) : (
                    // Responsable de institución: siempre es la propia institución
                    <input
                      type="text"
                      value={authUser?.institution?.name ?? '—'}
                      disabled
                      style={{ background: '#f8fafc', color: 'var(--color-muted)' }}
                    />
                  )}
                  {fieldErrors.institution_id && (
                    <span className="field-error">{fieldErrors.institution_id[0]}</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Estado activo/inactivo: solo en edición y solo para quien puede gestionar */}
          {isEdit && !isSelf && (isAdmin || isInstitucion) && (
            <div className="field field-checkbox">
              <input
                type="checkbox"
                id="is_active"
                name="is_active"
                checked={form.is_active}
                onChange={handleChange}
              />
              <label htmlFor="is_active">Usuario activo (puede iniciar sesión)</label>
            </div>
          )}

          <div className="form-actions">
            <Link to="/users" className="btn btn-secondary">
              Cancelar
            </Link>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  )
}
