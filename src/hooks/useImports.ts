import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  bulkResolveNoMatch,
  getImport,
  getImportRows,
  getImports,
  getImportSiblings,
  previewImport,
  rematchImportBatch,
  resolveImportRow,
  submitImportSheets,
} from '../api/imports'
import { queryKeys } from '../api/queryKeys'
import type { ImportBatch, ImportRow, ImportSheetAssignment } from '../types'

export function useImportsQuery(page = 1) {
  return useQuery({
    queryKey: [...queryKeys.imports.all, page],
    queryFn: async () => {
      const { data } = await getImports({ page })
      return {
        items: data.data as ImportBatch[],
        total: data.meta?.total ?? data.data.length,
        currentPage: data.meta?.current_page ?? 1,
        lastPage: data.meta?.last_page ?? 1,
      }
    },
  })
}

export function useImportQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.imports.detail(id ?? ''),
    queryFn: async () => {
      const { data } = await getImport(id as string)
      return data.data as ImportBatch
    },
    enabled: Boolean(id),
    // Refresca cada 3 segundos si el batch está procesando
    refetchInterval: (query) => {
      const batch = query.state.data as ImportBatch | undefined
      return batch?.status === 'processing' || batch?.status === 'pending' ? 3000 : false
    },
  })
}

export function useImportRowsQuery(
  batchId: string | undefined,
  status?: string,
  page = 1,
) {
  return useQuery({
    queryKey: [...queryKeys.imports.rows(batchId ?? '', status), page],
    queryFn: async () => {
      const { data } = await getImportRows(batchId as string, { status, page })
      return {
        items: data.data as ImportRow[],
        total: data.meta?.total ?? data.data.length,
        currentPage: data.meta?.current_page ?? 1,
        lastPage: data.meta?.last_page ?? 1,
      }
    },
    enabled: Boolean(batchId),
  })
}

/** Paso 1: sube el archivo y devuelve sus hojas detectadas para armar la asignación por hoja. */
export function usePreviewImportMutation() {
  return useMutation({
    mutationFn: (formData: FormData) => previewImport(formData),
  })
}

/** Paso 2: crea un batch por cada hoja asignada (fuente + institución). */
export function useSubmitImportSheetsMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { storage_path: string; original_filename: string; sheets: ImportSheetAssignment[] }) =>
      submitImportSheets(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.imports.all })
    },
  })
}

export function useResolveRowMutation(batchId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      rowId,
      action,
      childId,
      dataSource,
    }: {
      rowId: string
      action: 'confirm' | 'skip'
      childId?: string
      dataSource?: 'row' | 'matched_row'
    }) => resolveImportRow(batchId, rowId, { action, child_id: childId, data_source: dataSource }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.imports.detail(batchId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.imports.rows(batchId) })
    },
  })
}

/** Crea un niño nuevo por cada fila 'no_match' del lote de una sola vez. */
export function useBulkResolveNoMatchMutation(batchId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => bulkResolveNoMatch(batchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.imports.detail(batchId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.imports.rows(batchId) })
    },
  })
}

/** Otras hojas del mismo archivo subido, para el selector de comparación manual. */
export function useImportSiblingsQuery(batchId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.imports.siblings(batchId ?? ''),
    queryFn: async () => {
      const { data } = await getImportSiblings(batchId as string)
      return data.data as ImportBatch[]
    },
    enabled: Boolean(batchId),
  })
}

/** Recompara las filas sin resolver del batch contra una hoja elegida a mano. */
export function useRematchBatchMutation(batchId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (againstBatchId: string) => rematchImportBatch(batchId, againstBatchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.imports.detail(batchId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.imports.rows(batchId) })
    },
  })
}
