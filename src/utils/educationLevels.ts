import type { EducationLevel, Institution } from '../types'

// Espejo en el frontend de Institution::educationLevelDefinitions() / EducationRecord::gradeLabel()
// del backend — se usa para armar los selects de nivel/grado sin pedirle nada al servidor.
const JARDIN_MAX_GRADE = 5

export interface EducationLevelDefinition {
  level: EducationLevel
  label: string
  maxGrade: number
}

export function getEducationLevelDefinitions(
  institution: Pick<
    Institution,
    'offers_jardin' | 'offers_primario' | 'primario_years' | 'offers_secundario' | 'secundario_years'
  > | null | undefined,
): EducationLevelDefinition[] {
  if (!institution) return []

  const levels: EducationLevelDefinition[] = []
  if (institution.offers_jardin) {
    levels.push({ level: 'jardin', label: 'Jardín maternal e infantil', maxGrade: JARDIN_MAX_GRADE })
  }
  if (institution.offers_primario && institution.primario_years) {
    levels.push({ level: 'primario', label: 'Primario', maxGrade: institution.primario_years })
  }
  if (institution.offers_secundario && institution.secundario_years) {
    levels.push({ level: 'secundario', label: 'Secundario', maxGrade: institution.secundario_years })
  }
  return levels
}

export function gradeOrdinal(grade: number): string {
  switch (grade) {
    case 1: return '1er'
    case 2: return '2do'
    case 3: return '3er'
    case 4: return '4to'
    case 5: return '5to'
    case 6: return '6to'
    case 7: return '7mo'
    default: return `${grade}º`
  }
}

export function gradeLabel(level: EducationLevel, grade: number): string {
  switch (level) {
    case 'jardin': return `Sala de ${grade}`
    case 'primario': return `${gradeOrdinal(grade)} grado`
    case 'secundario': return `${gradeOrdinal(grade)} año`
    default: return String(grade)
  }
}

export function levelLabel(level: EducationLevel): string {
  switch (level) {
    case 'jardin': return 'Jardín'
    case 'primario': return 'Primario'
    case 'secundario': return 'Secundario'
    default: return level
  }
}
