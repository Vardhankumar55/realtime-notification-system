import React, { useState } from "react";
import { useNotifications } from "../context/NotificationContext";
import { notificationAPI } from "../services/api";
import Navbar from "../components/common/Navbar";
import NotificationCard from "../components/notifications/NotificationCard";

/**
 * Notification Center — full notification list with search, filter, and bulk actions.
 * Filters: type, read/unread status, date range.
 */

const TYPE_CONFIG = {
  ALL: {
    label: "All",
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
  },
  INFO: {
    label: "Info",
    color: "text-blue-600",
    bg: "bg-blue-50",
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
  },
  SUCCESS: {
    label: "Success",
    color: "text-green-600",
    bg: "bg-green-50",
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
  },
  WARNING: {
    label: "Warning",
    color: "text-yellow-600",
    bg: "bg-yellow-50",
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
  },
  ERROR: {
    label: "Error",
    color: "text-red-600",
    bg: "bg-red-50",
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
  },
  ANNOUNCEMENT: {
    label: "Announcement",
    color: "text-purple-600",
    bg: "bg-purple-50",
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
  },
  EXAM_DATES: {
    label: "Exams",
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
  },
  ASSIGNMENT_DEADLINES: {
    label: "Assignments",
    color: "text-orange-600",
    bg: "bg-orange-50",
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
  },
  PLACEMENT_DRIVE_ALERTS: {
    label: "Placements",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
  },
  HOLIDAY_ANNOUNCEMENTS: {
    label: "Holidays",
    color: "text-rose-600",
    bg: "bg-rose-50",
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
  },
  CLASSROOM_CHANGES: {
    label: "Classes",
    color: "text-cyan-600",
    bg: "bg-cyan-50",
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
  },
  ATTENDANCE_WARNINGS: {
    label: "Attendance",
    color: "text-amber-600",
    bg: "bg-amber-50",
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
  }
};

const STATUS_CONFIG = {
  ALL: {
    label: "All",
    color: "text-gray-600",
    bg: "bg-gray-100",
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
  },
  UNREAD: {
    label: "Unread",
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
  },
  READ: {
    label: "Read",
    color: "text-green-600",
    bg: "bg-green-50",
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
  },
  FAVORITES: {
    label: "Favorites",
    color: "text-yellow-600",
    bg: "bg-yellow-50",
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l2.07 6.323a1 1 0 00.95.69h6.69c.969 0 1.371 1.24.588 1.81l-5.414 3.935a1 1 0 00-.364 1.118l2.07 6.323c.3.921-.755 1.688-1.54 1.118l-5.414-3.935a1 1 0 00-1.175 0l-5.414 3.935c-.785.57-1.84-.197-1.54-1.118l2.07-6.323a1 1 0 00-.364-1.118L2.34 11.75c-.783-.57-.38-1.81.588-1.81h6.69a1 1 0 00.95-.69l2.07-6.323z" /></svg>
  },
  PINNED: {
    label: "Pinned",
    color: "text-sky-600",
    bg: "bg-sky-50",
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
  }
};

