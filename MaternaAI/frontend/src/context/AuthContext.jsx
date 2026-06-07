import React, { createContext, useState, useEffect, useContext } from 'react';
import { authAPI } from '../api';
import { getToken } from 'firebase/messaging';
import { messaging } from '../api/firebase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // Fetch latest user data from server to sync state
          const userData = await authAPI.getMe();
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
        } catch (error) {
          console.error("Session restoration failed:", error);
          // Session might have expired or token is invalid
          logout();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  useEffect(() => {
    const registerFCM = async () => {
      if (user && messaging) {
        try {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            const swUrl = `/firebase-messaging-sw.js?apiKey=${import.meta.env.VITE_FIREBASE_API_KEY}&authDomain=${import.meta.env.VITE_FIREBASE_AUTH_DOMAIN}&projectId=${import.meta.env.VITE_FIREBASE_PROJECT_ID}&storageBucket=${import.meta.env.VITE_FIREBASE_STORAGE_BUCKET}&messagingSenderId=${import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID}&appId=${import.meta.env.VITE_FIREBASE_APP_ID}`;
            const registration = await navigator.serviceWorker.register(swUrl);
            const currentToken = await getToken(messaging, {
              vapidKey: 'BAeHZdOeWrqGB81qvIGoi1VBGJgMI6MgPyoy-vOieKv8gyZGs-esSRb6WCDrttiZUh-KYt_LkNEHpT9xkLMOqkk',
              serviceWorkerRegistration: registration
            });
            if (currentToken) {
              await authAPI.registerFCM(currentToken);
              console.log('FCM Token registered');
            }
          }
        } catch (error) {
          console.error('An error occurred while retrieving token. ', error);
        }
      }
    };
    registerFCM();
  }, [user]);

  const login = async (phone, password) => {
    try {
      const data = await authAPI.login(phone, password);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      return data.user;
    } catch (error) {
      throw error.response?.data?.error || "Login failed. Please check your credentials.";
    }
  };

  const register = async (userData) => {
    try {
      const data = await authAPI.register(userData);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      return data.user;
    } catch (error) {
      throw error.response?.data?.error || "Registration failed. Please try again.";
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const updateProfile = async (updates) => {
    try {
      await authAPI.updateMe(updates);
      // Fetch fresh profile state to sync
      const freshUser = await authAPI.getMe();
      localStorage.setItem('user', JSON.stringify(freshUser));
      setUser(freshUser);
      return freshUser;
    } catch (error) {
      throw error.response?.data?.error || "Failed to update profile details.";
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    register,
    logout,
    updateProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
