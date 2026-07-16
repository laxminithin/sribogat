import api from '../api';

// Admin Authentication
export const adminLogin = async ({ email, password }) => {
  try {
    const response = await api.post('/users/admin/login', { email, password });
    return response.data;
  } catch (error) {
    throw error;
  }
};
