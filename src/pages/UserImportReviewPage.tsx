import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  useUserImportQuery,
  useUserImportRowsQuery,
  useResolveUserImportRowMutation,
} from '../hooks/useUserImports'
import type { UserImportReviewReason, UserImportRow } from '../types'

type StatusFilter = 'needs_review' | 'created' | 'skipped' | 'error'

const FILTER_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'needs_review', label: 'A revisar' },
  { value: 'created', label: 'Creados' },
  { value: 'skipped', label: 'Descartados' },
  { value: 'error', label: 'Errores' },
]

const REASON_LABEL: Record<UserImportReviewReason, string> = {
  duplicate_dni_existing: 'DNI ya registrado en el sistema',
  duplicate_dni_in_file: 'DNI repetido dentro del mismo archivo',
  invalid_dni: 'DNI inválido (debe tener 8 dígitos)',
  missing_name: 'Falta nombre o apellido',
  invalid_role: 'Rol inválido o no permitido',
  institution_head_conflict: 'La institución ya tiene un responsable activo',
}

const ROLE_LABEL: Record<string, string> = {
  institucion: 'Responsable de institución',
  representante: 'Representante',
}

export default function UserImportReviewPage() {
  const { id } = useParams<{ id: string }>()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('needs_review')
  const [page, setPage] = useState(1)

  const { data: batch, isLoading: batchLoading } = useUserImportQuery(id)
  const { data: rowsData, isLoading: rowsLoading } = useUserImportRowsQuery(id, statusFilter, page)

  const rows = rowsData?.items ?? []

  if (batchLoading) return <p className="text-muted">Cargando…</p>
  if (!batch) return <p>Importación no encontrada.</p>

  const isProcessing = batch.status === 'processing' || batch.status === 'pending'

  return (
    <>
      <Link to="/user-imports" className="back-link">← Carga masiva de usuarios</Link>
      <div className="page-header" style={{ marginTop: '0.25rem' }}>
        <div>
          <h1>Revisión de carga de usuarios</h1>
          <p className="text-muted" style={{ marginTop: 2, fontSize: '0.875rem' }}>
            {batch.original_filename}
            {batch.institution && ` · ${batch.institution.name}`}
          </p>
        </div>
        {isProcessing && <span className="badge badge-blue">⟳ Procesando…</span>}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '0.75rem',
          marginBottom: '1.5rem',
        }}
      >
        <StatCard label="Procesados" value={batch.rows.total} />
        <StatCard label="Creados" value={batch.rows.created} color="var(--color-success)" />
        <StatCard
          label="A revisar"
          value={batch.rows.needs_review}
          color={batch.rows.needs_review > 0 ? 'var(--color-warning)' : undefined}
          bold={batch.rows.needs_review > 0}
        />
        <StatCard label="Descartados" value={batch.rows.skipped} />
        <StatCard label="Errores" value={batch.rows.errors} color={batch.rows.errors > 0 ? 'var(--color-danger)' : undefined} />
      </div>

      {isProcessing && (
        <div className="alert" style={{ background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: 'var(--radius)', padding: '0.75rem 1rem', marginBottom: '1.25rem' }}>
          El archivo aún se está procesando. Los resultados aparecerán en unos segundos…
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--color-border)', paddingBottom: 0 }}>
        {FILTER_TABS.map((tab) => {
          const count =
            tab.value === 'needs_review' ? batch.rows.needs_review :
            tab.value === 'created'      ? batch.rows.created :
            tab.value === 'skipped'      ? batch.rows.skipped :
            batch.rows.errors
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
              {count > 0 && (
                <span style={{ background: tab.value === 'needs_review' ? 'var(--color-warning)' : 'var(--color-muted)', color: '#fff', borderRadius: '999px', padding: '0 5px', fontSize: '0.7rem', lineHeight: '1.4rem' }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

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

function ReviewCard({ row, batchId }: { row: UserImportRow; batchId: string }) {
  const { mutate: resolve, isPending, error } = useResolveUserImportRowMutation(batchId)
  const [resolved, setResolved] = useState(false)

  const conflictMsg = error
    ? ((error as { response?: { data?: { message?: string } } }).response?.data?.message ?? null)
    : null

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

  const isNeedsReview = row.status === 'needs_review'
  const isFinal = row.status === 'skipped' || row.status === 'created' || row.status === 'error'

  const fullName = [row.first_name, row.last_name].filter(Boolean).join(' ') || '—'

  return (
    <div
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius)',
        background: 'var(--color-surface)',
        overflow: 'hidden',
      }}
    >
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
        {row.role && <RoleBadge role={row.role} />}
        <span style={{ color: 'var(--color-muted)' }}>
          {row.review_reason ? REASON_LABEL[row.review_reason] : 'Sin motivo'}
        </span>
        <span style={{ marginLeft: 'auto', color: 'var(--color-muted)' }}>
          Línea #{row.file_line_number}
        </span>
      </div>

      <div style={{ padding: '1rem' }}>
        <div style={{ fontSize: '1rem', fontWeight: 600 }}>{fullName}</div>
        <div style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginTop: 2 }}>
          DNI: {row.dni ?? '—'}
        </div>
      </div>

      {row.notes && (
        <div
          style={{
            padding: '0.5rem 1rem',
            background: '#fffbeb',
            borderTop: '1px solid #fde68a',
            fontSize: '0.8rem',
            color: '#92400e',
          }}
        >
          💬 {row.notes}
        </div>
      )}

      {conflictMsg && (
        <div
          style={{
            padding: '0.5rem 1rem',
            background: '#fef2f2',
            borderTop: '1px solid #fecaca',
            fontSize: '0.8rem',
            color: 'var(--color-danger)',
          }}
        >
          {conflictMsg}
        </div>
      )}

      {isNeedsReview && (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center',
          }}
        >
          <button
            className="btn btn-sm btn-primary"
            disabled={isPending}
            onClick={() => handleAction('confirm')}
          >
            {isPending ? '…' : '✓ Confirmar y crear usuario'}
          </button>
          <button
            className="btn btn-sm btn-secondary"
            disabled={isPending}
            onClick={() => handleAction('skip')}
          >
            Descartar
          </button>
          <span className="text-muted" style={{ fontSize: '0.75rem', marginLeft: 4 }}>
            Confirmar vuelve a intentar crear el usuario — si el conflicto sigue vigente, va a fallar de nuevo.
          </span>
        </div>
      )}

      {isFinal && (
        <div style={{ padding: '0.6rem 1rem', borderTop: '1px solid var(--color-border)', fontSize: '0.8rem', color: row.status === 'created' ? 'var(--color-success)' : 'var(--color-muted)' }}>
          {row.status === 'created' && row.created_user
            ? `✓ Usuario creado: ${row.created_user.email}`
            : row.status === 'skipped'
            ? 'Descartado'
            : `Error: ${row.error_message ?? 'desconocido'}`}
        </div>
      )}
    </div>
  )
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        background: role === 'institucion' ? '#dbeafe' : '#e0e7ff',
        color: role === 'institucion' ? '#1d4ed8' : '#4338ca',
        borderRadius: '999px',
        padding: '1px 8px',
        fontSize: '0.75rem',
        fontWeight: 700,
      }}
    >
      {ROLE_LABEL[role] ?? role}
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
