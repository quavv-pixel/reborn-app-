import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { getSocket } from '../lib/socket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api.get('/api/auth/me');
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const socket = getSocket();
    if (user) {
      socket.connect();
    } else {
      socket.disconnect();
    }
    return () => {};
  }, [user]);

  const login = async (email, password) => {
    const data = await api.post('/api/auth/login', { email, password });
    setUser(data.user);
    return data.user;
  };

  const signup = async (payload) => {
    const data = await api.post('/api/auth/signup', payload);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    await api.post('/api/auth/logout');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
