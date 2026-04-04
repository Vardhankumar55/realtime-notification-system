import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { notificationAPI } from "../services/api";
import { useNotifications } from "../context/NotificationContext";

/**
 * Login page — handles user authentication.
 * On success: JWT is stored and user is redirected to dashboard.
 */

const Login = () => {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { addToast } = useNotifications();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(form);
      
      // Check for new notifications since last logout
      if (user.lastLogoutAt) {
          try {
              const res = await notificationAPI.getOfflineNew();
              const offlineNotifications = res.data.data || [];
              if (offlineNotifications.length > 0) {
                  addToast({
                      title: `You have ${offlineNotifications.length} new notification${offlineNotifications.length > 1 ? 's' : ''}`,
                      message: offlineNotifications.length === 1 
                        ? `Latest: ${offlineNotifications[0].title}`
                        : `Check them in your notification center.`,
                      type: "INFO",
                      isSystem: true,
                      showViewButton: true
                  });
              }
          } catch (e) {
              console.error("Failed to fetch offline notifications", e);
          }
      }

      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl
            items-center justify-center shadow-lg mb-4">
            <span className="text-white text-2xl font-bold">N</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-gray-500 mt-1">Sign in to your NotifyHub account</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500
                  focus:border-transparent outline-none transition-shadow text-sm"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500
                  focus:border-transparent outline-none transition-shadow text-sm"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold
                rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md
                disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Signing in...</>
              ) : "Sign in"}
            </button>
          </form>

          {/* Demo credentials */}
          {/* <div className="mt-5 p-3 bg-gray-50 rounded-lg text-xs text-gray-500 space-y-1">
            <p className="font-medium text-gray-600">Demo credentials:</p>
            <p>Admin: admin@demo.com / password123</p>
            <p>User: user@demo.com / password123</p>
          </div> */}
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don't have an account?{" "}
          <Link to="/register" className="text-indigo-600 font-medium hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
