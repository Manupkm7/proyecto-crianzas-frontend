import api from './client'
import type {
  ApiListResponse,
  Department,
  InstitutionDirectoryEntry,
  InstitutionType,
  Locality,
  Province,
  Sector,
} from '../types'

// Catálogo geográfico y desplegable de instituciones para el login institucional
// (provincia → departamento → localidad → sector → institución). Endpoints públicos,
// no requieren sesión — ver GeoController / InstitutionDirectoryController en el backend.

export const getProvinces = () => api.get<ApiListResponse<Province>>('/geo/provinces')

export const getDepartments = (provinceId: string) =>
  api.get<ApiListResponse<Department>>(`/geo/provinces/${provinceId}/departments`)

export const getLocalities = (departmentId: string) =>
  api.get<ApiListResponse<Locality>>(`/geo/departments/${departmentId}/localities`)

export const getSectors = () => api.get<ApiListResponse<Sector>>('/geo/sectors')

export const getInstitutionDirectory = (localityId: string, type: InstitutionType) =>
  api.get<ApiListResponse<InstitutionDirectoryEntry>>('/institutions/directory', {
    params: { locality_id: localityId, type },
  })
