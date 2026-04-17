import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { notificationAPI, adminAPI, messageAPI } from "../services/api";
import wsService from "../services/websocket";
import pushService from "../services/pushNotification";
import { useAuth } from "./AuthContext";

const LiveContext = createContext(null);

const PRIORITY_ORDER = {
  URGENT: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

const normalizeDeepLink = (notification) => {
  if (notification?.deepLink) return notification.deepLink;
  if (notification?.userNotificationId) return `/notifications?notification=${notification.userNotificationId}`;
  if (notification?.id) return `/notifications?notification=${notification.id}`;
  return "/notifications";
};

export const NotificationProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [replies, setReplies] = useState([]);
  const [unreadReplyCount, setUnreadReplyCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [messageRefreshKey, setMessageRefreshKey] = useState(0);
  const [lastIncomingMessage, setLastIncomingMessage] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushPermission, setPushPermission] = useState('default');
  const toastTimers = useRef({});
  const soundRef = useRef(new Audio("/sounds/samsung_spaceline.mp3"));

  const playNotificationSound = useCallback(() => {
    if (user?.soundEnabled) {
      soundRef.current.currentTime = 0;
      soundRef.current.play().catch((error) => console.log("Audio play blocked by browser:", error));
    }
  }, [user?.soundEnabled]);

  const sortNotifications = useCallback((list) => {
    return [...list].sort((left, right) => {
      if (left.isPinned && !right.isPinned) return -1;
      if (!left.isPinned && right.isPinned) return 1;
      const priorityDelta =
        (PRIORITY_ORDER[right.priority] || PRIORITY_ORDER.MEDIUM) -
        (PRIORITY_ORDER[left.priority] || PRIORITY_ORDER.MEDIUM);
      if (priorityDelta !== 0) return priorityDelta;
      return new Date(right.createdAt) - new Date(left.createdAt);
    });
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await notificationAPI.getMy();
      setNotifications(sortNotifications(res.data.data || []));
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    }
  }, [sortNotifications]);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await notificationAPI.getUnreadCount();
      setUnreadCount(res.data.data?.count || 0);
    } catch (error) {
      console.error("Failed to fetch unread count", error);
    }
  }, []);

  const fetchReplies = useCallback(async () => {
    if (user?.role !== "ROLE_ADMIN") return;
    try {
      const res = await adminAPI.getReplies();
      setReplies(res.data.data || []);
      const countRes = await adminAPI.getUnreadReplyCount();
      setUnreadReplyCount(countRes.data.data?.count || 0);
    } catch (error) {
      console.error("Failed to fetch replies", error);
    }
  }, [user?.role]);

  const fetchUnreadMessagesCount = useCallback(async () => {
    try {
      const res = await messageAPI.getUnreadCount();
      setUnreadMessagesCount(res.data.data?.count || 0);
    } catch (error) {
      console.error("Failed to fetch unread message count", error);
    }
  }, []);

  const removeToast = useCallback((toastId) => {
    clearTimeout(toastTimers.current[toastId]);
    delete toastTimers.current[toastId];
    setToasts((prev) => prev.filter((toast) => toast.toastId !== toastId));
  }, []);

  const scheduleToastRemoval = useCallback((toastId) => {
    clearTimeout(toastTimers.current[toastId]);
    toastTimers.current[toastId] = setTimeout(() => removeToast(toastId), 5000);
  }, [removeToast]);

  const cancelToastTimer = useCallback((toastId) => {
    clearTimeout(toastTimers.current[toastId]);
    delete toastTimers.current[toastId];
  }, []);

  const addToast = useCallback((toast) => {
    const freshId = Date.now() + Math.floor(Math.random() * 1000);
    let activeToastId = freshId;

    setToasts((prev) => {
      if (toast.groupToastKey) {
        const existing = prev.find((item) => item.groupToastKey === toast.groupToastKey);
        if (existing) {
          activeToastId = existing.toastId;
          const labels = [...(existing.aggregatedItems || []), toast.title || toast.senderName || "New item"].slice(-3);
          const nextCount = (existing.count || 1) + 1;
          return prev.map((item) =>
            item.toastId === existing.toastId
              ? {
                  ...item,
                  count: nextCount,
                  aggregatedItems: labels,
                  title: toast.groupTitle || existing.title,
                  message:
                    nextCount === 2
                      ? "Multiple items updated"
                      : `${nextCount} items processed successfully`,
                  deepLink: toast.deepLink || existing.deepLink,
                  summary: toast.summary || existing.summary,
                }
              : item
          );
        }
      }

      return [
        ...prev,
        {
          ...toast,
          toastId: freshId,
          count: toast.count || 1,
          aggregatedItems: toast.aggregatedItems || [],
        },
      ];
    });

    setTimeout(() => scheduleToastRemoval(activeToastId), 0);
  }, [scheduleToastRemoval]);

  const handleIncomingNotification = useCallback((notification) => {
    if (notification.action === "PIN" || notification.action === "FAVORITE") {
      setNotifications((prev) => sortNotifications(
        prev.map((item) =>
          item.userNotificationId === notification.userNotificationId
            ? { ...item, isPinned: notification.isPinned, isFavorite: notification.isFavorite }
            : item
        )
      ));
      return;
    }

    if (notification.action === "DELETE") {
      const existing = notifications.find((item) =>
        (notification.userNotificationId && item.userNotificationId === notification.userNotificationId) ||
        (!notification.userNotificationId && item.id === notification.id)
      );

      if (existing) {
        addToast({
          title: "Notification Removed",
          message: `"${notification.title || "Untitled"}" was deleted by an admin.`,
          type: "INFO",
          isSystem: true,
        });
        if (!existing.isRead) {
          setUnreadCount((count) => Math.max(0, count - 1));
        }
      }

      setNotifications((prev) => prev.filter((item) =>
        !(notification.userNotificationId && item.userNotificationId === notification.userNotificationId) &&
        !(notification.id && item.id === notification.id)
      ));
      return;
    }

    if (notification.action === "CLEAR_ALL") {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    if (notification.action === "MARK_ALL_READ") {
      const now = new Date().toISOString();
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true, readAt: item.readAt || now })));
      setUnreadCount(0);
      return;
    }

    if (notification.action === "EDITING") {
      if (notification.adminId === user?.id) return;
      addToast({
        title: "Notification Update Incoming",
        message: "An admin is editing this notification.",
        type: "INFO",
        isSystem: true,
        deepLink: normalizeDeepLink(notification),
      });
      return;
    }

    if (notification.action === "UPDATE") {
      if (notification.adminId !== user?.id) {
        addToast({
          title: "Notification Updated",
          message: notification.summary || `"${notification.title}" was updated.`,
          type: "SUCCESS",
          isSystem: true,
          deepLink: normalizeDeepLink(notification),
        });
      }

      setNotifications((prev) => {
        const existing = prev.find((item) =>
          item.id === notification.id || item.userNotificationId === notification.userNotificationId
        );

        if (existing) {
          if (notification.isArchived || (notification.snoozedUntil && new Date(notification.snoozedUntil) > new Date())) {
            if (!existing.isRead) setUnreadCount(count => Math.max(0, count - 1));
            return prev.filter(item => item.id !== notification.id && item.userNotificationId !== notification.userNotificationId);
          }
          return sortNotifications(prev.map((item) =>
            item.id === notification.id || item.userNotificationId === notification.userNotificationId
              ? {
                  ...item,
                  title: notification.title,
                  message: notification.message,
                  summary: notification.summary,
                  type: notification.type,
                  priority: notification.priority || "MEDIUM",
                  editedAt: notification.editedAt,
                  attachmentUrl: notification.attachmentUrl,
                  attachmentName: notification.attachmentName,
                  actionButtonText: notification.actionButtonText,
                  actionButtonUrl: notification.actionButtonUrl,
                  deepLink: normalizeDeepLink(notification),
                }
              : item
          ));
        }

        setUnreadCount((count) => count + 1);
        return sortNotifications([
          {
            id: notification.id,
            userNotificationId: notification.userNotificationId,
            title: notification.title,
            message: notification.message,
            summary: notification.summary,
            type: notification.type,
            priority: notification.priority || "MEDIUM",
            createdAt: notification.createdAt,
            editedAt: notification.editedAt,
            isRead: false,
            sender: {
              id: notification.senderId,
              name: notification.senderName,
            },
            attachmentName: notification.attachmentName,
            actionButtonText: notification.actionButtonText,
            actionButtonUrl: notification.actionButtonUrl,
            snoozedUntil: notification.snoozedUntil,
            isArchived: notification.isArchived,
            deepLink: normalizeDeepLink(notification),
            canReply: notification.canReply,
          },
          ...prev,
        ]);
      });
      return;
    }

    const isSender = notification.senderId === user?.id;
    const newItem = {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      summary: notification.summary,
      type: notification.type,
      priority: notification.priority || "MEDIUM",
      sender: { name: isSender ? "You" : notification.senderName },
      createdAt: notification.createdAt,
      editedAt: notification.editedAt,
      userNotificationId: notification.userNotificationId,
      isRead: false,
      isPinned: notification.isPinned || false,
      isFavorite: notification.isFavorite || false,
      attachmentUrl: notification.attachmentUrl,
      attachmentName: notification.attachmentName,
      deepLink: normalizeDeepLink(notification),
      canReply: notification.canReply,
    };

    setNotifications((prev) => sortNotifications([newItem, ...prev]));

    if (!isSender) {
      setUnreadCount((count) => count + 1);
      addToast({
        title: notification.title,
        message: notification.summary || notification.message,
        summary: notification.summary,
        type: notification.type || "INFO",
        deepLink: normalizeDeepLink(notification),
        groupToastKey: "live-notifications",
        groupTitle: "New notifications",
      });
      playNotificationSound();
      return;
    }

    if (notification.action === "PUSH") {
      addToast({
        title: "Notification Sent Successfully",
        message: "Your notification has been delivered successfully.",
        type: "SUCCESS",
        isSystem: true,
        deepLink: normalizeDeepLink(notification),
      });
      playNotificationSound();
    }
  }, [addToast, notifications, playNotificationSound, sortNotifications, user?.id]);

  const handleIncomingReply = useCallback((reply) => {
    setReplies((prev) => [reply, ...prev]);
    setUnreadReplyCount((count) => count + 1);
    addToast({
      id: `reply-${reply.id}`,
      title: "New User Reply",
      message: `${reply.userName} replied to: ${reply.notificationTitle}`,
      type: "INFO",
      isSystem: true,
    });
    playNotificationSound();
  }, [addToast, playNotificationSound]);

  const handleIncomingDirectMessage = useCallback((messageEvent) => {
    setMessageRefreshKey((key) => key + 1);
    setLastIncomingMessage(messageEvent);
    setUnreadMessagesCount((count) => count + 1);
    addToast({
      id: messageEvent.id,
      senderId: messageEvent.senderId,
      senderName: messageEvent.senderName,
      title: `Message from ${messageEvent.senderName}`,
      message: messageEvent.content,
      summary: messageEvent.content,
      type: "INFO",
      canReply: true,
      isDirectMessage: true,
      deepLink: messageEvent.deepLink || `/messages?user=${messageEvent.senderId}`,
      groupToastKey: "direct-messages",
      groupTitle: "New messages",
    });
    playNotificationSound();
  }, [addToast, playNotificationSound, user?.id]);

  const notificationHandlerRef = useRef(handleIncomingNotification);
  useEffect(() => {
    notificationHandlerRef.current = handleIncomingNotification;
  }, [handleIncomingNotification]);

  const markAsRead = async (userNotificationId) => {
    try {
      const res = await notificationAPI.markRead(userNotificationId);
      const updated = res.data.data;
      setNotifications((prev) =>
        prev.map((item) =>
          item.userNotificationId === userNotificationId
            ? { ...item, isRead: true, readAt: updated?.readAt || new Date().toISOString() }
            : item
        )
      );
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (error) {
      console.error("Failed to mark as read", error);
    }
  };

  const markAllRead = async () => {
    try {
      await notificationAPI.markAllRead();
      const now = new Date().toISOString();
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true, readAt: item.readAt || now })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all as read", error);
    }
  };

  const deleteNotification = async (userNotificationId) => {
    try {
      await notificationAPI.deleteFromView(userNotificationId);
      const existing = notifications.find((item) => item.userNotificationId === userNotificationId);
      if (existing && !existing.isRead) {
        setUnreadCount((count) => Math.max(0, count - 1));
      }
      setNotifications((prev) => prev.filter((item) => item.userNotificationId !== userNotificationId));
    } catch (error) {
      console.error("Failed to delete notification", error);
    }
  };

  const togglePin = async (userNotificationId) => {
    try {
      const res = await notificationAPI.pin(userNotificationId);
      const updated = res.data.data;
      setNotifications((prev) => sortNotifications(
        prev.map((item) =>
          item.userNotificationId === userNotificationId ? { ...item, isPinned: updated.isPinned } : item
        )
      ));
      addToast({
        title: updated.isPinned ? "Notification Pinned" : "Notification Unpinned",
        message: updated.isPinned ? "This notification will stay at the top." : "Notification returned to normal position.",
        type: "SUCCESS",
        isSystem: true,
      });
    } catch (error) {
      console.error("Failed to toggle pin", error);
    }
  };

  const toggleFavorite = async (userNotificationId) => {
    try {
      const res = await notificationAPI.favorite(userNotificationId);
      const updated = res.data.data;
      setNotifications((prev) =>
        prev.map((item) =>
          item.userNotificationId === userNotificationId ? { ...item, isFavorite: updated.isFavorite } : item
        )
      );
      addToast({
        title: updated.isFavorite ? "Added to Favorites" : "Removed from Favorites",
        message: updated.isFavorite ? "Saved for quick access." : "No longer a favorite.",
        type: "SUCCESS",
        isSystem: true,
      });
    } catch (error) {
      console.error("Failed to toggle favorite", error);
    }
  };

  const toggleArchive = async (userNotificationId) => {
    try {
      await notificationAPI.archive(userNotificationId);
    } catch (error) {
      console.error("Failed to toggle archive", error);
    }
  };

  const snoozeNotification = async (userNotificationId, minutes) => {
    try {
      await notificationAPI.snooze(userNotificationId, { snoozeMinutes: minutes });
    } catch (error) {
      console.error("Failed to snooze notification", error);
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
    } catch (error) {
      console.error("Failed to send reply", error);
      throw error;
    }
  };

  const markReplyRead = async (replyId) => {
    try {
      await adminAPI.markReplyRead(replyId);
      setReplies((prev) => prev.map((reply) => (reply.id === replyId ? { ...reply, isReadByAdmin: true } : reply)));
      setUnreadReplyCount((count) => Math.max(0, count - 1));
    } catch (error) {
      console.error("Failed to mark reply as read", error);
    }
  };

  const markConversationRead = async (otherUserId) => {
    try {
      await messageAPI.markConversationRead(otherUserId);
      await fetchUnreadMessagesCount();
      setMessageRefreshKey((key) => key + 1);
    } catch (error) {
      console.error("Failed to mark conversation as read", error);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.email) {
      fetchNotifications();
      fetchUnreadCount();
      fetchUnreadMessagesCount();
      if (user?.role === "ROLE_ADMIN") {
        fetchReplies();
      }
      wsService.connect(
        user.email,
        user?.role === "ROLE_ADMIN",
        (message) => notificationHandlerRef.current(message),
        (reply) => handleIncomingReply(reply),
        (directMessage) => handleIncomingDirectMessage(directMessage),
        () => setWsConnected(true),
        () => setWsConnected(false)
      );

      // 🔔 Initialize Web Push (for notifications even when site is closed)
      const initPush = async () => {
        const supported = await pushService.init();
        setPushSupported(supported);
        if (supported) {
          setPushPermission(pushService.getPermissionState());
          const isSubbed = await pushService.isSubscribed();
          setPushSubscribed(isSubbed);

          // Auto-subscribe if permission was previously granted
          if (pushService.getPermissionState() === 'granted' && !isSubbed) {
            const token = localStorage.getItem('token');
            if (token) {
              const success = await pushService.subscribe(token);
              setPushSubscribed(success);
            }
          }
        }
      };
      initPush();
    } else {
      wsService.disconnect();
      setWsConnected(false);
      setNotifications([]);
      setUnreadCount(0);
      setUnreadMessagesCount(0);
    }

    return () => {
      const timers = toastTimers.current;
      Object.values(timers).forEach(clearTimeout);
    };
  }, [
    fetchNotifications,
    fetchReplies,
    fetchUnreadCount,
    fetchUnreadMessagesCount,
    handleIncomingDirectMessage,
    handleIncomingReply,
    isAuthenticated,
    user?.email,
    user?.role,
  ]);

  // 🔔 Push notification controls
  const enablePushNotifications = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      const success = await pushService.subscribe(token);
      setPushSubscribed(success);
      setPushPermission(pushService.getPermissionState());
      if (success) {
        addToast({
          title: "Push Notifications Enabled",
          message: "You'll now receive notifications even when this site is closed!",
          type: "SUCCESS",
          isSystem: true,
        });
      }
      return success;
    }
    return false;
  };

  const disablePushNotifications = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      await pushService.unsubscribe(token);
      setPushSubscribed(false);
      addToast({
        title: "Push Notifications Disabled",
        message: "You'll only receive notifications when this site is open.",
        type: "INFO",
        isSystem: true,
      });
    }
  };

  return (
    <LiveContext.Provider
      value={{
        notifications,
        unreadCount,
        replies,
        unreadReplyCount,
        unreadMessagesCount,
        messageRefreshKey,
        lastIncomingMessage,
        setLastIncomingMessage,
        toasts,
        wsConnected,
        pushSupported,
        pushSubscribed,
        pushPermission,
        enablePushNotifications,
        disablePushNotifications,
        fetchNotifications,
        fetchUnreadCount,
        fetchUnreadMessagesCount,
        fetchReplies,
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
        toggleArchive,
        snoozeNotification,
        sendReply,
        markReplyRead,
        markConversationRead,
      }}
    >
      {children}
    </LiveContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(LiveContext);
  if (!ctx) throw new Error("useNotifications must be inside NotificationProvider");
  return ctx;
};
