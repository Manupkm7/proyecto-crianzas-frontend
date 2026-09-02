export type Role = 'admin' | 'coordinador' | 'institucion' | 'representante'

export type InstitutionType = 'salud' | 'educacion' | 'desarrollo_social' | 'justicia' | 'otro'

export interface Institution {
  id: string
  name: string
  type: InstitutionType
  type_label?: string
  address?: string | null
  phone?: string | null
  /** Jurisdicción — se expone aplanada (no anidada), ver InstitutionResource. */
  locality_id?: string | null
  locality?: Locality | null
  department?: Department | null
  province?: Province | null
  is_active: boolean
  users_count?: number
  /** Configuración de niveles educativos — solo relevante cuando type === 'educacion'. */
  offers_jardin?: boolean
  offers_primario?: boolean
  primario_years?: number | null
  offers_secundario?: boolean
  secundario_years?: number | null
}

export type EducationLevel = 'jardin' | 'primario' | 'secundario'

export interface AuthUser {
  id: string
  name: string
  /** Ausente cuando el actor autenticado es una Institution (login institucional). */
  email?: string
  /** DNI de la persona (8 dígitos) — con el que puede iniciar sesión como alternativa al email. */
  dni?: string | null
  roles: Role[]
  institution?: (Institution & { type_label?: string }) | null
  is_active?: boolean
  /** Todos los permisos efectivos (rol + directos). Solo presente en users.show / me. */
  permissions?: string[]
  /** Permisos asignados explícitamente al usuario (sin los heredados del rol). Solo en users.show / me. */
  direct_permissions?: string[]
  /** true si el actor autenticado es la propia Institution (login institucional), no un User. */
  is_institution_actor?: boolean
  /** Solo para actores Institution: el admin reseteó la clave y todavía usa la aleatoria. */
  password_must_change?: boolean
}

// ─── Login institucional (provincia → departamento → localidad → sector → institución) ──

export interface Province {
  id: string
  name: string
}

export interface Department {
  id: string
  name: string
}

export interface Locality {
  id: string
  name: string
}

export interface Sector {
  value: InstitutionType
  label: string
}

/** Fila del desplegable público de instituciones (id/name/type solamente, ver InstitutionDirectoryResource). */
export interface InstitutionDirectoryEntry {
  id: string
  name: string
  type: InstitutionType
}

export interface EducationRecord {
  id?: string
  child_id?: string
  school_name: string
  grade_or_year?: string | null
  level?: EducationLevel | null
  level_label?: string | null
  grade?: number | null
  grade_label?: string | null
  absences_count: number
  attendance_present_days?: number | null
  attendance_total_days?: number | null
  attendance_period_label?: string | null
  is_enrolled: boolean
  observations?: string | null
  institution?: { id: string; name: string } | null
}

/** Una entrada de la bitácora de observaciones de un registro educativo. */
export interface EducationObservation {
  id: string
  body: string
  author_name?: string | null
  has_attachment: boolean
  attachment_name?: string | null
  attachment_url?: string | null
  created_at: string
}

/**
 * Reporte bimestral del registro educativo. El registro (EducationRecord) es la
 * foto vigente; estos son el histórico, uno por año + bimestre.
 */
export interface EducationPeriodReport {
  id: string
  year: number
  bimester: number
  level?: EducationLevel | null
  level_label?: string | null
  grade?: number | null
  grade_label?: string | null
  is_enrolled: boolean
  absences_count?: number | null
  present_days?: number | null
  total_days?: number | null
  summary?: string | null
  created_at?: string
  updated_at?: string
}

export interface EducationDashboardGrade {
  grade: number
  label: string
  count: number
  alerts_count: number
}

export interface EducationDashboardLevel {
  level: EducationLevel
  label: string
  grades: EducationDashboardGrade[]
}

export interface EducationDashboardSummary {
  institution: { id: string; name: string }
  levels: EducationDashboardLevel[]
  unassigned_count: number
  total: number
}

export interface HealthRecord {
  id?: string
  health_center_name: string
  healthy_checkup_current: boolean | null
  vaccines_current: boolean | null
  last_checkup_date?: string | null
  observations?: string | null
  health_profile?: string | null
  institution?: { id: string; name: string } | null
}

/**
 * Reporte bimestral del registro de salud. El registro (HealthRecord) es la
 * foto vigente; estos son el histórico, uno por año + bimestre.
 */
export interface HealthPeriodReport {
  id: string
  year: number
  bimester: number
  healthy_checkup_current?: boolean | null
  vaccines_current?: boolean | null
  last_checkup_date?: string | null
  weight_kg?: string | number | null
  height_cm?: string | number | null
  summary?: string | null
  created_at?: string
  updated_at?: string
}

