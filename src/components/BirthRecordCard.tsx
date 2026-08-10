import { useState, type ChangeEvent, type FormEvent } from 'react'
import { isAxiosError } from 'axios'
import { useInstitutionsQuery } from '../hooks/useInstitutions'
import { useSaveBirthRecordMutation } from '../hooks/useChildRecords'
import type { ApiErrorBody, BirthRecord } from '../types'

interface BirthRecordCardProps {
  childId: string
  record: BirthRecord | null | undefined
  canEdit: boolean
  onRefresh: () => void
}

// Tarjeta que muestra (y permite editar) el registro de nacimiento de un niño.
// Solo admin puede crear/editar — la mayoría de estos registros llegan por importación masiva.
export default function BirthRecordCard({ childId, record, canEdit, onRefresh }: BirthRecordCardProps) {
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const saveRecord = useSaveBirthRecordMutation(childId)
  const loading = saveRecord.isPending
  const { data: institutions = [] } = useInstitutionsQuery({ enabled: editing })

  const [form, setForm] = useState({
    first_name: record?.first_name ?? '',
    last_name: record?.last_name ?? '',
    birth_date: record?.birth_date ?? '',
    mother_name: record?.mother_name ?? '',
    mother_dni: record?.mother_dni ?? '',
    father_name: record?.father_name ?? '',
    father_dni: record?.father_dni ?? '',
    address: record?.address ?? '',
    birth_establishment: record?.birth_establishment ?? '',
    observations: record?.observations ?? '',
    institution_id: record?.institution?.id ?? '',
  })

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const payload = { ...form, institution_id: form.institution_id || null }
      await saveRecord.mutateAsync({ exists: Boolean(record), data: payload })
      setEditing(false)
      onRefresh()
    } catch (err) {
      const message = isAxiosError<ApiErrorBody>(err) ? err.response?.data?.message : undefined
      setError(message ?? 'Error al guardar el registro de nacimiento.')
    }
  }

  if (!editing) {
    return (
      <div className="record-card">
        <div className="record-card-header">
          <h3>👶 Registro de nacimiento</h3>
          {canEdit && (
            <button className="btn btn-sm" onClick={() => setEditing(true)}>
              {record ? 'Editar' : 'Cargar registro'}
            </button>
          )}
        </div>

        {!record ? (
          <p className="text-muted">Sin registro de nacimiento cargado.</p>
        ) : (
          <dl className="detail-list">
            <dt>Madre</dt>
            <dd>{record.mother_name || '—'} {record.mother_dni ? `(DNI ${record.mother_dni})` : ''}</dd>

            <dt>Padre</dt>
            <dd>{record.father_name || '—'} {record.father_dni ? `(DNI ${record.father_dni})` : ''}</dd>

            <dt>Domicilio</dt>
            <dd>{record.address || '—'}</dd>

            <dt>Establecimiento</dt>
            <dd>{record.birth_establishment || '—'}</dd>

            {record.institution && (
              <>
                <dt>Institución que registró</dt>
                <dd>{record.institution.name}</dd>
              </>
            )}

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

  return (
    <div className="record-card">
      <div className="record-card-header">
        <h3>👶 {record ? 'Corregir registro de nacimiento' : 'Cargar registro de nacimiento'}</h3>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSave} className="form form-compact">
        <div className="form-row">
          <div className="field">
            <label htmlFor="birth-first_name">Nombre *</label>
            <input id="birth-first_name" name="first_name" type="text" value={form.first_name} onChange={handleChange} required />
          </div>
          <div className="field">
            <label htmlFor="birth-last_name">Apellido *</label>
            <input id="birth-last_name" name="last_name" type="text" value={form.last_name} onChange={handleChange} required />
          </div>
        </div>

        <div className="field">
          <label htmlFor="birth-birth_date">Fecha de nacimiento *</label>
          <input
            id="birth-birth_date"
            name="birth_date"
            type="date"
            value={form.birth_date}
            onChange={handleChange}
            required
            max={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div className="form-row">
          <div className="field">
            <label htmlFor="birth-mother_name">Nombre de la madre</label>
            <input id="birth-mother_name" name="mother_name" type="text" value={form.mother_name} onChange={handleChange} />
          </div>
          <div className="field">
            <label htmlFor="birth-mother_dni">DNI de la madre</label>
            <input id="birth-mother_dni" name="mother_dni" type="text" value={form.mother_dni} onChange={handleChange} maxLength={15} />
          </div>
        </div>

        <div className="form-row">
          <div className="field">
            <label htmlFor="birth-father_name">Nombre del padre</label>
            <input id="birth-father_name" name="father_name" type="text" value={form.father_name} onChange={handleChange} />
          </div>
          <div className="field">
            <label htmlFor="birth-father_dni">DNI del padre</label>
            <input id="birth-father_dni" name="father_dni" type="text" value={form.father_dni} onChange={handleChange} maxLength={15} />
          </div>
        </div>

        <div className="field">
          <label htmlFor="birth-address">Domicilio</label>
          <input id="birth-address" name="address" type="text" value={form.address} onChange={handleChange} />
        </div>

        <div className="field">
          <label htmlFor="birth-birth_establishment">Establecimiento donde ocurrió el nacimiento</label>
          <input
            id="birth-birth_establishment"
            name="birth_establishment"
            type="text"
            value={form.birth_establishment}
            onChange={handleChange}
            placeholder="Ej: Hospital Municipal"
          />
        </div>

        <div className="field">
          <label htmlFor="birth-institution_id">Institución que registró (opcional)</label>
          <select id="birth-institution_id" name="institution_id" value={form.institution_id} onChange={handleChange}>
            <option value="">Sin institución</option>
            {institutions.map((inst) => (
              <option key={inst.id} value={inst.id}>{inst.name}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="birth-observations">Observaciones</label>
          <textarea id="birth-observations" name="observations" value={form.observations} onChange={handleChange} rows={3} />
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
