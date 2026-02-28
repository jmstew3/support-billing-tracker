/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  clientAuthApi,
  setClientTokens,
  clearClientTokens,
  getClientAccessToken,
  type ClientUser,
} from '../services/clientApi';

interface ClientAuthContextType {
  user: ClientUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

const ClientAuthContext = createContext<ClientAuthContextType | undefined>(undefined);

export const ClientAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<ClientUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Fetch current user info using stored access token
   */
  const fetchUserInfo = useCallback(async () => {
    const accessToken = getClientAccessToken();
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    try {
      const userData = await clientAuthApi.me();
      setUser(userData);
    } catch {
      // Token invalid or expired, try to refresh
      try {
        await clientAuthApi.refresh();
        const userData = await clientAuthApi.me();
        setUser(userData);
      } catch {
        // Refresh failed, clear tokens
        clearClientTokens();
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Check authentication status on mount
   */
  useEffect(() => {
    fetchUserInfo();
  }, [fetchUserInfo]);

  /**
   * Login with email and password
   */
  const login = async (email: string, password: string) => {
    const response = await clientAuthApi.login(email, password);

    // Store access token (refresh token is now in HttpOnly cookie)
    setClientTokens(response.accessToken);

    // Set user
    setUser(response.user);
  };

  /**
   * Logout and clear tokens
   */
  const logout = async () => {
    await clientAuthApi.logout();
    setUser(null);
  };

  /**
   * Refresh access token using refresh token
   */
  const refreshToken = async () => {
    await clientAuthApi.refresh();
    await fetchUserInfo();
  };

  return (
    <ClientAuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshToken,
      }}
    >
      {children}
    </ClientAuthContext.Provider>
  );
};

/**
 * Hook to access client auth context
 * Must be used within ClientAuthProvider
 */
export const useClientAuth = () => {
  const context = useContext(ClientAuthContext);
  if (!context) {
    throw new Error('useClientAuth must be used within ClientAuthProvider');
  }
  return context;
};
