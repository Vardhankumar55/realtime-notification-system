import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { NotificationProvider } from "./context/LiveContext";
import ProtectedRoute from "./components/common/ProtectedRoute";
import ToastOverlay from "./components/common/ToastOverlay";
import PushNotificationBanner from "./components/common/PushNotificationBanner";

// Pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import NotificationCenterV2 from "./pages/NotificationCenterV2";
import AdminPanel from "./pages/AdminPanel";
import Profile from "./pages/Profile";
import Messages from "./pages/Messages";

/**
 * Root App component.
 *
 * Architecture:
 * - AuthProvider: wraps everything — provides login/logout state
 * - NotificationProvider: manages notifications + WebSocket
 * - Router: client-side navigation
 * - ProtectedRoute: guards authenticated pages
 * - ToastContainer: renders real-time toast popups globally
 */

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <ToastOverlay />
          <PushNotificationBanner />
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected routes (any authenticated user) */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/notifications" element={<NotificationCenterV2 />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/profile" element={<Profile />} />
            </Route>

            {/* Admin-only routes */}
            <Route element={<ProtectedRoute adminOnly />}>
              <Route path="/admin" element={<AdminPanel />} />
            </Route>

            {/* Default redirects */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
