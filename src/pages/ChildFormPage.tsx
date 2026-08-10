import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { useQueryClient } from '@tanstack/react-query'
import { useCreateChildMutation, useUpdateChildMutation, useChildQuery } from '../hooks/useChildren'
import {
  saveBirthRecord as apiBirthRecord,
  saveDeathRecord as apiDeathRecord,
} from '../api/records'
import { useInstitutionsQuery } from '../hooks/useInstitutions'
import { useRole } from '../hooks/useRole'
import { queryKeys } from '../api/queryKeys'
import type { ApiErrorBody } from '../types'

type ChildForm = {
  first_name: string
  last_name: string
  birth_date: string
  dni: string
  notes: string
}

type BirthForm = {
  institution_id: string
  mother_name: string
  mother_dni: string
  father_name: string
  father_dni: string
  address: string
  birth_establishment: string
  observations: string
}

type DeathForm = {
  institution_id: string
  death_date: string
  child_dni: string
  mother_dni: string
  cause_of_death: string
  observations: string
}

const EMPTY_BIRTH: BirthForm = {
  institution_id: '',
  mother_name: '',
  mother_dni: '',
  father_name: '',
  father_dni: '',
  address: '',
  birth_establishment: '',
  observations: '',
}

const EMPTY_DEATH: DeathForm = {
  institution_id: '',
  death_date: '',
  child_dni: '',
  mother_dni: '',
  cause_of_death: '',
  observations: '',
}

// Convierte strings vacíos a null para que el backend aplique `nullable` correctamente.
function nullify(form: Record<string, string>): Record<string, string | null> {
  return Object.fromEntries(
    Object.entries(form).map(([k, v]) => [k, v.trim() === '' ? null : v]),
  )
}

function ReadOnlyDivider({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0.25rem 0' }}>
      <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--color-border)' }} />
      <span
        style={{
          fontWeight: 700,
          fontSize: '0.78rem',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: 'var(--color-muted)',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--color-border)' }} />
    </div>
  )
}

function DataField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span
        style={{
          fontSize: '0.72rem',
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: 'var(--text-soft)',
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: '0.9rem', color: 'var(--text)', fontWeight: 500 }}>
        {value ?? '—'}
      </span>
    </div>
  )
}

function SectionDivider({
  label,
  included,
  onChange,
  danger = false,
}: {
  label: string
  included: boolean
  onChange: (v: boolean) => void
  danger?: boolean
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0.25rem 0' }}>
      <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--color-border)' }} />
      <span
        style={{
          fontWeight: 700,
          fontSize: '0.78rem',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: danger ? 'var(--color-danger)' : 'var(--color-muted)',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          cursor: 'pointer',
          fontSize: '0.82rem',
          color: 'var(--color-muted)',
          whiteSpace: 'nowrap',
        }}
      >
        <input type="checkbox" checked={included} onChange={(e) => onChange(e.target.checked)} />
        Incluir
      </label>
      <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--color-border)' }} />
    </div>
  )
}

