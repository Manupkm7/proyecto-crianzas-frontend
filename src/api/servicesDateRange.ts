// Fecha de prestaciones — filtro global desde/hasta del sidebar. Las
// prestaciones se informan por período (TRIM22026, BIM32026...): el backend
// trae las que tienen un período que se SUPERPONE con el rango (ver
// App\Support\ServiceDateRange). Viaja en cada request como headers
// X-Services-From / X-Services-To (ver client.ts). Mismo patrón que localityScope.ts.

export interface ServicesDateRange {
  /** 'YYYY-MM-DD' o '' (rango abierto de ese lado). */
  from: string
  to: string
}

export const SERVICES_FROM_HEADER = 'X-Services-From'
export const SERVICES_TO_HEADER = 'X-Services-To'

export const EMPTY_SERVICES_DATE_RANGE: ServicesDateRange = { from: '', to: '' }

const STORAGE_KEY = 'services_date_range'
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function isServicesDateRangeActive(range: ServicesDateRange): boolean {
  return range.from !== '' || range.to !== ''
}

export function isServicesDateRangeValid(range: ServicesDateRange): boolean {
  return !(range.from && range.to && range.from > range.to)
}

// "15/05/2026" — fechas cortas para el chip del topbar.
function formatDate(value: string): string {
  const [y, m, d] = value.split('-')
  return `${d}/${m}/${y}`
}

export function servicesDateRangeLabel(range: ServicesDateRange): string {
  if (range.from && range.to) return `${formatDate(range.from)} – ${formatDate(range.to)}`
  if (range.from) return `desde ${formatDate(range.from)}`
  if (range.to) return `hasta ${formatDate(range.to)}`
  return ''
}

function readStored(): ServicesDateRange {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<ServicesDateRange> | null
    const range = {
      from: typeof parsed?.from === 'string' && DATE_RE.test(parsed.from) ? parsed.from : '',
      to: typeof parsed?.to === 'string' && DATE_RE.test(parsed.to) ? parsed.to : '',
    }
    return isServicesDateRangeValid(range) ? range : EMPTY_SERVICES_DATE_RANGE
  } catch {
    return EMPTY_SERVICES_DATE_RANGE
  }
}

// Valor a nivel módulo para que el interceptor de axios lo lea sin depender de React.
let current: ServicesDateRange = readStored()

export function getServicesDateRange(): ServicesDateRange {
  return current
}

// Solo actualiza el valor; ServicesDateRangeContext refresca la UI y el cache.
export function storeServicesDateRange(range: ServicesDateRange) {
  current = range
  try {
    if (isServicesDateRangeActive(range)) localStorage.setItem(STORAGE_KEY, JSON.stringify(range))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Sin storage (modo privado, etc.): el filtro dura lo que dure la pestaña.
  }
}
