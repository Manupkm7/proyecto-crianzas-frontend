import api from './client'

export interface DatabaseExportFilters {
  province_id?: string
  department_id?: string
  locality_id?: string
  // Rango de fechas — filtra lo creado y/o actualizado en el rango. Mutuamente
  // excluyente con period_year/period_bimester (el backend rechaza ambos juntos).
  date_from?: string
  date_to?: string
  // Bimestre — acota a los niños con algún reporte bimestral en ese período,
  // y de ahí a toda su ficha (instituciones, registros, observaciones, etc.).
  period_year?: number
  period_bimester?: number
}

// Exportación completa de la base de datos (ZIP) — exclusivo del administrador.
// responseType 'blob' porque es un archivo binario, no JSON. Sin filtros
// (todos los campos vacíos) exporta todo el sistema, igual que antes.
export const downloadDatabaseExport = (filters: DatabaseExportFilters = {}) =>
  api.get('/database-export', { responseType: 'blob', params: filters })
