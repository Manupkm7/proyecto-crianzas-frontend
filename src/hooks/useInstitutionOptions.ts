import { useInstitutionsQuery } from './useInstitutions'
import type { InstitutionType } from '../types'

// Instituciones activas de un tipo dado — usado para que el admin elija
// a qué institución pertenece un registro nuevo (no tiene institución propia).
export function useInstitutionOptions(type: InstitutionType, enabled: boolean) {
  const { data: institutions = [] } = useInstitutionsQuery({ enabled })
  return institutions.filter((i) => i.type === type && i.is_active)
}
