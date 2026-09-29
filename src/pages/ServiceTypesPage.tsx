import { useState } from 'react'
import { useSaveServiceTypeMutation, useServiceTypesQuery } from '../hooks/useServices'
import type { ServiceSectorKey, ServiceType } from '../types'
import { PageHeader } from '../components/PageHeader'
import { Table, type Column } from '../components/Table'
import { EmptyState } from '../components/EmptyState'
import { SearchInput } from '../components/SearchInput'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { IconCheck, IconPlus } from '../components/icons'
import list from './css/list.module.css'
import detail from './css/detail.module.css'

// Catálogo de prestaciones (solo admin). Acá se decide cuáles son OBLIGATORIAS:
// si un niño no tiene alguna de ellas en su último período informado, el SAT
// levanta la alerta "Falta una prestación obligatoria".
//
// Las prestaciones que llegan por importación y no existían se agregan solas
// (no obligatorias) al confirmar la fila — por eso el catálogo crece con el uso.

function errorMessage(err: unknown, fallback: string): string {
  const body = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })
    .response?.data
  const firstFieldError = body?.errors ? Object.values(body.errors)[0]?.[0] : undefined
  return firstFieldError ?? body?.message ?? fallback
}

interface TypeForm {
  id?: string
  name: string
  sector: ServiceSectorKey | ''
  description: string
  is_mandatory: boolean
}

const emptyForm: TypeForm = { name: '', sector: '', description: '', is_mandatory: false }

