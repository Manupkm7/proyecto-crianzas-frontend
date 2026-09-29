// Fábrica centralizada de query keys, para mantener consistencia entre
// los hooks que leen (useQuery) y los que invalidan (useMutation).
export const queryKeys = {
  children: {
    all: ['children'] as const,
    detail: (id: string) => ['children', id] as const,
  },
  users: {
    all: ['users'] as const,
    /** Listado sin el ámbito global del sidebar (ej. RolesPage). */
    unscoped: ['users', 'unscoped'] as const,
    detail: (id: string) => ['users', id] as const,
    activity: (id: string) => ['users', id, 'activity'] as const,
  },
  institutions: {
    all: ['institutions'] as const,
    /** Listado sin el ámbito global del sidebar (desplegables de formularios). */
    unscoped: ['institutions', 'unscoped'] as const,
    detail: (id: string) => ['institutions', id] as const,
    /** Todas (sin paginar) para desplegables — ej. efector de una prestación. */
    allOptions: ['institutions', 'all-options'] as const,
  },
  programAreas: ['program-areas'] as const,
  serviceTypes: {
    all: ['service-types'] as const,
    list: (includeInactive: boolean) => ['service-types', { includeInactive }] as const,
  },
  childServices: (childId: string) => ['child-services', childId] as const,
  /** Grilla general de prestaciones (GET /child-services). */
  childServicesGrid: ['child-services-grid'] as const,
  imports: {
    all: ['imports'] as const,
    detail: (id: string) => ['imports', id] as const,
    rows: (id: string, status?: string) => ['imports', id, 'rows', status] as const,
    siblings: (id: string) => ['imports', id, 'siblings'] as const,
  },
  userImports: {
    all: ['user-imports'] as const,
    detail: (id: string) => ['user-imports', id] as const,
    rows: (id: string, status?: string) => ['user-imports', id, 'rows', status] as const,
  },
  roles: {
    all: ['roles'] as const,
  },
  permissions: {
    all: ['permissions'] as const,
  },
  geo: {
    provinces: ['geo', 'provinces'] as const,
    departments: (provinceId: string) => ['geo', 'departments', provinceId] as const,
    localities: (departmentId: string) => ['geo', 'localities', departmentId] as const,
    sectors: ['geo', 'sectors'] as const,
    institutionDirectory: (localityId: string, type: string) =>
      ['geo', 'institution-directory', localityId, type] as const,
  },
}
