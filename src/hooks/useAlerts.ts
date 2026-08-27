import { useMutation, useQueryClient } from '@tanstack/react-query'
import { acknowledgeAlert } from '../api/alerts'
import { queryKeys } from '../api/queryKeys'
import type { ChildAlertType } from '../types'

// Marca una alerta del SAT como "gestionada / en seguimiento". Al terminar,
// refresca el detalle del niño (y el listado, para el conteo de alertas).
export function useAcknowledgeAlertMutation(childId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ type, note }: { type: ChildAlertType; note: string }) =>
      acknowledgeAlert(childId, type, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.children.detail(childId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.children.all })
    },
  })
}
