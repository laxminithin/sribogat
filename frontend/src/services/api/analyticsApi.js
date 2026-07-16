import api from '../api';

export const analyticsApi = {
  // Get dashboard statistics
  getDashboardStats: async (startDate, endDate) => {
    const response = await api.get('/analytics/dashboard', {
      params: { startDate, endDate }
    });
    return response.data;
  },

  // Export data
  exportData: async (type, startDate, endDate, format = 'csv') => {
    const response = await api.get('/analytics/export', {
      params: { type, startDate, endDate, format },
      responseType: 'blob'
    });
    return response.data;
  },

  // Get custom reports
  getCustomReport: async (reportConfig) => {
    const response = await api.post('/analytics/custom-reports', reportConfig);
    return response.data;
  }
}; 