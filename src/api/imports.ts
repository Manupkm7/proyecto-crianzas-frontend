import api from './client'
import type {
  ApiItemResponse,
  ApiListResponse,
  ImportBatch,
  ImportPreviewResponse,
  ImportRow,
  ImportRowOverrides,
  ImportSheetAssignment,
  ResolveRowResponse,
} from '../types'

export const getImports = (params: { page?: number; search?: string } = {}) =>
  api.get<ApiListResponse<ImportBatch>>('/imports', { params })

export const getImport = (id: string) =>
  api.get<ApiItemResponse<ImportBatch>>(`/imports/${id}`)

/** Otras hojas creadas a partir del mismo archivo subido, para elegir contra cuál comparar. */
export const getImportSiblings = (id: string) =>
  api.get<ApiListResponse<ImportBatch>>(`/imports/${id}/siblings`)

/**
 * Sube un archivo CSV, TXT o XLSX y devuelve sus hojas detectadas (una entrada
 * virtual para CSV/TXT) sin procesarlo todavía. El Content-Type lo negocia
 * axios al recibir FormData.
 */
export const previewImport = (formData: FormData) =>
  api.post<ImportPreviewResponse>('/imports/preview', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

/** Crea un batch por cada hoja asignada (fuente + institución) del archivo ya subido. */
export const submitImportSheets = (data: {
  storage_path: string
  original_filename: string
  sheets: ImportSheetAssignment[]
}) => api.post<ApiListResponse<ImportBatch>>('/imports', data)

/**
 * Descarga la plantilla de columnas esperadas para una fuente, en el formato
 * elegido. responseType 'blob' porque el token va en el header Authorization
 * (no en cookies), así que no se puede navegar directo con un <a href>.
 */
export const downloadImportTemplate = (
  source: 'civil_registry' | 'education' | 'health',
  format: 'xlsx' | 'csv' | 'txt',
) =>
  api.get('/imports/template', {
    params: { source, format },
    responseType: 'blob',
  })

export const getImportRows = (
  batchId: string,
  params: { status?: string; page?: number; confidence?: number } = {},
) => api.get<ApiListResponse<ImportRow>>(`/imports/${batchId}/rows`, { params })

/** Conteo por % de confianza de las filas 'partial_match' del batch entero (no solo la página actual). */
export const getImportConfidenceSummary = (batchId: string) =>
  api.get<{ data: { confidence: number; count: number }[] }>(
    `/imports/${batchId}/rows/confidence-summary`,
  )

export const resolveImportRow = (
  batchId: string,
  rowId: string,
  data: {
    action: 'confirm' | 'skip'
    child_id?: string
    data_source?: 'row' | 'matched_row'
    overrides?: ImportRowOverrides
  },
) => api.patch<ResolveRowResponse>(`/imports/${batchId}/rows/${rowId}/resolve`, data)

/** Crea un niño nuevo por cada fila 'no_match' del lote — para cuando no hay ninguna hoja con la que comparar. */
export const bulkResolveNoMatch = (batchId: string) =>
  api.post<{ message: string; resolved: number; skipped_lines: number[] }>(
    `/imports/${batchId}/rows/bulk-resolve`,
  )

/** Recompara las filas sin resolver del batch contra una hoja elegida a mano por el operador. */
export const rematchImportBatch = (batchId: string, againstBatchId: string) =>
  api.post<{ message: string; updated: number }>(`/imports/${batchId}/rematch`, {
    against_batch_id: againstBatchId,
  })

/** Reabre una fila ya resuelta ('matched' o 'manual_resolved') para corregirla. */
export const reopenImportRow = (batchId: string, rowId: string) =>
  api.post<{ message: string; row: ImportRow }>(`/imports/${batchId}/rows/${rowId}/reopen`)
