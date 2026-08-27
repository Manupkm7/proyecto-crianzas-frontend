import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  changeMyInstitutionPassword,
  createInstitution,
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
}

export function useInstitutionsQuery(options: UseInstitutionsQueryOptions = {}) {
  return useQuery({
    queryKey: queryKeys.institutions.all,
    queryFn: async () => {
      const { data } = await getInstitutions()
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

export function useDeleteInstitutionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteInstitution(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.institutions.all })
    },
  })
}
