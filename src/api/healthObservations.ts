import api from './client'
import type { HealthObservation } from '../types'

export const getHealthObservations = (childId: string) =>
  api.get<HealthObservation[]>(`/children/${childId}/health-record/observations`)

export interface CreateHealthObservationInput {
  body: string
  attachment?: File | null
}

export const createHealthObservation = (childId: string, input: CreateHealthObservationInput) => {
  const formData = new FormData()
  formData.append('body', input.body)
  if (input.attachment) {
    formData.append('attachment', input.attachment)
  }
  return api.post<HealthObservation>(
    `/children/${childId}/health-record/observations`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
}

/**
 * Descarga el adjunto (PDF) de una observación. responseType 'blob' porque el
 * endpoint requiere el token de Sanctum en el header Authorization (no en
 * cookies) — no se puede navegar directo con un <a href> a la URL del backend,
 * el navegador nunca mandaría el token y la petición se cae.
 */
export const getHealthObservationAttachment = (observationId: string) =>
  api.get<Blob>(`/health-observations/${observationId}/attachment`, {
    responseType: 'blob',
  })
