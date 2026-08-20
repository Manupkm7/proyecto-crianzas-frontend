import api from './client'
import type { ApiItemResponse, ApiListResponse, ImportBatch, ImportRow } from '../types'

export const getImports = (params: { page?: number } = {}) =>
  api.get<ApiListResponse<ImportBatch>>('/imports', { params })

export const getImport = (id: string) =>
  api.get<ApiItemResponse<ImportBatch>>(`/imports/${id}`)

/** Sube un archivo CSV, TXT o XLSX. El Content-Type lo negocia axios al recibir FormData. */
export const uploadImport = (formData: FormData) =>
  api.post<ApiItemResponse<ImportBatch>>('/imports', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

/**
 * Descarga la plantilla de columnas esperadas para una fuente, en el formato
 * elegido. responseType 'blob' porque el token va en el header Authorization
 * (no en cookies), así que no se puede navegar directo con un <a href>.
 */
export const downloadImportTemplate = (
  source: 'civil_registry' | 'education',
  format: 'xlsx' | 'csv' | 'txt',
) =>
  api.get('/imports/template', {
    params: { source, format },
    responseType: 'blob',
  })

export const getImportRows = (
  batchId: string,
  params: { status?: string; page?: number } = {},
) => api.get<ApiListResponse<ImportRow>>(`/imports/${batchId}/rows`, { params })

export const resolveImportRow = (
  batchId: string,
  rowId: string,
  data: { action: 'confirm' | 'skip'; child_id?: string },
) => api.patch(`/imports/${batchId}/rows/${rowId}/resolve`, data)
