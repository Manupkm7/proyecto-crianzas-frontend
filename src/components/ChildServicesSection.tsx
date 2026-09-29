import { useMemo, useState } from 'react'
import {
  useChildServicesQuery,
  useDeleteChildServiceMutation,
  useProviderOptions,
  useSaveChildServiceMutation,
  useServiceTypesQuery,
} from '../hooks/useServices'
import { Badge } from './Badge'
import { Button } from './Button'
import { Card } from './Card'
import { IconAlert, IconEdit, IconPlus } from './icons'
import type { ChildService, ServicePeriodType, ServiceSectorKey, ServiceType } from '../types'
import detail from '../pages/css/detail.module.css'
import styles from './css/ChildServicesSection.module.css'

// Prestaciones por período (trimestre/bimestre) de un niño: salud, cuidado y
// educación, protección social, recreación... informadas por distintos
// efectores. Llegan por carga masiva (en la misma fila que matchea al niño) o se
// cargan a mano acá.
//
// Visibilidad (la aplica el backend): admin/coordinador ven todas; una
// institución ve y carga solo las prestaciones en las que ella es el efector.

const MAX_PERIOD: Record<ServicePeriodType, number> = { trimestre: 4, bimestre: 6 }

function currentTrimester() {
  const now = new Date()
  return { year: now.getFullYear(), number: Math.floor(now.getMonth() / 3) + 1 }
}

function errorMessage(err: unknown, fallback: string): string {
  const body = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })
    .response?.data
  const firstFieldError = body?.errors ? Object.values(body.errors)[0]?.[0] : undefined
  return firstFieldError ?? body?.message ?? fallback
}

interface ServiceForm {
  service_type_id: string
  institution_id: string
  sector: ServiceSectorKey | ''
  period_type: ServicePeriodType
  period_number: string
  year: string
  service_number: string
  observations: string
  has_alert: boolean
}

function emptyForm(): ServiceForm {
  const { year, number } = currentTrimester()
  return {
    service_type_id: '',
    institution_id: '',
    sector: '',
    period_type: 'trimestre',
    period_number: String(number),
    year: String(year),
    service_number: '',
    observations: '',
    has_alert: false,
  }
}

function formFromService(s: ChildService): ServiceForm {
  return {
    service_type_id: s.service_type?.id ?? '',
    institution_id: s.institution?.id ?? '',
    sector: s.sector,
    period_type: s.period_type,
    period_number: String(s.period_number),
    year: String(s.year),
    service_number: s.service_number != null ? String(s.service_number) : '',
    observations: s.observations ?? '',
    has_alert: s.has_alert,
  }
}

interface PeriodGroup {
  key: string
  label: string
  services: ChildService[]
}

