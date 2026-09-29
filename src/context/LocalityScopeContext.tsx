import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from './AuthContext'
import { getLocalityScope, storeLocalityScope, type LocalityScope } from '../api/localityScope'

interface LocalityScopeContextValue {
  /** Ámbito activo ('' = todas las localidades). */
  scope: LocalityScope
  setScope: (scope: LocalityScope) => void
  /** Solo admin/coordinador eligen ámbito; el resto ya está acotado a su institución. */
  canChoose: boolean
}

const LocalityScopeContext = createContext<LocalityScopeContextValue | null>(null)

export function LocalityScopeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [scope, setScopeState] = useState<LocalityScope>(getLocalityScope)

  const role = user?.roles?.[0]
  const canChoose = role === 'admin' || role === 'coordinador'

  const setScope = useCallback(
    (next: LocalityScope) => {
      if (next === getLocalityScope()) return
      storeLocalityScope(next)
      setScopeState(next)
      // El ámbito no forma parte de las query keys: sin esto se verían datos
      // cacheados de la localidad anterior. reset (no invalidate) para que la UI
      // muestre "cargando" en vez de los datos viejos mientras refetchea.
      queryClient.resetQueries()
    },
    [queryClient],
  )

  // Al cerrar sesión o entrar con un rol que no elige ámbito, se descarta el
  // guardado (el backend igual lo ignoraría, pero así no queda "pegado").
  useEffect(() => {
    if (!canChoose && getLocalityScope() !== '') {
      storeLocalityScope('')
      setScopeState('')
    }
  }, [canChoose])

  return (
    <LocalityScopeContext.Provider value={{ scope: canChoose ? scope : '', setScope, canChoose }}>
      {children}
    </LocalityScopeContext.Provider>
  )
}

// const { scope, setScope, canChoose } = useLocalityScope()
export function useLocalityScope() {
  const ctx = useContext(LocalityScopeContext)
  if (!ctx) throw new Error('useLocalityScope debe usarse dentro de <LocalityScopeProvider>')
  return ctx
}
