import { useState, type FormEvent, type ChangeEvent, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useChildQuery } from '../hooks/useChildren'
import {
  useEducationObservationsQuery,
  useCreateEducationObservationMutation,
} from '../hooks/useEducationObservations'
import {
  useHealthObservationsQuery,
  useCreateHealthObservationMutation,
} from '../hooks/useHealthObservations'
import { saveHealthRecord } from '../api/records'
import { queryKeys } from '../api/queryKeys'
import { useRole } from '../hooks/useRole'
import { Avatar } from '../components/Avatar'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import {
  IconAlert,
  IconArrowLeft,
  IconBook,
  IconBuilding,
  IconCalendar,
  IconCheck,
  IconDownload,
  IconEdit,
  IconHeart,
  IconId,
  IconPlus,
  IconUpload,
} from '../components/icons'
import type { EducationObservation, HealthObservation } from '../types'
import styles from './css/detail.module.css'

// ── helpers ───────────────────────────────────────────────────────────────────

function formatDate(s: string | null | undefined) {
  if (!s) return '—'
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}

function formatObsDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
}

function getCurrentPeriod() {
  const now = new Date()
  const m = now.getMonth() + 1
  const y = now.getFullYear()
  if (m <= 2) return `${y - 1}-5`
  if (m <= 4) return `${y}-1`
  if (m <= 6) return `${y}-2`
  if (m <= 8) return `${y}-3`
  if (m <= 10) return `${y}-4`
  return `${y}-5`
}

function getBimestreOptions() {
  const y = new Date().getFullYear()
  const result: { value: string; label: string }[] = []
  for (const year of [y + 1, y, y - 1]) {
    for (let b = 5; b >= 1; b--) {
      result.push({ value: `${year}-${b}`, label: `AÑO ${year} · BIMESTRE ${b}` })
    }
  }
  return result
}

const MAX_FILE = 10 * 1024 * 1024

// ── DataRow ───────────────────────────────────────────────────────────────────

function DataRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className={styles.dataItem}>
      <span className={styles.dataLabel}>{label}</span>
      <span className={styles.dataValue}>{value}</span>
    </div>
  )
}

// ── ObservacionesSection ──────────────────────────────────────────────────────

