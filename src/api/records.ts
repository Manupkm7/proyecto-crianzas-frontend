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