/** Una entrada de la bitácora de observaciones de un registro de salud. */
export interface HealthObservation {
  id: string
  body: string
  author_name?: string | null
  has_attachment: boolean
  attachment_name?: string | null
  attachment_url?: string | null
  created_at: string
}

/**
 * Registro de nacimiento — solo visible para admin/coordinador (BirthRecordPolicy).
 * Mayormente generado por importación masiva; la carga/edición manual es exclusiva de admin.
 */
export interface BirthRecord {
  id: string
  first_name: string
  last_name: string
  birth_date: string
  mother_name?: string | null
  mother_dni?: string | null
  father_name?: string | null
  father_dni?: string | null
  address?: string | null
  birth_establishment?: string | null
  observations?: string | null
  institution?: { id: string; name: string } | null
}

/**
 * Registro de defunción — solo visible para admin/coordinador (DeathRecordPolicy).
 * cause_of_death es el dato más sensible del sistema.
 */
export interface DeathRecord {
  id: string
  first_name: string
  last_name: string
  birth_date: string
  death_date: string
  child_dni?: string | null
  mother_dni: string
  cause_of_death?: string | null
  observations?: string | null
  institution?: { id: string; name: string } | null
}

export type ChildAlertType =
  | 'no_escolarizado'
  | 'inasistencias_elevadas'
  | 'control_atrasado'
  | 'vacunas_atrasadas'

/** Datos de una gestión de alerta ("en seguimiento"). */
export interface ChildAlertManagement {
  note: string
  by?: string | null
  acknowledged_at?: string
  expires_at?: string
}

export interface ChildAlertHistoryEntry extends ChildAlertManagement {
  active: boolean
}

/**
 * Alerta del SAT calculada por el backend (ver ChildAlertEvaluator). Salta si la
 * foto vigente O el último bimestre informado marcan el problema.
 */
export interface ChildAlert {
  type: ChildAlertType
  sector: 'educacion' | 'salud'
  label: string
  /** Dónde se detecta ahora mismo: 'record' (foto vigente) y/o 'period' (último bimestre). */
  sources: ('record' | 'period')[]
  /** Período "AAAA-B" del último bimestre, si es una de las fuentes. */
  period?: string | null
  status: 'pending' | 'managed'
  /** Gestión vigente, si status === 'managed'. */
  management?: ChildAlertManagement | null
  /** Historial de gestiones de este (niño, tipo), de la más reciente a la más vieja. */
  history?: ChildAlertHistoryEntry[]
}

export interface Child {
  id: string
  first_name: string
  last_name: string
  birth_date: string
  /** true si birth_date es un placeholder (1/1/2000) puesto por una importación que no traía el dato real. */
  birth_date_is_placeholder?: boolean
  age?: number
  dni?: string | null
  notes?: string | null
  education_record?: EducationRecord | null
  health_record?: HealthRecord | null
  birth_record?: BirthRecord | null
  death_record?: DeathRecord | null
  /** Alertas del SAT calculadas por el backend, cada una con su estado de gestión. */
  alerts?: ChildAlert[]
  /** true si hay al menos una alerta PENDIENTE (las gestionadas no cuentan). */
  has_alert?: boolean
  /** Solo en el detalle: hay alerta pendiente en el otro sector, sin revelar el detalle (ver ChildController::show). */
  other_sector_alert?: boolean
}

export interface ActivityLog {
  id: string
  created_at: string
  action: string
  action_label?: string
  model_type?: string
  model_label?: string
  changes?: {
    old?: Record<string, unknown>
    attributes?: Record<string, unknown>
  } | null
}

export interface PaginationMeta {
  current_page?: number
  last_page?: number
  per_page?: number
  total?: number
}

/** Envoltorio típico de una colección paginada del backend Laravel. */
export interface ApiListResponse<T> {
  data: T[]
  links?: Record<string, unknown>
  meta?: PaginationMeta
  /** Solo presente en /children: total de niños que tienen alguna alerta (ver ChildResource). */
  alerts_count?: number
}

/** Envoltorio típico de un recurso individual del backend Laravel. */
export interface ApiItemResponse<T> {
  data: T
}

/** Forma habitual del body de error del backend (mensajes y errores de validación 422). */
export interface ApiErrorBody {
  message?: string
  errors?: Record<string, string[]>
  child?: Child
}

// ─── Importaciones masivas ────────────────────────────────────────────────────

export type ImportSource = 'civil_registry' | 'education' | 'health'
export type ImportBatchStatus = 'pending' | 'processing' | 'completed' | 'failed'
export type ImportRowStatus =
  | 'pending'
  | 'matched'
  | 'partial_match'
  | 'no_match'
  | 'manual_resolved'
  | 'skipped'
  | 'error'

