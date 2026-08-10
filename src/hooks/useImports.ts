import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getImport,
  getImportRows,
  getImports,
  resolveImportRow,
  uploadImport,
} from '../api/imports'
import { queryKeys } from '../api/queryKeys'
import type { ImportBatch, ImportRow } from '../types'

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

export function useUploadImportMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (formData: FormData) => uploadImport(formData),
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
    }: {
      rowId: string
      action: 'confirm' | 'skip'
      childId?: string
    }) => resolveImportRow(batchId, rowId, { action, child_id: childId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.imports.detail(batchId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.imports.rows(batchId) })
    },
  })
}
