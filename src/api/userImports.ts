import api from './client'
import type { ApiItemResponse, ApiListResponse, UserImportBatch, UserImportRow } from '../types'

export const getUserImports = (params: { page?: number } = {}) =>
  api.get<ApiListResponse<UserImportBatch>>('/user-imports', { params })

export const getUserImport = (id: string) =>
  api.get<ApiItemResponse<UserImportBatch>>(`/user-imports/${id}`)

/** Sube un archivo CSV, TXT o XLSX con ID_NOMBRE, ID_APELLIDO, ID_DNI y ROL. */
export const uploadUserImport = (formData: FormData) =>
  api.post<ApiItemResponse<UserImportBatch>>('/user-imports', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

/**
 * Descarga la plantilla de columnas esperadas, en el formato elegido.
 * responseType 'blob' porque el token va en el header Authorization (no en
 * cookies), así que no se puede navegar directo con un <a href>.
 */
export const downloadUserImportTemplate = (format: 'xlsx' | 'csv' | 'txt') =>
  api.get('/user-imports/template', {
    params: { format },
    responseType: 'blob',
  })

export const getUserImportRows = (
  batchId: string,
  params: { status?: string; page?: number } = {},
) => api.get<ApiListResponse<UserImportRow>>(`/user-imports/${batchId}/rows`, { params })

export const resolveUserImportRow = (
  batchId: string,
  rowId: string,
  data: { action: 'confirm' | 'skip' },
) => api.patch(`/user-imports/${batchId}/rows/${rowId}/resolve`, data)
