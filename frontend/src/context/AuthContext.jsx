import React, { createContext, useContext, useState, useEffect } from "react";
import { authAPI } from "../services/api";

/**
 * AuthContext provides global authentication state.
 *
 * Stored in localStorage:
 *   - token: JWT string
 *   - user: serialized user object { id, name, email, role }
 *
 * Any component can call useAuth() to access:
 *   - user, token, isAuthenticated, isAdmin
 *   - login(), logout(), register()
 */

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("user");
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  // Restore user from storage on app start
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem("token");
      if (storedToken) {
        setToken(storedToken);
        try {
          // Verify token and get fresh user data
          const res = await authAPI.getMe();
          setUser(res.data.data);
        } catch (e) {
          console.error("Session expired or invalid");
          logout();
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (credentials) => {
    const res = await authAPI.login(credentials);
    const { data } = res.data;
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data));
    setToken(data.token);
    setUser(data);
    return data;
  };

  const register = async (userData) => {
    const res = await authAPI.register(userData);
    const { data } = res.data;
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data));
    setToken(data.token);
    setUser(data);
    return data;
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (e) {
      console.error("Logout failed at backend", e);
    }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  };

  // Persist user object changes to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    }
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        token,
        loading,
        isAuthenticated: !!token && !!user,
        isAdmin: user?.role === "ROLE_ADMIN",
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
