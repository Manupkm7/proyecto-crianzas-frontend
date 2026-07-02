import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { getInstitution, createInstitution, updateInstitution } from '../api/institutions'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'

const INSTITUTION_TYPES = [
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
  const { id } = useParams()
  const navigate = useNavigate()
  const { user: authUser } = useAuth()
  const isEdit = Boolean(id)

  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})

  const [form, setForm] = useState({
    name: '',
    type: 'salud',
    address: '',
    phone: '',
    is_active: true,
  })

  const authRole = authUser?.roles?.[0]
  const isAdmin = authRole === 'admin'
  const isInstitucion = authRole === 'institucion'

  // El responsable solo puede editar datos de contacto; nombre y tipo son de solo lectura
  const canEditSensitiveFields = isAdmin

  useEffect(() => {
    if (!isEdit) return

    getInstitution(id)
      .then(({ data }) => {
        const inst = data.data
        setForm({
          name:      inst.name ?? '',
          type:      inst.type ?? 'salud',
          address:   inst.address ?? '',
          phone:     inst.phone ?? '',
          is_active: inst.is_active ?? true,
        })
      })
      .catch(() => setError('No se pudo cargar la institución.'))
      .finally(() => setLoading(false))
  }, [id, isEdit])

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
    setFieldErrors((fe) => ({ ...fe, [name]: null }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)
    setFieldErrors({})

    try {
      // El responsable solo envía los campos que le corresponden editar
      const payload = canEditSensitiveFields
        ? { ...form }
        : { address: form.address, phone: form.phone }

      if (isEdit) {
        await updateInstitution(id, payload)
        setSuccess('Institución actualizada correctamente.')
      } else {
        await createInstitution(payload)
        navigate('/institutions')
      }
    } catch (err) {
      if (err.response?.status === 422) {
        const errs = err.response.data.errors ?? {}
        setFieldErrors(errs)
        setError('Hay errores en el formulario. Revisá los campos marcados en rojo.')
      } else {
        setError(err.response?.data?.message ?? 'Error al guardar la institución.')
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
    </Layout>
  )
}
