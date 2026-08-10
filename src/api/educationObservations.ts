import api from './client'
import type { EducationObservation } from '../types'

// Bitácora de observaciones del registro educativo de un niño (texto + PDF opcional).
export const getEducationObservations = (childId: string) =>
  api.get<EducationObservation[]>(`/children/${childId}/education-record/observations`)

export interface CreateEducationObservationInput {
  body: string
  attachment?: File | null
}

export const createEducationObservation = (childId: string, input: CreateEducationObservationInput) => {
  const formData = new FormData()
  formData.append('body', input.body)
  if (input.attachment) {
    formData.append('attachment', input.attachment)
  }
  return api.post<EducationObservation>(
    `/children/${childId}/education-record/observations`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
}
