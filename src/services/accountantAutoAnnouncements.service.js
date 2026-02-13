import api from './api'

const accountantAutoAnnouncementsService = {
  getAll: async (params = {}) => {
    const response = await api.get('/accountant-auto-announcements', { params })
    return response
  },

  getById: async (id) => {
    const response = await api.get(`/accountant-auto-announcements/${id}`)
    return response.data
  },

  create: async (data) => {
    const response = await api.post('/accountant-auto-announcements', data)
    return response
  },

  update: async (id, data) => {
    const response = await api.put(`/accountant-auto-announcements/${id}`, data)
    return response.data
  },

  delete: async (id) => {
    const response = await api.delete(`/accountant-auto-announcements/${id}`)
    return response.data
  },

  toggle: async (id) => {
    const response = await api.patch(`/accountant-auto-announcements/${id}/toggle`)
    return response.data
  }
}

export default accountantAutoAnnouncementsService
