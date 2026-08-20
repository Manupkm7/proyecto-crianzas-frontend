import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { useUserQuery, useCreateUserMutation, useUpdateUserMutation } from '../hooks/useUsers'
import { useInstitutionsQuery } from '../hooks/useInstitutions'
import { useAuth } from '../context/AuthContext'
import type { ApiErrorBody, Role } from '../types'

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
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user: authUser } = useAuth()
  const isEdit = Boolean(id)
  const isSelf = id === authUser?.id

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | null>>({})

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    dni: '',
    role: 'representante' as Role,
    institution_id: '',
    is_active: true,
  })

  const authRole = authUser?.roles?.[0]
  const isAdmin = authRole === 'admin'
  const isInstitucion = authRole === 'institucion'

  // Solo admin puede crear usuarios; isInstitucion solo puede editar los existentes
  const availableRoles: { value: Role; label: string }[] = [
    { value: 'admin', label: 'Administrador' },
    { value: 'coordinador', label: 'Coordinador' },
    { value: 'institucion', label: 'Responsable de institución' },
    { value: 'representante', label: 'Representante' },
  ]

  // Estos roles requieren que el usuario pertenezca a una institución
  const roleNeedsInstitution = ['institucion', 'representante'].includes(form.role)

  // Admin necesita la lista de instituciones para el selector
  const { data: institutions = [] } = useInstitutionsQuery({ enabled: isAdmin })
  const { data: fetchedUser, isLoading: loadingUser, error: userQueryError } = useUserQuery(
    isEdit ? id : undefined,
  )
  const createUserMutation = useCreateUserMutation()
  const updateUserMutation = useUpdateUserMutation(id ?? '')
  const loading = isEdit && loadingUser
  const saving = createUserMutation.isPending || updateUserMutation.isPending

  useEffect(() => {
    if (!fetchedUser) return
    setForm({
      name: fetchedUser.name ?? '',
      email: fetchedUser.email ?? '',
      password: '',
      dni: fetchedUser.dni ?? '',
      role: fetchedUser.roles?.[0] ?? 'representante',
      institution_id: fetchedUser.institution?.id ?? '',
      is_active: fetchedUser.is_active ?? true,
    })
  }, [fetchedUser])

  useEffect(() => {
    if (userQueryError) setError('No se pudo cargar el usuario.')
  }, [userQueryError])

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value, type } = e.target
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
    // Limpia el error de campo al editar
    setFieldErrors((fe) => ({ ...fe, [name]: null }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setFieldErrors({})

    try {
      const payload: Partial<typeof form> = { ...form }

      // En edición, no enviar password si está vacío
      if (isEdit && !payload.password) {
        delete payload.password
      }

      // No enviar institution_id ni dni si el rol no los requiere
      if (!roleNeedsInstitution) {
        delete payload.institution_id
        delete payload.dni
      }

      if (isEdit && id) {
        await updateUserMutation.mutateAsync(payload)
        setSuccess('Usuario actualizado correctamente.')
      } else {
        await createUserMutation.mutateAsync(payload)
        navigate('/users')
      }
    } catch (err) {
      if (isAxiosError<ApiErrorBody>(err) && err.response?.status === 422) {
        const errs = err.response.data.errors ?? {}
        setFieldErrors(errs)
        setError('Hay errores en el formulario. Revisá los campos marcados en rojo.')
      } else {
        const message = isAxiosError<ApiErrorBody>(err) ? err.response?.data?.message : undefined
        setError(message ?? 'Error al guardar el usuario.')
      }
    }
  }

  if (loading) {
    return (
        <p className="text-muted">Cargando…</p>
    )
  }

  return (
    <>
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

          {/* DNI: solo para institución/representante — es con lo que inician sesión */}
          {roleNeedsInstitution && (
            <div className="form-row">
              <div className="field">
                <label htmlFor="dni">DNI *</label>
                <input
                  id="dni"
                  type="text"
                  inputMode="numeric"
                  name="dni"
                  value={form.dni}
                  onChange={handleChange}
                  required
                  placeholder="8 dígitos, sin puntos ni espacios"
                />
                <span className="field-error" style={{ color: 'var(--color-muted)', fontWeight: 'normal' }}>
                  Con este DNI y su contraseña puede iniciar sesión desde "Soy representante".
                </span>
                {fieldErrors.dni && (
                  <span className="field-error">{fieldErrors.dni[0]}</span>
                )}
              </div>
            </div>
          )}

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
    </>
  )
}
