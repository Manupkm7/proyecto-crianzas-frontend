import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createEducationObservation,
  getEducationObservations,
  type CreateEducationObservationInput,
} from '../api/educationObservations'

const queryKey = (childId: string) => ['education-observations', childId] as const

export function useEducationObservationsQuery(childId: string | undefined) {
  return useQuery({
    queryKey: queryKey(childId ?? ''),
    queryFn: async () => {
      const { data } = await getEducationObservations(childId as string)
      return data
    },
    enabled: Boolean(childId),
  })
}

export function useCreateEducationObservationMutation(childId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateEducationObservationInput) => createEducationObservation(childId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKey(childId) })
    },
  })
}
