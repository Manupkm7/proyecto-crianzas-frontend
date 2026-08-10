import { useState, type ChangeEvent, type FormEvent } from 'react'
import { isAxiosError } from 'axios'
import { useSaveEducationRecordMutation } from '../hooks/useChildRecords'
import {
  useCreateEducationObservationMutation,
  useEducationObservationsQuery,
} from '../hooks/useEducationObservations'
import { useAuth } from '../context/AuthContext'
import { useInstitutionOptions } from '../hooks/useInstitutionOptions'
import { getEducationLevelDefinitions, gradeLabel } from '../utils/educationLevels'
import type { ApiErrorBody, EducationLevel, EducationRecord } from '../types'

interface EducationRecordCardProps {
  childId: string
  record: EducationRecord | null | undefined
  /** Alertas del niño calculadas por el backend (ver ChildResource::computeAlerts). */
  alerts?: string[]
  /** Hay alerta en el otro sector (salud), sin detalle — ver ChildController::show. */
  otherSectorAlert?: boolean
  canEdit: boolean
  onRefresh: () => void
}

const EDUCATION_ALERT_MESSAGES = ['No escolarizado', 'Inasistencias elevadas']

// Tarjeta que muestra (y permite editar) el registro educativo de un niño.
export default function EducationRecordCard({
  childId,
  record,
  alerts,
  otherSectorAlert,
  canEdit,
  onRefresh,
}: EducationRecordCardProps) {
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const saveRecord = useSaveEducationRecordMutation(childId)
  const loading = saveRecord.isPending
  const { user } = useAuth()
  const isAdmin = user?.roles?.[0] === 'admin'

  // El admin no tiene institución propia — al cargar un registro nuevo, elige a
  // qué institución educativa pertenece. Se pide la lista completa siempre que es
  // admin (no solo al crear) porque también se necesita para calcular los niveles
  // educativos disponibles al editar un registro ya existente.
  const educationInstitutions = useInstitutionOptions('educacion', isAdmin)
  const [institutionId, setInstitutionId] = useState(record?.institution?.id ?? '')
  const selectedInstitution = isAdmin
    ? educationInstitutions.find((i) => i.id === institutionId)
    : user?.institution
  const levelDefinitions = getEducationLevelDefinitions(selectedInstitution)

  const [form, setForm] = useState({
    school_name: record?.school_name ?? '',
    level: record?.level ?? '',
    grade: record?.grade ?? '',
    absences_count: record?.absences_count ?? 0,
    attendance_present_days: record?.attendance_present_days ?? '',
    attendance_total_days: record?.attendance_total_days ?? '',
    attendance_period_label: record?.attendance_period_label ?? '',
    is_enrolled: record?.is_enrolled ?? true,
    observations: record?.observations ?? '',
  })

  const gradesForSelectedLevel =
    levelDefinitions.find((l) => l.level === form.level)?.maxGrade ?? 0

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value, type } = e.target
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
      ...(name === 'level' ? { grade: '' } : {}),
    }))
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
          grade: form.grade === '' ? null : Number(form.grade),
          level: form.level === '' ? null : form.level,
          attendance_present_days:
            form.attendance_present_days === '' ? null : Number(form.attendance_present_days),
          attendance_total_days:
            form.attendance_total_days === '' ? null : Number(form.attendance_total_days),
        },
      })
      setEditing(false)
      onRefresh()
    } catch (err) {
      const message = isAxiosError<ApiErrorBody>(err)
        ? err.response?.data?.message
        : undefined
      setError(message ?? 'Error al guardar el registro educativo.')
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
          <>
            <EducationRecordSections record={record} alerts={alerts} otherSectorAlert={otherSectorAlert} />
            <EducationObservationsSection childId={childId} canEdit={canEdit} />
          </>
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
        {isAdmin && !record && (
          <div className="field">
            <label htmlFor="edu-institution_id">Institución educativa *</label>
            <select
              id="edu-institution_id"
              value={institutionId}
              onChange={(e) => setInstitutionId(e.target.value)}
              required
            >
              <option value="">Elegir…</option>
              {educationInstitutions.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </div>
        )}

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

        {levelDefinitions.length > 0 && (
          <div className="form-row">
            <div className="field">
              <label htmlFor="edu-level">Nivel</label>
              <select id="edu-level" name="level" value={form.level} onChange={handleChange}>
                <option value="">Sin especificar</option>
                {levelDefinitions.map((l) => (
                  <option key={l.level} value={l.level}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            {form.level && (
              <div className="field">
                <label htmlFor="edu-grade">Grado / Sala</label>
                <select id="edu-grade" name="grade" value={form.grade} onChange={handleChange} required>
                  <option value="">Elegir…</option>
                  {Array.from({ length: gradesForSelectedLevel }, (_, i) => i + 1).map((grade) => (
                    <option key={grade} value={grade}>
                      {gradeLabel(form.level as EducationLevel, grade)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

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

        <div className="form-row">
          <div className="field">
            <label htmlFor="edu-attendance_present_days">Días asistidos</label>
            <input
              id="edu-attendance_present_days"
              name="attendance_present_days"
              type="number"
              min={0}
              max={999}
              value={form.attendance_present_days}
              onChange={handleChange}
            />
          </div>
          <div className="field">
            <label htmlFor="edu-attendance_total_days">Días totales</label>
            <input
              id="edu-attendance_total_days"
              name="attendance_total_days"
              type="number"
              min={0}
              max={999}
              value={form.attendance_total_days}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="edu-attendance_period_label">Período</label>
          <input
            id="edu-attendance_period_label"
            name="attendance_period_label"
            type="text"
            value={form.attendance_period_label}
            onChange={handleChange}
            placeholder="Ej: 1er bimestre 2026"
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

interface EducationRecordSectionsProps {
  record: EducationRecord
  alerts?: string[]
  otherSectorAlert?: boolean
}

// Vista de solo lectura organizada como pide el equipo educativo: Situación de
// matrícula, Asistencia y Alertas quedan siempre separadas y son de solo lectura
// (se cargan desde el formulario de edición, no acá).
function EducationRecordSections({ record, alerts, otherSectorAlert }: EducationRecordSectionsProps) {
  const educationAlerts = (alerts ?? []).filter((a) => EDUCATION_ALERT_MESSAGES.includes(a))
  const gradeText = record.grade_label ?? record.grade_or_year ?? '—'

  return (
    <>
      <dl className="detail-list">
        <dt>Situación de matrícula</dt>
        <dd>
          {record.is_enrolled ? (
            <span className="badge badge-green">Activa</span>
          ) : (
            <span className="badge badge-red">Inactiva</span>
          )}{' '}
          · {gradeText}
        </dd>

        <dt>Asistencia</dt>
        <dd>
          {record.attendance_present_days != null && record.attendance_total_days != null ? (
            <>
              {record.attendance_present_days} de {record.attendance_total_days} días asistidos
              {record.attendance_period_label ? ` ${record.attendance_period_label}` : ''}
            </>
          ) : (
            <span className="text-muted">Sin datos de asistencia cargados.</span>
          )}
          {' · '}
          <span className={record.absences_count > 10 ? 'text-warning' : ''}>
            {record.absences_count} inasistencias
          </span>
        </dd>

        <dt>Alertas</dt>
        <dd>
          {educationAlerts.length === 0 && !otherSectorAlert ? (
            <span className="text-muted">Sin alertas.</span>
          ) : (
            <span style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {educationAlerts.map((a) => (
                <span key={a} className="badge badge-red">
                  {a} (automática)
                </span>
              ))}
              {otherSectorAlert && (
                <span className="badge badge-gray" title="Alerta en otro sector, sin detalle por confidencialidad">
                  Alerta en otro sector (sin detalle)
                </span>
              )}
            </span>
          )}
        </dd>
      </dl>
    </>
  )
}

// Bitácora de observaciones: cada entrada queda con autor, fecha y opcionalmente
// un PDF adjunto. A diferencia del resto de esta tarjeta, esta sección sí es
// editable directamente acá — "+ Agregar observación" no reemplaza el historial.
function EducationObservationsSection({ childId, canEdit }: { childId: string; canEdit: boolean }) {
  const { data: observations, isLoading } = useEducationObservationsQuery(childId)
  const createObservation = useCreateEducationObservationMutation(childId)
  const [adding, setAdding] = useState(false)
  const [body, setBody] = useState('')
  const [attachment, setAttachment] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!body.trim()) return
    try {
      await createObservation.mutateAsync({ body: body.trim(), attachment })
      setBody('')
      setAttachment(null)
      setAdding(false)
    } catch (err) {
      const message = isAxiosError<ApiErrorBody>(err) ? err.response?.data?.message : undefined
      setError(message ?? 'Error al guardar la observación.')
    }
  }

  return (
    <div style={{ marginTop: '1.25rem' }}>
      <div className="record-card-header">
        <h3 style={{ fontSize: '0.9rem' }}>Observaciones</h3>
        {canEdit && !adding && (
          <button className="btn btn-sm" onClick={() => setAdding(true)}>
            + Agregar observación
          </button>
        )}
      </div>

      {isLoading && <p className="text-muted">Cargando observaciones…</p>}

      {!isLoading && (observations?.length ?? 0) === 0 && !adding && (
        <p className="text-muted">Sin observaciones cargadas.</p>
      )}

      {(observations?.length ?? 0) > 0 && (
        <ul className="observation-list">
          {observations!.map((obs) => (
            <li key={obs.id} className="observation-item">
              <div className="observation-meta">
                <span>{obs.author_name ?? 'Usuario'}</span>
                <span>{new Date(obs.created_at).toLocaleDateString('es-AR')}</span>
              </div>
              <p className="observation-body">{obs.body}</p>
              {obs.has_attachment && obs.attachment_url && (
                <a
                  className="observation-attachment"
                  href={obs.attachment_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  📎 {obs.attachment_name ?? 'Adjunto PDF'}
                </a>
              )}
            </li>
          ))}
        </ul>
      )}

      {adding && (
        <form onSubmit={handleSubmit} className="form form-compact">
          {error && <div className="alert alert-error">{error}</div>}
          <div className="field">
            <label htmlFor="obs-body">Nueva observación *</label>
            <textarea
              id="obs-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="obs-attachment">Adjuntar PDF (opcional)</label>
            <input
              id="obs-attachment"
              type="file"
              accept="application/pdf"
              onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setAdding(false)
                setBody('')
                setAttachment(null)
                setError(null)
              }}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={createObservation.isPending}>
              {createObservation.isPending ? 'Guardando…' : 'Guardar observación'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
