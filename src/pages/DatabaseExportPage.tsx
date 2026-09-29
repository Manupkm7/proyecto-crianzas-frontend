import { useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { IconDownload } from '../components/icons'
import { useDepartmentsQuery, useLocalitiesQuery, useProvincesQuery } from '../hooks/useGeo'
import { downloadDatabaseExport } from '../api/databaseExport'
import { localityScopeLabel } from '../api/localityScope'
import { useLocalityScope } from '../context/LocalityScopeContext'
import detail from './css/detail.module.css'

// Exportación completa de la base de datos (ZIP) — exclusivo del administrador.
// Todos los filtros son opcionales: sin ninguno se exporta todo el sistema.

// Igual convención que ChildDetailPage: bimestres 1 a 5, valor "AÑO-BIMESTRE".
function getExportBimestreOptions() {
  const y = new Date().getFullYear()
  const result: { value: string; label: string }[] = []
  for (const year of [y + 1, y, y - 1]) {
    for (let b = 5; b >= 1; b--) {
      result.push({ value: `${year}-${b}`, label: `Año ${year} · Bimestre ${b}` })
    }
  }
  return result
}

type TimeMode = 'none' | 'range' | 'period'

export default function DatabaseExportPage() {
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Ámbito global del sidebar: el export NO lo respeta salvo que se elija acá.
  const { scope } = useLocalityScope()
  const [applyScope, setApplyScope] = useState(false)

  // Jurisdicción opcional para acotar la exportación — vacío = todo el sistema.
  const [provinceId, setProvinceId] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [localityId, setLocalityId] = useState('')
  const { data: provinces = [] } = useProvincesQuery()
  const { data: departments = [] } = useDepartmentsQuery(provinceId || undefined)
  const { data: localities = [] } = useLocalitiesQuery(departmentId || undefined)

  // Filtro por tiempo, mutuamente excluyente: sin filtro, rango de fechas, o bimestre.
  const [timeMode, setTimeMode] = useState<TimeMode>('none')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [period, setPeriod] = useState('') // "AAAA-B"

  const dateRangeInvalid = timeMode === 'range' && !!dateFrom && !!dateTo && dateTo < dateFrom

  // Descarga autenticada del ZIP: axios trae el archivo como blob (no navegación
  // por <a href>, porque el token va en el header Authorization, no en cookies).
  async function handleExport() {
    setError(null)

    if (timeMode === 'range' && (!dateFrom || !dateTo)) {
      setError('Elegí fecha desde y fecha hasta.')
      return
    }
    if (dateRangeInvalid) {
      setError('La fecha hasta no puede ser anterior a la fecha desde.')
      return
    }
    if (timeMode === 'period' && !period) {
      setError('Elegí un bimestre.')
      return
    }

    setExporting(true)
    try {
      const [periodYear, periodBimester] = period ? period.split('-').map(Number) : [undefined, undefined]

      const response = await downloadDatabaseExport({
        // Solo se manda el nivel más específico elegido — el backend resuelve
        // las instituciones a partir de ese único filtro (ver DatabaseExportController).
        ...(localityId
          ? { locality_id: localityId }
          : departmentId
          ? { department_id: departmentId }
          : provinceId
          ? { province_id: provinceId }
          : {}),
        ...(timeMode === 'range' ? { date_from: dateFrom, date_to: dateTo } : {}),
        ...(timeMode === 'period' && periodYear && periodBimester
          ? { period_year: periodYear, period_bimester: periodBimester }
          : {}),
        ...(scope && applyScope ? { apply_locality_scope: 1 as const } : {}),
      })
      const disposition = response.headers['content-disposition'] as string | undefined
      const match = disposition?.match(/filename="?([^"]+)"?/)
      const filename = match?.[1] ?? `export_${Date.now()}.zip`

      const url = URL.createObjectURL(response.data as Blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch {
      setError('No se pudo generar la exportación. Intentá de nuevo.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Gestión"
        title="Exportar base de datos"
        subtitle="Descargá un ZIP con los datos del sistema. Los filtros son opcionales: sin ninguno se exporta todo."
      />

      <Card>
        {scope && (
          <>
            <h2 className={detail.cardTitle}>Alcance</h2>
            <div className={detail.periodGrid}>
              <label className={detail.periodField}>
                <span className={detail.periodLabel}>Exportar</span>
                <select
                  className={detail.periodInput}
                  value={applyScope ? 'scope' : 'global'}
                  onChange={(e) => setApplyScope(e.target.value === 'scope')}
                >
                  <option value="global">Todo el sistema (global)</option>
                  <option value="scope">Solo el ámbito activo: {localityScopeLabel(scope)}</option>
                </select>
              </label>
            </div>
            <div style={{ marginBottom: 24 }} />
          </>
        )}

        <h2 className={detail.cardTitle}>Jurisdicción</h2>
        <div className={detail.periodGrid}>
          <label className={detail.periodField}>
            <span className={detail.periodLabel}>Provincia</span>
            <select
              className={detail.periodInput}
              value={provinceId}
              onChange={(e) => {
                setProvinceId(e.target.value)
                setDepartmentId('')
                setLocalityId('')
              }}
            >
              <option value="">Todas</option>
              {provinces.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className={detail.periodField}>
            <span className={detail.periodLabel}>Departamento</span>
            <select
              className={detail.periodInput}
              value={departmentId}
              disabled={!provinceId}
              onChange={(e) => {
                setDepartmentId(e.target.value)
                setLocalityId('')
              }}
            >
              <option value="">Todos</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label className={detail.periodField}>
            <span className={detail.periodLabel}>Localidad</span>
            <select
              className={detail.periodInput}
              value={localityId}
              disabled={!departmentId}
              onChange={(e) => setLocalityId(e.target.value)}
            >
              <option value="">Todas</option>
              {localities.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <h2 className={detail.cardTitle} style={{ marginTop: 24 }}>
          Período
        </h2>
        <div className={detail.periodGrid}>
          <label className={detail.periodField}>
            <span className={detail.periodLabel}>Filtrar por</span>
            <select
              className={detail.periodInput}
              value={timeMode}
              onChange={(e) => {
                setTimeMode(e.target.value as TimeMode)
                setError(null)
              }}
            >
              <option value="none">Sin filtro de tiempo</option>
              <option value="range">Rango de fechas (creado o actualizado)</option>
              <option value="period">Bimestre</option>
            </select>
          </label>

          {timeMode === 'range' && (
            <>
              <label className={detail.periodField}>
                <span className={detail.periodLabel}>Desde</span>
                <input
                  type="date"
                  className={detail.periodInput}
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </label>
              <label className={detail.periodField}>
                <span className={detail.periodLabel}>Hasta</span>
                <input
                  type="date"
                  className={detail.periodInput}
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </label>
            </>
          )}

          {timeMode === 'period' && (
            <label className={detail.periodField}>
              <span className={detail.periodLabel}>Bimestre</span>
              <select
                className={detail.periodInput}
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              >
                <option value="">Elegir bimestre…</option>
                {getExportBimestreOptions().map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {dateRangeInvalid && !error && (
          <p className={detail.obsError}>La fecha hasta no puede ser anterior a la fecha desde.</p>
        )}
        {error && <p className={detail.obsError}>{error}</p>}

        <div className={detail.obsFormActions} style={{ marginTop: 20 }}>
          <Button disabled={exporting || dateRangeInvalid} onClick={handleExport}>
            <IconDownload size={18} />
            {exporting ? 'Generando exportación…' : 'Descargar ZIP'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
