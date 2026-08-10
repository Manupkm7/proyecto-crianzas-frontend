import { useAuth } from '../context/AuthContext'
import type { Role } from '../types'

/**
 * Hook centralizado de permisos.
 * Evita repetir `const role = user?.roles?.[0]; const isAdmin = ...` en cada página.
 * Agrega la capa `can.*` para decisiones de UI sin hardcodear roles en cada componente.
 */
export function useRole() {
  const { user } = useAuth()
  const role = user?.roles?.[0] as Role | undefined
  const isAdmin = role === 'admin'
  const isCoordinador = role === 'coordinador'
  const isInstitucion = role === 'institucion'
  const isRepresentante = role === 'representante'
  const institutionType = user?.institution?.type
  const isEduInstitution = institutionType === 'educacion'
  const isSaludInstitution = institutionType === 'salud'
  const isInstitutionalUser = isInstitucion || isRepresentante

  return {
    role,
    isAdmin,
    isCoordinador,
    isInstitucion,
    isRepresentante,
    isInstitutionalUser,
    institutionType,
    isEduInstitution,
    isSaludInstitution,
    can: {
      // Niños
      createChildren: !isCoordinador,
      editChildren: isAdmin,
      deleteChildren: isAdmin,
      // Registros sensibles (nacimiento / defunción)
      viewBirthDeathRecords: isAdmin || isCoordinador,
      editBirthDeathRecords: isAdmin,
      // Registros de sector
      editEducationRecords: isAdmin || isEduInstitution,
      editHealthRecords: isAdmin || isSaludInstitution,
      // Instituciones
      viewAllInstitutions: isAdmin || isCoordinador || isInstitucion,
      createInstitutions: isAdmin,
      // Usuarios
      viewAllUsers: isAdmin || isCoordinador,
      createUsers: isAdmin || isInstitucion,
      viewUserActivity: isAdmin || isInstitucion,
      // Importaciones masivas
      manageImports: isAdmin,
    },
  }
}
