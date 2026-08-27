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

// Respuesta de creación: además del recurso, el backend devuelve UNA sola vez
// la contraseña institucional inicial en texto plano (ver InstitutionController::store).
export interface InstitutionCreateResponse extends ApiItemResponse<Institution> {
  initial_password: string
}

// Crea una nueva institución. Solo accesible para admin.
export const createInstitution = (data: InstitutionPayload) =>
  api.post<InstitutionCreateResponse>('/institutions', data)

// Respuesta del reseteo de contraseña institucional.
export interface InstitutionPasswordResetResponse {
  message: string
  initial_password: string
}

// Genera una nueva contraseña institucional y la devuelve una sola vez.
// Invalida la contraseña anterior y cierra las sesiones activas. Solo admin.
export const resetInstitutionPassword = (id: string) =>
  api.post<InstitutionPasswordResetResponse>(`/institutions/${id}/reset-password`)

export interface ChangeMyInstitutionPasswordPayload {
  current_password: string
  password: string
  password_confirmation: string
}

// La institución autenticada cambia su propia contraseña (tras un reset del
// admin, para dejar una que pueda recordar). Requiere la contraseña actual.
export const changeMyInstitutionPassword = (data: ChangeMyInstitutionPasswordPayload) =>
  api.post<{ message: string }>('/institution/change-password', data)

// Actualiza una institución (PATCH parcial).
// Admin: puede cambiar nombre, tipo, dirección, teléfono, estado.
// Responsable de institución: solo puede cambiar dirección y teléfono de la suya.
export const updateInstitution = (id: string, data: InstitutionPayload) =>
  api.patch<ApiItemResponse<Institution>>(`/institutions/${id}`, data)

// Desactiva una institución (baja lógica). Solo accesible para admin.
export const deleteInstitution = (id: string) => api.delete(`/institutions/${id}`)
