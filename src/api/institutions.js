import api from './client'

// Devuelve la lista paginada de instituciones.
// Admin y coordinador ven todas; institución/representante solo ven la propia.
export const getInstitutions = (params = {}) => api.get('/institutions', { params })

// Devuelve el detalle de una institución.
export const getInstitution = (id) => api.get(`/institutions/${id}`)

// Crea una nueva institución. Solo accesible para admin.
export const createInstitution = (data) => api.post('/institutions', data)

// Actualiza una institución (PATCH parcial).
// Admin: puede cambiar nombre, tipo, dirección, teléfono, estado.
// Responsable de institución: solo puede cambiar dirección y teléfono de la suya.
export const updateInstitution = (id, data) => api.patch(`/institutions/${id}`, data)

// Desactiva una institución (baja lógica). Solo accesible para admin.
export const deleteInstitution = (id) => api.delete(`/institutions/${id}`)
