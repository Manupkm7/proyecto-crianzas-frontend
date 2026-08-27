import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createEducationPeriodReport,
  createHealthPeriodReport,
  deleteEducationPeriodReport,
  deleteHealthPeriodReport,
  getEducationPeriodReports,
  getHealthPeriodReports,
  updateEducationPeriodReport,
  updateHealthPeriodReport,
  type EducationPeriodReportPayload,
  type HealthPeriodReportPayload,
} from '../api/periodReports'

const eduKey = (childId: string) => ['education-period-reports', childId] as const
const healthKey = (childId: string) => ['health-period-reports', childId] as const

// ─── Educación ────────────────────────────────────────────────────────────────

export function useEducationPeriodReportsQuery(childId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: eduKey(childId ?? ''),
    queryFn: async () => {
      const { data } = await getEducationPeriodReports(childId as string)
      return data
    },
    enabled: Boolean(childId) && enabled,
  })
}

export function useSaveEducationPeriodReportMutation(childId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: EducationPeriodReportPayload & { id?: string }) => {
      // year/bimestre identifican el reporte: van solo en el POST, nunca en el PATCH.
      const { id, year, bimester, ...rest } = input
      return id
        ? updateEducationPeriodReport(childId, id, rest)
        : createEducationPeriodReport(childId, { ...rest, year, bimester })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eduKey(childId) })
    },
  })
}

export function useDeleteEducationPeriodReportMutation(childId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (reportId: string) => deleteEducationPeriodReport(childId, reportId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eduKey(childId) })
    },
  })
}

// ─── Salud ────────────────────────────────────────────────────────────────────

export function useHealthPeriodReportsQuery(childId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: healthKey(childId ?? ''),
    queryFn: async () => {
      const { data } = await getHealthPeriodReports(childId as string)
      return data
    },
    enabled: Boolean(childId) && enabled,
  })
}

export function useSaveHealthPeriodReportMutation(childId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: HealthPeriodReportPayload & { id?: string }) => {
      // year/bimestre identifican el reporte: van solo en el POST, nunca en el PATCH.
      const { id, year, bimester, ...rest } = input
      return id
        ? updateHealthPeriodReport(childId, id, rest)
        : createHealthPeriodReport(childId, { ...rest, year, bimester })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: healthKey(childId) })
    },
  })
}

export function useDeleteHealthPeriodReportMutation(childId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (reportId: string) => deleteHealthPeriodReport(childId, reportId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: healthKey(childId) })
    },
  })
}
