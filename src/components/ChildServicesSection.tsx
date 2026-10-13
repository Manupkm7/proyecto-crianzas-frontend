import { useMemo, useState } from 'react'
import {
  useChildServicesQuery,
  useDeleteChildServiceMutation,
  useSaveChildServiceMutation,
  useServiceTypesQuery,
} from '../hooks/useServices'
import { Badge } from './Badge'
import { Button } from './Button'
import { Card } from './Card'
import {
  ChildServiceForm,
  emptyServiceForm,
  serviceErrorMessage,
  serviceFormFrom,
  servicePayloadFrom,
  validateServiceForm,
  type ServiceForm,
} from './ChildServiceForm'
import { IconAlert, IconEdit, IconPlus } from './icons'
import type { ChildService, ServiceType } from '../types'
import detail from '../pages/css/detail.module.css'
import styles from './css/ChildServicesSection.module.css'

// Prestaciones por período (trimestre/bimestre) de un niño: salud, cuidado y
// educación, protección social, recreación... informadas por distintos
// efectores. Llegan por carga masiva (en la misma fila que matchea al niño) o se
// cargan a mano acá.
//
// Visibilidad (la aplica el backend): admin/coordinador ven todas; una
// institución ve y carga solo las prestaciones en las que ella es el efector.

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
  const saveMutation = useSaveChildServiceMutation(childId)
  const deleteMutation = useDeleteChildServiceMutation(childId)

  const [periodFilter, setPeriodFilter] = useState('')
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [form, setForm] = useState<ServiceForm>(emptyServiceForm)
  const [error, setError] = useState<string | null>(null)

  const mandatory = (catalog?.data ?? []).filter((t) => t.is_mandatory)

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

  function startNew() {
    setForm(emptyServiceForm())
    setError(null)
    setEditingId('new')
  }

  function startEdit(s: ChildService) {
    setForm(serviceFormFrom(s))
    setError(null)
    setEditingId(s.id)
  }

  async function handleSave() {
    const invalid = validateServiceForm(form, isAdmin)
    setError(invalid)
    if (invalid) return
    try {
      await saveMutation.mutateAsync({
        id: editingId && editingId !== 'new' ? editingId : undefined,
        ...servicePayloadFrom(form, isAdmin),
      })
      setEditingId(null)
    } catch (err) {
      setError(serviceErrorMessage(err, 'No se pudo guardar la prestación.'))
    }
  }

  async function handleDelete(s: ChildService) {
    if (!window.confirm(`¿Dar de baja la prestación "${s.service_type?.name}" (${s.period_label})?`)) return
    try {
      await deleteMutation.mutateAsync(s.id)
    } catch (err) {
      window.alert(serviceErrorMessage(err, 'No se pudo dar de baja la prestación.'))
    }
  }

  function missingIn(group: PeriodGroup): ServiceType[] {
    if (!showMissing) return []
    const present = new Set(group.services.map((s) => s.service_type?.id))
    return mandatory.filter((t) => !present.has(t.id))
  }

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
        <ChildServiceForm
          form={form}
          onChange={setForm}
          isAdmin={isAdmin}
          error={error}
          saving={saveMutation.isPending}
          onSave={handleSave}
          onCancel={() => setEditingId(null)}
        />
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
