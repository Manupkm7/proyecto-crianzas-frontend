import { useState, type FormEvent, type ChangeEvent, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useChildQuery, useDeleteChildMutation } from '../hooks/useChildren'
import {
  useEducationObservationsQuery,
  useCreateEducationObservationMutation,
} from '../hooks/useEducationObservations'
import {
  useHealthObservationsQuery,
  useCreateHealthObservationMutation,
} from '../hooks/useHealthObservations'
import { getEducationObservationAttachment } from '../api/educationObservations'
import { getHealthObservationAttachment } from '../api/healthObservations'
import { useAttachmentViewer } from '../hooks/useAttachmentViewer'
import { PdfViewerModal } from '../components/PdfViewerModal'
import {
  useEducationPeriodReportsQuery,
  useSaveEducationPeriodReportMutation,
  useDeleteEducationPeriodReportMutation,
  useHealthPeriodReportsQuery,
  useSaveHealthPeriodReportMutation,
  useDeleteHealthPeriodReportMutation,
} from '../hooks/usePeriodReports'
import { saveHealthRecord } from '../api/records'
import {
  useSaveEducationRecordMutation,
  useSaveHealthRecordMutation,
  useDeleteEducationRecordMutation,
  useDeleteHealthRecordMutation,
} from '../hooks/useChildRecords'
import { useInstitutionsQuery } from '../hooks/useInstitutions'
import { useAcknowledgeAlertMutation } from '../hooks/useAlerts'
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
  IconTrash,
  IconUpload,
} from '../components/icons'
import type {
  ChildAlert,
  EducationObservation,
  EducationRecord,
  HealthObservation,
  HealthRecord,
} from '../types'
import styles from './css/detail.module.css'

// ── period (bimestre) helpers ─────────────────────────────────────────────────

// El selector de período usa strings "AÑO-BIMESTRE" (ej. "2026-3").
function parsePeriod(p: string): { year: number; bimester: number } {
  const [y, b] = p.split('-')
  return { year: Number(y), bimester: Number(b) }
}

function numOrNull(v: string): number | null {
  return v.trim() === '' ? null : Number(v)
}

function triToBool(v: string): boolean | null {
  if (v === 'si') return true
  if (v === 'no') return false
  return null
}

function boolToTri(v: boolean | null | undefined): string {
  if (v === true) return 'si'
  if (v === false) return 'no'
  return ''
}

function errorMessage(err: unknown, fallback: string): string {
  const body = (err as { response?: { data?: { message?: string } } }).response?.data
  return body?.message ?? fallback
}

// ── helpers ───────────────────────────────────────────────────────────────────

function formatDate(s: string | null | undefined) {
  if (!s) return '—'
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}

/**
 * Fecha de nacimiento + aviso cuando es un placeholder (1/1/2000) puesto por una
 * importación que no traía el dato real — ver ImportController::GENERIC_BIRTH_DATE
 * y children.birth_date_is_placeholder en el backend.
 */
function birthDateValue(child: {
  birth_date?: string | null
  birth_date_is_placeholder?: boolean
}): ReactNode {
  const formatted = formatDate(child.birth_date)
  if (!child.birth_date_is_placeholder) return formatted
  return (
    <span
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
      title="El archivo importado no traía la fecha de nacimiento real; se completó con 1/1/2000. Verificar y corregir editando el niño."
    >
      {formatted}
      <Badge tone="amber">
        <IconAlert size={12} /> Fecha estimada, no estaba cargada en la importación
      </Badge>
    </span>
  )
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
  const attachmentViewer = useAttachmentViewer()

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
            {o.has_attachment && (
              <button
                type="button"
                className={styles.obsAttachment}
                disabled={attachmentViewer.loadingId === o.id}
                onClick={() =>
                  attachmentViewer.open(
                    o.id,
                    o.attachment_name ?? 'documento.pdf',
                    getEducationObservationAttachment,
                  )
                }
              >
                <IconDownload size={13} />
                {attachmentViewer.loadingId === o.id
                  ? 'Abriendo...'
                  : (o.attachment_name ?? 'Adjunto')}
              </button>
            )}
          </div>
        ))}
      </div>

      {attachmentViewer.error && <p className={styles.obsError}>{attachmentViewer.error}</p>}
      {attachmentViewer.viewer && (
        <PdfViewerModal
          url={attachmentViewer.viewer.url}
          filename={attachmentViewer.viewer.filename}
          onClose={attachmentViewer.close}
        />
      )}
    </Card>
  )
}

