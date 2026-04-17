import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { useNotifications } from "../../context/LiveContext";

const TYPE_CONFIG = {
  INFO: { color: "text-blue-500", bg: "bg-blue-50" },
  SUCCESS: { color: "text-green-500", bg: "bg-green-50" },
  WARNING: { color: "text-yellow-500", bg: "bg-yellow-50" },
  ERROR: { color: "text-red-500", bg: "bg-red-50" },
  ANNOUNCEMENT: { color: "text-purple-500", bg: "bg-purple-50" },
  EXAM_DATES: { color: "text-indigo-500", bg: "bg-indigo-50" },
  ASSIGNMENT_DEADLINES: { color: "text-orange-500", bg: "bg-orange-50" },
  PLACEMENT_DRIVE_ALERTS: { color: "text-emerald-500", bg: "bg-emerald-50" },
  HOLIDAY_ANNOUNCEMENTS: { color: "text-rose-500", bg: "bg-rose-50" },
  CLASSROOM_CHANGES: { color: "text-cyan-500", bg: "bg-cyan-50" },
  ATTENDANCE_WARNINGS: { color: "text-amber-500", bg: "bg-amber-50" },
};

const PRIORITY_STYLES = {
  LOW: "bg-slate-100 text-slate-700",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};

const NotificationBellV2 = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const recent = notifications.slice(0, 8);

  const openNotification = async (notification) => {
    if (!notification.isRead && notification.userNotificationId) {
      await markAsRead(notification.userNotificationId);
    }
    setOpen(false);
    navigate(notification.deepLink || `/notifications?notification=${notification.userNotificationId || notification.id}`);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((value) => !value)}
        className="group relative rounded-2xl border border-gray-100 bg-white p-2.5 shadow-sm transition-all active:scale-95 hover:bg-gray-100"
        aria-label="Notifications"
      >
        <svg className="h-6 w-6 text-gray-600 transition-colors group-hover:text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="badge-pulse absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-3 z-50 w-[380px] overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-2xl ring-1 ring-black/5 animate-fade-in">
          <div className="flex items-center justify-between border-b border-gray-50 bg-white px-6 py-5">
            <span className="text-lg font-semibold tracking-tight text-gray-900">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-semibold tracking-tight text-indigo-600 transition-colors hover:text-indigo-700"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="scrollbar-thin max-h-[440px] overflow-x-hidden overflow-y-auto">
            {recent.length === 0 ? (
              <div className="px-10 py-16 text-center">
                <p className="mb-1 text-lg font-semibold text-gray-900">No notifications</p>
                <p className="text-sm text-gray-400">You are all caught up for now.</p>
              </div>
            ) : (
              <div className="space-y-3 p-3">
                {recent.map((notification) => {
                  const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.INFO;
                  const isRead = notification.isRead;
                  return (
                    <button
                      key={notification.userNotificationId || notification.id}
                      onClick={() => openNotification(notification)}
                      className={`relative flex w-full gap-4 rounded-2xl border px-4 py-4 text-left transition-all duration-200 ${
                        !isRead
                          ? `bg-white shadow-sm ${config.color.replace("text-", "border-")}`
                          : "border-gray-100 bg-white hover:bg-gray-50 hover:shadow-sm"
                      }`}
                    >
                      <div className={`mt-1 h-8 w-8 flex-shrink-0 rounded-xl ${config.bg} ${config.color}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <p className={`text-[15px] font-bold leading-tight ${!isRead ? config.color : "text-gray-700"}`}>
                            {notification.title}
                          </p>
                          {notification.priority && (
                            <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${PRIORITY_STYLES[notification.priority] || PRIORITY_STYLES.MEDIUM}`}>
                              {notification.priority}
                            </span>
                          )}
                        </div>
                        <p className="mt-1.5 line-clamp-2 text-[13px] font-medium leading-relaxed text-gray-500">
                          {notification.summary || notification.message}
                        </p>
                        <div className="mt-2.5 flex items-center justify-between gap-3">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                            {notification.createdAt ? formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true }) : ""}
                          </p>
                          {!isRead && (
                            <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${config.bg} ${config.color}`}>
                              New
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="border-t border-gray-50 bg-white p-2">
              <Link
                to="/notifications"
                onClick={() => setOpen(false)}
                className="block w-full rounded-xl py-3 text-center text-[13px] font-semibold text-indigo-600 transition-all hover:bg-gray-50"
              >
                Launch center
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBellV2;