export function ChildServicesSection({
  childId,
  canEdit,
  isAdmin,
  showMissing,
}: {
  childId: string
  /** Admin o usuario institucional con gestión de niños (el backend valida el efector). */
  canEdit: boolean
  /** Solo admin elige el efector y puede dar de baja. */
  isAdmin: boolean
  /** Admin/coordinador: marcar las prestaciones obligatorias que faltan en cada período. */
  showMissing: boolean
}) {
  const { data: services = [], isLoading, isError } = useChildServicesQuery(childId)
  const { data: catalog } = useServiceTypesQuery(false)
  const providers = useProviderOptions(isAdmin)
  const saveMutation = useSaveChildServiceMutation(childId)
  const deleteMutation = useDeleteChildServiceMutation(childId)

  const [periodFilter, setPeriodFilter] = useState('')
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [form, setForm] = useState<ServiceForm>(emptyForm)
  const [error, setError] = useState<string | null>(null)

  const serviceTypes = catalog?.data ?? []
  const sectors = catalog?.sectors ?? []
  const mandatory = serviceTypes.filter((t) => t.is_mandatory)

  // Agrupadas por período, del más reciente al más viejo (el backend ya ordena
  // por period_start desc y nro de prestación).
  const groups = useMemo<PeriodGroup[]>(() => {
    const map = new Map<string, PeriodGroup>()
    for (const s of services) {
      const g = map.get(s.period_key) ?? { key: s.period_key, label: s.period_label, services: [] }
      g.services.push(s)
      map.set(s.period_key, g)
    }
    return [...map.values()]
  }, [services])

  const visibleGroups = periodFilter ? groups.filter((g) => g.key === periodFilter) : groups
  const alertsCount = services.filter((s) => s.has_alert).length

  const typesBySector = useMemo(() => {
    const map = new Map<string, ServiceType[]>()
    for (const t of serviceTypes) {
      const list = map.get(t.sector_label) ?? []
      list.push(t)
      map.set(t.sector_label, list)
    }
    return [...map.entries()]
  }, [serviceTypes])

  function startNew() {
    setForm(emptyForm())
    setError(null)
    setEditingId('new')
  }

  function startEdit(s: ChildService) {
    setForm(formFromService(s))
    setError(null)
    setEditingId(s.id)
  }

  async function handleSave() {
    setError(null)
    if (!form.service_type_id) {
      setError('Elegí la prestación.')
      return
    }
    if (isAdmin && !form.institution_id) {
      setError('Elegí el efector.')
      return
    }
    try {
      await saveMutation.mutateAsync({
        id: editingId && editingId !== 'new' ? editingId : undefined,
        service_type_id: form.service_type_id,
        ...(isAdmin ? { institution_id: form.institution_id } : {}),
        sector: form.sector || null,
        year: Number(form.year),
        period_type: form.period_type,
        period_number: Number(form.period_number),
        service_number: form.service_number.trim() === '' ? null : Number(form.service_number),
        observations: form.observations.trim() || null,
        has_alert: form.has_alert,
      })
      setEditingId(null)
    } catch (err) {
      setError(errorMessage(err, 'No se pudo guardar la prestación.'))
    }
  }

  async function handleDelete(s: ChildService) {
    if (!window.confirm(`¿Dar de baja la prestación "${s.service_type?.name}" (${s.period_label})?`)) return
    try {
      await deleteMutation.mutateAsync(s.id)
    } catch (err) {
      window.alert(errorMessage(err, 'No se pudo dar de baja la prestación.'))
    }
  }

  function missingIn(group: PeriodGroup): ServiceType[] {
    if (!showMissing) return []
    const present = new Set(group.services.map((s) => s.service_type?.id))
    return mandatory.filter((t) => !present.has(t.id))
  }

  const periodNumbers = Array.from({ length: MAX_PERIOD[form.period_type] }, (_, i) => i + 1)

  return (
    <Card>
      <div className={detail.bimestreBar}>
        <h2 className={detail.cardTitle} style={{ marginBottom: 0 }}>
          Prestaciones
          {alertsCount > 0 && (
            <Badge tone="amber" style={{ marginLeft: 8 }}>
              <IconAlert size={12} /> {alertsCount} con alerta
            </Badge>
          )}
        </h2>
        <div className={styles.headActions}>
          {groups.length > 1 && (
            <select
              className={detail.bimestreSelect}
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              aria-label="Filtrar por período"
            >
              <option value="">Todos los períodos</option>
              {groups.map((g) => (
                <option key={g.key} value={g.key}>
                  {g.label}
                </option>
              ))}
            </select>
          )}
          {canEdit && editingId === null && (
            <Button variant="secondary" size="sm" onClick={startNew}>
              <IconPlus size={14} />
              Cargar prestación
            </Button>
          )}
        </div>
      </div>

      {editingId !== null && (
        <div className={detail.obsForm}>
          <div className={detail.periodGrid}>
            <label className={`${detail.periodField} ${detail.wide}`}>
              <span className={detail.periodLabel}>Prestación</span>
              <select
                className={detail.periodInput}
                value={form.service_type_id}
                onChange={(e) => setForm({ ...form, service_type_id: e.target.value })}
              >
                <option value="">Elegir prestación…</option>
                {typesBySector.map(([sectorLabel, types]) => (
                  <optgroup key={sectorLabel} label={sectorLabel}>
                    {types.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                        {t.is_mandatory ? ' (obligatoria)' : ''}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>

            {isAdmin && (
              <label className={`${detail.periodField} ${detail.wide}`}>
                <span className={detail.periodLabel}>Efector</span>
                <select
                  className={detail.periodInput}
                  value={form.institution_id}
                  onChange={(e) => setForm({ ...form, institution_id: e.target.value })}
                >
                  <option value="">Elegir institución…</option>
                  {providers.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className={detail.periodField}>
              <span className={detail.periodLabel}>Tipo de período</span>
              <select
                className={detail.periodInput}
                value={form.period_type}
                onChange={(e) => {
                  const type = e.target.value as ServicePeriodType
                  const n = Math.min(Number(form.period_number), MAX_PERIOD[type])
                  setForm({ ...form, period_type: type, period_number: String(n) })
                }}
              >
                <option value="trimestre">Trimestre</option>
                <option value="bimestre">Bimestre</option>
              </select>
            </label>

            <label className={detail.periodField}>
              <span className={detail.periodLabel}>
                {form.period_type === 'trimestre' ? 'Trimestre' : 'Bimestre'}
              </span>
              <select
                className={detail.periodInput}
                value={form.period_number}
                onChange={(e) => setForm({ ...form, period_number: e.target.value })}
              >
                {periodNumbers.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>

            <label className={detail.periodField}>
              <span className={detail.periodLabel}>Año</span>
              <input
                className={detail.periodInput}
                type="number"
                min={2000}
                max={2100}
                value={form.year}
                onChange={(e) => setForm({ ...form, year: e.target.value })}
              />
            </label>

            <label className={detail.periodField}>
              <span className={detail.periodLabel}>Nro prestación</span>
              <input
                className={detail.periodInput}
                type="number"
                min={0}
                value={form.service_number}
                onChange={(e) => setForm({ ...form, service_number: e.target.value })}
              />
            </label>

            <label className={`${detail.periodField} ${detail.wide}`}>
              <span className={detail.periodLabel}>Sector</span>
              <select
                className={detail.periodInput}
                value={form.sector}
                onChange={(e) => setForm({ ...form, sector: e.target.value as ServiceSectorKey | '' })}
              >
                <option value="">El de la prestación en el catálogo</option>
                {sectors.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={`${detail.periodField} ${detail.wide}`}>
              <span className={detail.periodLabel}>Observaciones</span>
              <textarea
                className={detail.obsTextarea}
                rows={3}
                maxLength={3000}
                value={form.observations}
                onChange={(e) => setForm({ ...form, observations: e.target.value })}
              />
            </label>

            <label className={detail.periodCheck} style={{ gridColumn: '1 / -1' }}>
              <input
                type="checkbox"
                checked={form.has_alert}
                onChange={(e) => setForm({ ...form, has_alert: e.target.checked })}
              />
              Marcar con alerta (genera una alerta del SAT hasta que alguien la gestione)
            </label>
          </div>

          {error && <p className={detail.obsError}>{error}</p>}
          <div className={detail.obsFormActions}>
            <Button type="button" variant="secondary" size="sm" onClick={() => setEditingId(null)}>
              Cancelar
            </Button>
            <Button size="sm" disabled={saveMutation.isPending} onClick={handleSave}>
              {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>
      )}

      {isLoading && <p className={detail.periodEmpty}>Cargando...</p>}
      {isError && <p className={detail.periodEmpty}>No se pudieron cargar las prestaciones.</p>}

      {!isLoading && !isError && services.length === 0 && (
        <p className={detail.periodEmpty}>Sin prestaciones cargadas.</p>
      )}

      {visibleGroups.map((group) => {
        const missing = missingIn(group)
        return (
          <section key={group.key} className={styles.group}>
            <h3 className={styles.groupTitle}>{group.label}</h3>

            {missing.length > 0 && (
              <p className={styles.missing}>
                <IconAlert size={13} /> Faltan prestaciones obligatorias:{' '}
                {missing.map((t) => t.name).join(', ')}
              </p>
            )}

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Nro</th>
                    <th>Sector</th>
                    <th>Efector</th>
                    <th>Prestación</th>
                    <th>Observaciones</th>
                    <th>Alerta</th>
                    {canEdit && <th aria-label="Acciones" />}
                  </tr>
                </thead>
                <tbody>
                  {group.services.map((s) => (
                    <tr key={s.id} className={s.has_alert ? styles.rowAlert : undefined}>
                      <td data-label="Nro">{s.service_number ?? '—'}</td>
                      <td data-label="Sector">{s.sector_label}</td>
                      <td data-label="Efector">{s.institution?.name ?? '—'}</td>
                      <td data-label="Prestación">
                        {s.service_type?.name ?? '—'}
                        {s.service_type?.is_mandatory && (
                          <span className={styles.mandatoryTag}>obligatoria</span>
                        )}
                      </td>
                      <td data-label="Observaciones" className={styles.obsCell}>
                        {s.observations ?? <span className={styles.muted}>s/d</span>}
                      </td>
                      <td data-label="Alerta">
                        {s.has_alert ? (
                          <Badge tone="amber">
                            <IconAlert size={12} /> Sí
                          </Badge>
                        ) : (
                          <span className={styles.muted}>No</span>
                        )}
                      </td>
                      {canEdit && (
                        <td className={styles.actions}>
                          <button
                            type="button"
                            className={styles.iconBtn}
                            onClick={() => startEdit(s)}
                            title="Editar"
                            aria-label="Editar prestación"
                          >
                            <IconEdit size={14} />
                          </button>
                          {isAdmin && (
                            <button
                              type="button"
                              className={styles.linkBtn}
                              onClick={() => handleDelete(s)}
                              disabled={deleteMutation.isPending}
                            >
                              Baja
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )
      })}
    </Card>
  )
}
