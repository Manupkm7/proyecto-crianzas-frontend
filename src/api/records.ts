import api from './client'

// Los registros de dominio (educación, salud, nacimiento, defunción) comparten el mismo
// patrón: POST para crear, PATCH para corregir uno ya existente.
const saveRecord = (path: string, exists: boolean, data: Record<string, unknown>) =>
  api[exists ? 'patch' : 'post'](path, data)

export const saveEducationRecord = (childId: string, exists: boolean, data: Record<string, unknown>) =>
  saveRecord(`/children/${childId}/education-record`, exists, data)

export const saveHealthRecord = (childId: string, exists: boolean, data: Record<string, unknown>) =>
  saveRecord(`/children/${childId}/health-record`, exists, data)

export const saveBirthRecord = (childId: string, exists: boolean, data: Record<string, unknown>) =>
  saveRecord(`/children/${childId}/birth-record`, exists, data)

export const saveDeathRecord = (childId: string, exists: boolean, data: Record<string, unknown>) =>
  saveRecord(`/children/${childId}/death-record`, exists, data)

// Desvincular (soft delete) el registro de dominio de un niño — solo admin.
// Los datos se conservan en el historial; volver a vincular la misma institución
// restaura el registro.
export const deleteEducationRecord = (childId: string) =>
  api.delete(`/children/${childId}/education-record`)

export const deleteHealthRecord = (childId: string) =>
  api.delete(`/children/${childId}/health-record`)
