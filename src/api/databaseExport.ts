import api from './client'

export interface DatabaseExportJurisdiction {
  province_id?: string
  department_id?: string
  locality_id?: string
}

// Exportación completa de la base de datos (ZIP) — exclusivo del administrador.
// responseType 'blob' porque es un archivo binario, no JSON. Sin jurisdicción
// (todos los campos vacíos) exporta todo el sistema, igual que antes.
export const downloadDatabaseExport = (jurisdiction: DatabaseExportJurisdiction = {}) =>
  api.get('/database-export', { responseType: 'blob', params: jurisdiction })
