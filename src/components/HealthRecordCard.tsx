import { useState, type ChangeEvent, type FormEvent } from 'react'
import { isAxiosError } from 'axios'
import { useSaveHealthRecordMutation } from '../hooks/useChildRecords'
import { useAuth } from '../context/AuthContext'
import { useInstitutionOptions } from '../hooks/useInstitutionOptions'
import type { ApiErrorBody, HealthRecord } from '../types'

interface HealthRecordCardProps {
  childId: string
  record: HealthRecord | null | undefined
  canEdit: boolean
  onRefresh: () => void
}

// Tarjeta que muestra (y permite editar) el registro de salud de un niño.
export default function HealthRecordCard({
  childId,
  record,
  canEdit,
  onRefresh,
}: HealthRecordCardProps) {
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const saveRecord = useSaveHealthRecordMutation(childId)
  const loading = saveRecord.isPending
  const { user } = useAuth()
  const isAdmin = user?.roles?.[0] === 'admin'

  // El admin no tiene institución propia — al cargar un registro nuevo, elige a
  // qué institución de salud pertenece. El resto de los usuarios usa la suya.
  const healthInstitutions = useInstitutionOptions('salud', isAdmin && !record)
  const [institutionId, setInstitutionId] = useState('')

  const [form, setForm] = useState({
    health_center_name: record?.health_center_name ?? '',
    healthy_checkup_current: record?.healthy_checkup_current ?? false,
    vaccines_current: record?.vaccines_current ?? false,
    last_checkup_date: record?.last_checkup_date ?? '',
    observations: record?.observations ?? '',
  })

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await saveRecord.mutateAsync({
        exists: Boolean(record),
        data: {
          ...form,
          ...(isAdmin && !record ? { institution_id: institutionId } : {}),
        },
      })
      setEditing(false)
      onRefresh()
    } catch (err) {
      const message = isAxiosError<ApiErrorBody>(err)
        ? err.response?.data?.message
        : undefined
      setError(message ?? 'Error al guardar el registro de salud.')
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
        {isAdmin && !record && (
          <div className="field">
            <label htmlFor="hlth-institution_id">Institución de salud *</label>
            <select
              id="hlth-institution_id"
              value={institutionId}
              onChange={(e) => setInstitutionId(e.target.value)}
              required
            >
              <option value="">Elegir…</option>
              {healthInstitutions.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </div>
        )}

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
