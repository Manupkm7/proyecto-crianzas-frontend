import axios from 'axios'
import { getLocalityScope, LOCALITY_SCOPE_HEADER } from './localityScope'

// Instancia de axios preconfigurada para hablar con el backend Laravel.
// Todos los requests de la aplicación pasan por aquí.
const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

// Antes de cada request: agrega el token de autenticación si existe en localStorage.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  // Ámbito global del sidebar (ver localityScope.ts). No pisa un valor puesto
  // a mano en el request (UNSCOPED, para los desplegables de formularios).
  const scope = getLocalityScope()
  if (scope && config.headers[LOCALITY_SCOPE_HEADER] === undefined) {
    config.headers[LOCALITY_SCOPE_HEADER] = scope
  }
  return config
})

// Después de cada response: si el servidor devuelve 401 (no autenticado),
// borra el token y redirige al login.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
