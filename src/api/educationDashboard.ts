import api from './client'
import type { EducationDashboardSummary } from '../types'

// Resumen por nivel/grado del dashboard de una institución educativa.
// Admin/coordinador pueden pasar institutionId para ver el resumen de una institución puntual.
export const getEducationDashboard = (institutionId?: string) =>
  api.get<EducationDashboardSummary>('/education-dashboard', {
    params: institutionId ? { institution_id: institutionId } : {},
  })
