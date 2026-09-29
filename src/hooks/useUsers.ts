import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createUser,
  deleteUser,
  getUser,
  getUserActivity,
  getUsers,
  updateUser,
  type UserPayload,
} from '../api/users'
import { queryKeys } from '../api/queryKeys'

interface UseUsersQueryOptions {
  enabled?: boolean
  /** false = ignora el ámbito global del sidebar (por defecto lo respeta). */
  scoped?: boolean
}

export function useUsersQuery(options: UseUsersQueryOptions = {}) {
  const scoped = options.scoped ?? true
  return useQuery({
    queryKey: scoped ? queryKeys.users.all : queryKeys.users.unscoped,
    queryFn: async () => {
      const { data } = await getUsers(scoped)
      return data.data ?? []
    },
    enabled: options.enabled ?? true,
  })
}

export function useUserQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.users.detail(id ?? ''),
    queryFn: async () => {
      const { data } = await getUser(id as string)
      return data.data
    },
    enabled: Boolean(id),
  })
}

// Historial de actividad de un usuario (audit log).
export function useUserActivityQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.users.activity(id ?? ''),
    queryFn: async () => {
      const { data } = await getUserActivity(id as string)
      return 'data' in data ? data.data : data
    },
    enabled: Boolean(id),
  })
}

export function useCreateUserMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UserPayload) => createUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
    },
  })
}

export function useUpdateUserMutation(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UserPayload) => updateUser(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(id) })
    },
  })
}

export function useDeleteUserMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
    },
  })
}
