import { useQuery } from '@tanstack/react-query'
import { getEducationDashboard } from '../api/educationDashboard'

interface UseEducationDashboardOptions {
  institutionId?: string
  enabled?: boolean
}

// Conteo de niños y alertas por nivel/grado — usado en el dashboard de instituciones educativas.
export function useEducationDashboardQuery(options: UseEducationDashboardOptions = {}) {
  return useQuery({
    queryKey: ['education-dashboard', options.institutionId ?? null],
    queryFn: async () => {
      const { data } = await getEducationDashboard(options.institutionId)
      return data
    },
    enabled: options.enabled ?? true,
  })
}