// ── HealthObservationSection ──────────────────────────────────────────────────

function HealthObservationSection({ childId, canAdd }: { childId: string; canAdd: boolean }) {
  const { data: obs, isLoading } = useHealthObservationsQuery(childId)
  const mutation = useCreateHealthObservationMutation(childId)
  const attachmentViewer = useAttachmentViewer()

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
            {o.has_attachment && (
              <button
                type="button"
                className={styles.obsAttachment}
                disabled={attachmentViewer.loadingId === o.id}
                onClick={() =>
                  attachmentViewer.open(
                    o.id,
                    o.attachment_name ?? 'documento.pdf',
                    getHealthObservationAttachment,
                  )
                }
              >
                <IconDownload size={13} />
                {attachmentViewer.loadingId === o.id
                  ? 'Abriendo...'
                  : (o.attachment_name ?? 'Adjunto')}
              </button>
            )}
          </div>
        ))}
      </div>

      {attachmentViewer.error && <p className={styles.obsError}>{attachmentViewer.error}</p>}
      {attachmentViewer.viewer && (
        <PdfViewerModal
          url={attachmentViewer.viewer.url}
          filename={attachmentViewer.viewer.filename}
          onClose={attachmentViewer.close}
        />
      )}
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

// ── BimestreBar ───────────────────────────────────────────────────────────────

