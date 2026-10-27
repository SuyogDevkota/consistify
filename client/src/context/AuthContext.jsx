import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  authApi,
  clearCsrf,
  ensureCsrf,
  getErrorMessage,
  refreshSession,
} from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      await ensureCsrf();
      const res = await authApi.me();
      setUser(res.data.data.user);
      return res.data.data.user;
    } catch {
      try {
        const refreshed = await refreshSession();
        setUser(refreshed.data.data.user);
        return refreshed.data.data.user;
      } catch {
        setUser(null);
        return null;
      }
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await refreshUser();
      setLoading(false);
    })();
  }, [refreshUser]);

  useEffect(() => {
    const expireSession = () => {
      clearCsrf();
      setUser(null);
    };
    window.addEventListener('consistify:session-expired', expireSession);
    return () => window.removeEventListener('consistify:session-expired', expireSession);
  }, []);

  const register = async (data) => {
    const res = await authApi.register(data);
    clearCsrf();
    await ensureCsrf();
    setUser(res.data.data.user);
    return res.data.data.user;
  };

  const login = async (data) => {
    const res = await authApi.login(data);
    clearCsrf();
    await ensureCsrf();
    setUser(res.data.data.user);
    return res.data.data.user;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      clearCsrf();
      setUser(null);
    }
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      register,
      login,
      logout,
      refreshUser,
      setUser,
      getErrorMessage,
    }),
    [user, loading, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
