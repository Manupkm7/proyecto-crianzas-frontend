import { useState } from 'react'
import api from '../api/client'

// Tarjeta que muestra (y permite editar) el registro educativo de un niño.
// Props:
//   childId  — UUID del niño
//   record   — objeto EducationRecord o null si no existe aún
//   canEdit  — si el usuario tiene permisos para crear/editar
//   onRefresh — función para recargar el niño padre después de guardar
export default function EducationRecordCard({ childId, record, canEdit, onRefresh }) {
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [form, setForm] = useState({
    school_name: record?.school_name ?? '',
    grade_or_year: record?.grade_or_year ?? '',
    absences_count: record?.absences_count ?? 0,
    is_enrolled: record?.is_enrolled ?? true,
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
      await api[method](`/children/${childId}/education-record`, form)
      setEditing(false)
      onRefresh()
    } catch (err) {
      setError(err.response?.data?.message ?? 'Error al guardar el registro educativo.')
    } finally {
      setLoading(false)
    }
  }

  // Vista de solo lectura
  if (!editing) {
    return (
      <div className="record-card record-card--education">
        <div className="record-card-header">
          <h3>📚 Registro educativo</h3>
          {canEdit && (
            <button className="btn btn-sm" onClick={() => setEditing(true)}>
              {record ? 'Editar' : 'Cargar registro'}
            </button>
          )}
        </div>

        {!record ? (
          <p className="text-muted">Sin registro educativo cargado.</p>
        ) : (
          <dl className="detail-list">
            <dt>Escuela</dt>
            <dd>{record.school_name}</dd>

            <dt>Grado / Sala</dt>
            <dd>{record.grade_or_year || '—'}</dd>

            <dt>Inasistencias</dt>
            <dd>
              <span className={record.absences_count > 10 ? 'text-warning' : ''}>
                {record.absences_count}
              </span>
            </dd>

            <dt>Escolarizado</dt>
            <dd>
              {record.is_enrolled ? (
                <span className="badge badge-green">Sí</span>
              ) : (
                <span className="badge badge-red">No ⚠</span>
              )}
            </dd>

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
    <div className="record-card record-card--education">
      <div className="record-card-header">
        <h3>📚 {record ? 'Editar registro educativo' : 'Cargar registro educativo'}</h3>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSave} className="form form-compact">
        <div className="field">
          <label htmlFor="edu-school_name">Nombre de la escuela *</label>
          <input
            id="edu-school_name"
            name="school_name"
            type="text"
            value={form.school_name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="edu-grade_or_year">Grado / Sala</label>
          <input
            id="edu-grade_or_year"
            name="grade_or_year"
            type="text"
            value={form.grade_or_year}
            onChange={handleChange}
            placeholder="Ej: 1er grado, Sala de 4"
          />
        </div>

        <div className="field">
          <label htmlFor="edu-absences_count">Cantidad de inasistencias</label>
          <input
            id="edu-absences_count"
            name="absences_count"
            type="number"
            min={0}
            max={9999}
            value={form.absences_count}
            onChange={handleChange}
          />
        </div>

        <div className="field field-checkbox">
          <input
            id="edu-is_enrolled"
            name="is_enrolled"
            type="checkbox"
            checked={form.is_enrolled}
            onChange={handleChange}
          />
          <label htmlFor="edu-is_enrolled">Actualmente escolarizado</label>
        </div>

        <div className="field">
          <label htmlFor="edu-observations">Observaciones</label>
          <textarea
            id="edu-observations"
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
