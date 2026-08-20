import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useImportsQuery, useUploadImportMutation } from '../hooks/useImports'
import { useInstitutionOptions } from '../hooks/useInstitutionOptions'
import { downloadImportTemplate } from '../api/imports'
import { IconUpload } from '../components/icons'
import type { ImportBatch, ImportBatchStatus } from '../types'

type TemplateFormat = 'xlsx' | 'csv' | 'txt'

const TEMPLATE_FORMAT_LABEL: Record<TemplateFormat, string> = {
  xlsx: 'Excel',
  csv: 'CSV',
  txt: 'TXT',
}

const STATUS_LABEL: Record<ImportBatchStatus, string> = {
  pending: 'Pendiente',
  processing: 'Procesando…',
  completed: 'Completado',
  failed: 'Error',
}

const STATUS_CLASS: Record<ImportBatchStatus, string> = {
  pending: 'badge badge-gray',
  processing: 'badge badge-blue',
  completed: 'badge badge-green',
  failed: 'badge badge-red',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function ImportsListPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useImportsQuery(page)
  const batches = data?.items ?? []

  return (
    <>
      <div className="page-header">
        <h1>Importaciones masivas</h1>
      </div>

      <UploadPanel />

      {isLoading && <p className="text-muted">Cargando…</p>}

      {!isLoading && batches.length === 0 && (
        <div className="empty-state">
          <p>Todavía no se importó ningún archivo.</p>
        </div>
      )}

      {batches.length > 0 && (
        <>
          <table className="table" style={{ marginTop: '1.5rem' }}>
            <thead>
              <tr>
                <th>Fuente</th>
                <th>Archivo</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th style={{ textAlign: 'center' }}>✓ Match</th>
                <th style={{ textAlign: 'center' }}>⚠ Revisar</th>
                <th style={{ textAlign: 'center' }}>✕ Sin match</th>
                <th style={{ textAlign: 'center' }}>⊘ Errores</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <BatchRow key={b.id} batch={b} />
              ))}
            </tbody>
          </table>

          {(data?.lastPage ?? 1) > 1 && (
            <div className="action-group mt-4" style={{ justifyContent: 'flex-end' }}>
              <button
                className="btn btn-sm btn-secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </button>
              <span className="text-muted" style={{ alignSelf: 'center' }}>
                Página {page} de {data?.lastPage}
              </span>
              <button
                className="btn btn-sm btn-secondary"
                disabled={page >= (data?.lastPage ?? 1)}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}
    </>
  )
}

function BatchRow({ batch }: { batch: ImportBatch }) {
  const hasPendingReview = batch.rows.pending_review > 0
  const isActive = batch.status === 'processing' || batch.status === 'pending'

  return (
    <tr>
      <td>
        <span className={`badge ${batch.source === 'civil_registry' ? 'badge-blue' : 'badge-green'}`}>
          {batch.source_label}
        </span>
      </td>
      <td style={{ fontSize: '0.875rem' }}>
        {batch.original_filename}
        {batch.institution && (
          <span className="text-muted" style={{ display: 'block', fontSize: '0.8rem' }}>
            {batch.institution.name}
          </span>
        )}
      </td>
      <td style={{ fontSize: '0.875rem', color: 'var(--color-muted)' }}>
        {formatDate(batch.created_at)}
      </td>
      <td>
        <span className={STATUS_CLASS[batch.status]}>
          {isActive && '⟳ '}
          {STATUS_LABEL[batch.status]}
        </span>
        {batch.status === 'failed' && batch.error_message && (
          <span className="text-muted" style={{ display: 'block', fontSize: '0.75rem', marginTop: 2 }}>
            {batch.error_message.slice(0, 80)}
          </span>
        )}
      </td>
      <td style={{ textAlign: 'center', color: 'var(--color-success)', fontWeight: 600 }}>
        {batch.rows.matched > 0 ? batch.rows.matched : '—'}
      </td>
      <td style={{ textAlign: 'center', color: hasPendingReview ? 'var(--color-warning)' : 'var(--color-muted)', fontWeight: hasPendingReview ? 700 : 400 }}>
        {batch.rows.pending_review > 0 ? batch.rows.pending_review : '—'}
      </td>
      <td style={{ textAlign: 'center', color: 'var(--color-muted)' }}>
        {batch.rows.no_match > 0 ? batch.rows.no_match : '—'}
      </td>
      <td style={{ textAlign: 'center', color: batch.rows.errors > 0 ? 'var(--color-danger)' : 'var(--color-muted)' }}>
        {batch.rows.errors > 0 ? batch.rows.errors : '—'}
      </td>
      <td>
        {hasPendingReview && (
          <Link to={`/imports/${batch.id}/review`} className="btn btn-sm btn-primary">
            Revisar ({batch.rows.pending_review})
          </Link>
        )}
        {!hasPendingReview && batch.status === 'completed' && (
          <Link to={`/imports/${batch.id}/review`} className="btn btn-sm btn-secondary">
            Ver detalle
          </Link>
        )}
      </td>
    </tr>
  )
}

