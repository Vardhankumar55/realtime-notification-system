import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useNotifications } from "../context/LiveContext";
import { notificationAPI } from "../services/api";
import NavbarV2 from "../components/common/NavbarV2";
import NotificationCardV2 from "../components/notifications/NotificationCardV2";

const TYPE_CONFIG = {
  ALL: { label: "All", color: "text-indigo-600", bg: "bg-indigo-50" },
  INFO: { label: "Info", color: "text-blue-600", bg: "bg-blue-50" },
  SUCCESS: { label: "Success", color: "text-green-600", bg: "bg-green-50" },
  WARNING: { label: "Warning", color: "text-yellow-600", bg: "bg-yellow-50" },
  ERROR: { label: "Error", color: "text-red-600", bg: "bg-red-50" },
  ANNOUNCEMENT: { label: "Announcement", color: "text-purple-600", bg: "bg-purple-50" },
  EXAM_DATES: { label: "Exams", color: "text-indigo-600", bg: "bg-indigo-50" },
  ASSIGNMENT_DEADLINES: { label: "Assignments", color: "text-orange-600", bg: "bg-orange-50" },
  PLACEMENT_DRIVE_ALERTS: { label: "Placements", color: "text-emerald-600", bg: "bg-emerald-50" },
  HOLIDAY_ANNOUNCEMENTS: { label: "Holidays", color: "text-rose-600", bg: "bg-rose-50" },
  CLASSROOM_CHANGES: { label: "Classes", color: "text-cyan-600", bg: "bg-cyan-50" },
  ATTENDANCE_WARNINGS: { label: "Attendance", color: "text-amber-600", bg: "bg-amber-50" },
};

const STATUS_CONFIG = {
  ALL: { label: "All", color: "text-gray-600", bg: "bg-gray-100" },
  UNREAD: { label: "Unread", color: "text-indigo-600", bg: "bg-indigo-50" },
  READ: { label: "Read", color: "text-green-600", bg: "bg-green-50" },
  FAVORITES: { label: "Favorites", color: "text-yellow-600", bg: "bg-yellow-50" },
  PINNED: { label: "Pinned", color: "text-sky-600", bg: "bg-sky-50" },
  ARCHIVED: { label: "Archived", color: "text-gray-600", bg: "bg-gray-200" },
};

const PRIORITY_CONFIG = {
  ALL: { label: "Any Priority", color: "text-gray-600", bg: "bg-gray-100" },
  URGENT: { label: "Urgent", color: "text-red-600", bg: "bg-red-50" },
  HIGH: { label: "High", color: "text-orange-600", bg: "bg-orange-50" },
  MEDIUM: { label: "Medium", color: "text-blue-600", bg: "bg-blue-50" },
  LOW: { label: "Low", color: "text-slate-600", bg: "bg-slate-100" },
};

