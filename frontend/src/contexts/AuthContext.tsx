import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface User {
  id: number;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Get API base URL based on environment
   */
  const getApiUrl = () => {
    if (window.location.hostname === 'velocity.peakonedigital.com') {
      return 'https://velocity.peakonedigital.com/billing-overview-api/api';
    }
    return import.meta.env.VITE_API_URL || 'http://localhost:3011/api';
  };

  /**
   * Fetch current user info using stored access token
   */
  const fetchUserInfo = useCallback(async () => {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${getApiUrl()}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        // Token invalid or expired, try to refresh
        await refreshToken();
      }
    } catch (error) {
      // Clear invalid tokens
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
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
    const response = await fetch(`${getApiUrl()}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();

    // Store tokens
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);

    // Set user
    setUser(data.user);
  };

  /**
   * Logout and clear tokens
   */
  const logout = async () => {
    const refreshTokenValue = localStorage.getItem('refreshToken');

    try {
      // Call logout endpoint to invalidate refresh token
      await fetch(`${getApiUrl()}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken: refreshTokenValue })
      });
    } catch (error) {
      // Logout failed
    }

    // Clear local storage and state
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  /**
   * Refresh access token using refresh token
   */
  const refreshToken = async () => {
    const refreshTokenValue = localStorage.getItem('refreshToken');
    if (!refreshTokenValue) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch(`${getApiUrl()}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken: refreshTokenValue })
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      localStorage.setItem('accessToken', data.accessToken);

      // Fetch updated user info
      await fetchUserInfo();
    } catch (error) {
      // Clear invalid tokens
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshToken
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook to access auth context
 * Must be used within AuthProvider
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
