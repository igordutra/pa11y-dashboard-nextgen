/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import api from './api';

interface User {
  id: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    const token = localStorage.getItem('pa11y_token');
    
    // Also check URL for OAuth token
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    if (urlToken) {
      localStorage.setItem('pa11y_token', urlToken);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    try {
      // First, check if auth is even enabled on the backend
      const { data: apiInfo } = await api.get('/api');
      
      if (!apiInfo.authEnabled) {
        // If auth is disabled, fetch the default guest/admin profile provided by the server
        const { data: userData } = await api.get('/api/auth/me');
        setUser(userData);
        setLoading(false);
        return;
      }

      // Auth is enabled, we need a token
      if (!token && !urlToken) {
        setLoading(false);
        return;
      }

      const { data } = await api.get('/api/auth/me');
      setUser(data);
    } catch (err) {
      console.error('Auth failed', err);
      localStorage.removeItem('pa11y_token');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = (token: string, userData: User) => {
    localStorage.setItem('pa11y_token', token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('pa11y_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}