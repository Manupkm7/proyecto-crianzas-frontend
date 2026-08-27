import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useChildrenQuery } from '../hooks/useChildren'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { Table, type Column } from './Table'
import { Badge } from './Badge'
import { SearchInput } from './SearchInput'
import { Button } from './Button'
import { getEducationLevelDefinitions, gradeLabel } from '../utils/educationLevels'
import type { Child, EducationLevel, Institution } from '../types'
import styles from './css/ChildrenAlertsTable.module.css'

type RecordFilter = 'all' | 'yes' | 'no'

const PER_PAGE = 10

interface ChildrenAlertsTableProps {
  /** Cuando se pasa, muestra selects de Nivel/Grado armados con los niveles que ofrece esta institución. */
  levelInstitution?: Institution | null
}

// Tabla de niños del dashboard: búsqueda y filtros resueltos por el backend
// (no localmente), porque cada institución solo carga una parte de los registros
// y la idea es poder aislar "quién tiene educativo pero no salud", etc.
export function ChildrenAlertsTable({ levelInstitution }: ChildrenAlertsTableProps = {}) {
  const [searchInput, setSearchInput] = useState('')
  const [educationFilter, setEducationFilter] = useState<RecordFilter>('all')
  const [healthFilter, setHealthFilter] = useState<RecordFilter>('all')
  const [onlyAlerts, setOnlyAlerts] = useState(false)
  const [levelFilter, setLevelFilter] = useState('')
  const [gradeFilter, setGradeFilter] = useState('')
  const [page, setPage] = useState(1)

  const search = useDebouncedValue(searchInput)
  const levelDefinitions = getEducationLevelDefinitions(levelInstitution)
  const gradesForSelectedLevel =
    levelDefinitions.find((l) => l.level === levelFilter)?.maxGrade ?? 0

  useEffect(() => {
    setPage(1)
  }, [search, educationFilter, healthFilter, onlyAlerts, levelFilter, gradeFilter])

  useEffect(() => {
    setGradeFilter('')
  }, [levelFilter])

  const { data, isLoading, error } = useChildrenQuery({
    search: search || undefined,
    has_education: educationFilter === 'all' ? undefined : educationFilter === 'yes',
    has_health: healthFilter === 'all' ? undefined : healthFilter === 'yes',
    alert: onlyAlerts || undefined,
    level: levelFilter || undefined,
    grade: gradeFilter ? Number(gradeFilter) : undefined,
    page,
    per_page: PER_PAGE,
  })

  const children = data?.items ?? []
  const lastPage = data?.lastPage ?? 1
  const total = data?.total ?? 0

  const columns: Column<Child>[] = [
    {
      key: 'name',
      header: 'Nombre',
      render: (c) => (
        <Link to={`/children/${c.id}`}>
          {c.first_name} {c.last_name}
        </Link>
      ),
    },
    {
      key: 'age',
      header: 'Edad',
      render: (c) => (c.age !== undefined ? `${c.age} años` : '—'),
    },
    {
      key: 'education',
      header: 'Reg. educativo',
      render: (c) =>
        c.education_record ? (
          <Badge tone="edu">{c.education_record.grade_label ?? 'Cargado'}</Badge>
        ) : (
          <Badge tone="neutral">Sin cargar</Badge>
        ),
    },
    {
      key: 'health',
      header: 'Reg. de salud',
      render: (c) =>
        c.health_record ? (
          <Badge tone="health">Cargado</Badge>
        ) : (
          <Badge tone="neutral">Sin cargar</Badge>
        ),
    },
    {
      key: 'alerts',
      header: 'Alertas',
      render: (c) =>
        c.alerts && c.alerts.length > 0 ? (
          <div className={styles.alertsCell}>
            {c.alerts.map((a) => (
              <Badge key={a.type} tone={a.status === 'managed' ? 'neutral' : 'amber'}>
                {a.label}
                {a.status === 'managed' ? ' · en seguimiento' : ''}
              </Badge>
            ))}
          </div>
        ) : (
          <span style={{ color: 'var(--text-soft)' }}>—</span>
        ),
    },
  ]

  return (
    <div>
      <div className={styles.toolbar}>
        <div className={styles.search}>
          <SearchInput
            label="Buscar por nombre, apellido o DNI"
            placeholder="Buscar por nombre, apellido o DNI…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        <select
          className={styles.select}
          value={educationFilter}
          onChange={(e) => setEducationFilter(e.target.value as RecordFilter)}
          aria-label="Filtrar por registro educativo"
        >
          <option value="all">Registro educativo: todos</option>
          <option value="yes">Con registro educativo</option>
          <option value="no">Sin registro educativo</option>
        </select>

        <select
          className={styles.select}
          value={healthFilter}
          onChange={(e) => setHealthFilter(e.target.value as RecordFilter)}
          aria-label="Filtrar por registro de salud"
        >
          <option value="all">Registro de salud: todos</option>
          <option value="yes">Con registro de salud</option>
          <option value="no">Sin registro de salud</option>
        </select>

        {levelDefinitions.length > 0 && (
          <>
            <select
              className={styles.select}
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              aria-label="Filtrar por nivel educativo"
            >
              <option value="">Nivel: todos</option>
              {levelDefinitions.map((l) => (
                <option key={l.level} value={l.level}>
                  {l.label}
                </option>
              ))}
            </select>

            {levelFilter && (
              <select
                className={styles.select}
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                aria-label="Filtrar por grado"
              >
                <option value="">Grado: todos</option>
                {Array.from({ length: gradesForSelectedLevel }, (_, i) => i + 1).map((grade) => (
                  <option key={grade} value={grade}>
                    {gradeLabel(levelFilter as EducationLevel, grade)}
                  </option>
                ))}
              </select>
            )}
          </>
        )}

        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={onlyAlerts}
            onChange={(e) => setOnlyAlerts(e.target.checked)}
          />
          Solo con alertas
        </label>
      </div>

      {error && <div className="alert alert-error">Error al cargar los niños.</div>}

      <Table
        columns={columns}
        data={children}
        rowKey={(c) => c.id}
        empty={isLoading ? 'Cargando…' : 'No hay niños que coincidan con los filtros.'}
      />

      <div className={styles.footer}>
        <span>{total} niño{total === 1 ? '' : 's'}</span>
        {lastPage > 1 && (
          <div className={styles.pager}>
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </Button>
            <span>
              Página {page} de {lastPage}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= lastPage}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
