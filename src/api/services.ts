import api from './client'
import { UNSCOPED } from './localityScope'
import type {
  ChildService,
  Institution,
  ServicePeriodType,
  ServiceSectorKey,
  ServiceSectorOption,
  ServiceType,
  ApiListResponse,
} from '../types'

// Prestaciones por período de un niño (salud, cuidado y educación, protección
// social...) y su catálogo. También llegan por carga masiva, en las mismas filas
// de Registro Civil / Educación / Salud con las que se matchean los niños.

// ─── Catálogo ─────────────────────────────────────────────────────────────────

export interface ServiceTypesResponse {
  data: ServiceType[]
  sectors: ServiceSectorOption[]
}

export const getServiceTypes = (includeInactive = false) =>
  api.get<ServiceTypesResponse>('/service-types', {
    params: includeInactive ? { include_inactive: 1 } : {},
  })

export interface ServiceTypePayload {
  name?: string
  sector?: ServiceSectorKey
  description?: string | null
  is_mandatory?: boolean
  is_active?: boolean
}

export const createServiceType = (data: ServiceTypePayload) =>
  api.post<ServiceType>('/service-types', data)

export const updateServiceType = (id: string, data: ServiceTypePayload) =>
  api.patch<ServiceType>(`/service-types/${id}`, data)

// ─── Prestaciones de un niño ──────────────────────────────────────────────────

export const getChildServices = (childId: string) =>
  api.get<ChildService[]>(`/children/${childId}/services`)

// ─── Grilla general (una fila por prestación, todos los niños visibles) ──────

export interface ChildServicesGridParams {
  /** Código del período: TRIM12026 / BIM32026. */
  period?: string
  /** Nombre y/o apellido del niño. */
  search?: string
  alert?: boolean
  page?: number
  per_page?: number
}

export interface ChildServicesGridResponse extends ApiListResponse<ChildService> {
  /** Períodos con prestaciones cargadas (para el select), del más nuevo al más viejo. */
  periods: { code: string; label: string }[]
}

export const getChildServicesGrid = (params: ChildServicesGridParams = {}) =>
  api.get<ChildServicesGridResponse>('/child-services', { params })

export interface ChildServicePayload {
  service_type_id?: string
  /** Solo admin: el efector. Para una institución es siempre la propia. */
  institution_id?: string
  sector?: ServiceSectorKey | null
  year?: number
  period_type?: ServicePeriodType
  period_number?: number
  service_number?: number | null
  observations?: string | null
  has_alert?: boolean
}

export const createChildService = (childId: string, data: ChildServicePayload) =>
  api.post<ChildService>(`/children/${childId}/services`, data)

export const updateChildService = (childId: string, serviceId: string, data: ChildServicePayload) =>
  api.patch<ChildService>(`/children/${childId}/services/${serviceId}`, data)

export const deleteChildService = (childId: string, serviceId: string) =>
  api.delete(`/children/${childId}/services/${serviceId}`)

// Todas las instituciones activas para elegir el efector (el listado normal
// pagina de a 20). Ignora el ámbito global: el efector puede ser de otra localidad.
export const getAllInstitutions = () =>
  api.get<ApiListResponse<Institution>>('/institutions', { params: { per_page: 500 }, ...UNSCOPED })
