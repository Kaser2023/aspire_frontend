import api from './api';

const notificationService = {
  getAll: async (params = {}) => {
    return api.get('/notifications', { params });
  },

  getUnreadCount: async () => {
    return api.get('/notifications/unread-count');
  },

  markAsRead: async (id) => {
    return api.put(`/notifications/${id}/read`);
  },

  markAllAsRead: async () => {
    return api.put('/notifications/read-all');
  },

  delete: async (id) => {
    return api.delete(`/notifications/${id}`);
  },

  clearRead: async () => {
    return api.delete('/notifications/clear-read');
  }
};

export default notificationService;
