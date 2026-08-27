import api from './client'
import type { EducationPeriodReport, HealthPeriodReport } from '../types'

// Reportes bimestrales de los registros de dominio de un niño.
// El registro (education-record / health-record) sigue siendo la foto vigente;
// estos son el histórico consultable por año + bimestre.

// ─── Educación ────────────────────────────────────────────────────────────────

export const getEducationPeriodReports = (childId: string) =>
  api.get<EducationPeriodReport[]>(`/children/${childId}/education-record/periods`)

export interface EducationPeriodReportPayload {
  year: number
  bimester: number
  level?: string | null
  grade?: number | null
  is_enrolled?: boolean
  absences_count?: number | null
  present_days?: number | null
  total_days?: number | null
  summary?: string | null
}

export const createEducationPeriodReport = (childId: string, data: EducationPeriodReportPayload) =>
  api.post<EducationPeriodReport>(`/children/${childId}/education-record/periods`, data)

export const updateEducationPeriodReport = (
  childId: string,
  reportId: string,
  data: Partial<Omit<EducationPeriodReportPayload, 'year' | 'bimester'>>,
) => api.patch<EducationPeriodReport>(`/children/${childId}/education-record/periods/${reportId}`, data)

export const deleteEducationPeriodReport = (childId: string, reportId: string) =>
  api.delete(`/children/${childId}/education-record/periods/${reportId}`)

// ─── Salud ────────────────────────────────────────────────────────────────────

export const getHealthPeriodReports = (childId: string) =>
  api.get<HealthPeriodReport[]>(`/children/${childId}/health-record/periods`)

export interface HealthPeriodReportPayload {
  year: number
  bimester: number
  healthy_checkup_current?: boolean | null
  vaccines_current?: boolean | null
  last_checkup_date?: string | null
  weight_kg?: number | null
  height_cm?: number | null
  summary?: string | null
}

export const createHealthPeriodReport = (childId: string, data: HealthPeriodReportPayload) =>
  api.post<HealthPeriodReport>(`/children/${childId}/health-record/periods`, data)

export const updateHealthPeriodReport = (
  childId: string,
  reportId: string,
  data: Partial<Omit<HealthPeriodReportPayload, 'year' | 'bimester'>>,
) => api.patch<HealthPeriodReport>(`/children/${childId}/health-record/periods/${reportId}`, data)

export const deleteHealthPeriodReport = (childId: string, reportId: string) =>
  api.delete(`/children/${childId}/health-record/periods/${reportId}`)
