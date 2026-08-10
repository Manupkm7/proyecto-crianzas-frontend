import api from './client'

// Exportación completa de la base de datos (ZIP) — exclusivo del administrador.
// responseType 'blob' porque es un archivo binario, no JSON.
export const downloadDatabaseExport = () =>
  api.get('/database-export', { responseType: 'blob' })
