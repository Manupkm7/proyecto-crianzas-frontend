import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from './AuthContext'
import {
  EMPTY_SERVICES_DATE_RANGE,
  getServicesDateRange,
  isServicesDateRangeActive,
  storeServicesDateRange,
  type ServicesDateRange,
} from '../api/servicesDateRange'

interface ServicesDateRangeContextValue {
  /** Rango aplicado (siempre válido; from/to vacíos = abierto de ese lado). */
  range: ServicesDateRange
  setRange: (range: ServicesDateRange) => void
}

const ServicesDateRangeContext = createContext<ServicesDateRangeContextValue | null>(null)

export function ServicesDateRangeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [range, setRangeState] = useState<ServicesDateRange>(getServicesDateRange)

  const setRange = useCallback(
    (next: ServicesDateRange) => {
      const prev = getServicesDateRange()
      if (next.from === prev.from && next.to === prev.to) return
      storeServicesDateRange(next)
      setRangeState(next)
      // Igual que el ámbito: los headers no forman parte de las query keys.
      queryClient.resetQueries()
    },
    [queryClient],
  )

  // Al cerrar sesión se descarta el rango (no queda "pegado" para el próximo usuario).
  useEffect(() => {
    if (!user && isServicesDateRangeActive(getServicesDateRange())) {
      storeServicesDateRange(EMPTY_SERVICES_DATE_RANGE)
      setRangeState(EMPTY_SERVICES_DATE_RANGE)
    }
  }, [user])

  return (
    <ServicesDateRangeContext.Provider value={{ range, setRange }}>
      {children}
    </ServicesDateRangeContext.Provider>
  )
}

// const { range, setRange } = useServicesDateRange()
export function useServicesDateRange() {
  const ctx = useContext(ServicesDateRangeContext)
  if (!ctx) throw new Error('useServicesDateRange debe usarse dentro de <ServicesDateRangeProvider>')
  return ctx
}
