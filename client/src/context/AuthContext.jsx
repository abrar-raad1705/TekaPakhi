import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authApi } from '../api/authApi';
import { profileApi } from '../api/profileApi';

const AuthContext = createContext(null);
const ACTIVE_ACCOUNT_STATUS = 'ACTIVE';

function normalizeSessionUser(profile) {
  if (!profile) return null;

  if ('profileId' in profile && 'typeName' in profile) {
    return {
      ...profile,
      accountStatus: profile.accountStatus || ACTIVE_ACCOUNT_STATUS,
    };
  }

  const subtypeData = profile.subtypeData || null;

  return {
    profileId: profile.profile_id,
    phoneNumber: profile.phone_number,
    fullName: profile.full_name,
    typeId: profile.type_id,
    typeName: profile.type_name,
    isPhoneVerified: Boolean(profile.is_phone_verified),
    requiresPinSetup:
      profile.type_name === 'DISTRIBUTOR' &&
      subtypeData?.pending_pin_setup === true,
    accountStatus: subtypeData?.status || ACTIVE_ACCOUNT_STATUS,
    profilePictureUrl: profile.profile_picture_url ?? null,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(false);

  const isAuthenticated = !!user && !!localStorage.getItem('accessToken');

  const persistUser = useCallback((nextUser) => {
    if (nextUser) {
      localStorage.setItem('user', JSON.stringify(nextUser));
      setUser(nextUser);
      return;
    }

    localStorage.removeItem('user');
    setUser(null);
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  const login = useCallback(async (phoneNumber, securityPin) => {
    setLoading(true);
    try {
      const { data } = await authApi.login({ phoneNumber, securityPin });
      const { accessToken, profile } = data.data;
      const normalizedProfile = normalizeSessionUser(profile);

      localStorage.setItem('accessToken', accessToken);
      persistUser(normalizedProfile);

      return { success: true, data: data.data };
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, [persistUser]);

  const refreshUser = useCallback(async () => {
    if (!localStorage.getItem('accessToken')) return null;

    try {
      const { data } = await profileApi.getProfile();
      const refreshedUser = normalizeSessionUser(data.data);
      persistUser(refreshedUser);
      return refreshedUser;
    } catch (error) {
      if ([401, 403].includes(error.response?.status)) {
        clearSession();
      }
      throw error;
    }
  }, [clearSession, persistUser]);

  useEffect(() => {
    if (!localStorage.getItem('accessToken')) return undefined;

    const syncUser = () => {
      refreshUser().catch(() => {});
    };

    syncUser();
    window.addEventListener('focus', syncUser);
    document.addEventListener('visibilitychange', syncUser);
    const intervalId = window.setInterval(syncUser, 60000);

    return () => {
      window.removeEventListener('focus', syncUser);
      document.removeEventListener('visibilitychange', syncUser);
      window.clearInterval(intervalId);
    };
  }, [refreshUser]);

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

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore logout errors
    } finally {
      clearSession();
    }
  }, [clearSession]);

  /**
   * Determine the home route based on user role
   */
  const getHomeRoute = useCallback(() => {
    if (!user) return '/login';
    switch (user.typeName) {
      case 'SYSTEM': return '/dashboard';
      case 'AGENT': return '/agent';
      case 'MERCHANT': return '/merchant';
      case 'DISTRIBUTOR':
        if (user.requiresPinSetup) return '/distributor/setup-pin';
        return '/distributor';
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
    refreshUser,
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
