import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useChildServicesGridQuery } from '../hooks/useServices'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
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
export function ChildServicesGrid() {
  const [period, setPeriod] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [onlyAlerts, setOnlyAlerts] = useState(false)
  const [page, setPage] = useState(1)

  const search = useDebouncedValue(searchInput)

  useEffect(() => {
    setPage(1)
  }, [period, search, onlyAlerts])

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
