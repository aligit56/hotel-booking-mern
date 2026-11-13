import axios from 'axios'

const apiBaseUrl = import.meta.env.VITE_API_URL
  || `${window.location.protocol}//${window.location.hostname}:5000/api`

const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  config.withCredentials = true
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error),
)

export default api
