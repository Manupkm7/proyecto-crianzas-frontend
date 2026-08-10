import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createChild,
  deleteChild,
  getChild,
  getChildren,
  updateChild,
  type ChildPayload,
  type ChildrenQueryParams,
} from '../api/children'
import { queryKeys } from '../api/queryKeys'
import type { Child } from '../types'

export interface ChildrenQueryResult {
  items: Child[]
  total: number
  alertsCount: number
  currentPage: number
  lastPage: number
}

// Lista de niños visibles para el usuario autenticado, con filtros/paginación opcionales.
export function useChildrenQuery(params: ChildrenQueryParams = {}) {
  return useQuery({
    queryKey: [...queryKeys.children.all, params],
    queryFn: async (): Promise<ChildrenQueryResult> => {
      const { data } = await getChildren(params)

      if (Array.isArray(data)) {
        return {
          items: data,
          total: data.length,
          alertsCount: data.filter((c) => c.has_alert).length,
          currentPage: 1,
          lastPage: 1,
        }
      }

      return {
        items: data.data,
        total: data.meta?.total ?? data.data.length,
        alertsCount: data.alerts_count ?? data.data.filter((c) => c.has_alert).length,
        currentPage: data.meta?.current_page ?? 1,
        lastPage: data.meta?.last_page ?? 1,
      }
    },
  })
}

// Detalle de un niño puntual (con sus registros de dominio).
export function useChildQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.children.detail(id ?? ''),
    queryFn: async () => {
      const { data } = await getChild(id as string)
      return 'data' in data ? data.data : data
    },
    enabled: Boolean(id),
  })
}

export function useCreateChildMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ChildPayload) => createChild(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.children.all })
    },
  })
}

export function useUpdateChildMutation(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ChildPayload) => updateChild(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.children.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.children.detail(id) })
    },
  })
}

export function useDeleteChildMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteChild(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.children.all })
    },
  })
}
