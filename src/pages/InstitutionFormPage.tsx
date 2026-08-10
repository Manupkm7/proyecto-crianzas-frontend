import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { isAxiosError } from 'axios'
import {
  useInstitutionQuery,
  useCreateInstitutionMutation,
  useUpdateInstitutionMutation,
} from '../hooks/useInstitutions'
import { useAuth } from '../context/AuthContext'
import type { ApiErrorBody, InstitutionType } from '../types'

const INSTITUTION_TYPES: { value: InstitutionType; label: string }[] = [
  { value: 'salud', label: 'Salud' },
  { value: 'educacion', label: 'Educación' },
  { value: 'desarrollo_social', label: 'Desarrollo Social' },
  { value: 'justicia', label: 'Justicia' },
  { value: 'otro', label: 'Otro' },
]

/**
 * InstitutionFormPage — Formulario para crear o editar una institución.
 *
 * Modo creación:  /institutions/new        — solo admin
 * Modo edición:   /institutions/:id        — admin (todos los campos)
 *                                          — responsable de institución (dirección y teléfono)
 *
 * El backend ya rechaza modificaciones no autorizadas (403), pero el formulario
 * también oculta o deshabilita los campos según el rol para una mejor experiencia.
 */
export default function InstitutionFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user: authUser } = useAuth()
  const isEdit = Boolean(id)

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | null>>({})

  const [form, setForm] = useState({
    name: '',
    type: 'salud' as InstitutionType,
    address: '',
    phone: '',
    is_active: true,
    offers_jardin: false,
    offers_primario: false,
    primario_years: 6 as 6 | 7,
    offers_secundario: false,
    secundario_years: 6 as 6 | 7,
  })

  const authRole = authUser?.roles?.[0]
  const isAdmin = authRole === 'admin'
  const isInstitucion = authRole === 'institucion'

  // El responsable solo puede editar datos de contacto; nombre y tipo son de solo lectura
  const canEditSensitiveFields = isAdmin

  const { data: fetchedInstitution, isLoading: loadingInstitution, error: institutionQueryError } =
    useInstitutionQuery(isEdit ? id : undefined)
  const createInstitutionMutation = useCreateInstitutionMutation()
  const updateInstitutionMutation = useUpdateInstitutionMutation(id ?? '')
  const loading = isEdit && loadingInstitution
  const saving = createInstitutionMutation.isPending || updateInstitutionMutation.isPending

  useEffect(() => {
    if (!fetchedInstitution) return
    setForm({
      name: fetchedInstitution.name ?? '',
      type: fetchedInstitution.type ?? 'salud',
      address: fetchedInstitution.address ?? '',
      phone: fetchedInstitution.phone ?? '',
      is_active: fetchedInstitution.is_active ?? true,
      offers_jardin: fetchedInstitution.offers_jardin ?? false,
      offers_primario: fetchedInstitution.offers_primario ?? false,
      primario_years: (fetchedInstitution.primario_years as 6 | 7) ?? 6,
      offers_secundario: fetchedInstitution.offers_secundario ?? false,
      secundario_years: (fetchedInstitution.secundario_years as 6 | 7) ?? 6,
    })
  }, [fetchedInstitution])

  useEffect(() => {
    if (institutionQueryError) setError('No se pudo cargar la institución.')
  }, [institutionQueryError])

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value, type } = e.target
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
    setFieldErrors((fe) => ({ ...fe, [name]: null }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setFieldErrors({})

    try {
      // El responsable solo envía los campos que le corresponden editar
      const payload = canEditSensitiveFields
        ? { ...form }
        : { address: form.address, phone: form.phone }

      if (isEdit && id) {
        await updateInstitutionMutation.mutateAsync(payload)
        setSuccess('Institución actualizada correctamente.')
      } else {
        await createInstitutionMutation.mutateAsync(payload)
        navigate('/institutions')
      }
    } catch (err) {
      if (isAxiosError<ApiErrorBody>(err) && err.response?.status === 422) {
        const errs = err.response.data.errors ?? {}
        setFieldErrors(errs)
        setError('Hay errores en el formulario. Revisá los campos marcados en rojo.')
      } else {
        const message = isAxiosError<ApiErrorBody>(err) ? err.response?.data?.message : undefined
        setError(message ?? 'Error al guardar la institución.')
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
          <Link to="/institutions" className="back-link">← Volver a instituciones</Link>
          <h1>{isEdit ? form.name || 'Editar institución' : 'Nueva institución'}</h1>
          {isInstitucion && (
            <p className="text-muted" style={{ marginTop: '0.25rem', fontSize: '0.875rem' }}>
              Podés actualizar la dirección y el teléfono de contacto de tu institución.
            </p>
          )}
        </div>
      </div>

      <div className="form-card">
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form className="form" onSubmit={handleSubmit}>
          {/* Nombre — solo admin puede modificarlo */}
          <div className="field">
            <label htmlFor="name">Nombre de la institución *</label>
            <input
              id="name"
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              required={!isEdit || canEditSensitiveFields}
              disabled={!canEditSensitiveFields}
              style={!canEditSensitiveFields ? { background: '#f8fafc', color: 'var(--color-muted)' } : {}}
            />
            {fieldErrors.name && (
              <span className="field-error">{fieldErrors.name[0]}</span>
            )}
            {!canEditSensitiveFields && (
              <span className="field-error" style={{ color: 'var(--color-muted)', fontWeight: 'normal' }}>
                El nombre solo puede modificarlo el administrador del sistema.
              </span>
            )}
          </div>

          {/* Tipo — solo admin puede modificarlo */}
          <div className="form-row">
            <div className="field">
              <label htmlFor="type">Tipo de institución *</label>
              <select
                id="type"
                name="type"
                value={form.type}
                onChange={handleChange}
                required={canEditSensitiveFields}
                disabled={!canEditSensitiveFields}
              >
                {INSTITUTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              {fieldErrors.type && (
                <span className="field-error">{fieldErrors.type[0]}</span>
              )}
              {!canEditSensitiveFields && (
                <span className="field-error" style={{ color: 'var(--color-muted)', fontWeight: 'normal' }}>
                  El tipo solo puede modificarlo el administrador.
                </span>
              )}
            </div>

            {/* Estado activo/inactivo — solo admin en modo edición */}
            {isEdit && canEditSensitiveFields && (
              <div className="field" style={{ justifyContent: 'flex-end' }}>
                <label>Estado</label>
                <div className="field-checkbox" style={{ marginTop: '0.5rem' }}>
                  <input
                    type="checkbox"
                    id="is_active"
                    name="is_active"
                    checked={form.is_active}
                    onChange={handleChange}
                  />
                  <label htmlFor="is_active">Institución activa</label>
                </div>
              </div>
            )}
          </div>

          {/* Niveles educativos — solo admin, solo cuando el tipo es 'educacion' */}
          {canEditSensitiveFields && form.type === 'educacion' && (
            <div className="field">
              <label>Niveles educativos que ofrece</label>

              <div className="field-checkbox">
                <input
                  type="checkbox"
                  id="offers_jardin"
                  name="offers_jardin"
                  checked={form.offers_jardin}
                  onChange={handleChange}
                />
                <label htmlFor="offers_jardin">Jardín maternal e infantil (sala 1 a 5)</label>
              </div>

              <div className="field-checkbox">
                <input
                  type="checkbox"
                  id="offers_primario"
                  name="offers_primario"
                  checked={form.offers_primario}
                  onChange={handleChange}
                />
                <label htmlFor="offers_primario">Primario</label>
              </div>
              {form.offers_primario && (
                <div className="field" style={{ marginLeft: '1.5rem', maxWidth: '220px' }}>
                  <label htmlFor="primario_years">Cantidad de años de primario</label>
                  <select
                    id="primario_years"
                    name="primario_years"
                    value={form.primario_years}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, primario_years: Number(e.target.value) as 6 | 7 }))
                    }
                  >
                    <option value={6}>6 años</option>
                    <option value={7}>7 años</option>
                  </select>
                </div>
              )}

              <div className="field-checkbox">
                <input
                  type="checkbox"
                  id="offers_secundario"
                  name="offers_secundario"
                  checked={form.offers_secundario}
                  onChange={handleChange}
                />
                <label htmlFor="offers_secundario">Secundario</label>
              </div>
              {form.offers_secundario && (
                <div className="field" style={{ marginLeft: '1.5rem', maxWidth: '220px' }}>
                  <label htmlFor="secundario_years">Cantidad de años de secundario</label>
                  <select
                    id="secundario_years"
                    name="secundario_years"
                    value={form.secundario_years}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, secundario_years: Number(e.target.value) as 6 | 7 }))
                    }
                  >
                    <option value={6}>6 años</option>
                    <option value={7}>7 años</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Datos de contacto — editables por admin y responsable */}
          <div className="form-row">
            <div className="field">
              <label htmlFor="address">Dirección</label>
              <input
                id="address"
                type="text"
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="Ej: Av. Siempreviva 742"
              />
              {fieldErrors.address && (
                <span className="field-error">{fieldErrors.address[0]}</span>
              )}
            </div>

            <div className="field">
              <label htmlFor="phone">Teléfono</label>
              <input
                id="phone"
                type="text"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="Ej: (011) 4234-5678"
              />
              {fieldErrors.phone && (
                <span className="field-error">{fieldErrors.phone[0]}</span>
              )}
            </div>
          </div>

          <div className="form-actions">
            <Link to="/institutions" className="btn btn-secondary">
              Cancelar
            </Link>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving
                ? 'Guardando…'
                : isEdit
                ? 'Guardar cambios'
                : 'Crear institución'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
