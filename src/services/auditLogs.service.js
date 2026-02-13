import api from './api';

const auditLogsService = {
  async getEntityHistory(entityType, entityId, params = {}) {
    return api.get(`/audit-logs/entity/${entityType}/${entityId}`, { params });
  },

  async getModuleHistory(module, params = {}) {
    return api.get(`/audit-logs/module/${module}`, { params });
  }
};

export default auditLogsService;
