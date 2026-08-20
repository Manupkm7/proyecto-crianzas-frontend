import { useQuery } from '@tanstack/react-query'
import { getDepartments, getInstitutionDirectory, getLocalities, getProvinces, getSectors } from '../api/geo'
import { queryKeys } from '../api/queryKeys'
import type { InstitutionType } from '../types'

// Catálogo geográfico en cascada para el login institucional. Cada nivel solo
// se habilita (enabled) cuando el nivel padre ya fue elegido.

export function useProvincesQuery() {
  return useQuery({
    queryKey: queryKeys.geo.provinces,
    queryFn: async () => {
      const { data } = await getProvinces()
      return data.data ?? []
    },
    staleTime: Infinity, // catálogo estático
  })
}

export function useDepartmentsQuery(provinceId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.geo.departments(provinceId ?? ''),
    queryFn: async () => {
      const { data } = await getDepartments(provinceId as string)
      return data.data ?? []
    },
    enabled: Boolean(provinceId),
    staleTime: Infinity,
  })
}

export function useLocalitiesQuery(departmentId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.geo.localities(departmentId ?? ''),
    queryFn: async () => {
      const { data } = await getLocalities(departmentId as string)
      return data.data ?? []
    },
    enabled: Boolean(departmentId),
    staleTime: Infinity,
  })
}

export function useSectorsQuery() {
  return useQuery({
    queryKey: queryKeys.geo.sectors,
    queryFn: async () => {
      const { data } = await getSectors()
      return data.data ?? []
    },
    staleTime: Infinity,
  })
}

export function useInstitutionDirectoryQuery(
  localityId: string | undefined,
  type: InstitutionType | undefined,
) {
  return useQuery({
    queryKey: queryKeys.geo.institutionDirectory(localityId ?? '', type ?? ''),
    queryFn: async () => {
      const { data } = await getInstitutionDirectory(localityId as string, type as InstitutionType)
      return data.data ?? []
    },
    enabled: Boolean(localityId && type),
  })
}
