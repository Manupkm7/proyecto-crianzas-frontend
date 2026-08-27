import api from './client'
import type { ChildAlertType } from '../types'

// Gestión de alertas del SAT. Marcar una alerta como "gestionada / en
// seguimiento" (se coordinó un control fuera de la plataforma) la silencia por
// un tiempo; después, si el problema persiste, vuelve a aparecer.

export const acknowledgeAlert = (childId: string, type: ChildAlertType, note: string) =>
  api.post<{ message: string }>(`/children/${childId}/alerts/${type}/acknowledge`, { note })
