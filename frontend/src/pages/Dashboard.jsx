import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import Navbar from "../components/common/Navbar";
import NotificationCard from "../components/notifications/NotificationCard";

/**
 * Dashboard — the main landing page after login.
 * Shows: stats summary, recent notifications, quick actions.
 */

const StatCard = ({ label, value, icon, color }) => (
  <div className={`bg-white rounded-xl border border-gray-100 p-5 shadow-sm flex items-center gap-4`}>
    <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center text-2xl flex-shrink-0`}>
      {icon}
    </div>
    <div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  </div>
);

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const { notifications, unreadCount, markAsRead, wsConnected, togglePin, toggleFavorite } = useNotifications();

  const totalCount = notifications.length;
  const readCount = notifications.filter((n) => n.isRead).length;
  const recent = notifications.slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50/50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Welcome banner */}
        <div className="bg-gradient-to-br from-indigo-700 via-indigo-600 to-purple-700 rounded-3xl p-8 mb-10 text-white shadow-xl relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl opacity-50" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-400/20 rounded-full -ml-16 -mb-16 blur-2xl opacity-40" />

          <div className="flex items-center justify-between flex-wrap gap-6 relative z-10">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">Welcome back, {user?.name}!</h1>
              <p className="text-indigo-100/90 mt-2 text-lg font-medium">
                {isAdmin ? "Admin view active — manage global notifications." : "You have notifications that need your attention."}
              </p>
            </div>
            <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-white/20 shadow-lg">
              <span className={`w-3 h-3 rounded-full ${wsConnected ? "bg-green-400 animate-pulse-dot" : "bg-yellow-400 animate-pulse"}`} />
              <span className="text-sm font-semibold tracking-wide">{wsConnected ? "Real-time Connected" : "Connecting..."}</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <StatCard
            label="Total Received" value={totalCount}
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>}
            color="bg-indigo-50 text-indigo-600"
          />
          <StatCard
            label="Unread Alerts" value={unreadCount}
            icon={<svg className="w-6 h-6 border-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>}
            color="bg-red-50 text-red-600"
          />
          <StatCard
            label="Acknowledged" value={readCount}
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            color="bg-green-50 text-green-600"
          />
          <StatCard
            label="System Role" value={isAdmin ? "Administrator" : "User"}
            icon={isAdmin ? <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg> : <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
            color="bg-purple-50 text-purple-600"
          />
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <Link to="/notifications"
            className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm
              hover:shadow-md hover:border-indigo-200 transition-all group overflow-hidden relative">
            <div className="absolute inset-0 bg-indigo-50/50 translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
            <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 group-hover:scale-110 group-hover:bg-indigo-200 transition-all relative z-10 shadow-sm">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            </div>
            <div className="relative z-10">
              <p className="font-bold text-gray-900 text-lg">Notification Center</p>
              <p className="text-gray-500 font-medium">Manage and filter your entire history</p>
            </div>
            <svg className="w-6 h-6 text-indigo-400 ml-auto group-hover:text-indigo-600 group-hover:translate-x-1 transition-all relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          {isAdmin && (
            <Link to="/admin"
              className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm
                hover:shadow-md hover:border-purple-200 transition-all group overflow-hidden relative">
              <div className="absolute inset-0 bg-purple-50/50 translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 group-hover:scale-110 group-hover:bg-purple-200 transition-all relative z-10 shadow-sm">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
              </div>
              <div className="relative z-10">
                <p className="font-bold text-gray-900 text-lg">Admin Controller</p>
                <p className="text-gray-500 font-medium">Broadcast and audit notifications</p>
              </div>
              <svg className="w-6 h-6 text-purple-400 ml-auto group-hover:text-purple-600 group-hover:translate-x-1 transition-all relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}
        </div>

        {/* Recent notifications */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-8 py-6 border-b border-gray-50 bg-gray-50/50">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Recent Stream</h2>
              <p className="text-sm text-gray-500 font-medium">The latest notifications from the system</p>
            </div>
            <Link to="/notifications" className="px-4 py-2 bg-white text-indigo-600 text-sm font-bold rounded-xl border border-indigo-100 hover:bg-indigo-50 transition-colors shadow-sm">
              View All Stream
            </Link>
          </div>
          <div className="p-8 space-y-4">
            {recent.length === 0 ? (
              <div className="text-center py-20 bg-gray-50/30 rounded-2xl border border-dashed border-gray-200">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                </div>
                <p className="text-gray-900 font-bold text-xl">All clear!</p>
                <p className="text-gray-400 font-medium mt-1">You've reached the end of the stream.</p>
              </div>
            ) : (
              recent.map((n) => (
                <NotificationCard
                  key={n.userNotificationId || n.id}
                  notification={n}
                  onMarkRead={markAsRead}
                  onPin={togglePin}
                  onFavorite={toggleFavorite}
                  showActions
                />
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
