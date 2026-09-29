// Ámbito global por localidad — el admin/coordinador lo elige desde el sidebar
// y acota los listados de toda la plataforma (niños, prestaciones, efectores,
// usuarios). Viaja en cada request como header X-Locality-Scope (ver client.ts);
// el backend lo resuelve en App\Support\LocalityScope y lo ignora para
// cualquier otro rol. Es una lente de vista, no un control de acceso.

export type LocalityScope = '' | 'san_justo' | 'uriburu'

export const LOCALITY_SCOPE_HEADER = 'X-Locality-Scope'

export const LOCALITY_SCOPE_OPTIONS: { value: LocalityScope; label: string; short: string }[] = [
  { value: '', label: 'Todas las localidades', short: 'Todas' },
  { value: 'san_justo', label: 'San Justo (Santa Fe)', short: 'San Justo' },
  { value: 'uriburu', label: 'Uriburu (La Pampa)', short: 'Uriburu' },
]

export function localityScopeLabel(scope: LocalityScope): string {
  return LOCALITY_SCOPE_OPTIONS.find((o) => o.value === scope)?.label ?? ''
}

const STORAGE_KEY = 'locality_scope'

function readStored(): LocalityScope {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return LOCALITY_SCOPE_OPTIONS.some((o) => o.value === value) ? (value as LocalityScope) : ''
  } catch {
    return ''
  }
}

// Valor a nivel módulo para que el interceptor de axios lo lea sin depender de React.
let current: LocalityScope = readStored()

export function getLocalityScope(): LocalityScope {
  return current
}

// Solo actualiza el valor; LocalityScopeContext se encarga de refrescar la UI y el cache.
export function storeLocalityScope(scope: LocalityScope) {
  current = scope
  try {
    if (scope) localStorage.setItem(STORAGE_KEY, scope)
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Sin storage (modo privado, etc.): el ámbito dura lo que dure la pestaña.
  }
}

// Config de axios para requests que deben ver TODO el sistema aunque haya un
// ámbito activo — ej. desplegables de formularios (institución de un usuario,
// efector de una prestación): filtrarlos dejaría vacío el select al editar un
// registro de otra localidad. El backend ignora cualquier valor desconocido.
export const UNSCOPED = { headers: { [LOCALITY_SCOPE_HEADER]: 'none' } }
