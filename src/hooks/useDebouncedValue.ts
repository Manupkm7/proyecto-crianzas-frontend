import { useEffect, useState } from 'react'

// Devuelve `value` recién después de `delayMs` sin cambios — para no disparar
// un request a la API en cada tecla de un input de búsqueda.
export function useDebouncedValue<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