export interface ImportBatch {
  id: string
  source: ImportSource
  source_label: string
  status: ImportBatchStatus
  original_filename: string
  sheet_name?: string | null
  /** Compartido entre todos los batches del mismo archivo subido — para agruparlos. */
  storage_path: string
  rows: {
    total: number
    matched: number
    partial: number
    no_match: number
    resolved: number
    skipped: number
    errors: number
    pending_review: number
  }
  institution?: { id: string; name: string } | null
  error_message?: string | null
  started_at?: string | null
  finished_at?: string | null
  created_at: string
}

export interface ImportSheetPreview {
  sheet_name: string | null
}

export interface ImportPreviewResponse {
  storage_path: string
  original_filename: string
  sheets: ImportSheetPreview[]
}

export interface ImportSheetAssignment {
  sheet_name: string | null
  source: ImportSource
  institution_id?: string | null
}

export interface ImportRowMatch {
  id: string
  first_name?: string | null
  last_name?: string | null
  name_fallback?: string | null
  birth_date?: string | null
  dni?: string | null
  school_name?: string | null
  mother_name?: string | null
  father_name?: string | null
  match_confidence?: number | null
}

export interface SuggestedChild {
  id: string
  first_name?: string | null
  last_name?: string | null
  birth_date?: string | null
  birth_date_is_placeholder?: boolean
  dni?: string | null
}

/** Correcciones que el operador tipea a mano antes de confirmar una fila (ver ReviewCard). */
export interface ImportRowOverrides {
  first_name?: string | null
  last_name?: string | null
  dni?: string | null
  birth_date?: string | null
  mother_name?: string | null
  mother_dni?: string | null
  father_name?: string | null
  father_dni?: string | null
  address?: string | null
  birth_establishment?: string | null
  school_name?: string | null
  grade_or_year?: string | null
  health_center_name?: string | null
  healthy_checkup_current?: boolean | null
  vaccines_current?: boolean | null
  last_checkup_date?: string | null
  observations?: string | null
}

export interface ImportRow {
  id: string
  status: ImportRowStatus
  source?: ImportSource
  source_label?: string
  first_name?: string | null
  last_name?: string | null
  name_fallback?: string | null
  birth_date?: string | null
  dni?: string | null
  mother_name?: string | null
  mother_dni?: string | null
  father_name?: string | null
  father_dni?: string | null
  address?: string | null
  school_name?: string | null
  grade_or_year?: string | null
  birth_establishment?: string | null
  health_center_name?: string | null
  healthy_checkup_current?: boolean | null
  vaccines_current?: boolean | null
  last_checkup_date?: string | null
  observations?: string | null
  raw_columns?: Record<string, string | number | null>
  match_confidence?: number | null
  match_notes?: string | null
  file_line_number?: number | null
  matched_row?: ImportRowMatch | null
  suggested_child?: SuggestedChild | null
  child?: Child | null
  resolved_by?: { user_id: string; resolved_at: string } | null
  error_message?: string | null
}

/** Body de PATCH /imports/{batch}/rows/{row}/resolve (ver ImportController::resolveRow). */
export interface ResolveRowResponse {
  message: string
  row: ImportRow
}

// ─── Carga masiva de usuarios (institución / representante) ──────────────────

export type UserImportBatchStatus = 'pending' | 'processing' | 'completed' | 'failed'
export type UserImportRowStatus = 'pending' | 'created' | 'needs_review' | 'skipped' | 'error'
export type UserImportReviewReason =
  | 'duplicate_dni_existing'
  | 'duplicate_dni_in_file'
  | 'invalid_dni'
  | 'missing_name'
  | 'invalid_role'
  | 'institution_head_conflict'

export interface UserImportBatch {
  id: string
  status: UserImportBatchStatus
  original_filename: string
  rows: {
    total: number
    created: number
    needs_review: number
    skipped: number
    errors: number
  }
  institution?: { id: string; name: string } | null
  uploaded_by?: { id: string; name: string } | null
  error_message?: string | null
  started_at?: string | null
  finished_at?: string | null
  created_at: string
}

export interface UserImportRow {
  id: string
  status: UserImportRowStatus
  first_name?: string | null
  last_name?: string | null
  dni?: string | null
  role?: 'institucion' | 'representante' | null
  review_reason?: UserImportReviewReason | null
  notes?: string | null
  file_line_number?: number | null
  created_user?: { id: string; name: string; email: string } | null
  resolved_by?: { user_id: string; resolved_at: string } | null
  error_message?: string | null
}
