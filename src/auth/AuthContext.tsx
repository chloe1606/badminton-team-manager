import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthUser, LoginCredentials } from '../types/auth';
import { supabaseAuthService } from './services/authServices';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Check Supabase session status automatically on layout mount
  useEffect(() => {
    supabaseAuthService.getCurrentUser()
      .then((currentUser) => setUser(currentUser))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (credentials: LoginCredentials) => {
    const loggedInUser = await supabaseAuthService.login(credentials);
    setUser(loggedInUser);
  };

  const logout = async () => {
    await supabaseAuthService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
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
