import { useState } from 'react'
import api from '../api/client'

// Tarjeta que muestra (y permite editar) el registro de salud de un niño.
// Props:
//   childId  — UUID del niño
//   record   — objeto HealthRecord o null si no existe aún
//   canEdit  — si el usuario tiene permisos para crear/editar
//   onRefresh — función para recargar el niño padre después de guardar
export default function HealthRecordCard({ childId, record, canEdit, onRefresh }) {
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [form, setForm] = useState({
    health_center_name: record?.health_center_name ?? '',
    healthy_checkup_current: record?.healthy_checkup_current ?? false,
    vaccines_current: record?.vaccines_current ?? false,
    last_checkup_date: record?.last_checkup_date ?? '',
    observations: record?.observations ?? '',
  })

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  async function handleSave(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const method = record ? 'patch' : 'post'
      await api[method](`/children/${childId}/health-record`, form)
      setEditing(false)
      onRefresh()
    } catch (err) {
      setError(err.response?.data?.message ?? 'Error al guardar el registro de salud.')
    } finally {
      setLoading(false)
    }
  }

  // Vista de solo lectura
  if (!editing) {
    return (
      <div className="record-card record-card--health">
        <div className="record-card-header">
          <h3>🏥 Registro de salud</h3>
          {canEdit && (
            <button className="btn btn-sm" onClick={() => setEditing(true)}>
              {record ? 'Editar' : 'Cargar registro'}
            </button>
          )}
        </div>

        {!record ? (
          <p className="text-muted">Sin registro de salud cargado.</p>
        ) : (
          <dl className="detail-list">
            <dt>Centro de salud</dt>
            <dd>{record.health_center_name}</dd>

            <dt>Control de niño sano</dt>
            <dd>
              {record.healthy_checkup_current ? (
                <span className="badge badge-green">Al día</span>
              ) : (
                <span className="badge badge-red">No al día ⚠</span>
              )}
            </dd>

            <dt>Vacunas</dt>
            <dd>
              {record.vaccines_current ? (
                <span className="badge badge-green">Al día</span>
              ) : (
                <span className="badge badge-red">No al día ⚠</span>
              )}
            </dd>

            <dt>Último control</dt>
            <dd>{record.last_checkup_date || '—'}</dd>

            {record.observations && (
              <>
                <dt>Observaciones</dt>
                <dd>{record.observations}</dd>
              </>
            )}
          </dl>
        )}
      </div>
    )
  }

  // Formulario de edición
  return (
    <div className="record-card record-card--health">
      <div className="record-card-header">
        <h3>🏥 {record ? 'Editar registro de salud' : 'Cargar registro de salud'}</h3>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSave} className="form form-compact">
        <div className="field">
          <label htmlFor="hlth-health_center_name">Centro de salud / Salita / Hospital *</label>
          <input
            id="hlth-health_center_name"
            name="health_center_name"
            type="text"
            value={form.health_center_name}
            onChange={handleChange}
            required
            placeholder="Ej: CAPS N°3, Hospital Municipal"
          />
        </div>

        <div className="field field-checkbox">
          <input
            id="hlth-healthy_checkup_current"
            name="healthy_checkup_current"
            type="checkbox"
            checked={form.healthy_checkup_current}
            onChange={handleChange}
          />
          <label htmlFor="hlth-healthy_checkup_current">Control de niño sano al día</label>
        </div>

        <div className="field field-checkbox">
          <input
            id="hlth-vaccines_current"
            name="vaccines_current"
            type="checkbox"
            checked={form.vaccines_current}
            onChange={handleChange}
          />
          <label htmlFor="hlth-vaccines_current">Vacunas al día</label>
        </div>

        <div className="field">
          <label htmlFor="hlth-last_checkup_date">Fecha del último control</label>
          <input
            id="hlth-last_checkup_date"
            name="last_checkup_date"
            type="date"
            value={form.last_checkup_date}
            onChange={handleChange}
            max={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div className="field">
          <label htmlFor="hlth-observations">Observaciones</label>
          <textarea
            id="hlth-observations"
            name="observations"
            value={form.observations}
            onChange={handleChange}
            rows={3}
          />
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  )
}
