import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createHealthObservation,
  getHealthObservations,
  type CreateHealthObservationInput,
} from '../api/healthObservations'

const queryKey = (childId: string) => ['health-observations', childId] as const

export function useHealthObservationsQuery(childId: string | undefined) {
  return useQuery({
    queryKey: queryKey(childId ?? ''),
    queryFn: async () => {
      const { data } = await getHealthObservations(childId as string)
      return data
    },
    enabled: Boolean(childId),
  })
}

export function useCreateHealthObservationMutation(childId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateHealthObservationInput) => createHealthObservation(childId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKey(childId) })
    },
  })
}
