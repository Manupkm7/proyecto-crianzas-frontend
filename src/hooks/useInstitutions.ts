import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  changeMyInstitutionPassword,
  createInstitution,
  createProgramArea,
  getProgramAreas,
  deleteInstitution,
  getInstitution,
  getInstitutions,
  resetInstitutionPassword,
  updateInstitution,
  type ChangeMyInstitutionPasswordPayload,
  type InstitutionPayload,
} from '../api/institutions'
import { queryKeys } from '../api/queryKeys'

interface UseInstitutionsQueryOptions {
  enabled?: boolean
  /**
   * true = respeta el ámbito global del sidebar (listado de efectores, stats del
   * dashboard). Por defecto false: la mayoría de los usos son desplegables de
   * formularios, que tienen que ofrecer TODAS las instituciones.
   */
  scoped?: boolean
}

export function useInstitutionsQuery(options: UseInstitutionsQueryOptions = {}) {
  const scoped = options.scoped ?? false
  return useQuery({
    // Keys distintas: comparten el prefijo 'institutions', así que las
    // invalidaciones existentes (queryKeys.institutions.all) alcanzan a ambas.
    queryKey: scoped ? queryKeys.institutions.all : queryKeys.institutions.unscoped,
    queryFn: async () => {
      const { data } = await getInstitutions({}, scoped)
      return data.data ?? []
    },
    enabled: options.enabled ?? true,
  })
}

export function useInstitutionQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.institutions.detail(id ?? ''),
    queryFn: async () => {
      const { data } = await getInstitution(id as string)
      return data.data
    },
    enabled: Boolean(id),
  })
}

export function useCreateInstitutionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: InstitutionPayload) => createInstitution(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.institutions.all })
    },
  })
}

export function useUpdateInstitutionMutation(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: InstitutionPayload) => updateInstitution(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.institutions.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.institutions.detail(id) })
    },
  })
}

export function useResetInstitutionPasswordMutation() {
  return useMutation({
    mutationFn: (id: string) => resetInstitutionPassword(id),
  })
}

export function useChangeMyInstitutionPasswordMutation() {
  return useMutation({
    mutationFn: (payload: ChangeMyInstitutionPasswordPayload) =>
      changeMyInstitutionPassword(payload),
  })
}

// ─── Dependencias programáticas (ficha del efector) ─────────────────────────

export function useProgramAreasQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.programAreas,
    queryFn: async () => {
      const { data } = await getProgramAreas()
      return data.data
    },
    enabled,
  })
}

export function useCreateProgramAreaMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      const { data } = await createProgramArea(name)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.programAreas })
    },
  })
}

export function useDeleteInstitutionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteInstitution(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.institutions.all })
    },
  })
}
