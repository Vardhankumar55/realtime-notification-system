import React, { useState, useRef, useEffect } from "react";
import { useNotifications } from "../../context/LiveContext";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";

const TYPE_CONFIG = {
  INFO: {
    color: "text-blue-500",
    bg: "bg-blue-50",
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
  },
  SUCCESS: {
    color: "text-green-500",
    bg: "bg-green-50",
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
  },
  WARNING: {
    color: "text-yellow-500",
    bg: "bg-yellow-50",
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
  },
  ERROR: {
    color: "text-red-500",
    bg: "bg-red-50",
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
  },
  ANNOUNCEMENT: {
    color: "text-purple-500",
    bg: "bg-purple-50",
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
  },
  EXAM_DATES: {
    color: "text-indigo-500",
    bg: "bg-indigo-50",
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
  },
  ASSIGNMENT_DEADLINES: {
    color: "text-orange-500",
    bg: "bg-orange-50",
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
  },
  PLACEMENT_DRIVE_ALERTS: {
    color: "text-emerald-500",
    bg: "bg-emerald-50",
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
  },
  HOLIDAY_ANNOUNCEMENTS: {
    color: "text-rose-500",
    bg: "bg-rose-50",
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
  },
  CLASSROOM_CHANGES: {
    color: "text-cyan-500",
    bg: "bg-cyan-50",
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
  },
  ATTENDANCE_WARNINGS: {
    color: "text-amber-500",
    bg: "bg-amber-50",
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
  }
};

const NotificationBell = () => {
  const { notifications, unreadCount, markAsRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const recent = notifications.slice(0, 8);

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2.5 rounded-2xl hover:bg-gray-100 transition-all active:scale-95 group shadow-sm bg-white border border-gray-100"
        aria-label="Notifications"
      >
        {/* Bell icon */}
        <svg className="w-6 h-6 text-gray-600 group-hover:text-indigo-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {/* Badge */}
        {unreadCount > 0 && (
          <span className="badge-pulse absolute -top-1 -right-1 bg-red-500 text-white text-[10px]
            font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 border-2 border-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 mt-3 w-[360px] bg-white rounded-3xl shadow-2xl
          border border-gray-100 z-50 overflow-hidden ring-1 ring-black/5 animate-fade-in">
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between bg-white">
            <span className="text-gray-900 font-semibold text-lg tracking-tight">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors tracking-tight">
                Clear all
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[440px] overflow-y-auto overflow-x-hidden scrollbar-thin">
            {recent.length === 0 ? (
              <div className="py-16 text-center px-10">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-5">
                  <svg className="w-10 h-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                </div>
                <p className="text-gray-900 font-semibold text-lg mb-1">No notifications</p>
                <p className="text-gray-400 text-sm font-normal">You're all caught up for now!</p>
              </div>
            ) : (
          <div className="p-3 space-y-3">
                {recent.map((n) => {
                  const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.INFO;
                  const isRead = n.isRead;
                  
                  return (
                    <div
                      key={n.userNotificationId || n.id}
                      className={`flex gap-4 px-4 py-4 cursor-pointer transition-all duration-200 rounded-2xl relative border
                        ${!isRead ? `bg-white ${cfg.color.replace('text-', 'border-')} shadow-sm text-gray-900` : "bg-white border-gray-100 hover:bg-gray-50 hover:shadow-sm"}`}
                      onClick={() => {
                        if (!isRead) markAsRead(n.userNotificationId);
                        setOpen(false);
                      }}
                    >
                      <div className={`flex-shrink-0 mt-1 w-8 h-8 rounded-xl flex items-center justify-center ${cfg.bg} ${cfg.color}`}>
                        {cfg.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[15px] leading-tight transition-colors font-bold ${!isRead ? cfg.color : "text-gray-600"}`}>
                          {n.title}
                        </p>
                        <p className="text-[13px] text-gray-500 mt-1.5 leading-relaxed font-medium line-clamp-2">{n.message}</p>
                        <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-gray-50">
                          <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">
                            {n.createdAt ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true }) : ""}
                          </p>
                          <div className="flex gap-2">
                             {!isRead && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsRead(n.userNotificationId);
                                  }}
                                  className="text-[11px] font-black text-indigo-600 hover:text-indigo-800 transition-colors uppercase tracking-tight"
                                >
                                  Mark Read
                                </button>
                             )}
                             <Link 
                               to={`/notifications?notification=${n.userNotificationId || n.id}`}
                               onClick={() => setOpen(false)}
                               className="text-[11px] font-black text-gray-400 hover:text-indigo-600 transition-colors uppercase tracking-tight"
                             >
                               {n.canReply ? "Reply" : "Open"}
                             </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="bg-white border-t border-gray-50 p-2">
              <Link
                to="/notifications"
                onClick={() => setOpen(false)}
                className="block w-full py-3 text-[13px] font-semibold text-indigo-600 hover:bg-gray-50 transition-all rounded-xl text-center"
              >
                Launch center →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
