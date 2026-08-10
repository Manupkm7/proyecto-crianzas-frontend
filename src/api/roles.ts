import api from './client'

export interface RoleData {
  id: number
  name: string
  is_built_in: boolean
  users_count: number
  permissions: string[]
}

export interface PermissionData {
  id: number
  name: string
  roles_count: number
  users_count: number
}

export interface UserPermissionsData {
  id: string
  name: string
  role_permissions: string[]
  direct_permissions: string[]
  all_permissions: string[]
}

// ─── Roles ───────────────────────────────────────────────────────────────────

export const getRoles = () =>
  api.get<{ data: RoleData[] }>('/roles')

export const createRole = (payload: { name: string; permissions: string[] }) =>
  api.post<{ data: RoleData }>('/roles', payload)

export const updateRolePermissions = (id: number, permissions: string[]) =>
  api.put<{ data: RoleData }>(`/roles/${id}`, { permissions })

export const deleteRole = (id: number) =>
  api.delete(`/roles/${id}`)

// ─── Permisos ─────────────────────────────────────────────────────────────────

export const getPermissions = () =>
  api.get<{ data: PermissionData[] }>('/permissions')

export const createPermission = (name: string) =>
  api.post<{ data: PermissionData }>('/permissions', { name })

export const deletePermission = (id: number) =>
  api.delete(`/permissions/${id}`)

// ─── Permisos directos de usuario ────────────────────────────────────────────

export const syncUserDirectPermissions = (userId: string, permissions: string[]) =>
  api.put<{ data: UserPermissionsData }>(`/users/${userId}/permissions`, { permissions })
