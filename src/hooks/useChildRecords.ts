import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  deleteEducationRecord,
  deleteHealthRecord,
  saveBirthRecord,
  saveDeathRecord,
  saveEducationRecord,
  saveHealthRecord,
} from '../api/records'
import { queryKeys } from '../api/queryKeys'

interface SaveRecordInput {
  exists: boolean
  data: Record<string, unknown>
}

// Los 4 registros de dominio (educación, salud, nacimiento, defunción) viven dentro
// del detalle del niño — al guardar uno, solo hace falta invalidar esa query.
function useSaveRecordMutation(
  childId: string,
  save: (childId: string, exists: boolean, data: Record<string, unknown>) => Promise<unknown>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ exists, data }: SaveRecordInput) => save(childId, exists, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.children.detail(childId) })
    },
  })
}

export const useSaveEducationRecordMutation = (childId: string) =>
  useSaveRecordMutation(childId, saveEducationRecord)

export const useSaveHealthRecordMutation = (childId: string) =>
  useSaveRecordMutation(childId, saveHealthRecord)

export const useSaveBirthRecordMutation = (childId: string) =>
  useSaveRecordMutation(childId, saveBirthRecord)

export const useSaveDeathRecordMutation = (childId: string) =>
  useSaveRecordMutation(childId, saveDeathRecord)

// Desvincular institución de un niño (solo admin) — mismo criterio de invalidación.
function useDeleteRecordMutation(childId: string, remove: (childId: string) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => remove(childId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.children.detail(childId) })
    },
  })
}

export const useDeleteEducationRecordMutation = (childId: string) =>
  useDeleteRecordMutation(childId, deleteEducationRecord)

export const useDeleteHealthRecordMutation = (childId: string) =>
  useDeleteRecordMutation(childId, deleteHealthRecord)
