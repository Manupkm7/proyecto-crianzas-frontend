import api from './client'
import type { ApiItemResponse, ApiListResponse, ActivityLog, AuthUser } from '../types'

export interface UserPayload {
  name?: string
  email?: string
  password?: string
  role?: string
  institution_id?: string
  is_active?: boolean
}

// Devuelve la lista paginada de usuarios.
// Admin ve todos; responsable de institución ve solo sus representantes.
export const getUsers = () => api.get<ApiListResponse<AuthUser>>('/users')

// Devuelve el detalle completo de un usuario (con permisos y relaciones).
export const getUser = (id: string) => api.get<ApiItemResponse<AuthUser>>(`/users/${id}`)

// Crea un nuevo usuario. El payload incluye: name, email, password, role, institution_id.
export const createUser = (data: UserPayload) =>
  api.post<ApiItemResponse<AuthUser>>('/users', data)

// Actualiza parcialmente un usuario (PATCH). Solo se envían los campos que cambian.
export const updateUser = (id: string, data: UserPayload) =>
  api.patch<ApiItemResponse<AuthUser>>(`/users/${id}`, data)

// Desactiva (baja lógica) un usuario. No lo elimina de la base de datos.
export const deleteUser = (id: string) => api.delete(`/users/${id}`)

// Devuelve el historial de acciones que realizó un usuario (audit log).
// Solo accesible para admin, coordinador, o responsable de institución (sobre sus representantes).
export const getUserActivity = (id: string) =>
  api.get<ApiListResponse<ActivityLog> | ApiItemResponse<ActivityLog[]>>(`/users/${id}/activity`)
