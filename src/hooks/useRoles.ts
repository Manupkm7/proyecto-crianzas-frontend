import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createPermission,
  createRole,
  deletePermission,
  deleteRole,
  getPermissions,
  getRoles,
  syncUserDirectPermissions,
  updateRolePermissions,
  type PermissionData,
  type RoleData,
} from '../api/roles'
import { queryKeys } from '../api/queryKeys'

// ─── Roles ───────────────────────────────────────────────────────────────────

export function useRolesQuery() {
  return useQuery({
    queryKey: queryKeys.roles.all,
    queryFn: async (): Promise<RoleData[]> => {
      const { data } = await getRoles()
      return data.data
    },
  })
}

export function useCreateRoleMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { name: string; permissions: string[] }) => createRole(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.all })
    },
  })
}

export function useUpdateRolePermissionsMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, permissions }: { id: number; permissions: string[] }) =>
      updateRolePermissions(id, permissions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.all })
    },
  })
}

export function useDeleteRoleMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.all })
    },
  })
}

// ─── Permisos ─────────────────────────────────────────────────────────────────

export function usePermissionsQuery() {
  return useQuery({
    queryKey: queryKeys.permissions.all,
    queryFn: async (): Promise<PermissionData[]> => {
      const { data } = await getPermissions()
      return data.data
    },
  })
}

export function useCreatePermissionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => createPermission(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.permissions.all })
    },
  })
}

export function useDeletePermissionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deletePermission(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.permissions.all })
      // Los roles también cambian si un permiso desaparece
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.all })
    },
  })
}

// ─── Permisos directos de usuario ────────────────────────────────────────────

export function useSyncUserPermissionsMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, permissions }: { userId: string; permissions: string[] }) =>
      syncUserDirectPermissions(userId, permissions),
    onSuccess: (_data, { userId }) => {
      // Invalida el detalle del usuario para que reflejen los nuevos permisos
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(userId) })
    },
  })
}
