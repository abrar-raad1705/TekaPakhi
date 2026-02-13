import api from './axiosInstance';

export const profileApi = {
  getProfile: () => api.get('/profile/me'),
  updateProfile: (data) => api.put('/profile/me', data),
  lookup: (phone) => api.get(`/profile/lookup/${phone}`),
  getBillers: () => api.get('/profile/billers'),
};
