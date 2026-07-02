import api from './client'

// Devuelve la lista paginada de usuarios.
// Admin ve todos; responsable de institución ve solo sus representantes.
export const getUsers = () => api.get('/users')

// Devuelve el detalle completo de un usuario (con permisos y relaciones).
export const getUser = (id) => api.get(`/users/${id}`)

// Crea un nuevo usuario. El payload incluye: name, email, password, role, institution_id.
export const createUser = (data) => api.post('/users', data)

// Actualiza parcialmente un usuario (PATCH). Solo se envían los campos que cambian.
export const updateUser = (id, data) => api.patch(`/users/${id}`, data)

// Desactiva (baja lógica) un usuario. No lo elimina de la base de datos.
export const deleteUser = (id) => api.delete(`/users/${id}`)

// Devuelve el historial de acciones que realizó un usuario (audit log).
// Solo accesible para admin, coordinador, o responsable de institución (sobre sus representantes).
export const getUserActivity = (id) => api.get(`/users/${id}/activity`)
