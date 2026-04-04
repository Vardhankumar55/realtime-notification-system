import React, {
  createContext, useContext, useState,
  useEffect, useCallback, useRef,
} from "react";
import { notificationAPI, adminAPI } from "../services/api";
import wsService from "../services/websocket";
import { useAuth } from "./AuthContext";

/**
 * NotificationContext manages:
 * - notifications list (fetched on load + updated via WebSocket)
 * - unread count badge
 * - toast queue for real-time popup alerts
 * - WebSocket lifecycle (connect on login, disconnect on logout)
 */

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [replies, setReplies] = useState([]);
  const [unreadReplyCount, setUnreadReplyCount] = useState(0);
  const [toasts, setToasts] = useState([]);
  const [wsConnected, setWsConnected] = useState(false);
  const toastTimers = useRef({});
  const soundRef = useRef(new Audio("/sounds/samsung_spaceline.mp3"));

  // ── Sound Management ──────────────────────────────────────
  const playNotificationSound = useCallback(() => {
    if (user?.soundEnabled) {
      soundRef.current.currentTime = 0;
      soundRef.current.play().catch(e => console.log("Audio play blocked by browser:", e));
    }
  }, [user?.soundEnabled]);

  // ── Fetch notifications from REST API ──────────────────────
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await notificationAPI.getMy();
      const list = res.data.data || [];
      setNotifications(sortNotifications(list));
    } catch (e) {
      console.error("Failed to fetch notifications", e);
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await notificationAPI.getUnreadCount();
      setUnreadCount(res.data.data?.count || 0);
    } catch (e) {
      console.error("Failed to fetch unread count", e);
    }
  }, []);

  const fetchReplies = useCallback(async () => {
    if (user?.role !== "ROLE_ADMIN") return;
    try {
      const res = await adminAPI.getReplies();
      setReplies(res.data.data || []);
      const countRes = await adminAPI.getUnreadReplyCount();
      setUnreadReplyCount(countRes.data.data?.count || 0);
    } catch (e) {
      console.error("Failed to fetch replies", e);
    }
  }, [user?.role]);

  // ── Toast management ────────────────────────────────────────
  const addToast = useCallback((notification) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { ...notification, toastId: id }]);
    toastTimers.current[id] = setTimeout(() => removeToast(id), 5000);
  }, []);

  const removeToast = (toastId) => {
    clearTimeout(toastTimers.current[toastId]);
    delete toastTimers.current[toastId];
    setToasts((prev) => prev.filter((t) => t.toastId !== toastId));
  };

  const cancelToastTimer = useCallback((toastId) => {
    clearTimeout(toastTimers.current[toastId]);
    delete toastTimers.current[toastId];
  }, []);

  // Sort helper: Pinned first, then by date
  const sortNotifications = useCallback((list) => {
    return [...list].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, []);

  // ── Handle incoming WebSocket notification ─────────────────
  const handleIncomingNotification = useCallback((notification) => {
    if (notification.action === "PIN" || notification.action === "FAVORITE") {
      setNotifications((prev) => {
        const newList = prev.map((n) =>
          n.userNotificationId === notification.userNotificationId
            ? { ...n, isPinned: notification.isPinned, isFavorite: notification.isFavorite }
            : n
        );
        return sortNotifications(newList);
      });
      return;
    }

    if (notification.action === "DELETE") {
      // Use latest notifications state to find if we had this item
      const item = notifications.find((n) => 
        (notification.userNotificationId && n.userNotificationId === notification.userNotificationId) ||
        (!notification.userNotificationId && n.id === notification.id)
      );

      if (item) {
        addToast({
          title: "Notification Removed",
          message: `"${notification.title || 'Untitled'}" was deleted by an admin.`,
          type: "INFO",
          isSystem: true
        });
        if (!item.isRead) {
          setUnreadCount((c) => Math.max(0, c - 1));
        }
      }

      setNotifications((prev) => prev.filter((n) => 
        !(notification.userNotificationId && n.userNotificationId === notification.userNotificationId) &&
        !(notification.id && n.id === notification.id)
      ));
      return;
    }

    if (notification.action === "CLEAR_ALL") {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    if (notification.action === "MARK_ALL_READ") {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      return;
    }

    if (notification.action === "EDITING") {
      // Don't show toast for self
      if (notification.adminId === user?.id) return;

      addToast({
        title: "Notification Update Incoming",
        message: "Admin is Editing the Notification please wait",
        type: "INFO",
        isSystem: true
      });
      return;
    }

    if (notification.action === "UPDATE") {
      // Don't show toast for self
      if (notification.adminId !== user?.id) {
        addToast({
          title: "Notification Updated",
          message: `"${notification.title}" has been updated successfully by an admin.`,
          type: "SUCCESS",
          isSystem: true
        });
      }
      setNotifications((prev) => {
        const existing = prev.find((n) => (n.id === notification.id || n.userNotificationId === notification.userNotificationId));
        
        if (existing) {
          // Normal update
          return prev.map((n) =>
            (n.id === notification.id || n.userNotificationId === notification.userNotificationId) ? {
              ...n,
              title: notification.title,
              message: notification.message,
              type: notification.type,
              editedAt: notification.editedAt,
              attachmentUrl: notification.attachmentUrl,
              attachmentName: notification.attachmentName,
            } : n
          );
        } else {
          // Re-pushed notification: it was deleted but now it's back
          setUnreadCount(c => c + 1);
          const newItem = {
            id: notification.id,
            userNotificationId: notification.userNotificationId,
            title: notification.title,
            message: notification.message,
            type: notification.type,
            createdAt: notification.createdAt,
            editedAt: notification.editedAt,
            isRead: false,
            sender: { 
              id: notification.senderId, 
              name: notification.senderName 
            },
            attachmentUrl: notification.attachmentUrl,
            attachmentName: notification.attachmentName,
          };
          // Put it at top
          return [newItem, ...prev];
        }
      });
      setToasts((prev) => 
        prev.map((t) => 
          t.id === notification.id ? { ...t, title: notification.title, message: notification.message, type: notification.type } : t
        )
      );
      return;
    }

    // New Notification case
    const isSender = notification.senderId === user?.id;
    setNotifications((prev) => {
      const newItem = {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        sender: { name: isSender ? "You" : notification.senderName },
        createdAt: notification.createdAt,
        editedAt: notification.editedAt,
        userNotificationId: notification.userNotificationId,
        isRead: false,
        isPinned: notification.isPinned || false,
        isFavorite: notification.isFavorite || false,
        attachmentUrl: notification.attachmentUrl,
        attachmentName: notification.attachmentName,
      };
      return sortNotifications([newItem, ...prev]);
    });

    if (!isSender) {
      setUnreadCount((c) => c + 1);
      addToast(notification);
      playNotificationSound();
    } else if (notification.action === "PUSH") {
      addToast({
        ...notification,
        sender: null,
        title: "Notification Sent Successfully",
        message: "Your notification has been delivered successfully.",
        type: "SUCCESS",
        isSystem: true
      });
      playNotificationSound();
    }
  }, [addToast, user?.id, sortNotifications, notifications, playNotificationSound]);

  // ── Handle incoming WebSocket reply (Admin Only) ────────────
  const handleIncomingReply = useCallback((reply) => {
    setReplies((prev) => [reply, ...prev]);
    setUnreadReplyCount((c) => c + 1);
    addToast({
      id: `reply-${reply.id}`,
      title: "New User Reply",
      message: `${reply.userName} replied to: ${reply.notificationTitle}`,
      type: "INFO",
      isSystem: true,
    });
    playNotificationSound();
  }, [addToast, playNotificationSound]);

  // Use a ref for the handler to avoid re-connecting on every dependency change
  const handlerRef = useRef(handleIncomingNotification);
  useEffect(() => {
    handlerRef.current = handleIncomingNotification;
  }, [handleIncomingNotification]);

  // ── Mark as read ────────────────────────────────────────────
  const markAsRead = async (userNotificationId) => {
    try {
      await notificationAPI.markRead(userNotificationId);
      setNotifications((prev) =>
        prev.map((n) =>
          n.userNotificationId === userNotificationId ? { ...n, isRead: true } : n
        )
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (e) {
      console.error("Failed to mark as read", e);
    }
  };

  const markAllRead = async () => {
    try {
      await notificationAPI.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error("Failed to mark all as read", e);
    }
  };

  const deleteNotification = async (userNotificationId) => {
    try {
      await notificationAPI.deleteFromView(userNotificationId);
      const target = notifications.find(n => n.userNotificationId === userNotificationId);
      if (target && !target.isRead) {
        setUnreadCount(c => Math.max(0, c - 1));
      }
      setNotifications(prev => prev.filter(n => n.userNotificationId !== userNotificationId));
    } catch (e) {
      console.error("Failed to delete notification", e);
    }
  };

  const togglePin = async (userNotificationId) => {
    try {
      const res = await notificationAPI.pin(userNotificationId);
      const updated = res.data.data;
      setNotifications((prev) => {
        const newList = prev.map((n) =>
          n.userNotificationId === userNotificationId
            ? { ...n, isPinned: updated.isPinned }
            : n
        );
        return sortNotifications(newList);
      });
      addToast({
        title: updated.isPinned ? "Notification Pinned" : "Notification Unpinned",
        message: updated.isPinned ? "This notification will stay at the top." : "Notification returned to normal position.",
        type: "SUCCESS",
        isSystem: true
      });
    } catch (e) {
      console.error("Failed to toggle pin", e);
    }
  };

  const toggleFavorite = async (userNotificationId) => {
    try {
      const res = await notificationAPI.favorite(userNotificationId);
      const updated = res.data.data;
      setNotifications((prev) =>
        prev.map((n) =>
          n.userNotificationId === userNotificationId
            ? { ...n, isFavorite: updated.isFavorite }
            : n
        )
      );
      addToast({
        title: updated.isFavorite ? "Added to Favorites" : "Removed from Favorites",
        message: updated.isFavorite ? "Saved for quick access." : "No longer a favorite.",
        type: "SUCCESS",
        isSystem: true
      });
    } catch (e) {
      console.error("Failed to toggle favorite", e);
    }
  };

  const sendReply = async (notificationId, message) => {
    try {
      const res = await notificationAPI.reply(notificationId, { message });
      addToast({
        title: "Reply Sent",
        message: "Your message has been delivered to the admin.",
        type: "SUCCESS",
        isSystem: true,
      });
      return res.data.data;
    } catch (e) {
      console.error("Failed to send reply", e);
      throw e;
    }
  };

  const markReplyRead = async (replyId) => {
    try {
      await adminAPI.markReplyRead(replyId);
      setReplies((prev) =>
        prev.map((r) => (r.id === replyId ? { ...r, isReadByAdmin: true } : r))
      );
      setUnreadReplyCount((c) => Math.max(0, c - 1));
    } catch (e) {
      console.error("Failed to mark reply as read", e);
    }
  };

  // ── WebSocket connect/disconnect ────────────────────────────
  useEffect(() => {
    if (isAuthenticated && user?.email) {
      fetchNotifications();
      fetchUnreadCount();
      if (user?.role === "ROLE_ADMIN") {
        fetchReplies();
      }
      wsService.connect(
        user.email,
        user?.role === "ROLE_ADMIN",
        (msg) => handlerRef.current(msg),
        (reply) => handleIncomingReply(reply),
        () => setWsConnected(true),
        () => setWsConnected(false)
      );
    } else {
      wsService.disconnect();
      setWsConnected(false);
      setNotifications([]);
      setUnreadCount(0);
    }

    return () => {
      // Snapshot the ref value so cleanup uses the value at effect invocation time
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const timers = toastTimers.current;
      Object.values(timers).forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.email]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        toasts,
        wsConnected,
        fetchNotifications,
        fetchUnreadCount,
        markAsRead,
        markAllRead,
        deleteNotification,
        addToast,
        removeToast,
        cancelToastTimer,
        setNotifications,

        setUnreadCount,
        togglePin,
        toggleFavorite,
        replies,
        unreadReplyCount,
        sendReply,
        fetchReplies,
        markReplyRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be inside NotificationProvider");
  return ctx;
};