function UploadPanel() {
  const [open, setOpen] = useState(false)
  const [source, setSource] = useState<'civil_registry' | 'education'>('civil_registry')
  const [institutionId, setInstitutionId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const { mutateAsync: upload, isPending, isSuccess, error: uploadError } = useUploadImportMutation()
  const educationInstitutions = useInstitutionOptions('educacion', true)

  const [downloadingTemplate, setDownloadingTemplate] = useState<TemplateFormat | null>(null)
  const [templateError, setTemplateError] = useState<string | null>(null)

  const errorMsg = uploadError
    ? ((uploadError as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Error al subir el archivo.')
    : null

  // Descarga autenticada: el token va en el header Authorization, no en
  // cookies, así que no se puede navegar directo con un <a href>.
  async function handleDownloadTemplate(format: TemplateFormat) {
    setTemplateError(null)
    setDownloadingTemplate(format)
    try {
      const response = await downloadImportTemplate(source, format)
      const disposition = response.headers['content-disposition'] as string | undefined
      const match = disposition?.match(/filename="?([^"]+)"?/)
      const filename = match?.[1] ?? `plantilla_${source}.${format}`

      const url = URL.createObjectURL(response.data as Blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch {
      setTemplateError('No se pudo descargar la plantilla. Intentá de nuevo.')
    } finally {
      setDownloadingTemplate(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return

    const fd = new FormData()
    fd.append('file', file)
    fd.append('source', source)
    if (source === 'education' && institutionId) {
      fd.append('institution_id', institutionId)
    }

    await upload(fd)
    setFile(null)
    // No cerramos el panel: el mensaje de éxito le da feedback al usuario
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) setFile(dropped)
  }

  if (!open) {
    return (
      <button
        className="btn btn-primary"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        onClick={() => setOpen(true)}
      >
        <IconUpload size={16} />
        Subir archivo
      </button>
    )
  }

  return (
    <div
      className="card"
      style={{ marginBottom: '1.5rem', padding: '1.25rem', border: '1px solid var(--color-border)' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Subir archivo de importación</h3>
        <button className="btn-link" style={{ fontSize: '0.875rem' }} onClick={() => setOpen(false)}>
          Cancelar
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Fuente */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: 6, fontSize: '0.875rem' }}>
            Fuente del archivo
          </label>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            {(['civil_registry', 'education'] as const).map((s) => (
              <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.875rem' }}>
                <input
                  type="radio"
                  name="source"
                  value={s}
                  checked={source === s}
                  onChange={() => { setSource(s); setInstitutionId('') }}
                />
                {s === 'civil_registry' ? 'Registro Civil' : 'Educación'}
              </label>
            ))}
          </div>
        </div>

        {/* Institución (solo educación) */}
        {source === 'education' && (
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: 6, fontSize: '0.875rem' }}>
              Institución educativa <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <select
              className="search-input"
              value={institutionId}
              onChange={(e) => setInstitutionId(e.target.value)}
              required
              style={{ width: '100%', maxWidth: 360 }}
            >
              <option value="">Seleccionar institución…</option>
              {educationInstitutions.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Plantilla descargable */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: 6, fontSize: '0.875rem' }}>
            ¿No sabés qué columnas van? Descargá la plantilla
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {(['xlsx', 'csv', 'txt'] as const).map((format) => (
              <button
                key={format}
                type="button"
                className="btn btn-sm btn-secondary"
                disabled={downloadingTemplate !== null}
                onClick={() => handleDownloadTemplate(format)}
              >
                {downloadingTemplate === format ? 'Descargando…' : `Plantilla ${TEMPLATE_FORMAT_LABEL[format]}`}
              </button>
            ))}
          </div>
          {templateError && (
            <p style={{ margin: '6px 0 0', color: 'var(--color-danger)', fontSize: '0.8rem' }}>{templateError}</p>
          )}
        </div>

        {/* Zona de drop */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? 'var(--color-primary)' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius)',
            padding: '1.5rem',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragOver ? '#eff6ff' : 'var(--color-bg)',
            marginBottom: '1rem',
            transition: 'all 0.15s',
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt,.xlsx,.xls"
            style={{ display: 'none' }}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <p style={{ margin: 0, fontWeight: 500, color: 'var(--color-primary)' }}>
              📄 {file.name} ({(file.size / 1024).toFixed(0)} KB)
            </p>
          ) : (
            <>
              <IconUpload size={28} style={{ color: 'var(--color-muted)', marginBottom: 8 }} />
              <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.875rem' }}>
                Arrastrá el archivo aquí o hacé clic para seleccionar
              </p>
              <p style={{ margin: '4px 0 0', color: 'var(--color-muted)', fontSize: '0.8rem' }}>
                CSV, TXT o Excel (.xlsx, .xls) — máximo 10 MB
              </p>
            </>
          )}
        </div>

        {errorMsg && <div className="alert alert-error" style={{ marginBottom: '0.75rem' }}>{errorMsg}</div>}
        {isSuccess && <div className="alert alert-success" style={{ marginBottom: '0.75rem' }}>Archivo enviado. El procesamiento comenzará en instantes.</div>}

        <div className="action-group">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!file || isPending || (source === 'education' && !institutionId)}
          >
            {isPending ? 'Enviando…' : 'Procesar archivo'}
          </button>
        </div>
      </form>
    </div>
  )
}
