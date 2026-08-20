import api from './client'
import type { ApiItemResponse, ApiListResponse, Institution } from '../types'

export type InstitutionPayload = Partial<
  Pick<
    Institution,
    | 'name'
    | 'type'
    | 'address'
    | 'phone'
    | 'locality_id'
    | 'is_active'
    | 'offers_jardin'
    | 'offers_primario'
    | 'primario_years'
    | 'offers_secundario'
    | 'secundario_years'
  >
>

// Devuelve la lista paginada de instituciones.
// Admin y coordinador ven todas; institución/representante solo ven la propia.
export const getInstitutions = (params: Record<string, unknown> = {}) =>
  api.get<ApiListResponse<Institution>>('/institutions', { params })

// Devuelve el detalle de una institución.
export const getInstitution = (id: string) =>
  api.get<ApiItemResponse<Institution>>(`/institutions/${id}`)

// Crea una nueva institución. Solo accesible para admin.
export const createInstitution = (data: InstitutionPayload) =>
  api.post<ApiItemResponse<Institution>>('/institutions', data)

// Actualiza una institución (PATCH parcial).
// Admin: puede cambiar nombre, tipo, dirección, teléfono, estado.
// Responsable de institución: solo puede cambiar dirección y teléfono de la suya.
export const updateInstitution = (id: string, data: InstitutionPayload) =>
  api.patch<ApiItemResponse<Institution>>(`/institutions/${id}`, data)

// Desactiva una institución (baja lógica). Solo accesible para admin.
export const deleteInstitution = (id: string) => api.delete(`/institutions/${id}`)
