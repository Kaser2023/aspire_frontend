import api from './api'

const automaticAnnouncementsService = {
  // Get all automatic announcements
  getAll: async (params = {}) => {
    try {
      console.log('🔍 Fetching auto announcements from API:', params);
      const response = await api.get('/automatic-announcements', { params })
      console.log('📥 Auto announcements API response:', response);
      // Return the full response object, not just response.data
      return response
    } catch (error) {
      console.error('❌ Error fetching auto announcements:', error);
      throw error;
    }
  },

  // Get automatic announcement by ID
  getById: async (id) => {
    try {
      console.log('🔍 Fetching auto announcement by ID:', id);
      const response = await api.get(`/automatic-announcements/${id}`)
      console.log('📥 Auto announcement by ID response:', response);
      return response.data
    } catch (error) {
      console.error('❌ Error fetching auto announcement by ID:', error);
      throw error;
    }
  },

  // Create automatic announcement
  create: async (data) => {
    try {
      console.log('🚀 Creating auto announcement:', data);
      const response = await api.post('/automatic-announcements', data)
      console.log('✅ Auto announcement created response:', response);
      return response
    } catch (error) {
      console.error('❌ Error creating auto announcement:', error);
      throw error;
    }
  },

  // Update automatic announcement
  update: async (id, data) => {
    try {
      console.log('🔄 Updating auto announcement:', id, data);
      const response = await api.put(`/automatic-announcements/${id}`, data)
      console.log('✅ Auto announcement updated response:', response);
      return response.data
    } catch (error) {
      console.error('❌ Error updating auto announcement:', error);
      throw error;
    }
  },

  // Delete automatic announcement
  delete: async (id) => {
    try {
      console.log('🗑️ Deleting auto announcement:', id);
      const response = await api.delete(`/automatic-announcements/${id}`)
      console.log('✅ Auto announcement deleted response:', response);
      return response.data
    } catch (error) {
      console.error('❌ Error deleting auto announcement:', error);
      throw error;
    }
  },

  // Toggle automatic announcement status
  toggle: async (id) => {
    try {
      console.log('🔄 Toggling auto announcement:', id);
      const response = await api.patch(`/automatic-announcements/${id}/toggle`)
      console.log('✅ Auto announcement toggled response:', response);
      return response.data
    } catch (error) {
      console.error('❌ Error toggling auto announcement:', error);
      throw error;
    }
  }
}

export default automaticAnnouncementsService
