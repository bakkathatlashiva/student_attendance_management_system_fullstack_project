import { createContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const loggedInUser = localStorage.getItem('current_user');
    return loggedInUser ? JSON.parse(loggedInUser) : null;
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('token') || null;
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('current_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('current_user');
    }
  }, [user]);

  // Login handler
  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const data = await authAPI.login(email, password);
      setToken(data.token);
      setUser(data.user);
      return data.user;
    } catch (error) {
      const errorMsg = error.response?.data?.msg || 'Invalid email or password.';
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Signup handler
  const signup = async (name, email, password, role = 'faculty', profileData = {}) => {
    setIsLoading(true);
    try {
      const data = await authAPI.register(name, email, password, role, profileData);
      setToken(data.token);
      setUser(data.user);
      return data.user;
    } catch (error) {
      const errorMsg = error.response?.data?.msg || 'Registration failed.';
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Request Reset Password link
  const requestForgotPassword = async (email) => {
    setIsLoading(true);
    try {
      const data = await authAPI.forgotPassword(email);
      return data;
    } catch (error) {
      const errorMsg = error.response?.data?.msg || 'Request password reset failed.';
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Set new password with token
  const resetPassword = async (resetToken, password) => {
    setIsLoading(true);
    try {
      const data = await authAPI.resetPassword(resetToken, password);
      return data;
    } catch (error) {
      const errorMsg = error.response?.data?.msg || 'Password reset failed.';
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Logout handler
  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('current_user');
  };

  return (
    <AuthContext.Provider value={{ token, user, login, signup, logout, forgotPassword: requestForgotPassword, resetPassword, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