function ObservacionesSection({ childId, canAdd }: { childId: string; canAdd: boolean }) {
  const { data: obs, isLoading } = useEducationObservationsQuery(childId)
  const mutation = useCreateEducationObservationMutation(childId)

  const [showForm, setShowForm] = useState(false)
  const [body, setBody] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    if (f && f.size > MAX_FILE) {
      setFileError(`El archivo supera los 10 MB (${(f.size / 1024 / 1024).toFixed(1)} MB).`)
      setFile(null)
      e.target.value = ''
    } else {
      setFileError(null)
      setFile(f)
    }
  }

  function handleCancel() {
    setShowForm(false)
    setBody('')
    setFile(null)
    setFileError(null)
    setSubmitError(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    setSubmitError(null)
    try {
      await mutation.mutateAsync({ body: body.trim(), attachment: file })
      handleCancel()
    } catch {
      setSubmitError('No se pudo guardar la observación. Intentá de nuevo.')
    }
  }

  return (
    <Card>
      <div className={styles.cardTitleRow}>
        <h2 className={styles.cardTitle} style={{ marginBottom: 0 }}>
          <IconEdit size={18} />
          Observaciones
        </h2>
        {canAdd && !showForm && (
          <Button variant="secondary" size="sm" onClick={() => setShowForm(true)}>
            <IconPlus size={14} />
            Agregar
          </Button>
        )}
      </div>

      {showForm && (
        <form className={styles.obsForm} onSubmit={handleSubmit}>
          <textarea
            className={styles.obsTextarea}
            placeholder="Escribí la observación..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            required
          />
          <div className={styles.obsFormRow}>
            <label className={styles.obsFileLabel}>
              <IconUpload size={13} />
              {file ? file.name : 'Adjuntar PDF (máx. 10 MB)'}
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFile}
                style={{ display: 'none' }}
              />
            </label>
            <div className={styles.obsFormActions}>
              <Button type="button" variant="secondary" size="sm" onClick={handleCancel}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={mutation.isPending || !body.trim()}>
                {mutation.isPending ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </div>
          {fileError && <p className={styles.obsError}>{fileError}</p>}
          {submitError && <p className={styles.obsError}>{submitError}</p>}
        </form>
      )}

      <div className={styles.obsList}>
        {isLoading && <p className={styles.obsEmpty}>Cargando...</p>}
        {!isLoading && !obs?.length && (
          <p className={styles.obsEmpty}>Sin observaciones registradas.</p>
        )}
        {obs?.map((o: EducationObservation) => (
          <div key={o.id} className={styles.obsItem}>
            <span className={styles.obsMeta}>
              {formatObsDate(o.created_at)}
              {o.author_name && (
                <>
                  {' '}·{' '}
                  <strong>{o.author_name}</strong>
                </>
              )}
            </span>
            <p className={styles.obsBody}>{o.body}</p>
            {o.has_attachment && o.attachment_url && (
              <a
                href={o.attachment_url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.obsAttachment}
              >
                <IconDownload size={13} />
                {o.attachment_name ?? 'Adjunto'}
              </a>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}

// ── HealthObservationSection ──────────────────────────────────────────────────

function HealthObservationSection({ childId, canAdd }: { childId: string; canAdd: boolean }) {
  const { data: obs, isLoading } = useHealthObservationsQuery(childId)
  const mutation = useCreateHealthObservationMutation(childId)

  const [showForm, setShowForm] = useState(false)
  const [body, setBody] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    if (f && f.size > MAX_FILE) {
      setFileError(`El archivo supera los 10 MB (${(f.size / 1024 / 1024).toFixed(1)} MB).`)
      setFile(null)
      e.target.value = ''
    } else {
      setFileError(null)
      setFile(f)
    }
  }

  function handleCancel() {
    setShowForm(false)
    setBody('')
    setFile(null)
    setFileError(null)
    setSubmitError(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    setSubmitError(null)
    try {
      await mutation.mutateAsync({ body: body.trim(), attachment: file })
      handleCancel()
    } catch {
      setSubmitError('No se pudo guardar la observación. Intentá de nuevo.')
    }
  }

  return (
    <Card>
      <div className={styles.cardTitleRow}>
        <h2 className={styles.cardTitle} style={{ marginBottom: 0 }}>
          <IconEdit size={18} />
          Observaciones
        </h2>
        {canAdd && !showForm && (
          <Button variant="secondary" size="sm" onClick={() => setShowForm(true)}>
            <IconPlus size={14} />
            Agregar
          </Button>
        )}
      </div>

      {showForm && (
        <form className={styles.obsForm} onSubmit={handleSubmit}>
          <textarea
            className={styles.obsTextarea}
            placeholder="Escribí la observación..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            required
          />
          <div className={styles.obsFormRow}>
            <label className={styles.obsFileLabel}>
              <IconUpload size={13} />
              {file ? file.name : 'Adjuntar PDF (máx. 10 MB)'}
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFile}
                style={{ display: 'none' }}
              />
            </label>
            <div className={styles.obsFormActions}>
              <Button type="button" variant="secondary" size="sm" onClick={handleCancel}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={mutation.isPending || !body.trim()}>
                {mutation.isPending ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </div>
          {fileError && <p className={styles.obsError}>{fileError}</p>}
          {submitError && <p className={styles.obsError}>{submitError}</p>}
        </form>
      )}

      <div className={styles.obsList}>
        {isLoading && <p className={styles.obsEmpty}>Cargando...</p>}
        {!isLoading && !obs?.length && (
          <p className={styles.obsEmpty}>Sin observaciones registradas.</p>
        )}
        {obs?.map((o: HealthObservation) => (
          <div key={o.id} className={styles.obsItem}>
            <span className={styles.obsMeta}>
              {formatObsDate(o.created_at)}
              {o.author_name && (
                <>
                  {' '}·{' '}
                  <strong>{o.author_name}</strong>
                </>
              )}
            </span>
            <p className={styles.obsBody}>{o.body}</p>
            {o.has_attachment && o.attachment_url && (
              <a
                href={o.attachment_url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.obsAttachment}
              >
                <IconDownload size={13} />
                {o.attachment_name ?? 'Adjunto'}
              </a>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}

// ── HealthProfileEditor ───────────────────────────────────────────────────────

function HealthProfileEditor({ childId, current, onSaved }: { childId: string; current?: string | null; onSaved: (v: string) => void }) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(current ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      await saveHealthRecord(childId, true, { health_profile: value.trim() || null })
      queryClient.invalidateQueries({ queryKey: queryKeys.children.detail(childId) })
      onSaved(value.trim())
      setEditing(false)
    } catch {
      setError('No se pudo guardar. Intentá de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  if (!editing) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p className={styles.notes} style={{ minHeight: 36 }}>
          {current || <span style={{ color: 'var(--text-soft)', fontStyle: 'italic' }}>Sin perfil de salud registrado.</span>}
        </p>
        <div>
          <Button variant="secondary" size="sm" onClick={() => { setValue(current ?? ''); setEditing(true) }}>
            <IconEdit size={14} />
            Editar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.obsForm} style={{ marginTop: 0 }}>
      <textarea
        className={styles.obsTextarea}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={4}
        maxLength={3000}
        placeholder="Resumen del estado de salud actual del niño/a..."
      />
      {error && <p className={styles.obsError}>{error}</p>}
      <div className={styles.obsFormActions} style={{ marginLeft: 0, justifyContent: 'flex-end', display: 'flex', gap: 8 }}>
        <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(false)}>
          Cancelar
        </Button>
        <Button size="sm" disabled={saving} onClick={handleSave}>
          {saving ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
    </div>
  )
}

// ── ChildDetailPage ───────────────────────────────────────────────────────────

export default function ChildDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: child, isLoading, isError } = useChildQuery(id)
  const { isAdmin, isInstitucion, isInstitutionalUser, isEduInstitution, isSaludInstitution } = useRole()
  const [period, setPeriod] = useState(getCurrentPeriod)
  const bimestreOptions = getBimestreOptions()

  if (isLoading) {
    return <p style={{ padding: 24, color: 'var(--text-muted)' }}>Cargando...</p>
  }

  if (isError || !child) {
    return (
      <div style={{ padding: 24 }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
          No se pudo cargar la información del niño.
        </p>
        <Button variant="secondary" onClick={() => navigate('/children')}>
          <IconArrowLeft size={18} />
          Volver al listado
        </Button>
      </div>
    )
  }

  const fullName = `${child.first_name} ${child.last_name}`
  const edu = child.education_record
  const institutionName = edu?.institution?.name ?? edu?.school_name ?? null

  // ── Vista restringida: institución / representante educativo ─────────────

  if (isInstitutionalUser && isEduInstitution) {
    const alerts = child.alerts ?? []

    return (
      <div>
        <Link to="/children" className={styles.back}>
          <IconArrowLeft size={18} />
          Volver al listado
        </Link>

        <div className={styles.identity}>
          <div className={styles.person}>
            <Avatar name={fullName} size="lg" />
            <div className={styles.personText}>
              <h1 className={styles.personName}>{fullName}</h1>
              <div className={styles.personMeta}>
                {child.age != null && <span>{child.age} años</span>}
                {child.age != null && institutionName && (
                  <span className={styles.metaDot}>·</span>
                )}
                {institutionName && <Badge tone="edu">{institutionName}</Badge>}
                {child.has_alert && (
                  <Badge tone="amber">
                    <IconAlert size={12} />
                    {' '}Alerta
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.eduStack}>
          {/* identidad + matrícula */}
          <div className={styles.eduRow}>
            <Card>
              <h2 className={styles.cardTitle}>
                <IconId size={18} />
                Identidad
              </h2>
              <div className={styles.dataList}>
                <DataRow label="Nombre completo" value={fullName} />
                <DataRow label="DNI" value={child.dni ?? '—'} />
                <DataRow label="Edad" value={child.age != null ? `${child.age} años` : '—'} />
                <DataRow label="Domicilio" value={child.birth_record?.address ?? '—'} />
              </div>
            </Card>

            <Card>
              <h2 className={styles.cardTitle}>
                <IconBuilding size={18} />
                Situación de matrícula
              </h2>
              {edu ? (
                <div className={styles.dataList}>
                  <DataRow
                    label="Estado"
                    value={
                      <Badge tone={edu.is_enrolled ? 'success' : 'neutral'}>
                        {edu.is_enrolled ? (
                          <>
                            <IconCheck size={12} /> Activa
                          </>
                        ) : (
                          'Inactiva'
                        )}
                      </Badge>
                    }
                  />
                  <DataRow label="Nivel" value={edu.level_label ?? '—'} />
                  <DataRow
                    label="Año / Grado"
                    value={edu.grade_label ?? edu.grade_or_year ?? '—'}
                  />
                  <DataRow label="Escuela" value={edu.school_name} />
                </div>
              ) : (
                <p className={styles.notes}>Sin registro educativo cargado.</p>
              )}
            </Card>
          </div>

          {/* asistencia con selector de bimestre */}
          <Card>
            <div className={styles.bimestreBar}>
              <h2 className={styles.cardTitle} style={{ marginBottom: 0 }}>
                <IconCalendar size={18} />
                Asistencia
              </h2>
              <select
                className={styles.bimestreSelect}
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                aria-label="Período"
              >
                {bimestreOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {edu &&
            (edu.attendance_present_days != null || edu.attendance_total_days != null) ? (
              <div className={styles.attendanceStat}>
                <span className={styles.attendanceMain}>
                  {edu.attendance_present_days ?? '—'}
                  <span className={styles.attendanceSep}> de </span>
                  {edu.attendance_total_days ?? '—'}
                </span>
                <span className={styles.attendanceSub}>días asistidos</span>
                {edu.attendance_period_label && (
                  <span className={styles.attendancePeriod}>{edu.attendance_period_label}</span>
                )}
                {edu.absences_count > 0 && (
                  <span className={styles.attendanceAbsences}>
                    {edu.absences_count}{' '}
                    {edu.absences_count === 1 ? 'inasistencia' : 'inasistencias'}
                  </span>
                )}
              </div>
            ) : (
              <p className={styles.notes} style={{ marginTop: 12 }}>
                Sin datos de asistencia registrados para este período.
              </p>
            )}
          </Card>

          {/* alertas — solo si hay algo que mostrar */}
          {(alerts.length > 0 || child.other_sector_alert) && (
            <Card>
              <h2 className={styles.cardTitle}>
                <IconAlert size={18} />
                Alertas
              </h2>
              <div className={styles.alertsList}>
                {alerts.map((a, i) => (
                  <div key={i} className={styles.alertItem}>
                    <IconAlert size={14} />
                    <span>{a}</span>
                    <Badge tone="amber">Automática</Badge>
                  </div>
                ))}
                {child.other_sector_alert && (
                  <div className={styles.alertItem}>
                    <IconAlert size={14} />
                    <span>Alerta en otro sector</span>
                    <Badge tone="neutral">Sin detalle</Badge>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* observaciones — editable para usuarios institucionales */}
          <ObservacionesSection childId={id!} canAdd />
        </div>
      </div>
    )
  }

  // ── Vista restringida: institución / representante de salud ─────────────

  if (isInstitutionalUser && isSaludInstitution) {
    const salud = child.health_record
    const efector = salud?.institution?.name ?? salud?.health_center_name ?? '—'
    const alerts = child.alerts ?? []

    return (
      <div>
        <Link to="/children" className={styles.back}>
          <IconArrowLeft size={18} />
          Volver al listado
        </Link>

        <div className={styles.identity}>
          <div className={styles.person}>
            <Avatar name={fullName} size="lg" />
            <div className={styles.personText}>
              <h1 className={styles.personName}>{fullName}</h1>
              <div className={styles.personMeta}>
                {child.age != null && <span>{child.age} años</span>}
                {child.age != null && <span className={styles.metaDot}>·</span>}
                {efector !== '—' && <Badge tone="health">{efector}</Badge>}
                {child.has_alert && (
                  <Badge tone="amber">
                    <IconAlert size={12} />
                    {' '}Alerta
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.eduStack}>
          <div className={styles.eduRow}>
            <Card>
              <h2 className={styles.cardTitle}>
                <IconId size={18} />
                Identidad
              </h2>
              <div className={styles.dataList}>
                <DataRow label="Nombre completo" value={fullName} />
                <DataRow label="Edad" value={child.age != null ? `${child.age} años` : '—'} />
                <DataRow label="Fecha de nacimiento" value={formatDate(child.birth_date)} />
                <DataRow label="DNI" value={child.dni ?? '—'} />
              </div>
            </Card>

            <Card>
              <h2 className={styles.cardTitle}>
                <IconHeart size={18} />
                Efector asignado
              </h2>
              {salud ? (
                <div className={styles.dataList}>
                  <DataRow label="Centro de salud" value={efector} />
                  <DataRow
                    label="Controles de salud"
                    value={
                      <Badge tone={salud.healthy_checkup_current ? 'success' : 'amber'}>
                        {salud.healthy_checkup_current ? <><IconCheck size={12} /> Al día</> : 'Atrasado'}
                      </Badge>
                    }
                  />
                  <DataRow
                    label="Vacunas"
                    value={
                      <Badge tone={salud.vaccines_current ? 'success' : 'amber'}>
                        {salud.vaccines_current ? <><IconCheck size={12} /> Al día</> : 'Atrasadas'}
                      </Badge>
                    }
                  />
                  {salud.last_checkup_date && (
                    <DataRow label="Último control" value={formatDate(salud.last_checkup_date)} />
                  )}
                </div>
              ) : (
                <p className={styles.notes}>Sin registro de salud cargado.</p>
              )}
            </Card>
          </div>

          {(alerts.length > 0 || child.other_sector_alert) && (
            <Card>
              <h2 className={styles.cardTitle}>
                <IconAlert size={18} />
                Alertas
              </h2>
              <div className={styles.alertsList}>
                {alerts.map((a, i) => (
                  <div key={i} className={styles.alertItem}>
                    <IconAlert size={14} />
                    <span>{a}</span>
                    <Badge tone="amber">Automática</Badge>
                  </div>
                ))}
                {child.other_sector_alert && (
                  <div className={styles.alertItem}>
                    <IconAlert size={14} />
                    <span>Alerta en otro sector</span>
                    <Badge tone="neutral">Sin detalle</Badge>
                  </div>
                )}
              </div>
            </Card>
          )}

          <Card>
            <div className={styles.cardTitleRow}>
              <h2 className={styles.cardTitle} style={{ marginBottom: 0 }}>
                <IconHeart size={18} />
                Perfil de salud
              </h2>
            </div>
            {isInstitucion && isSaludInstitution ? (
              <HealthProfileEditor
                childId={id!}
                current={salud?.health_profile}
                onSaved={() => {}}
              />
            ) : (
              <p className={styles.notes}>
                {salud?.health_profile || (
                  <span style={{ color: 'var(--text-soft)', fontStyle: 'italic' }}>
                    Sin perfil de salud registrado.
                  </span>
                )}
              </p>
            )}
          </Card>

          <HealthObservationSection childId={id!} canAdd={isInstitucion && isSaludInstitution} />
        </div>
      </div>
    )
  }

  // ── Vista completa: admin / coordinador / otros ───────────────────────────

  return (
    <div>
      <Link to="/children" className={styles.back}>
        <IconArrowLeft size={18} />
        Volver al listado
      </Link>

      <div className={styles.identity}>
        <div className={styles.person}>
          <Avatar name={fullName} size="lg" />
          <div className={styles.personText}>
            <h1 className={styles.personName}>{fullName}</h1>
            <div className={styles.personMeta}>
              {child.age != null && <span>{child.age} años</span>}
              {child.age != null && <span className={styles.metaDot}>·</span>}
              <span>Nacido/a el {formatDate(child.birth_date)}</span>
              {institutionName && <Badge tone="edu">{institutionName}</Badge>}
              {child.has_alert && (
                <Badge tone="amber">
                  <IconAlert size={12} />
                  {' '}Alerta
                </Badge>
              )}
            </div>
          </div>
        </div>
        {isAdmin && (
          <div className={styles.headActions}>
            <Button variant="secondary" onClick={() => navigate(`/children/${id}/edit`)}>
              <IconEdit size={18} />
              Editar
            </Button>
          </div>
        )}
      </div>

      <div className={styles.grid}>
        <div className={styles.sideStack}>
          <Card>
            <h2 className={styles.cardTitle}>
              <IconId size={20} />
              Datos personales
            </h2>
            <div className={styles.dataList}>
              <DataRow label="DNI" value={child.dni ?? '—'} />
              <DataRow label="Edad" value={child.age != null ? `${child.age} años` : '—'} />
              <DataRow label="Nacimiento" value={formatDate(child.birth_date)} />
              <DataRow label="Domicilio" value={child.birth_record?.address ?? '—'} />
            </div>
          </Card>

          {child.notes && (
            <Card>
              <h2 className={styles.cardTitle}>Notas</h2>
              <p className={styles.notes}>{child.notes}</p>
            </Card>
          )}

          {edu && (
            <Card accent="var(--edu)">
              <h2 className={styles.cardTitle}>
                <IconBook size={18} />
                Registro educativo
              </h2>
              <div className={styles.dataList}>
                <DataRow label="Escuela" value={edu.school_name} />
                <DataRow
                  label="Estado"
                  value={
                    <Badge tone={edu.is_enrolled ? 'success' : 'neutral'}>
                      {edu.is_enrolled ? 'Activo' : 'Inactivo'}
                    </Badge>
                  }
                />
                <DataRow label="Nivel" value={edu.level_label ?? '—'} />
                <DataRow
                  label="Año / Grado"
                  value={edu.grade_label ?? edu.grade_or_year ?? '—'}
                />
                {edu.attendance_present_days != null && (
                  <DataRow
                    label="Asistencia"
                    value={`${edu.attendance_present_days} de ${edu.attendance_total_days ?? '?'} días`}
                  />
                )}
                <DataRow label="Inasistencias" value={`${edu.absences_count}`} />
              </div>
            </Card>
          )}
        </div>

        <div className={styles.sideStack}>
          {child.health_record && (
            <Card accent="var(--health)">
              <h2 className={styles.cardTitle}>
                <IconHeart size={18} />
                Registro de salud
              </h2>
              <div className={styles.dataList}>
                <DataRow
                  label="Centro de salud"
                  value={child.health_record.health_center_name}
                />
                <DataRow
                  label="Controles"
                  value={
                    <Badge
                      tone={child.health_record.healthy_checkup_current ? 'success' : 'amber'}
                    >
                      {child.health_record.healthy_checkup_current ? (
                        <>
                          <IconCheck size={12} /> Al día
                        </>
                      ) : (
                        'Atrasado'
                      )}
                    </Badge>
                  }
                />
                <DataRow
                  label="Vacunas"
                  value={
                    <Badge tone={child.health_record.vaccines_current ? 'success' : 'amber'}>
                      {child.health_record.vaccines_current ? (
                        <>
                          <IconCheck size={12} /> Al día
                        </>
                      ) : (
                        'Atrasadas'
                      )}
                    </Badge>
                  }
                />
                {child.health_record.last_checkup_date && (
                  <DataRow
                    label="Último control"
                    value={formatDate(child.health_record.last_checkup_date)}
                  />
                )}
              </div>
            </Card>
          )}

          {(child.alerts?.length || child.other_sector_alert) ? (
            <Card>
              <h2 className={styles.cardTitle}>
                <IconAlert size={18} />
                Alertas
              </h2>
              <div className={styles.alertsList}>
                {child.alerts?.map((a, i) => (
                  <div key={i} className={styles.alertItem}>
                    <IconAlert size={14} />
                    <span>{a}</span>
                    <Badge tone="amber">Automática</Badge>
                  </div>
                ))}
                {child.other_sector_alert && (
                  <div className={styles.alertItem}>
                    <IconAlert size={14} />
                    <span>Alerta en otro sector</span>
                    <Badge tone="neutral">Sin detalle</Badge>
                  </div>
                )}
              </div>
            </Card>
          ) : null}

          <ObservacionesSection childId={id!} canAdd={isAdmin} />
        </div>
      </div>
    </div>
  )
}
