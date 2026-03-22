import { createContext, useContext, useState, useCallback } from 'react';
import { authApi } from '../api/authApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(false);

  const isAuthenticated = !!user && !!localStorage.getItem('accessToken');

  const login = useCallback(async (phoneNumber, securityPin) => {
    setLoading(true);
    try {
      const { data } = await authApi.login({ phoneNumber, securityPin });
      const { accessToken, profile } = data.data;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('user', JSON.stringify(profile));
      setUser(profile);

      return { success: true, data: data.data };
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (payload) => {
    setLoading(true);
    try {
      const { data } = await authApi.register(payload);
      return { success: true, data: data.data };
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, []);

<<<<<<< Updated upstream
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore logout errors
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      setUser(null);
    }
=======
  const logout = useCallback(() => {

    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    setUser(null);
>>>>>>> Stashed changes
  }, []);


  /**
   * Determine the home route based on user role
   */
  const getHomeRoute = useCallback(() => {
    if (!user) return '/login';
    switch (user.typeName) {
      case 'SYSTEM': return '/admin';
      case 'AGENT': return '/agent';
      case 'MERCHANT': return '/merchant';
      case 'DISTRIBUTOR': return '/distributor';
      case 'BILLER': return '/biller';
      default: return '/dashboard';
    }
  }, [user]);

  const value = {
    user,
    setUser,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    getHomeRoute,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
