import api from './axiosInstance';

export const profileApi = {
  getProfile: () => api.get('/profile/me'),
  updateProfile: (data) => api.put('/profile/me', data),
  lookup: (phone) => api.get(`/profile/lookup/${phone}`),
  getBillers: () => api.get('/profile/billers'),
  uploadAvatar: (file) => {
    const formData = new FormData();
    formData.append('avatar', file, 'avatar.jpg');
    return api.post('/profile/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
