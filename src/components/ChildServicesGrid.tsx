import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  useChildServicesGridQuery,
  useDeleteChildServiceMutation,
  useSaveChildServiceMutation,
} from '../hooks/useServices'
import { useRole } from '../hooks/useRole'
import {
  ChildServiceForm,
  serviceErrorMessage,
  serviceFormFrom,
  servicePayloadFrom,
  validateServiceForm,
  type ServiceForm,
} from './ChildServiceForm'
import { IconEdit } from './icons'
import section from './css/ChildServicesSection.module.css'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useLocalityScope } from '../context/LocalityScopeContext'
import { useServicesDateRange } from '../context/ServicesDateRangeContext'
import { Table, type Column } from './Table'
import { Badge } from './Badge'
import { SearchInput } from './SearchInput'
import type { ChildService } from '../types'
import styles from './css/ChildrenAlertsTable.module.css'
import grid from './css/ChildServicesGrid.module.css'

const PER_PAGE = 25

// Grilla de niños con sus prestaciones: una fila por prestación, con la misma
// estructura que el archivo que se importa (Fecha, Niño, Nro prestación, Sector,
// Efector, Nombre prestación, Observaciones, Alerta). Un mismo niño aparece
// tantas veces como prestaciones tenga (de distintos efectores). Filtros y
// permisos los resuelve el backend (GET /child-services).
//
// Edición y baja desde la misma grilla, con las reglas de la ficha del niño
// (ver ChildServicePolicy): el admin edita todo, elige efector y da de baja; el
// usuario institucional edita las suyas (la grilla ya solo le muestra esas);
// el coordinador solo lee.

// Formulario de edición de UNA prestación de la grilla. Componente aparte porque
// los hooks de mutación están atados al niño de la prestación.
function GridServiceEditor({
  service,
  isAdmin,
  onDone,
}: {
  service: ChildService
  isAdmin: boolean
  onDone: () => void
}) {
  const saveMutation = useSaveChildServiceMutation(service.child_id)
  const [form, setForm] = useState<ServiceForm>(() => serviceFormFrom(service))
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  // La grilla puede ser larga: llevar el formulario a la vista al abrirlo.
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [service.id])

  async function handleSave() {
    const invalid = validateServiceForm(form, isAdmin)
    setError(invalid)
    if (invalid) return
    try {
      await saveMutation.mutateAsync({ id: service.id, ...servicePayloadFrom(form, isAdmin) })
      onDone()
    } catch (err) {
      setError(serviceErrorMessage(err, 'No se pudo guardar la prestación.'))
    }
  }

  return (
    <div ref={ref} className={grid.editor}>
      <p className={grid.editorTitle}>
        Editando: {service.service_type?.name ?? 'Prestación'} · {service.period_code}
        {service.child && (
          <>
            {' '}
            — {service.child.first_name} {service.child.last_name}
          </>
        )}
      </p>
      <ChildServiceForm
        form={form}
        onChange={setForm}
        isAdmin={isAdmin}
        error={error}
        saving={saveMutation.isPending}
        onSave={handleSave}
        onCancel={onDone}
      />
    </div>
  )
}

function GridServiceDeleteButton({ service, onDeleted }: { service: ChildService; onDeleted: () => void }) {
  const deleteMutation = useDeleteChildServiceMutation(service.child_id)

  async function handleDelete() {
    const childName = service.child ? ` de ${service.child.first_name} ${service.child.last_name}` : ''
    if (!window.confirm(`¿Dar de baja la prestación "${service.service_type?.name}"${childName} (${service.period_label})?`)) return
    try {
      await deleteMutation.mutateAsync(service.id)
      onDeleted()
    } catch (err) {
      window.alert(serviceErrorMessage(err, 'No se pudo dar de baja la prestación.'))
    }
  }

  return (
    <button
      type="button"
      className={section.linkBtn}
      onClick={handleDelete}
      disabled={deleteMutation.isPending}
    >
      Baja
    </button>
  )
}