export default function ChildFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const { isAdmin } = useRole()
  const queryClient = useQueryClient()

  const [form, setForm] = useState<ChildForm>({
    first_name: '',
    last_name: '',
    birth_date: '',
    dni: '',
    notes: '',
  })
  const [birthForm, setBirthForm] = useState<BirthForm>(EMPTY_BIRTH)
  const [includeBirth, setIncludeBirth] = useState(false)
  const [deathForm, setDeathForm] = useState<DeathForm>(EMPTY_DEATH)
  const [includeDeath, setIncludeDeath] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [saving, setSaving] = useState(false)

  const { data: fetchedChild, isLoading: loadingChild } = useChildQuery(isEdit ? id : undefined)
  const { data: institutions = [] } = useInstitutionsQuery({ enabled: isAdmin })
  const activeInstitutions = institutions.filter((i) => i.is_active)

  const createChild = useCreateChildMutation()
  const updateChild = useUpdateChildMutation(id ?? '')

  useEffect(() => {
    if (!fetchedChild) return

    setForm({
      first_name: fetchedChild.first_name ?? '',
      last_name: fetchedChild.last_name ?? '',
      birth_date: fetchedChild.birth_date ?? '',
      dni: fetchedChild.dni ?? '',
      notes: fetchedChild.notes ?? '',
    })

    if (fetchedChild.birth_record) {
      const br = fetchedChild.birth_record
      setIncludeBirth(true)
      setBirthForm({
        institution_id: br.institution?.id ?? '',
        mother_name: br.mother_name ?? '',
        mother_dni: br.mother_dni ?? '',
        father_name: br.father_name ?? '',
        father_dni: br.father_dni ?? '',
        address: br.address ?? '',
        birth_establishment: br.birth_establishment ?? '',
        observations: br.observations ?? '',
      })
    }

    if (fetchedChild.death_record) {
      const dr = fetchedChild.death_record
      setIncludeDeath(true)
      setDeathForm({
        institution_id: dr.institution?.id ?? '',
        death_date: dr.death_date ?? '',
        child_dni: dr.child_dni ?? '',
        mother_dni: dr.mother_dni ?? '',
        cause_of_death: dr.cause_of_death ?? '',
        observations: dr.observations ?? '',
      })
    }
  }, [fetchedChild])

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: [] }))
  }

  function handleBirthChange(
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const { name, value } = e.target
    setBirthForm((prev) => ({ ...prev, [name]: value }))
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: [] }))
  }

  function handleDeathChange(
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const { name, value } = e.target
    setDeathForm((prev) => ({ ...prev, [name]: value }))
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: [] }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setFieldErrors({})
    setSaving(true)

    try {
      let childId: string

      if (isEdit && id) {
        await updateChild.mutateAsync(form)
        childId = id
      } else {
        const { data } = await createChild.mutateAsync(form)
        const created = 'data' in data ? data.data : data
        childId = created.id
      }

      // Los registros de nacimiento/defunción comparten first_name, last_name, birth_date
      // con el niño — se pasan implícitamente para no duplicar campos en el formulario.
      const sharedChildFields = {
        first_name: form.first_name,
        last_name: form.last_name,
        birth_date: form.birth_date,
      }

      if (isAdmin && includeBirth) {
        const birthExists = isEdit && Boolean(fetchedChild?.birth_record)
        await apiBirthRecord(childId, birthExists, {
          ...nullify(birthForm as Record<string, string>),
          ...sharedChildFields,
        })
        queryClient.invalidateQueries({ queryKey: queryKeys.children.detail(childId) })
      }

      if (isAdmin && includeDeath) {
        const deathExists = isEdit && Boolean(fetchedChild?.death_record)
        await apiDeathRecord(childId, deathExists, {
          ...nullify(deathForm as Record<string, string>),
          ...sharedChildFields,
        })
        queryClient.invalidateQueries({ queryKey: queryKeys.children.detail(childId) })
      }

      if (isEdit) {
        setSuccess('Datos actualizados correctamente.')
      } else {
        navigate(`/children/${childId}`)
      }
    } catch (err) {
      if (isAxiosError<ApiErrorBody>(err)) {
        if (err.response?.status === 409) {
          const existing = err.response.data?.child
          setError(
            existing
              ? `Ya existe un niño con ese DNI: ${existing.first_name} ${existing.last_name}.`
              : (err.response.data?.message ?? 'Conflicto al guardar los datos.'),
          )
        } else if (err.response?.status === 422) {
          setFieldErrors(err.response.data?.errors ?? {})
          setError('Hay errores en el formulario. Corregílos y volvé a intentar.')
        } else {
          setError(
            err.response?.data?.message ??
              (isEdit ? 'Error al actualizar.' : 'Error al registrar el niño.'),
          )
        }
      } else {
        setError(isEdit ? 'Error al actualizar.' : 'Error al registrar el niño.')
      }
    } finally {
      setSaving(false)
    }
  }

  if (loadingChild && isEdit) {
    return <p className="text-muted">Cargando…</p>
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <>
      <div className="page-header">
        <div>
          <Link to={isEdit ? `/children/${id}` : '/children'} className="back-link">
            ← {isEdit ? 'Volver al perfil' : 'Volver al listado'}
          </Link>
          <h1>
            {isEdit
              ? `Editar — ${fetchedChild?.first_name ?? ''} ${fetchedChild?.last_name ?? ''}`
              : 'Registrar nuevo niño'}
          </h1>
        </div>
      </div>

      <div className="form-card" style={{ maxWidth: 760 }}>
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit} className="form">

          {/* ── Datos del niño ─────────────────────────────────────────── */}
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
              {fieldErrors.first_name?.[0] && (
                <span className="field-error">{fieldErrors.first_name[0]}</span>
              )}
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
              {fieldErrors.last_name?.[0] && (
                <span className="field-error">{fieldErrors.last_name[0]}</span>
              )}
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
                max={today}
              />
              {fieldErrors.birth_date?.[0] && (
                <span className="field-error">{fieldErrors.birth_date[0]}</span>
              )}
            </div>
            <div className="field">
              <label htmlFor="dni">
                DNI{' '}
                <span style={{ color: 'var(--color-muted)', fontWeight: 400 }}>
                  (opcional — cifrado)
                </span>
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
              {fieldErrors.dni?.[0] && (
                <span className="field-error">{fieldErrors.dni[0]}</span>
              )}
            </div>
          </div>

          <div className="field">
            <label htmlFor="notes">
              Notas generales{' '}
              <span style={{ color: 'var(--color-muted)', fontWeight: 400 }}>(opcional)</span>
            </label>
            <textarea
              id="notes"
              name="notes"
              value={form.notes}
              onChange={handleChange}
              maxLength={2000}
              rows={2}
              placeholder="Observaciones generales, no vinculadas a salud ni educación."
            />
            {fieldErrors.notes?.[0] && (
              <span className="field-error">{fieldErrors.notes[0]}</span>
            )}
          </div>

          {/* ── Registro educativo (solo admin, solo edición, read-only) ── */}
          {isAdmin && isEdit && (
            <>
              <ReadOnlyDivider label="Registro educativo" />
              {fetchedChild?.education_record ? (() => {
                const er = fetchedChild.education_record!
                const attendance =
                  er.attendance_present_days != null && er.attendance_total_days != null
                    ? `${er.attendance_present_days} / ${er.attendance_total_days}${er.attendance_period_label ? ` (${er.attendance_period_label})` : ''}`
                    : null
                return (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '12px 24px',
                      padding: '14px',
                      background: 'var(--surface-2, rgba(0,0,0,0.03))',
                      borderRadius: 10,
                    }}
                  >
                    <DataField
                      label="Institución educativa"
                      value={er.institution?.name ?? er.school_name}
                    />
                    {er.institution?.name && er.school_name !== er.institution.name && (
                      <DataField label="Nombre de la escuela" value={er.school_name} />
                    )}
                    <DataField
                      label="Estado de matrícula"
                      value={
                        er.is_enrolled ? (
                          <span className="badge badge-green">Matriculado</span>
                        ) : (
                          <span className="badge badge-red">No matriculado</span>
                        )
                      }
                    />
                    <DataField label="Nivel" value={er.level_label ?? er.level} />
                    <DataField label="Año / grado" value={er.grade_label ?? (er.grade != null ? String(er.grade) : null)} />
                    <DataField label="Inasistencias" value={er.absences_count != null ? String(er.absences_count) : null} />
                    {attendance && <DataField label="Asistencia" value={attendance} />}
                    {er.observations && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <DataField label="Observaciones" value={er.observations} />
                      </div>
                    )}
                  </div>
                )
              })() : (
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '4px 0 8px' }}>
                  Sin registro educativo vinculado. El niño aún no fue matcheado con ninguna institución educativa.
                </p>
              )}
            </>
          )}

          {/* ── Registro de nacimiento (solo admin) ────────────────────── */}
          {isAdmin && (
            <>
              <SectionDivider
                label="Registro de nacimiento"
                included={includeBirth}
                onChange={setIncludeBirth}
              />

              {includeBirth && (
                <>
                  <div className="form-row">
                    <div className="field">
                      <label htmlFor="mother_name">Nombre de la madre</label>
                      <input
                        id="mother_name"
                        name="mother_name"
                        type="text"
                        value={birthForm.mother_name}
                        onChange={handleBirthChange}
                        maxLength={200}
                      />
                      {fieldErrors.mother_name?.[0] && (
                        <span className="field-error">{fieldErrors.mother_name[0]}</span>
                      )}
                    </div>
                    <div className="field">
                      <label htmlFor="mother_dni">DNI de la madre</label>
                      <input
                        id="mother_dni"
                        name="mother_dni"
                        type="text"
                        value={birthForm.mother_dni}
                        onChange={handleBirthChange}
                        maxLength={15}
                        placeholder="Ej: 32000111"
                      />
                      {fieldErrors.mother_dni?.[0] && (
                        <span className="field-error">{fieldErrors.mother_dni[0]}</span>
                      )}
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="field">
                      <label htmlFor="father_name">Nombre del padre</label>
                      <input
                        id="father_name"
                        name="father_name"
                        type="text"
                        value={birthForm.father_name}
                        onChange={handleBirthChange}
                        maxLength={200}
                      />
                      {fieldErrors.father_name?.[0] && (
                        <span className="field-error">{fieldErrors.father_name[0]}</span>
                      )}
                    </div>
                    <div className="field">
                      <label htmlFor="father_dni">DNI del padre</label>
                      <input
                        id="father_dni"
                        name="father_dni"
                        type="text"
                        value={birthForm.father_dni}
                        onChange={handleBirthChange}
                        maxLength={15}
                        placeholder="Ej: 30000222"
                      />
                      {fieldErrors.father_dni?.[0] && (
                        <span className="field-error">{fieldErrors.father_dni[0]}</span>
                      )}
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="field">
                      <label htmlFor="birth_address">Domicilio</label>
                      <input
                        id="birth_address"
                        name="address"
                        type="text"
                        value={birthForm.address}
                        onChange={handleBirthChange}
                        maxLength={300}
                        placeholder="Dirección del domicilio familiar"
                      />
                      {fieldErrors.address?.[0] && (
                        <span className="field-error">{fieldErrors.address[0]}</span>
                      )}
                    </div>
                    <div className="field">
                      <label htmlFor="birth_establishment">Establecimiento de nacimiento</label>
                      <input
                        id="birth_establishment"
                        name="birth_establishment"
                        type="text"
                        value={birthForm.birth_establishment}
                        onChange={handleBirthChange}
                        maxLength={200}
                        placeholder="Hospital, clínica, etc."
                      />
                      {fieldErrors.birth_establishment?.[0] && (
                        <span className="field-error">{fieldErrors.birth_establishment[0]}</span>
                      )}
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="field">
                      <label htmlFor="birth_institution_id">
                        Institución que registra{' '}
                        <span style={{ color: 'var(--color-muted)', fontWeight: 400 }}>
                          (opcional)
                        </span>
                      </label>
                      <select
                        id="birth_institution_id"
                        name="institution_id"
                        value={birthForm.institution_id}
                        onChange={handleBirthChange}
                      >
                        <option value="">— Sin asignar —</option>
                        {activeInstitutions.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.institution_id?.[0] && (
                        <span className="field-error">{fieldErrors.institution_id[0]}</span>
                      )}
                    </div>
                  </div>

                  <div className="field">
                    <label htmlFor="birth_observations">
                      Observaciones{' '}
                      <span style={{ color: 'var(--color-muted)', fontWeight: 400 }}>
                        (opcional)
                      </span>
                    </label>
                    <textarea
                      id="birth_observations"
                      name="observations"
                      value={birthForm.observations}
                      onChange={handleBirthChange}
                      maxLength={3000}
                      rows={2}
                    />
                  </div>
                </>
              )}
            </>
          )}

          {/* ── Registro de defunción (solo admin) ─────────────────────── */}
          {isAdmin && (
            <>
              <SectionDivider
                label="Registro de defunción"
                included={includeDeath}
                onChange={setIncludeDeath}
                danger
              />

              {includeDeath && (
                <>
                  <div className="form-row">
                    <div className="field">
                      <label htmlFor="death_date">Fecha de defunción *</label>
                      <input
                        id="death_date"
                        name="death_date"
                        type="date"
                        value={deathForm.death_date}
                        onChange={handleDeathChange}
                        max={today}
                      />
                      {fieldErrors.death_date?.[0] && (
                        <span className="field-error">{fieldErrors.death_date[0]}</span>
                      )}
                    </div>
                    <div className="field">
                      <label htmlFor="death_child_dni">
                        DNI del niño/a{' '}
                        <span style={{ color: 'var(--color-muted)', fontWeight: 400 }}>
                          (opcional)
                        </span>
                      </label>
                      <input
                        id="death_child_dni"
                        name="child_dni"
                        type="text"
                        value={deathForm.child_dni}
                        onChange={handleDeathChange}
                        maxLength={15}
                      />
                      {fieldErrors.child_dni?.[0] && (
                        <span className="field-error">{fieldErrors.child_dni[0]}</span>
                      )}
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="field">
                      <label htmlFor="death_mother_dni">DNI de la madre *</label>
                      <input
                        id="death_mother_dni"
                        name="mother_dni"
                        type="text"
                        value={deathForm.mother_dni}
                        onChange={handleDeathChange}
                        maxLength={15}
                        placeholder="Ej: 32000111"
                      />
                      {fieldErrors.mother_dni?.[0] && (
                        <span className="field-error">{fieldErrors.mother_dni[0]}</span>
                      )}
                    </div>
                    <div className="field">
                      <label htmlFor="death_institution_id">Institución que registra *</label>
                      <select
                        id="death_institution_id"
                        name="institution_id"
                        value={deathForm.institution_id}
                        onChange={handleDeathChange}
                      >
                        <option value="">— Seleccionar —</option>
                        {activeInstitutions.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.institution_id?.[0] && (
                        <span className="field-error">{fieldErrors.institution_id[0]}</span>
                      )}
                    </div>
                  </div>

                  <div className="field">
                    <label htmlFor="cause_of_death">
                      Causa de defunción{' '}
                      <span style={{ color: 'var(--color-muted)', fontWeight: 400 }}>
                        (opcional)
                      </span>
                    </label>
                    <textarea
                      id="cause_of_death"
                      name="cause_of_death"
                      value={deathForm.cause_of_death}
                      onChange={handleDeathChange}
                      maxLength={1000}
                      rows={2}
                    />
                    {fieldErrors.cause_of_death?.[0] && (
                      <span className="field-error">{fieldErrors.cause_of_death[0]}</span>
                    )}
                  </div>

                  <div className="field">
                    <label htmlFor="death_observations">
                      Observaciones{' '}
                      <span style={{ color: 'var(--color-muted)', fontWeight: 400 }}>
                        (opcional)
                      </span>
                    </label>
                    <textarea
                      id="death_observations"
                      name="observations"
                      value={deathForm.observations}
                      onChange={handleDeathChange}
                      maxLength={3000}
                      rows={2}
                    />
                  </div>
                </>
              )}
            </>
          )}

          <div className="form-actions">
            <Link
              to={isEdit ? `/children/${id}` : '/children'}
              className="btn btn-secondary"
            >
              Cancelar
            </Link>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Registrar niño'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