const NotificationCenter = () => {
  const { notifications, markAsRead, unreadCount, fetchNotifications, deleteNotification, setNotifications, setUnreadCount, addToast, togglePin, toggleFavorite } = useNotifications();

  const [filterType, setFilterType] = useState("ALL");
  const [filterRead, setFilterRead] = useState("ALL"); // ALL | READ | UNREAD | FAVORITES | PINNED
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // Client-side filter
  const filtered = notifications.filter((n) => {
    const matchType = filterType === "ALL" || n.type === filterType;
    const matchRead =
      filterRead === "ALL" ||
      (filterRead === "READ" && n.isRead) ||
      (filterRead === "UNREAD" && !n.isRead) ||
      (filterRead === "FAVORITES" && n.isFavorite) ||
      (filterRead === "PINNED" && n.isPinned);
    const matchSearch =
      !search ||
      n.title?.toLowerCase().includes(search.toLowerCase()) ||
      n.message?.toLowerCase().includes(search.toLowerCase());
    return matchType && matchRead && matchSearch;
  });

  const handleRefresh = async () => {
    setLoading(true);
    await fetchNotifications();
    setLoading(false);
  };

  const handleClearAll = async () => {
    if (!window.confirm("Are you sure you want to clear all notifications?")) return;
    try {
        await notificationAPI.clearAll();
        setNotifications([]);
        setUnreadCount(0);
        addToast({ 
            title: "Inbox Cleared", 
            message: "All notifications have been removed", 
            type: "SUCCESS" 
        });
    } catch (e) {
        addToast({ 
            title: "Action Failed", 
            message: "Failed to clear notifications", 
            type: "ERROR" 
        });
    }
  };

  const handleDelete = async (userNotificationId) => {
    try {
        await deleteNotification(userNotificationId);
        addToast({ 
            title: "Success", 
            message: "Notification deleted successfully", 
            type: "SUCCESS" 
        });
    } catch (e) {
         addToast({ 
            title: "Error", 
            message: "Failed to delete notification", 
            type: "ERROR" 
        });
    }
  };


  return (
    <div className="min-h-screen bg-gray-50/50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4 px-2">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Notification Center</h1>
            <p className="text-gray-500 font-medium mt-1">
              {unreadCount > 0 ? (
                <span className="text-indigo-600 font-bold">{unreadCount} pending alerts</span>
              ) : (
                <span className="text-green-600 font-bold">Inbox clear</span>
              )}
              <span className="mx-2 text-gray-300">·</span>
              <span className="text-gray-400 font-bold uppercase tracking-tighter">{notifications.length} total notifications</span>
            </p>
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="px-5 py-2.5 bg-white text-gray-700 text-sm font-bold border border-gray-200 rounded-2xl hover:bg-gray-50 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-60 shadow-sm"
            >
              <svg className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Refresh
            </button>
            <button
              onClick={handleClearAll}
              className="px-5 py-2.5 bg-red-50 text-red-600 text-sm font-bold rounded-2xl hover:bg-red-100 active:scale-95 transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              Clear All
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 mb-8 shadow-xl space-y-5">
           <div className="relative group">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search in notifications history..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-6 py-3.5 text-sm font-medium border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-50/50 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-400"
            />
          </div>

          <div className="flex flex-col gap-6">
            <div className="w-full">
              <p className="text-sm font-medium text-gray-500 mb-3 ml-1">Notification Category</p>
                <div className="flex gap-2.5 flex-wrap">
                  {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                    <button 
                      key={key} 
                      onClick={() => setFilterType(key)} 
                      className={`px-5 py-2.5 text-xs rounded-2xl font-bold transition-all flex items-center gap-2.5 border-2
                        ${filterType === key 
                          ? `${cfg.bg} ${cfg.color} ${cfg.color.replace('text-', 'border-')} shadow-lg shadow-indigo-100/20 scale-105` 
                          : "bg-white text-gray-500 border-gray-100 hover:border-gray-200 hover:bg-gray-50"}`}
                    >
                      <span className={`${filterType === key ? "scale-110" : "opacity-70"} transition-transform`}>
                        {cfg.icon}
                      </span>
                      {cfg.label}
                    </button>
                  ))}
                </div>
            </div>

            <div className="w-full border-t border-gray-100 pt-6">
              <p className="text-sm font-medium text-gray-500 mb-3 ml-1">Status</p>
              <div className="flex gap-2.5 flex-wrap">
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <button 
                    key={key} 
                    onClick={() => setFilterRead(key)} 
                    className={`px-5 py-2.5 text-xs rounded-2xl font-bold transition-all flex items-center gap-2.5 border-2
                      ${filterRead === key 
                        ? `${cfg.bg} ${cfg.color} ${cfg.color.replace('text-', 'border-')} shadow-lg scale-105` 
                        : "bg-white text-gray-500 border-gray-100 hover:border-gray-200 hover:bg-gray-50"}`}
                  >
                    <span className={`${filterRead === key ? "scale-110" : "opacity-70"} transition-transform`}>
                      {cfg.icon}
                    </span>
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Notification list */}
        <div className="space-y-4 animate-fade-in">
          {filtered.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-gray-200">
              <p className="text-gray-400 font-medium text-sm">No Notifications Found</p>
            </div>
          ) : (
            filtered.map((n) => (
              <NotificationCard
                key={n.userNotificationId || n.id}
                notification={n}
                onMarkRead={!n.isRead ? () => markAsRead(n.userNotificationId) : undefined}
                onDelete={() => handleDelete(n.userNotificationId)}
                onPin={togglePin}
                onFavorite={toggleFavorite}
                showActions
              />
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default NotificationCenter;
