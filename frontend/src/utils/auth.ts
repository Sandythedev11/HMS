import { NavigateFunction } from 'react-router-dom';

/**
 * Logs out the user by clearing auth data and redirecting to login
 */
export const logout = (navigate?: NavigateFunction) => {
  // Clear all auth data
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  
  // Redirect to login if navigate is provided
  if (navigate) {
    navigate('/login');
  } else if (window) {
    // Fallback if navigate is not available
    window.location.href = '/login';
  }
};

/**
 * Checks if the user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('token');
};

/**
 * Gets the user role from localStorage
 */
export const getUserRole = (): string | null => {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  
  try {
    const user = JSON.parse(userStr);
    return user.role || null;
  } catch (e) {
    console.error('Error parsing user data:', e);
    return null;
  }
};

/**
 * Checks if the user is an admin
 */
export const isAdmin = (): boolean => {
  return getUserRole() === 'admin';
};

/**
 * Gets user info from localStorage
 */
export const getUserInfo = () => {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch (e) {
    console.error('Error parsing user data:', e);
    return null;
  }
};

/**
 * Gets the correct dashboard URL based on user role
 */
export const getDashboardUrl = (): string => {
  return isAdmin() ? '/admin/dashboard' : '/student/dashboard';
}; 