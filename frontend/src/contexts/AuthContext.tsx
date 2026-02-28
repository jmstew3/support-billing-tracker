/* eslint-disable react-refresh/only-export-components */
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
    if (window.location.hostname === 'billing.peakonedigital.com') {
      return 'https://billing.peakonedigital.com/api';
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
    } catch {
      // Clear invalid tokens
      localStorage.removeItem('accessToken');
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
      credentials: 'include', // Send/receive cookies
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      let errorMessage = 'Login failed';

      // Handle specific HTTP status codes with user-friendly messages
      if (response.status === 404) {
        errorMessage = 'Service unavailable. Please try again later.';
      } else if (response.status === 401) {
        errorMessage = 'Invalid credentials';
      } else if (response.status === 429) {
        errorMessage = 'Too many attempts. Please wait and try again.';
      } else if (response.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      } else {
        try {
          const error = await response.json();
          if (error.error) errorMessage = error.error;
        } catch {
          // Response body was empty or not JSON - use default message
        }
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();

    // Store access token only (refresh token is now in HttpOnly cookie)
    localStorage.setItem('accessToken', data.accessToken);

    // Set user
    setUser(data.user);
  };

  /**
   * Logout and clear tokens
   */
  const logout = async () => {
    try {
      // Call logout endpoint to invalidate refresh token
      // Cookie is sent automatically with credentials: 'include'
      await fetch(`${getApiUrl()}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Send HttpOnly cookie
      });
    } catch {
      // Logout failed
    }

    // Clear local storage and state
    localStorage.removeItem('accessToken');
    setUser(null);
  };

  /**
   * Refresh access token using refresh token (in HttpOnly cookie)
   */
  const refreshToken = async () => {
    try {
      const response = await fetch(`${getApiUrl()}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Send HttpOnly cookie
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