export default function ServiceTypesPage() {
  const { data, isLoading, error: queryError } = useServiceTypesQuery(true)
  const saveMutation = useSaveServiceTypeMutation()

  const [search, setSearch] = useState('')
  const [form, setForm] = useState<TypeForm | null>(null)
  const [error, setError] = useState<string | null>(null)

  const types = data?.data ?? []
  const sectors = data?.sectors ?? []

  const filtered = types.filter((t) =>
    search ? t.name.toLowerCase().includes(search.toLowerCase()) : true,
  )
  const mandatoryCount = types.filter((t) => t.is_mandatory && t.is_active).length

  async function toggle(t: ServiceType, patch: Partial<Pick<ServiceType, 'is_mandatory' | 'is_active'>>) {
    try {
      await saveMutation.mutateAsync({ id: t.id, ...patch })
    } catch (err) {
      window.alert(errorMessage(err, 'No se pudo actualizar la prestación.'))
    }
  }

  async function handleSave() {
    if (!form) return
    setError(null)
    if (!form.name.trim() || !form.sector) {
      setError('Completá el nombre y el sector.')
      return
    }
    try {
      await saveMutation.mutateAsync({
        id: form.id,
        name: form.name.trim(),
        sector: form.sector,
        description: form.description.trim() || null,
        is_mandatory: form.is_mandatory,
      })
      setForm(null)
    } catch (err) {
      setError(errorMessage(err, 'No se pudo guardar la prestación.'))
    }
  }

  const columns: Column<ServiceType>[] = [
    {
      key: 'name',
      header: 'Prestación',
      render: (t) => (
        <div className={list.nameCell}>
          <div className={list.nameMain}>{t.name}</div>
          {t.description && <div className={list.nameSub}>{t.description}</div>}
        </div>
      ),
    },
    { key: 'sector', header: 'Sector', render: (t) => t.sector_label },
    {
      key: 'mandatory',
      header: 'Obligatoria',
      render: (t) => (
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={t.is_mandatory}
            disabled={saveMutation.isPending || !t.is_active}
            onChange={(e) => toggle(t, { is_mandatory: e.target.checked })}
          />
          {t.is_mandatory ? 'Sí' : 'No'}
        </label>
      ),
    },
    {
      key: 'usage',
      header: 'En uso',
      render: (t) => <span className={list.muted}>{t.usage_count ?? 0}</span>,
    },
    {
      key: 'status',
      header: 'Estado',
      render: (t) =>
        t.is_active ? (
          <span className="badge badge-green">Activa</span>
        ) : (
          <span className="badge badge-red">Inactiva</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '190px',
      render: (t) => (
        <div className={list.rowActions}>
          <button
            className={list.actionBtn}
            disabled={saveMutation.isPending}
            onClick={() => toggle(t, { is_active: !t.is_active })}
          >
            {t.is_active ? 'Desactivar' : 'Reactivar'}
          </button>
          <button
            className={list.actionBtn}
            onClick={() => {
              setError(null)
              setForm({
                id: t.id,
                name: t.name,
                sector: t.sector,
                description: t.description ?? '',
                is_mandatory: t.is_mandatory,
              })
            }}
          >
            Editar
          </button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        eyebrow="Gestión"
        title="Catálogo de prestaciones"
        subtitle={
          <>
            Marcá como <strong>obligatorias</strong> las prestaciones que todo niño debería tener en
            cada período informado: si falta alguna, se genera una alerta.{' '}
            {mandatoryCount > 0
              ? `Hoy hay ${mandatoryCount} obligatoria${mandatoryCount === 1 ? '' : 's'}.`
              : 'Todavía no hay ninguna obligatoria.'}
          </>
        }
        actions={
          form === null ? (
            <Button
              onClick={() => {
                setError(null)
                setForm({ ...emptyForm })
              }}
            >
              <IconPlus size={18} />
              Nueva prestación
            </Button>
          ) : undefined
        }
      />

      {form && (
        <div style={{ marginBottom: 20 }}>
          <Card>
            <h2 className={detail.cardTitle}>{form.id ? 'Editar prestación' : 'Nueva prestación'}</h2>
            <div className={detail.periodGrid}>
              <label className={detail.periodField}>
                <span className={detail.periodLabel}>Nombre</span>
                <input
                  className={detail.periodInput}
                  value={form.name}
                  maxLength={150}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ej.: Control de niño sano"
                />
              </label>
              <label className={detail.periodField}>
                <span className={detail.periodLabel}>Sector</span>
                <select
                  className={detail.periodInput}
                  value={form.sector}
                  onChange={(e) => setForm({ ...form, sector: e.target.value as ServiceSectorKey | '' })}
                >
                  <option value="">Elegir sector…</option>
                  {sectors.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className={`${detail.periodField} ${detail.wide}`}>
                <span className={detail.periodLabel}>Descripción (opcional)</span>
                <input
                  className={detail.periodInput}
                  value={form.description}
                  maxLength={1000}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </label>
              <label className={detail.periodCheck} style={{ gridColumn: '1 / -1' }}>
                <input
                  type="checkbox"
                  checked={form.is_mandatory}
                  onChange={(e) => setForm({ ...form, is_mandatory: e.target.checked })}
                />
                Obligatoria en cada período (si falta, genera alerta)
              </label>
            </div>
            {error && <p className={detail.obsError}>{error}</p>}
            <div className={detail.obsFormActions} style={{ marginTop: 12 }}>
              <Button variant="secondary" size="sm" onClick={() => setForm(null)}>
                Cancelar
              </Button>
              <Button size="sm" disabled={saveMutation.isPending} onClick={handleSave}>
                <IconCheck size={14} />
                {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      <div className={list.toolbar}>
        <SearchInput
          placeholder="Buscar prestación…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className={list.count}>
          {isLoading ? 'Cargando…' : `${filtered.length} ${filtered.length === 1 ? 'prestación' : 'prestaciones'}`}
        </span>
      </div>

      {queryError && <div className="alert alert-error">Error al cargar el catálogo de prestaciones.</div>}

      <Table
        columns={columns}
        data={filtered}
        rowKey={(t) => t.id}
        loading={isLoading}
        empty={
          <EmptyState
            title="No hay prestaciones en el catálogo"
            description={
              search
                ? 'Probá con otro nombre.'
                : 'Se agregan solas al confirmar filas importadas que traen prestaciones, o podés crearlas a mano.'
            }
          />
        }
      />
    </div>
  )
}