const NotificationCenterV2 = () => {
  const {
    notifications,
    markAsRead,
    unreadCount,
    fetchNotifications,
    deleteNotification,
    setNotifications,
    setUnreadCount,
    addToast,
    togglePin,
    toggleFavorite,
    toggleArchive,
    snoozeNotification,
  } = useNotifications();
  const [searchParams] = useSearchParams();
  const [filterType, setFilterType] = useState("ALL");
  const [filterRead, setFilterRead] = useState("ALL");
  const [filterPriority, setFilterPriority] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [archivedList, setArchivedList] = useState([]);
  const highlightedId = searchParams.get("notification");

  useEffect(() => {
    if (filterRead === "ARCHIVED") {
      setLoading(true);
      notificationAPI.filter({ isArchived: true }).then(res => {
        setArchivedList(res.data.data || []);
      }).finally(() => setLoading(false));
    }
  }, [filterRead]);

  useEffect(() => {
    if (!highlightedId) return;
    const target = notifications.find(
      (item) =>
        String(item.userNotificationId) === highlightedId || String(item.id) === highlightedId
    );
    if (target?.userNotificationId && !target.isRead) {
      markAsRead(target.userNotificationId);
    }
  }, [highlightedId, markAsRead, notifications]);

  const baseList = filterRead === "ARCHIVED" ? archivedList : notifications;

  const filtered = baseList.filter((notification) => {
    const matchType = filterType === "ALL" || notification.type === filterType;
    const matchRead =
      filterRead === "ALL" ||
      filterRead === "ARCHIVED" ||
      (filterRead === "READ" && notification.isRead) ||
      (filterRead === "UNREAD" && !notification.isRead) ||
      (filterRead === "FAVORITES" && notification.isFavorite) ||
      (filterRead === "PINNED" && notification.isPinned);
    const matchPriority = filterPriority === "ALL" || (notification.priority || "MEDIUM") === filterPriority;
    const haystack = [
      notification.title,
      notification.summary,
      notification.message,
      notification.sender?.name,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matchSearch = !search || haystack.includes(search.toLowerCase());
    return matchType && matchRead && matchPriority && matchSearch;
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
      addToast({ title: "Inbox Cleared", message: "All notifications have been removed.", type: "SUCCESS" });
    } catch (error) {
      addToast({ title: "Action Failed", message: "Failed to clear notifications.", type: "ERROR" });
    }
  };

  const handleDelete = async (userNotificationId) => {
    try {
      await deleteNotification(userNotificationId);
      addToast({ title: "Success", message: "Notification deleted successfully.", type: "SUCCESS" });
    } catch (error) {
      addToast({ title: "Error", message: "Failed to delete notification.", type: "ERROR" });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <NavbarV2 />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 px-2">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Notification Center</h1>
            <p className="mt-1 font-medium text-gray-500">
              {unreadCount > 0 ? (
                <span className="font-bold text-indigo-600">{unreadCount} pending alerts</span>
              ) : (
                <span className="font-bold text-green-600">Inbox clear</span>
              )}
              <span className="mx-2 text-gray-300">|</span>
              <span className="font-bold uppercase tracking-tighter text-gray-400">
                {notifications.length} total notifications
              </span>
            </p>
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition-all hover:bg-gray-50 active:scale-95 disabled:opacity-60"
            >
              <span className={loading ? "animate-spin" : ""}>O</span>
              Refresh
            </button>
            <button
              onClick={handleClearAll}
              className="flex items-center gap-2 rounded-2xl bg-red-50 px-5 py-2.5 text-sm font-bold text-red-600 transition-all hover:bg-red-100 active:scale-95"
            >
              Clear All
            </button>
          </div>
        </div>

        <div className="mb-8 space-y-5 rounded-3xl border border-gray-100 bg-white p-6 shadow-xl">
          <div className="relative group">
            <input
              type="text"
              placeholder="Search title, summary, message, sender..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-2xl border border-gray-200 py-3.5 pl-12 pr-6 text-sm font-medium outline-none transition-all placeholder:text-gray-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50"
            />
          </div>

          <div className="flex flex-col gap-6">
            <div className="w-full">
              <p className="mb-3 ml-1 text-sm font-medium text-gray-500">Notification Category</p>
              <div className="flex flex-wrap gap-2.5">
                {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => setFilterType(key)}
                    className={`rounded-2xl border-2 px-5 py-2.5 text-xs font-bold transition-all ${
                      filterType === key
                        ? `${config.bg} ${config.color} ${config.color.replace("text-", "border-")} scale-105 shadow-lg shadow-indigo-100/20`
                        : "border-gray-100 bg-white text-gray-500 hover:border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {config.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="w-full border-t border-gray-100 pt-6">
              <p className="mb-3 ml-1 text-sm font-medium text-gray-500">Status</p>
              <div className="flex flex-wrap gap-2.5">
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => setFilterRead(key)}
                    className={`rounded-2xl border-2 px-5 py-2.5 text-xs font-bold transition-all ${
                      filterRead === key
                        ? `${config.bg} ${config.color} ${config.color.replace("text-", "border-")} scale-105 shadow-lg`
                        : "border-gray-100 bg-white text-gray-500 hover:border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {config.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="w-full border-t border-gray-100 pt-6">
              <p className="mb-3 ml-1 text-sm font-medium text-gray-500">Priority</p>
              <div className="flex flex-wrap gap-2.5">
                {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => setFilterPriority(key)}
                    className={`rounded-2xl border-2 px-5 py-2.5 text-xs font-bold transition-all ${
                      filterPriority === key
                        ? `${config.bg} ${config.color} ${config.color.replace("text-", "border-")} scale-105 shadow-lg`
                        : "border-gray-100 bg-white text-gray-500 hover:border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {config.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 animate-fade-in">
          {filtered.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-200 bg-white py-24 text-center">
              <p className="text-sm font-medium text-gray-400">No notifications found.</p>
            </div>
          ) : (
            filtered.map((notification) => (
              <NotificationCardV2
                key={notification.userNotificationId || notification.id}
                notification={notification}
                highlighted={
                  String(notification.userNotificationId) === highlightedId ||
                  String(notification.id) === highlightedId
                }
                onMarkRead={!notification.isRead ? () => markAsRead(notification.userNotificationId) : undefined}
                onDelete={() => handleDelete(notification.userNotificationId)}
                onPin={togglePin}
                onFavorite={toggleFavorite}
                onArchive={toggleArchive}
                onSnooze={snoozeNotification}
                showActions
              />
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default NotificationCenterV2;
