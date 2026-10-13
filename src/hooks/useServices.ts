import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import {
  createChildService,
  createServiceType,
  deleteChildService,
  getAllInstitutions,
  getChildServices,
  getChildServicesGrid,
  type ChildServicesGridParams,
  getServiceTypes,
  updateChildService,
  updateServiceType,
  type ChildServicePayload,
  type ServiceTypePayload,
} from '../api/services'
import { queryKeys } from '../api/queryKeys'

// ─── Catálogo ─────────────────────────────────────────────────────────────────

export function useServiceTypesQuery(includeInactive = false, enabled = true) {
  return useQuery({
    queryKey: queryKeys.serviceTypes.list(includeInactive),
    queryFn: async () => {
      const { data } = await getServiceTypes(includeInactive)
      return data
    },
    enabled,
  })
}

export function useSaveServiceTypeMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: ServiceTypePayload & { id?: string }) =>
      id ? updateServiceType(id, data) : createServiceType(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.serviceTypes.all })
      // Marcar/desmarcar una obligatoria cambia las alertas de los niños.
      queryClient.invalidateQueries({ queryKey: queryKeys.children.all })
    },
  })
}

// ─── Grilla general ───────────────────────────────────────────────────────────

export function useChildServicesGridQuery(params: ChildServicesGridParams = {}) {
  return useQuery({
    queryKey: [...queryKeys.childServicesGrid, params],
    queryFn: async () => {
      const { data } = await getChildServicesGrid(params)
      return {
        items: data.data,
        periods: data.periods ?? [],
        total: data.meta?.total ?? data.data.length,
        lastPage: data.meta?.last_page ?? 1,
      }
    },
    placeholderData: keepPreviousData,
  })
}

// ─── Prestaciones de un niño ──────────────────────────────────────────────────

export function useChildServicesQuery(childId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.childServices(childId ?? ''),
    queryFn: async () => {
      const { data } = await getChildServices(childId as string)
      return data
    },
    enabled: Boolean(childId) && enabled,
  })
}

export function useSaveChildServiceMutation(childId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: ChildServicePayload & { id?: string }) =>
      id ? updateChildService(childId, id, data) : createChildService(childId, data),
    onSuccess: () => invalidateAfterServiceChange(queryClient, childId),
  })
}

// Crear/editar/dar de baja una prestación cambia: la grilla, las alertas del SAT
// del niño, y también la LISTA de niños (columna de prestaciones y el filtro
// global de fecha de prestaciones: editar el período o dar de baja la única
// prestación del rango saca al niño de la lista). children.all es prefijo de
// children.detail, así que cubre ambos.
function invalidateAfterServiceChange(queryClient: QueryClient, childId: string) {
  queryClient.invalidateQueries({ queryKey: queryKeys.childServices(childId) })
  queryClient.invalidateQueries({ queryKey: queryKeys.childServicesGrid })
  queryClient.invalidateQueries({ queryKey: queryKeys.children.all })
}

export function useDeleteChildServiceMutation(childId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (serviceId: string) => deleteChildService(childId, serviceId),
    onSuccess: () => invalidateAfterServiceChange(queryClient, childId),
  })
}

/** Todas las instituciones activas — para que el admin elija el efector. */
export function useProviderOptions(enabled: boolean) {
  const { data = [] } = useQuery({
    queryKey: queryKeys.institutions.allOptions,
    queryFn: async () => {
      const { data } = await getAllInstitutions()
      return data.data ?? []
    },
    enabled,
  })
  return data.filter((i) => i.is_active)
}
