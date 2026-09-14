import api from './client'
import type { ApiItemResponse, ApiListResponse, Child } from '../types'

export interface ChildPayload {
  first_name?: string
  last_name?: string
  birth_date?: string
  dni?: string
  notes?: string
}

export interface ChildrenQueryParams {
  /** Nombre/apellido (parcial) o DNI (coincidencia exacta — el DNI está cifrado). */
  search?: string
  /** Filtra por si tiene o no registro educativo/de salud cargado. */
  has_education?: boolean
  has_health?: boolean
  /** Solo niños con alguna alerta (ver Child.alerts). */
  alert?: boolean
  /** Filtra por nivel/grado del registro educativo (dashboard de instituciones educativas). */
  level?: string
  grade?: number
  /** Solo niños con registro (educativo o de salud) en alguna institución de esa localidad fija. */
  institution_locality?: 'san_justo' | 'uriburu'
  page?: number
  per_page?: number
}

// Devuelve la lista de niños visibles para el usuario autenticado.
export const getChildren = (params: ChildrenQueryParams = {}) =>
  api.get<ApiListResponse<Child> | Child[]>('/children', { params })

// Devuelve el detalle de un niño (con sus registros de educación, salud, nacimiento y defunción).
export const getChild = (id: string) => api.get<ApiItemResponse<Child> | Child>(`/children/${id}`)

// Registra un nuevo niño. Solo carga los datos base — los registros de dominio se cargan aparte.
export const createChild = (data: ChildPayload) =>
  api.post<ApiItemResponse<Child> | Child>('/children', data)

// Actualiza los datos base de un niño. Solo accesible para admin.
export const updateChild = (id: string, data: ChildPayload) =>
  api.patch<ApiItemResponse<Child> | Child>(`/children/${id}`, data)

// Da de baja (lógica) a un niño. Solo accesible para admin.
export const deleteChild = (id: string) => api.delete(`/children/${id}`)
