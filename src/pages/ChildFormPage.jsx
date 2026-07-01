import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api/client'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'

// Formulario para registrar un nuevo niño.
// Solo carga los datos base (nombre, apellido, fecha de nacimiento, DNI).
// El registro educativo o de salud se carga desde el detalle del niño.
export default function ChildFormPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    birth_date: '',
    dni: '',
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    // Limpia el error de campo al escribir
    setFieldErrors((prev) => ({ ...prev, [name]: null }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setFieldErrors({})

    try {
      const { data } = await api.post('/children', form)
      // Redirige al detalle del niño recién creado
      navigate(`/children/${data.data?.id ?? data.id}`)
    } catch (err) {
      if (err.response?.status === 409) {
        // Ya existe un niño con ese DNI
        const existing = err.response.data?.child
        setError(
          `Ya existe un niño con ese DNI: ${existing?.first_name} ${existing?.last_name}. ` +
          `¿Querés ver su perfil?`
        )
      } else if (err.response?.status === 422) {
        // Errores de validación del servidor
        setFieldErrors(err.response.data?.errors ?? {})
        setError('Hay errores en el formulario. Corregílos y volvé a intentar.')
      } else {
        setError(err.response?.data?.message ?? 'Error al registrar el niño.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div className="page-header">
        <div>
          <Link to="/children" className="back-link">← Volver al listado</Link>
          <h1>Registrar nuevo niño</h1>
        </div>
      </div>

      <div className="form-card">
        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="form">
          <div className="form-row">
            <div className="field">
              <label htmlFor="first_name">Nombre *</label>
              <input
                id="first_name"
                name="first_name"
                type="text"
                value={form.first_name}
                onChange={handleChange}
                required
                maxLength={100}
              />
              {fieldErrors.first_name && <span className="field-error">{fieldErrors.first_name[0]}</span>}
            </div>

            <div className="field">
              <label htmlFor="last_name">Apellido *</label>
              <input
                id="last_name"
                name="last_name"
                type="text"
                value={form.last_name}
                onChange={handleChange}
                required
                maxLength={100}
              />
              {fieldErrors.last_name && <span className="field-error">{fieldErrors.last_name[0]}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="field">
              <label htmlFor="birth_date">Fecha de nacimiento *</label>
              <input
                id="birth_date"
                name="birth_date"
                type="date"
                value={form.birth_date}
                onChange={handleChange}
                required
                max={new Date().toISOString().split('T')[0]}
              />
              {fieldErrors.birth_date && <span className="field-error">{fieldErrors.birth_date[0]}</span>}
            </div>

            <div className="field">
              <label htmlFor="dni">
                DNI{' '}
                <span className="text-muted">(opcional — se guarda cifrado)</span>
              </label>
              <input
                id="dni"
                name="dni"
                type="text"
                value={form.dni}
                onChange={handleChange}
                maxLength={15}
                placeholder="Ej: 45123456"
              />
              {fieldErrors.dni && <span className="field-error">{fieldErrors.dni[0]}</span>}
            </div>
          </div>

          <div className="field">
            <label htmlFor="notes">Notas generales <span className="text-muted">(opcional)</span></label>
            <textarea
              id="notes"
              name="notes"
              value={form.notes}
              onChange={handleChange}
              maxLength={2000}
              rows={3}
              placeholder="Observaciones generales, no vinculadas a salud ni educación específicamente."
            />
            {fieldErrors.notes && <span className="field-error">{fieldErrors.notes[0]}</span>}
          </div>

          <div className="form-actions">
            <Link to="/children" className="btn btn-secondary">Cancelar</Link>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Guardando…' : 'Registrar niño'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  )
}