export function ChildServicesGrid() {
  const { isAdmin, isInstitutionalUser } = useRole()
  // Mismo criterio que la ficha del niño; el backend revalida con ChildServicePolicy.
  const canEdit = isAdmin || isInstitutionalUser
  const [editing, setEditing] = useState<ChildService | null>(null)

  const [period, setPeriod] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [onlyAlerts, setOnlyAlerts] = useState(false)
  const [page, setPage] = useState(1)

  const search = useDebouncedValue(searchInput)
  // Filtros globales del sidebar (viajan como headers): solo para volver a la página 1.
  const { scope } = useLocalityScope()
  const { range: servicesRange } = useServicesDateRange()

  useEffect(() => {
    setPage(1)
  }, [period, search, onlyAlerts, scope, servicesRange])

  // El select de período solo ofrece los del rango: el elegido puede quedar afuera.
  useEffect(() => {
    setPeriod('')
  }, [servicesRange])

  const { data, isLoading, isFetching, error } = useChildServicesGridQuery({
    period: period || undefined,
    search: search || undefined,
    alert: onlyAlerts || undefined,
    page,
    per_page: PER_PAGE,
  })

  const rows = data?.items ?? []
  const periods = data?.periods ?? []
  const total = data?.total ?? 0
  const lastPage = data?.lastPage ?? 1

  const columns: Column<ChildService>[] = [
    {
      key: 'period',
      header: 'Fecha',
      render: (s) => <span title={s.period_label}>{s.period_code}</span>,
    },
    {
      key: 'child',
      header: 'Niño',
      render: (s) =>
        s.child ? (
          <Link to={`/children/${s.child.id}`}>
            {s.child.first_name} {s.child.last_name}
          </Link>
        ) : (
          '—'
        ),
    },
    {
      key: 'number',
      header: 'Nro prestación',
      align: 'center',
      render: (s) => s.service_number ?? '—',
    },
    {
      key: 'sector',
      header: 'Sector',
      render: (s) => s.sector_label,
    },
    {
      key: 'provider',
      header: 'Efector',
      render: (s) => s.institution?.name ?? '—',
    },
    {
      key: 'name',
      header: 'Nombre prestación',
      render: (s) => s.service_type?.name ?? '—',
    },
    {
      key: 'observations',
      header: 'Observaciones',
      render: (s) =>
        s.observations ? (
          <span className={grid.observations} title={s.observations}>
            {s.observations}
          </span>
        ) : (
          <span className={grid.muted}>s/d</span>
        ),
    },
    {
      key: 'alert',
      header: 'Alerta',
      align: 'center',
      render: (s) =>
        s.has_alert ? <Badge tone="danger">SI</Badge> : <span className={grid.muted}>NO</span>,
    },
    ...(canEdit
      ? [
          {
            key: 'actions',
            header: '',
            align: 'right' as const,
            render: (s: ChildService) => (
              <span className={section.actions}>
                <button
                  type="button"
                  className={section.iconBtn}
                  onClick={() => setEditing(s)}
                  title="Editar"
                  aria-label="Editar prestación"
                >
                  <IconEdit size={14} />
                </button>
                {isAdmin && (
                  <GridServiceDeleteButton
                    service={s}
                    onDeleted={() => setEditing((cur) => (cur?.id === s.id ? null : cur))}
                  />
                )}
              </span>
            ),
          },
        ]
      : []),
  ]

  return (
    <div>
      <div className={styles.toolbar}>
        <select
          className={styles.select}
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          aria-label="Buscar por período"
        >
          <option value="">Período: todos</option>
          {periods.map((p) => (
            <option key={p.code} value={p.code}>
              {p.code} · {p.label}
            </option>
          ))}
        </select>

        <div className={styles.search}>
          <SearchInput
            label="Buscar por nombre y apellido"
            placeholder="Buscar por nombre y apellido…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={onlyAlerts}
            onChange={(e) => setOnlyAlerts(e.target.checked)}
          />
          Con alerta
        </label>
      </div>

      {error && <div className="alert alert-error">Error al cargar las prestaciones.</div>}

      {editing && (
        <GridServiceEditor
          key={editing.id}
          service={editing}
          isAdmin={isAdmin}
          onDone={() => setEditing(null)}
        />
      )}

      <Table
        columns={columns}
        data={rows}
        rowKey={(s) => s.id}
        loading={isLoading}
        empty={
          period || search || onlyAlerts
            ? 'No hay prestaciones que coincidan con los filtros.'
            : 'Todavía no hay prestaciones cargadas.'
        }
        pagination={
          lastPage > 1
            ? { page, lastPage, onPageChange: setPage, loading: isFetching }
            : undefined
        }
      />

      <div className={styles.footer}>
        <span>
          {total} {total === 1 ? 'prestación' : 'prestaciones'}
        </span>
      </div>
    </div>
  )
}
