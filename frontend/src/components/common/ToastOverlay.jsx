import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../../context/LiveContext";
import { useAuth } from "../../context/AuthContext";
import { buildProtectedAssetUrl, messageAPI } from "../../services/api";

const TYPE_STYLES = {
  INFO: { bar: "bg-blue-500", bg: "bg-blue-50 border-blue-200" },
  SUCCESS: { bar: "bg-green-500", bg: "bg-green-50 border-green-200" },
  WARNING: { bar: "bg-yellow-500", bg: "bg-yellow-50 border-yellow-200" },
  ERROR: { bar: "bg-red-500", bg: "bg-red-50 border-red-200" },
  ANNOUNCEMENT: { bar: "bg-purple-500", bg: "bg-purple-50 border-purple-200" },
};

const PRIORITY_STYLES = {
  LOW: "bg-slate-100 text-slate-700",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-800 border border-orange-200",
  URGENT: "bg-red-600 text-white shadow-md animate-pulse",
};

const Toast = ({ toast, onClose }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cancelToastTimer, sendReply, markAsRead, setMessageRefreshKey, markConversationRead } = useNotifications();
  const styles = TYPE_STYLES[toast.type] || TYPE_STYLES.INFO;
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);

  const isUrgent = toast.priority === "URGENT";
  const bgClass = isUrgent ? "bg-red-50 border-red-500 border-2 shadow-[0_0_15px_rgba(239,68,68,0.4)]" : styles.bg;
  const barClass = isUrgent ? "bg-red-600 animate-pulse" : styles.bar;

  const isSender = toast.senderId && user?.id === toast.senderId && !toast.isSystem;
  const displayTitle = isSender ? "Notification Sent Successfully" : toast.title;
  const displayMessage = isSender
    ? "Your notification has been delivered to selected users."
    : toast.summary || toast.message;
  const downloadUrl = buildProtectedAssetUrl(toast.attachmentUrl);

  const openToastTarget = async () => {
    if (toast.userNotificationId && !toast.isRead) {
      await markAsRead(toast.userNotificationId);
    }
    navigate(toast.deepLink || "/notifications");
    onClose(toast.toastId);
  };

  const handleReplyClick = () => {
    setIsReplying(true);
    cancelToastTimer(toast.toastId);
  };

  const handleSendReply = async () => {
    if (!replyText.trim()) return;
    setIsSendingReply(true);
    try {
      if (toast.isDirectMessage) {
        // Direct Message Reply
        await messageAPI.send({ recipientId: toast.senderId, content: replyText.trim() });
        setMessageRefreshKey(k => k + 1);
      } else {
        // Notification Reply
        await sendReply(toast.id, replyText.trim());
      }
      onClose(toast.toastId);
    } catch (error) {
      console.error(error);
      setIsSendingReply(false);
    }
  };

  return (
    <div className={`toast-enter relative mb-3 flex w-80 items-start gap-3 overflow-hidden rounded-lg border p-4 shadow-lg ${bgClass}`}>
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${barClass}`} />

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-800">{displayTitle}</p>
            <p className="mt-0.5 line-clamp-2 text-xs text-gray-600">{displayMessage}</p>
          </div>
          {toast.priority && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${PRIORITY_STYLES[toast.priority] || PRIORITY_STYLES.MEDIUM}`}>
              {toast.priority}
            </span>
          )}
        </div>

        {toast.senderName && !isSender && (
          <p className="mt-1 text-xs font-bold uppercase tracking-tight text-gray-400">
            From: {toast.senderName}
          </p>
        )}

        {toast.count > 1 && toast.aggregatedItems?.length > 0 && (
          <div className="mt-2 rounded-md bg-white/70 p-2">
            <p className="text-[11px] font-bold text-gray-700">{toast.count} items grouped</p>
            <p className="mt-1 text-[11px] text-gray-500">{toast.aggregatedItems.join(" • ")}</p>
          </div>
        )}

        {!isReplying && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {!isSender && !toast.isSystem && (toast.canReply || toast.userNotificationId || toast.isDirectMessage) && (
              <div className="flex w-full items-center justify-between border-t border-gray-100 pt-3 mt-1">
                <div className="flex gap-4">
                  {(toast.canReply || toast.isDirectMessage) && (
                    <button
                      onClick={handleReplyClick}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                    >
                      Reply
                    </button>
                  )}
                  {(toast.userNotificationId || toast.isDirectMessage) && (
                    <button
                      onClick={async () => {
                        if (toast.userNotificationId) {
                          await markAsRead(toast.userNotificationId);
                        } else if (toast.isDirectMessage) {
                          await markConversationRead(toast.senderId);
                        }
                        onClose(toast.toastId);
                      }}
                      className="text-xs font-bold text-indigo-400 hover:text-indigo-600"
                    >
                      Mark as Read
                    </button>
                  )}
                </div>
                <button
                  onClick={openToastTarget}
                  className="text-xs font-bold text-gray-500 hover:text-gray-800 underline decoration-indigo-200"
                >
                  Open
                </button>
              </div>
            )}
            
            {downloadUrl && (
              <button
                onClick={() => {
                  window.open(downloadUrl, "_blank", "noopener,noreferrer");
                  onClose(toast.toastId);
                }}
                className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100"
              >
                Download File
              </button>
            )}
          </div>
        )}

        {isReplying && (
          <div className="mt-3 rounded border border-gray-200 bg-white/70 p-2">
            <textarea
              className="w-full resize-none rounded border border-gray-300 p-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Your reply..."
              rows={2}
              maxLength={500}
              value={replyText}
              onChange={(event) => setReplyText(event.target.value)}
              disabled={isSendingReply}
            />
            <div className="mt-1 flex items-center justify-end gap-2">
              <button
                onClick={() => onClose(toast.toastId)}
                className="px-2 py-1 text-[10px] font-bold uppercase text-gray-500 hover:text-gray-700"
                disabled={isSendingReply}
              >
                Cancel
              </button>
              <button
                onClick={handleSendReply}
                disabled={isSendingReply || !replyText.trim()}
                className="rounded bg-indigo-600 px-3 py-1 text-[10px] font-bold uppercase text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSendingReply ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        )}

        {isUrgent && (
          <button
            onClick={() => onClose(toast.toastId)}
            className="mt-3 w-full rounded bg-red-600 px-3 py-2 text-xs font-bold uppercase tracking-wider text-white shadow hover:bg-red-700 active:bg-red-800"
          >
            Acknowledge Priority Alert
          </button>
        )}
      </div>

      {!isUrgent && (
        <button
          onClick={() => onClose(toast.toastId)}
          className="flex-shrink-0 text-lg leading-none text-gray-400 hover:text-gray-600"
        >
          x
        </button>
      )}
    </div>
  );
};

const ToastOverlay = () => {
  const { toasts, removeToast } = useNotifications();

  return (
    <div className="pointer-events-none fixed top-4 right-4 z-[9999] flex flex-col items-end">
      {[...toasts]
        .sort((a, b) => (b.priority === "URGENT" ? 1 : 0) - (a.priority === "URGENT" ? 1 : 0))
        .map((toast) => (
        <div key={toast.toastId} className="pointer-events-auto">
          <Toast toast={toast} onClose={removeToast} />
        </div>
      ))}
    </div>
  );
};

export default ToastOverlay;
