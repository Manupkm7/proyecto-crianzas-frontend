import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useImportQuery, useImportRowsQuery, useResolveRowMutation } from '../hooks/useImports'
import type { ImportRow } from '../types'

type StatusFilter = 'partial_match' | 'no_match' | 'manual_resolved' | 'skipped'

const FILTER_TABS: { value: StatusFilter | ''; label: string }[] = [
  { value: 'partial_match', label: 'Conflictos de tilde' },
  { value: 'no_match', label: 'Sin coincidencia' },
  { value: 'manual_resolved', label: 'Resueltos' },
  { value: 'skipped', label: 'Descartados' },
]

export default function ImportReviewPage() {
  const { id } = useParams<{ id: string }>()
  const [statusFilter, setStatusFilter] = useState<StatusFilter | ''>('partial_match')
  const [page, setPage] = useState(1)

  const { data: batch, isLoading: batchLoading } = useImportQuery(id)
  const { data: rowsData, isLoading: rowsLoading } = useImportRowsQuery(id, statusFilter || undefined, page)

  const rows = rowsData?.items ?? []

  if (batchLoading) return <p className="text-muted">Cargando…</p>
  if (!batch) return <p>Importación no encontrada.</p>

  const isProcessing = batch.status === 'processing' || batch.status === 'pending'

  return (
    <>
      {/* Encabezado */}
      <Link to="/imports" className="back-link">← Importaciones</Link>
      <div className="page-header" style={{ marginTop: '0.25rem' }}>
        <div>
          <h1>Revisión de importación</h1>
          <p className="text-muted" style={{ marginTop: 2, fontSize: '0.875rem' }}>
            {batch.source_label} · {batch.original_filename}
            {batch.institution && ` · ${batch.institution.name}`}
          </p>
        </div>
        {isProcessing && (
          <span className="badge badge-blue">⟳ Procesando…</span>
        )}
      </div>

      {/* Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '0.75rem',
          marginBottom: '1.5rem',
        }}
      >
        <StatCard label="Procesados" value={batch.rows.total} />
        <StatCard label="Emparejados" value={batch.rows.matched} color="var(--color-success)" />
        <StatCard
          label="A revisar"
          value={batch.rows.pending_review}
          color={batch.rows.pending_review > 0 ? 'var(--color-warning)' : undefined}
          bold={batch.rows.pending_review > 0}
        />
        <StatCard label="Resueltos" value={batch.rows.matched + batch.rows.total - batch.rows.pending_review - batch.rows.no_match - batch.rows.partial} />
        <StatCard label="Errores" value={batch.rows.errors} color={batch.rows.errors > 0 ? 'var(--color-danger)' : undefined} />
      </div>

      {isProcessing && (
        <div className="alert" style={{ background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: 'var(--radius)', padding: '0.75rem 1rem', marginBottom: '1.25rem' }}>
          El archivo aún se está procesando. Los resultados aparecerán en unos segundos…
        </div>
      )}

      {/* Tabs de filtro */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--color-border)', paddingBottom: 0 }}>
        {FILTER_TABS.map((tab) => {
          const count =
            tab.value === 'partial_match' ? batch.rows.partial :
            tab.value === 'no_match'      ? batch.rows.no_match :
            undefined
          return (
            <button
              key={tab.value}
              onClick={() => { setStatusFilter(tab.value); setPage(1) }}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: statusFilter === tab.value ? '2px solid var(--color-primary)' : '2px solid transparent',
                color: statusFilter === tab.value ? 'var(--color-primary)' : 'var(--color-muted)',
                fontWeight: statusFilter === tab.value ? 600 : 400,
                cursor: 'pointer',
                padding: '0.4rem 0.75rem',
                fontSize: '0.875rem',
                marginBottom: -1,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {tab.label}
              {count !== undefined && count > 0 && (
                <span style={{ background: tab.value === 'partial_match' ? 'var(--color-warning)' : 'var(--color-muted)', color: '#fff', borderRadius: '999px', padding: '0 5px', fontSize: '0.7rem', lineHeight: '1.4rem' }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Listado de filas */}
      {rowsLoading && <p className="text-muted">Cargando filas…</p>}

      {!rowsLoading && rows.length === 0 && (
        <div className="empty-state">
          <p>No hay filas en este estado.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {rows.map((row) => (
          <ReviewCard key={row.id} row={row} batchId={id!} />
        ))}
      </div>

      {/* Paginación */}
      {(rowsData?.lastPage ?? 1) > 1 && (
        <div className="action-group mt-4" style={{ justifyContent: 'flex-end' }}>
          <button
            className="btn btn-sm btn-secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Anterior
          </button>
          <span className="text-muted" style={{ alignSelf: 'center' }}>
            Página {page} de {rowsData?.lastPage}
          </span>
          <button
            className="btn btn-sm btn-secondary"
            disabled={page >= (rowsData?.lastPage ?? 1)}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente
          </button>
        </div>
      )}
    </>
  )
}

// ─── Tarjeta de revisión de una fila ─────────────────────────────────────────

function ReviewCard({ row, batchId }: { row: ImportRow; batchId: string }) {
  const { mutate: resolve, isPending } = useResolveRowMutation(batchId)
  const [resolved, setResolved] = useState(false)

  if (resolved) {
    return (
      <div
        style={{
          padding: '0.75rem 1rem',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius)',
          background: '#f0fdf4',
          color: 'var(--color-success)',
          fontSize: '0.875rem',
        }}
      >
        ✓ Resuelto — fila #{row.file_line_number}
      </div>
    )
  }

  function handleAction(action: 'confirm' | 'skip') {
    resolve(
      { rowId: row.id, action },
      { onSuccess: () => setResolved(true) },
    )
  }

  const isPartialMatch = row.status === 'partial_match'
  const isResolved = row.status === 'manual_resolved' || row.status === 'skipped'

  const confidenceColor =
    (row.match_confidence ?? 0) >= 100
      ? 'var(--color-success)'
      : (row.match_confidence ?? 0) >= 80
      ? 'var(--color-warning)'
      : 'var(--color-muted)'

  return (
    <div
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius)',
        background: 'var(--color-surface)',
        overflow: 'hidden',
      }}
    >
      {/* Encabezado de la card */}
      <div
        style={{
          padding: '0.6rem 1rem',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-bg)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.8rem',
        }}
      >
        <ConfidenceBadge confidence={row.match_confidence} />
        <span style={{ color: 'var(--color-muted)' }}>
          {row.status === 'partial_match'
            ? 'Posible coincidencia — diferencia de tildes o variante'
            : 'Sin coincidencia en la fuente opuesta'}
        </span>
        <span style={{ marginLeft: 'auto', color: 'var(--color-muted)' }}>
          Línea #{row.file_line_number}
        </span>
      </div>

      {/* Comparación de datos */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isPartialMatch ? '1fr auto 1fr' : '1fr',
          gap: '1rem',
          padding: '1rem',
          alignItems: 'center',
        }}
      >
        {/* Lado izquierdo: la fila actual */}
        <DataPanel
          label={row.source_label ?? ''}
          firstName={row.first_name}
          lastName={row.last_name}
          birthDate={row.birth_date}
          extra={row.school_name ?? row.birth_establishment}
        />

        {/* Separador con confianza */}
        {isPartialMatch && row.matched_row && (
          <>
            <div style={{ textAlign: 'center', color: confidenceColor }}>
              <div style={{ fontSize: '1.1rem' }}>⟷</div>
              <div style={{ fontSize: '0.75rem', marginTop: 2, fontWeight: 600 }}>
                {row.match_confidence}%
              </div>
            </div>

            {/* Lado derecho: la contraparte */}
            <DataPanel
              label={row.source === 'civil_registry' ? 'Educación' : 'Registro Civil'}
              firstName={row.matched_row.first_name}
              lastName={row.matched_row.last_name}
              birthDate={row.matched_row.birth_date}
              extra={row.matched_row.school_name}
              highlight={row.matched_row.first_name !== row.first_name || row.matched_row.last_name !== row.last_name}
            />
          </>
        )}
      </div>

      {/* Nota del matching */}
      {row.match_notes && (
        <div
          style={{
            padding: '0.5rem 1rem',
            background: '#fffbeb',
            borderTop: '1px solid #fde68a',
            fontSize: '0.8rem',
            color: '#92400e',
          }}
        >
          💬 {row.match_notes}
        </div>
      )}

      {/* Acciones */}
      {!isResolved && (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center',
          }}
        >
          {isPartialMatch ? (
            <>
              <button
                className="btn btn-sm btn-primary"
                disabled={isPending}
                onClick={() => handleAction('confirm')}
              >
                {isPending ? '…' : '✓ Confirmar como el mismo niño'}
              </button>
              <button
                className="btn btn-sm btn-secondary"
                disabled={isPending}
                onClick={() => handleAction('skip')}
              >
                Descartar
              </button>
            </>
          ) : (
            <>
              <button
                className="btn btn-sm btn-primary"
                disabled={isPending}
                onClick={() => handleAction('confirm')}
              >
                {isPending ? '…' : '+ Crear registro de niño'}
              </button>
              <button
                className="btn btn-sm btn-secondary"
                disabled={isPending}
                onClick={() => handleAction('skip')}
              >
                Descartar
              </button>
            </>
          )}
          <span className="text-muted" style={{ fontSize: '0.75rem', marginLeft: 4 }}>
            {isPartialMatch
              ? 'Confirmar crea un único niño con datos de ambas fuentes'
              : 'Crear genera un nuevo niño con estos datos'}
          </span>
        </div>
      )}

      {isResolved && (
        <div style={{ padding: '0.6rem 1rem', borderTop: '1px solid var(--color-border)', fontSize: '0.8rem', color: 'var(--color-success)' }}>
          ✓ Ya resuelto
        </div>
      )}
    </div>
  )
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function DataPanel({
  label,
  firstName,
  lastName,
  birthDate,
  extra,
  highlight = false,
}: {
  label: string
  firstName?: string | null
  lastName?: string | null
  birthDate?: string | null
  extra?: string | null
  highlight?: boolean
}) {
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || '—'
  const formattedDate = birthDate
    ? new Date(birthDate + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—'

  return (
    <div>
      <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: '1rem',
          fontWeight: 600,
          color: highlight ? 'var(--color-warning)' : 'var(--color-text)',
        }}
      >
        {fullName}
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginTop: 2 }}>
        Nacimiento: {formattedDate}
      </div>
      {extra && (
        <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: 2 }}>
          {extra}
        </div>
      )}
    </div>
  )
}

function ConfidenceBadge({ confidence }: { confidence?: number | null }) {
  if (confidence == null) return null
  const color =
    confidence >= 100 ? '#16a34a' :
    confidence >= 80  ? '#d97706' :
    '#64748b'
  return (
    <span
      style={{
        display: 'inline-block',
        background: color + '22',
        color,
        border: `1px solid ${color}44`,
        borderRadius: '999px',
        padding: '1px 8px',
        fontSize: '0.75rem',
        fontWeight: 700,
      }}
    >
      {confidence}%
    </span>
  )
}

function StatCard({
  label,
  value,
  color,
  bold = false,
}: {
  label: string
  value: number
  color?: string
  bold?: boolean
}) {
  return (
    <div
      style={{
        padding: '0.75rem 1rem',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius)',
        background: 'var(--color-surface)',
      }}
    >
      <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: '1.25rem', fontWeight: bold ? 700 : 600, color: color ?? 'var(--color-text)' }}>
        {value}
      </div>
    </div>
  )
}