function BimestreBar({
  title,
  period,
  setPeriod,
  options,
  onChange,
}: {
  title: string
  period: string
  setPeriod: (v: string) => void
  options: { value: string; label: string }[]
  onChange?: () => void
}) {
  return (
    <div className={styles.bimestreBar}>
      <h2 className={styles.cardTitle} style={{ marginBottom: 0 }}>
        <IconCalendar size={18} />
        {title}
      </h2>
      <select
        className={styles.bimestreSelect}
        value={period}
        onChange={(e) => {
          setPeriod(e.target.value)
          onChange?.()
        }}
        aria-label="Período"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

// ── EducationPeriodSection ────────────────────────────────────────────────────

interface EduPeriodForm {
  is_enrolled: boolean
  absences_count: string
  present_days: string
  total_days: string
  summary: string
}

function EducationPeriodSection({
  childId,
  period,
  setPeriod,
  options,
  canEdit,
}: {
  childId: string
  period: string
  setPeriod: (v: string) => void
  options: { value: string; label: string }[]
  canEdit: boolean
}) {
  const { year, bimester } = parsePeriod(period)
  const { data: reports, isLoading } = useEducationPeriodReportsQuery(childId)
  const saveMutation = useSaveEducationPeriodReportMutation(childId)
  const deleteMutation = useDeleteEducationPeriodReportMutation(childId)

  const current = reports?.find((r) => r.year === year && r.bimester === bimester) ?? null

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<EduPeriodForm>(emptyForm)
  const [error, setError] = useState<string | null>(null)

  function emptyForm(): EduPeriodForm {
    return { is_enrolled: true, absences_count: '', present_days: '', total_days: '', summary: '' }
  }

  function startEdit() {
    setForm(
      current
        ? {
            is_enrolled: current.is_enrolled,
            absences_count: current.absences_count?.toString() ?? '',
            present_days: current.present_days?.toString() ?? '',
            total_days: current.total_days?.toString() ?? '',
            summary: current.summary ?? '',
          }
        : emptyForm(),
    )
    setError(null)
    setEditing(true)
  }

  async function handleSave() {
    setError(null)
    try {
      await saveMutation.mutateAsync({
        id: current?.id,
        year,
        bimester,
        is_enrolled: form.is_enrolled,
        absences_count: numOrNull(form.absences_count),
        present_days: numOrNull(form.present_days),
        total_days: numOrNull(form.total_days),
        summary: form.summary.trim() || null,
      })
      setEditing(false)
    } catch (err) {
      setError(errorMessage(err, 'No se pudo guardar el reporte del bimestre.'))
    }
  }

  async function handleDelete() {
    if (!current) return
    if (!window.confirm('¿Borrar el reporte de este bimestre?')) return
    setError(null)
    try {
      await deleteMutation.mutateAsync(current.id)
      setEditing(false)
    } catch (err) {
      setError(errorMessage(err, 'No se pudo borrar el reporte.'))
    }
  }

  return (
    <Card>
      <BimestreBar
        title="Reporte del bimestre"
        period={period}
        setPeriod={setPeriod}
        options={options}
        onChange={() => setEditing(false)}
      />

      {isLoading && <p className={styles.periodEmpty}>Cargando...</p>}

      {!isLoading && !editing && (
        <>
          {current ? (
            <div className={styles.dataList}>
              <DataRow
                label="Escolarizado"
                value={
                  <Badge tone={current.is_enrolled ? 'success' : 'neutral'}>
                    {current.is_enrolled ? 'Sí' : 'No'}
                  </Badge>
                }
              />
              <DataRow label="Inasistencias" value={current.absences_count ?? '—'} />
              <DataRow
                label="Días asistidos"
                value={
                  current.present_days != null
                    ? `${current.present_days}${current.total_days != null ? ` de ${current.total_days}` : ''}`
                    : '—'
                }
              />
              {current.grade_label && <DataRow label="Grado" value={current.grade_label} />}
            </div>
          ) : (
            <p className={styles.periodEmpty}>Sin datos cargados para este bimestre.</p>
          )}

          {current?.summary && <p className={styles.periodSummary}>{current.summary}</p>}

          {canEdit && (
            <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
              <Button variant="secondary" size="sm" onClick={startEdit}>
                <IconEdit size={14} />
                {current ? 'Editar' : 'Cargar bimestre'}
              </Button>
              {current && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                >
                  Borrar
                </Button>
              )}
            </div>
          )}
        </>
      )}

      {editing && (
        <div className={styles.obsForm}>
          <div className={styles.periodGrid}>
            <label className={styles.periodField}>
              <span className={styles.periodLabel}>Inasistencias</span>
              <input
                className={styles.periodInput}
                type="number"
                min={0}
                value={form.absences_count}
                onChange={(e) => setForm({ ...form, absences_count: e.target.value })}
              />
            </label>
            <label className={styles.periodField}>
              <span className={styles.periodLabel}>Días asistidos</span>
              <input
                className={styles.periodInput}
                type="number"
                min={0}
                value={form.present_days}
                onChange={(e) => setForm({ ...form, present_days: e.target.value })}
              />
            </label>
            <label className={styles.periodField}>
              <span className={styles.periodLabel}>Días totales</span>
              <input
                className={styles.periodInput}
                type="number"
                min={0}
                value={form.total_days}
                onChange={(e) => setForm({ ...form, total_days: e.target.value })}
              />
            </label>
            <label className={styles.periodField} style={{ justifyContent: 'flex-end' }}>
              <span className={styles.periodCheck}>
                <input
                  type="checkbox"
                  checked={form.is_enrolled}
                  onChange={(e) => setForm({ ...form, is_enrolled: e.target.checked })}
                />
                Escolarizado
              </span>
            </label>
            <label className={`${styles.periodField} ${styles.wide}`}>
              <span className={styles.periodLabel}>Resumen del bimestre</span>
              <textarea
                className={styles.obsTextarea}
                rows={3}
                maxLength={3000}
                value={form.summary}
                onChange={(e) => setForm({ ...form, summary: e.target.value })}
              />
            </label>
          </div>
          {error && <p className={styles.obsError}>{error}</p>}
          <div className={styles.obsFormActions}>
            <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
            <Button size="sm" disabled={saveMutation.isPending} onClick={handleSave}>
              {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}

// ── HealthPeriodSection ───────────────────────────────────────────────────────

interface HealthPeriodForm {
  healthy_checkup_current: string
  vaccines_current: string
  last_checkup_date: string
  weight_kg: string
  height_cm: string
  summary: string
}

function HealthPeriodSection({
  childId,
  period,
  setPeriod,
  options,
  canEdit,
}: {
  childId: string
  period: string
  setPeriod: (v: string) => void
  options: { value: string; label: string }[]
  canEdit: boolean
}) {
  const { year, bimester } = parsePeriod(period)
  const { data: reports, isLoading } = useHealthPeriodReportsQuery(childId)
  const saveMutation = useSaveHealthPeriodReportMutation(childId)
  const deleteMutation = useDeleteHealthPeriodReportMutation(childId)

  const current = reports?.find((r) => r.year === year && r.bimester === bimester) ?? null

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<HealthPeriodForm>(emptyForm)
  const [error, setError] = useState<string | null>(null)

  function emptyForm(): HealthPeriodForm {
    return {
      healthy_checkup_current: '',
      vaccines_current: '',
      last_checkup_date: '',
      weight_kg: '',
      height_cm: '',
      summary: '',
    }
  }

  function startEdit() {
    setForm(
      current
        ? {
            healthy_checkup_current: boolToTri(current.healthy_checkup_current),
            vaccines_current: boolToTri(current.vaccines_current),
            last_checkup_date: current.last_checkup_date ?? '',
            weight_kg: current.weight_kg != null ? String(current.weight_kg) : '',
            height_cm: current.height_cm != null ? String(current.height_cm) : '',
            summary: current.summary ?? '',
          }
        : emptyForm(),
    )
    setError(null)
    setEditing(true)
  }

  async function handleSave() {
    setError(null)
    try {
      await saveMutation.mutateAsync({
        id: current?.id,
        year,
        bimester,
        healthy_checkup_current: triToBool(form.healthy_checkup_current),
        vaccines_current: triToBool(form.vaccines_current),
        last_checkup_date: form.last_checkup_date || null,
        weight_kg: numOrNull(form.weight_kg),
        height_cm: numOrNull(form.height_cm),
        summary: form.summary.trim() || null,
      })
      setEditing(false)
    } catch (err) {
      setError(errorMessage(err, 'No se pudo guardar el reporte del bimestre.'))
    }
  }

  async function handleDelete() {
    if (!current) return
    if (!window.confirm('¿Borrar el reporte de este bimestre?')) return
    setError(null)
    try {
      await deleteMutation.mutateAsync(current.id)
      setEditing(false)
    } catch (err) {
      setError(errorMessage(err, 'No se pudo borrar el reporte.'))
    }
  }

  function checkupBadge(v: boolean | null | undefined, okText: string, badText: string) {
    if (v == null) return <span className={styles.dataValue}>Sin dato</span>
    return <Badge tone={v ? 'success' : 'amber'}>{v ? okText : badText}</Badge>
  }

  return (
    <Card>
      <BimestreBar
        title="Control del bimestre"
        period={period}
        setPeriod={setPeriod}
        options={options}
        onChange={() => setEditing(false)}
      />

      {isLoading && <p className={styles.periodEmpty}>Cargando...</p>}

      {!isLoading && !editing && (
        <>
          {current ? (
            <div className={styles.dataList}>
              <DataRow
                label="Control de niño sano"
                value={checkupBadge(current.healthy_checkup_current, 'Al día', 'Atrasado')}
              />
              <DataRow
                label="Vacunas"
                value={checkupBadge(current.vaccines_current, 'Al día', 'Atrasadas')}
              />
              {current.last_checkup_date && (
                <DataRow label="Último control" value={formatDate(current.last_checkup_date)} />
              )}
              {current.weight_kg != null && (
                <DataRow label="Peso" value={`${current.weight_kg} kg`} />
              )}
              {current.height_cm != null && (
                <DataRow label="Talla" value={`${current.height_cm} cm`} />
              )}
            </div>
          ) : (
            <p className={styles.periodEmpty}>Sin datos cargados para este bimestre.</p>
          )}

          {current?.summary && <p className={styles.periodSummary}>{current.summary}</p>}

          {canEdit && (
            <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
              <Button variant="secondary" size="sm" onClick={startEdit}>
                <IconEdit size={14} />
                {current ? 'Editar' : 'Cargar bimestre'}
              </Button>
              {current && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                >
                  Borrar
                </Button>
              )}
            </div>
          )}
        </>
      )}

      {editing && (
        <div className={styles.obsForm}>
          <div className={styles.periodGrid}>
            <label className={styles.periodField}>
              <span className={styles.periodLabel}>Control de niño sano</span>
              <select
                className={styles.periodInput}
                value={form.healthy_checkup_current}
                onChange={(e) => setForm({ ...form, healthy_checkup_current: e.target.value })}
              >
                <option value="">Sin dato</option>
                <option value="si">Al día</option>
                <option value="no">Atrasado</option>
              </select>
            </label>
            <label className={styles.periodField}>
              <span className={styles.periodLabel}>Vacunas</span>
              <select
                className={styles.periodInput}
                value={form.vaccines_current}
                onChange={(e) => setForm({ ...form, vaccines_current: e.target.value })}
              >
                <option value="">Sin dato</option>
                <option value="si">Al día</option>
                <option value="no">Atrasadas</option>
              </select>
            </label>
            <label className={styles.periodField}>
              <span className={styles.periodLabel}>Último control</span>
              <input
                className={styles.periodInput}
                type="date"
                value={form.last_checkup_date}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setForm({ ...form, last_checkup_date: e.target.value })}
              />
            </label>
            <label className={styles.periodField}>
              <span className={styles.periodLabel}>Peso (kg)</span>
              <input
                className={styles.periodInput}
                type="number"
                min={0}
                step="0.01"
                value={form.weight_kg}
                onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
              />
            </label>
            <label className={styles.periodField}>
              <span className={styles.periodLabel}>Talla (cm)</span>
              <input
                className={styles.periodInput}
                type="number"
                min={0}
                step="0.01"
                value={form.height_cm}
                onChange={(e) => setForm({ ...form, height_cm: e.target.value })}
              />
            </label>
            <label className={`${styles.periodField} ${styles.wide}`}>
              <span className={styles.periodLabel}>Resumen del bimestre</span>
              <textarea
                className={styles.obsTextarea}
                rows={3}
                maxLength={3000}
                value={form.summary}
                onChange={(e) => setForm({ ...form, summary: e.target.value })}
              />
            </label>
          </div>
          {error && <p className={styles.obsError}>{error}</p>}
          <div className={styles.obsFormActions}>
            <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
            <Button size="sm" disabled={saveMutation.isPending} onClick={handleSave}>
              {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}

// ── SectorInstitutionAdmin ────────────────────────────────────────────────────
// Solo admin: vincular / cambiar / desvincular la institución (educativa o de
// salud) de un niño. Una institución NO puede adoptar por su cuenta un niño que
// ya existe — eso lo decide el admin desde el perfil del niño.

function SectorInstitutionAdmin({
  sector,
  childId,
  record,
}: {
  sector: 'educacion' | 'salud'
  childId: string
  record: EducationRecord | HealthRecord | null | undefined
}) {
  const isEdu = sector === 'educacion'
  const { data: institutions = [] } = useInstitutionsQuery({ enabled: true })
  const options = institutions.filter((i) => i.type === sector && i.is_active)

  const saveEdu = useSaveEducationRecordMutation(childId)
  const saveHealth = useSaveHealthRecordMutation(childId)
  const delEdu = useDeleteEducationRecordMutation(childId)
  const delHealth = useDeleteHealthRecordMutation(childId)
  const save = isEdu ? saveEdu : saveHealth
  const del = isEdu ? delEdu : delHealth

  const currentInstId = record?.institution?.id ?? ''
  const currentName =
    record?.institution?.name ??
    (record && 'school_name' in record ? record.school_name : undefined) ??
    (record && 'health_center_name' in record ? record.health_center_name : undefined) ??
    null

  const [editing, setEditing] = useState(false)
  const [selected, setSelected] = useState(currentInstId)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    const inst = options.find((i) => i.id === selected)
    if (!inst) return
    setError(null)
    const exists = Boolean(record?.id)
    const data: Record<string, unknown> = isEdu
      ? {
          institution_id: inst.id,
          school_name: inst.name,
          ...(exists ? {} : { is_enrolled: true, absences_count: 0 }),
        }
      : {
          institution_id: inst.id,
          health_center_name: inst.name,
          ...(exists ? {} : { healthy_checkup_current: true, vaccines_current: true }),
        }
    try {
      await save.mutateAsync({ exists, data })
      setEditing(false)
    } catch (err) {
      setError(errorMessage(err, 'No se pudo guardar.'))
    }
  }

  async function handleUnlink() {
    if (!record?.id) return
    if (
      !window.confirm(
        `¿Desvincular a este niño de ${currentName}? Los datos quedan en el historial y se recuperan si volvés a vincular esa institución.`,
      )
    )
      return
    setError(null)
    try {
      await del.mutateAsync()
      setEditing(false)
      setSelected('')
    } catch (err) {
      setError(errorMessage(err, 'No se pudo desvincular.'))
    }
  }

  return (
    <Card accent={isEdu ? 'var(--edu)' : 'var(--health)'}>
      <div className={styles.cardTitleRow}>
        <h2 className={styles.cardTitle} style={{ marginBottom: 0 }}>
          {isEdu ? <IconBook size={18} /> : <IconHeart size={18} />}
          {isEdu ? 'Institución educativa' : 'Institución de salud'}
        </h2>
        {!editing && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setSelected(currentInstId)
              setError(null)
              setEditing(true)
            }}
          >
            <IconEdit size={14} />
            {record ? 'Cambiar' : 'Vincular'}
          </Button>
        )}
      </div>

      {!editing && (
        <p className={styles.notes}>
          {currentName ?? (
            <span style={{ color: 'var(--text-soft)', fontStyle: 'italic' }}>
              Sin institución vinculada.
            </span>
          )}
        </p>
      )}

      {editing && (
        <div className={styles.obsForm} style={{ marginTop: 0 }}>
          <select
            className={styles.periodInput}
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">— Elegir institución —</option>
            {options.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
          {error && <p className={styles.obsError}>{error}</p>}
          <div className={styles.obsFormActions}>
            {record && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleUnlink}
                disabled={del.isPending}
              >
                Desvincular
              </Button>
            )}
            <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={save.isPending || !selected || selected === currentInstId}
              onClick={handleSave}
            >
              {save.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}

// ── AlertsCard ────────────────────────────────────────────────────────────────
// Alertas del SAT + gestión ("en seguimiento"). La institución dueña del
// registro o el admin puede confirmar una alerta: se coordina un control fuera
// de la plataforma y la alerta se silencia un tiempo. Si el problema persiste,
// vuelve a aparecer como pendiente.

function formatPeriodLabel(period?: string | null): string {
  if (!period) return ''
  const [y, b] = period.split('-')
  return `${b}° bim. ${y}`
}

function AlertRow({
  alert,
  childId,
  canManage,
}: {
  alert: ChildAlert
  childId: string
  canManage: boolean
}) {
  const [managing, setManaging] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const mutation = useAcknowledgeAlertMutation(childId)

  const managed = alert.status === 'managed'
  const inRecord = alert.sources.includes('record')
  const inPeriod = alert.sources.includes('period')
  const olderHistory = (alert.history ?? []).filter((h) => !h.active)

  async function submit() {
    if (note.trim().length < 5) {
      setError('Escribí una nota (al menos 5 caracteres).')
      return
    }
    setError(null)
    try {
      await mutation.mutateAsync({ type: alert.type, note: note.trim() })
      setManaging(false)
      setNote('')
    } catch (err) {
      setError(errorMessage(err, 'No se pudo registrar la gestión.'))
    }
  }

  return (
    <div className={styles.alertRow}>
      <div className={styles.alertRowHead}>
        <IconAlert size={14} />
        <span className={styles.alertRowLabel}>{alert.label}</span>
        <Badge tone={managed ? 'neutral' : 'amber'}>{managed ? 'En seguimiento' : 'Pendiente'}</Badge>
      </div>

      <p className={styles.alertRowMeta}>
        {inRecord && inPeriod
          ? 'Marcada en la ficha vigente y en el último bimestre informado.'
          : inPeriod
            ? `Marcada en el ${formatPeriodLabel(alert.period)}, aunque la ficha vigente diga lo contrario.`
            : 'Marcada en la ficha vigente.'}
      </p>

      {managed && alert.management && (
        <p className={styles.alertRowMeta}>
          Gestionada{alert.management.by ? ` por ${alert.management.by}` : ''}
          {alert.management.expires_at
            ? ` · se vuelve a revisar el ${formatDate(alert.management.expires_at.slice(0, 10))}`
            : ''}
          {alert.management.note ? ` — “${alert.management.note}”` : ''}
        </p>
      )}

      {canManage && !managing && (
        <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setNote('')
              setError(null)
              setManaging(true)
            }}
          >
            <IconCheck size={14} />
            {managed ? 'Actualizar seguimiento' : 'Confirmar / gestionar'}
          </Button>
          {olderHistory.length > 0 && (
            <Button variant="secondary" size="sm" onClick={() => setShowHistory((v) => !v)}>
              {showHistory ? 'Ocultar historial' : `Historial (${olderHistory.length})`}
            </Button>
          )}
        </div>
      )}

      {managing && (
        <div className={styles.obsForm} style={{ marginTop: 8 }}>
          <textarea
            className={styles.obsTextarea}
            rows={3}
            maxLength={2000}
            placeholder="¿Qué se hizo o se va a hacer? Ej.: se contactó a la familia y se coordinó turno para el control."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          {error && <p className={styles.obsError}>{error}</p>}
          <div className={styles.obsFormActions}>
            <Button type="button" variant="secondary" size="sm" onClick={() => setManaging(false)}>
              Cancelar
            </Button>
            <Button size="sm" disabled={mutation.isPending} onClick={submit}>
              {mutation.isPending ? 'Guardando...' : 'Marcar como gestionada'}
            </Button>
          </div>
        </div>
      )}

      {showHistory && olderHistory.length > 0 && (
        <div className={styles.alertHistory}>
          {olderHistory.map((h, i) => (
            <p key={i} className={styles.alertRowMeta}>
              {h.acknowledged_at ? formatDate(h.acknowledged_at.slice(0, 10)) : '—'}
              {h.by ? ` · ${h.by}` : ''} — “{h.note}”
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

function AlertsCard({
  alerts,
  otherSectorAlert,
  childId,
  canManage,
}: {
  alerts: ChildAlert[]
  otherSectorAlert?: boolean
  childId: string
  canManage: boolean
}) {
  if (alerts.length === 0 && !otherSectorAlert) return null

  return (
    <Card>
      <h2 className={styles.cardTitle}>
        <IconAlert size={18} />
        Alertas
      </h2>
      <div className={styles.alertsList}>
        {alerts.map((a) => (
          <AlertRow key={a.type} alert={a} childId={childId} canManage={canManage} />
        ))}
        {otherSectorAlert && (
          <div className={styles.alertItem}>
            <IconAlert size={14} />
            <span>Alerta pendiente en otro sector</span>
            <Badge tone="neutral">Sin detalle</Badge>
          </div>
        )}
      </div>
    </Card>
  )
}

// ── DeleteChildButton ─────────────────────────────────────────────────────────
// Solo admin: da de baja (soft delete) el registro del niño. El backend nunca
// borra físicamente — los registros de dominio (educación, salud, etc.) quedan
// intactos para trazabilidad; el niño solo deja de listarse/buscarse.

function DeleteChildButton({ childId, fullName }: { childId: string; fullName: string }) {
  const navigate = useNavigate()
  const mutation = useDeleteChildMutation()
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    if (
      !window.confirm(
        `¿Dar de baja a ${fullName}? El registro deja de listarse y buscarse, pero no se borra: los datos históricos (educación, salud, etc.) se conservan y un admin puede restaurarlo si hace falta.`,
      )
    )
      return
    setError(null)
    try {
      await mutation.mutateAsync(childId)
      navigate('/children')
    } catch (err) {
      setError(errorMessage(err, 'No se pudo dar de baja al niño.'))
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
      <Button variant="danger" onClick={handleDelete} disabled={mutation.isPending}>
        <IconTrash size={18} />
        {mutation.isPending ? 'Dando de baja...' : 'Dar de baja'}
      </Button>
      {error && <p className={styles.obsError}>{error}</p>}
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

          {/* reporte bimestral: asistencia + resumen del bimestre elegido */}
          <EducationPeriodSection
            childId={id!}
            period={period}
            setPeriod={setPeriod}
            options={bimestreOptions}
            canEdit={isInstitucion}
          />

          {/* alertas del SAT + gestión ("en seguimiento") */}
          <AlertsCard
            alerts={alerts}
            otherSectorAlert={child.other_sector_alert}
            childId={id!}
            canManage={isAdmin || isInstitucion}
          />

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
                <DataRow label="Fecha de nacimiento" value={birthDateValue(child)} />
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

          <AlertsCard
            alerts={alerts}
            otherSectorAlert={child.other_sector_alert}
            childId={id!}
            canManage={isAdmin || isInstitucion}
          />

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

          <HealthPeriodSection
            childId={id!}
            period={period}
            setPeriod={setPeriod}
            options={bimestreOptions}
            canEdit={isInstitucion && isSaludInstitution}
          />

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
              {child.birth_date_is_placeholder && (
                <Badge tone="amber" title="El archivo importado no traía este dato; se completó con 1/1/2000. Verificar y corregir.">
                  <IconAlert size={12} /> Fecha estimada, no estaba cargada en la importación
                </Badge>
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
        {isAdmin && (
          <div className={styles.headActions}>
            <Button variant="secondary" onClick={() => navigate(`/children/${id}/edit`)}>
              <IconEdit size={18} />
              Editar
            </Button>
            <DeleteChildButton childId={id!} fullName={fullName} />
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
              <DataRow label="Nacimiento" value={birthDateValue(child)} />
              <DataRow label="Domicilio" value={child.birth_record?.address ?? '—'} />
            </div>
          </Card>

          {child.notes && (
            <Card>
              <h2 className={styles.cardTitle}>Notas</h2>
              <p className={styles.notes}>{child.notes}</p>
            </Card>
          )}

          {isAdmin && <SectorInstitutionAdmin sector="educacion" childId={id!} record={edu} />}

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

          {edu && (
            <EducationPeriodSection
              childId={id!}
              period={period}
              setPeriod={setPeriod}
              options={bimestreOptions}
              canEdit={isAdmin}
            />
          )}
        </div>

        <div className={styles.sideStack}>
          {isAdmin && (
            <SectorInstitutionAdmin sector="salud" childId={id!} record={child.health_record} />
          )}

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

          {child.health_record && (
            <HealthPeriodSection
              childId={id!}
              period={period}
              setPeriod={setPeriod}
              options={bimestreOptions}
              canEdit={isAdmin}
            />
          )}

          <AlertsCard
            alerts={child.alerts ?? []}
            otherSectorAlert={child.other_sector_alert}
            childId={id!}
            canManage={isAdmin || isInstitucion}
          />

          {/* Las observaciones son la bitácora de UN registro (education_record_id /
              health_record_id son NOT NULL en la base) — sin el registro del sector
              no hay dónde colgarlas, así que solo se ofrecen si existe. */}
          {edu && <ObservacionesSection childId={id!} canAdd={isAdmin} />}
          {child.health_record && (
            <HealthObservationSection childId={id!} canAdd={isAdmin} />
          )}
        </div>
      </div>
    </div>
  )
}
