/**
 * Authentication Context and User State Provider
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types/index.ts';
import { api } from '../services/api.ts';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (params: any) => Promise<void>;
  forgotPassword: (email: string) => Promise<{ message: string; devResetToken?: string; devResetExpiresAt?: string }>;
  resetPassword: (token: string, password: string) => Promise<{ message: string }>;
  logout: () => void;
  quickDemoLogin: (role: UserRole) => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadCurrentUser() {
      const token = api.getToken();
      if (!token) {
        // No stored session: stay signed out until the user explicitly logs in.
        setUser(null);
        setIsLoading(false);
        return;
      }

      try {
        const res = await api.getMe();
        setUser(res.user);
      } catch (err) {
        api.clearToken();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadCurrentUser();
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await api.login({ email, password: pass });
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (params: any) => {
    setIsLoading(true);
    try {
      const res = await api.register(params);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const forgotPassword = async (email: string) => {
    return api.forgotPassword(email);
  };

  const resetPassword = async (token: string, password: string) => {
    return api.resetPassword({ token, password });
  };

  const logout = () => {
    api.clearToken();
    setUser(null);
  };

  const quickDemoLogin = async (role: UserRole) => {
    setIsLoading(true);
    try {
      if (role === 'admin') {
        const res = await api.login({ email: 'admin@intervai.com', password: 'admin123' });
        setUser(res.user);
      } else {
        const res = await api.login({ email: 'candidate@intervai.com', password: 'candidate123' });
        setUser(res.user);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!user) return;
    const res = await api.updateProfile(updates);
    setUser(res.user);
  };

  const refreshUser = async () => {
    if (!user) return;
    try {
      const res = await api.getMe();
      setUser(res.user);
    } catch {
      /* keep existing session on transient failure */
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        isLoading,
        login,
        register,
        forgotPassword,
        resetPassword,
        logout,
        quickDemoLogin,
        updateUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
