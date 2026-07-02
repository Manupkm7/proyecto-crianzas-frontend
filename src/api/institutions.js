import api from './client'

// Devuelve la lista de instituciones.
// Admin y coordinador ven todas; institución/representante solo ven la propia.
export const getInstitutions = (params = {}) => api.get('/institutions', { params })
