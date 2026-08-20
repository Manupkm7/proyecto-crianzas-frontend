import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getUserImport,
  getUserImportRows,
  getUserImports,
  resolveUserImportRow,
  uploadUserImport,
} from '../api/userImports'
import { queryKeys } from '../api/queryKeys'
import type { UserImportBatch, UserImportRow } from '../types'

export function useUserImportsQuery(page = 1) {
  return useQuery({
    queryKey: [...queryKeys.userImports.all, page],
    queryFn: async () => {
      const { data } = await getUserImports({ page })
      return {
        items: data.data as UserImportBatch[],
        total: data.meta?.total ?? data.data.length,
        currentPage: data.meta?.current_page ?? 1,
        lastPage: data.meta?.last_page ?? 1,
      }
    },
  })
}

export function useUserImportQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.userImports.detail(id ?? ''),
    queryFn: async () => {
      const { data } = await getUserImport(id as string)
      return data.data as UserImportBatch
    },
    enabled: Boolean(id),
    // Refresca cada 3 segundos si el batch está procesando
    refetchInterval: (query) => {
      const batch = query.state.data as UserImportBatch | undefined
      return batch?.status === 'processing' || batch?.status === 'pending' ? 3000 : false
    },
  })
}

export function useUserImportRowsQuery(
  batchId: string | undefined,
  status?: string,
  page = 1,
) {
  return useQuery({
    queryKey: [...queryKeys.userImports.rows(batchId ?? '', status), page],
    queryFn: async () => {
      const { data } = await getUserImportRows(batchId as string, { status, page })
      return {
        items: data.data as UserImportRow[],
        total: data.meta?.total ?? data.data.length,
        currentPage: data.meta?.current_page ?? 1,
        lastPage: data.meta?.last_page ?? 1,
      }
    },
    enabled: Boolean(batchId),
  })
}

export function useUploadUserImportMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (formData: FormData) => uploadUserImport(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.userImports.all })
    },
  })
}

export function useResolveUserImportRowMutation(batchId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ rowId, action }: { rowId: string; action: 'confirm' | 'skip' }) =>
      resolveUserImportRow(batchId, rowId, { action }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.userImports.detail(batchId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.userImports.rows(batchId) })
    },
  })
}
