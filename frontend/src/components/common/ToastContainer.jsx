import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useNotifications } from "../../context/NotificationContext";
import { useAuth } from "../../context/AuthContext";


/**
 * Toast notification overlay — displayed in the top-right corner.
 * Shows real-time incoming notifications for 5 seconds each.
 * Stacks multiple toasts vertically.
 */

const TYPE_STYLES = {
  INFO:         { bar: "bg-blue-500",   icon: "ℹ️",  bg: "bg-blue-50 border-blue-200" },
  SUCCESS:      { bar: "bg-green-500",  icon: "✅",  bg: "bg-green-50 border-green-200" },
  WARNING:      { bar: "bg-yellow-500", icon: "⚠️",  bg: "bg-yellow-50 border-yellow-200" },
  ERROR:        { bar: "bg-red-500",    icon: "❌",  bg: "bg-red-50 border-red-200" },
  ANNOUNCEMENT: { bar: "bg-purple-500", icon: "📢",  bg: "bg-purple-50 border-purple-200" },
};

const Toast = ({ toast, onClose }) => {
  const { user } = useAuth();
  const { cancelToastTimer, sendReply, markAsRead } = useNotifications();
  const styles = TYPE_STYLES[toast.type] || TYPE_STYLES.INFO;

  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);

  // Determine if this user is the one who sent the notification
  const isSender = toast.senderId && user?.id === toast.senderId && !toast.isSystem;

  const displayTitle = isSender ? "Notification Sent Successfully" : toast.title;
  const displayMessage = isSender
    ? "Your notification has been delivered to selected users"
    : toast.message;

  const handleReplyClick = () => {
    setIsReplying(true);
    cancelToastTimer(toast.toastId);
  };

  const handleSendReply = async () => {
    if (!replyText.trim()) return;
    setIsSendingReply(true);
    try {
      await sendReply(toast.id, replyText.trim());
      onClose(toast.toastId);
    } catch (e) {
      console.error(e);
      setIsSendingReply(false);
    }
  };

  const handleMarkAsRead = async () => {
    if (toast.userNotificationId) {
      await markAsRead(toast.userNotificationId);
    }
    onClose(toast.toastId);
  };

  return (
    <div
      className={`toast-enter flex items-start gap-3 w-80 rounded-lg border shadow-lg p-4 mb-3 ${styles.bg} relative overflow-hidden`}
    >
      {/* Colored side bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${styles.bar} rounded-l-lg`} />

      <span className="text-xl mt-0.5 ml-1">{styles.icon}</span>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-800 text-sm truncate">{displayTitle}</p>
        <p className="text-gray-600 text-xs mt-0.5 line-clamp-2">{displayMessage}</p>
        {toast.senderName && !isSender && (
          <p className="text-gray-400 text-xs mt-1 uppercase tracking-tight font-bold">
            From: {toast.senderName}
          </p>
        )}
        
        
        {toast.showViewButton && !isReplying && (
           <Link 
             to="/notifications" 
             onClick={() => onClose(toast.toastId)}
             className="block mt-1.5 text-xs font-bold text-indigo-600 hover:underline"
           >
             View Notifications →
           </Link>
        )}

        {/* Attachment download in toast */}
        {toast.attachmentUrl && !isReplying && (
          <div className="mt-2 group pointer-events-auto">
            <button
               onClick={(e) => {
                 e.stopPropagation();
                 const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';
                 const apiRoot = apiBase.replace(/\/api$/, '');
                 window.open(`${apiRoot}${toast.attachmentUrl}`, '_blank');
                 onClose(toast.toastId);
               }}
               className="flex items-center gap-1 text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full border border-indigo-100 hover:bg-indigo-100 transition-all truncate max-w-[180px]"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {toast.attachmentName || "Download"}
            </button>
          </div>
        )}

        {/* Action Buttons */}
        {!isSender && !toast.isSystem && !isReplying && (toast.canReply || toast.userNotificationId) && (
          <div className="flex items-center gap-3 mt-3 pt-2 border-t border-gray-100">
            {toast.canReply && (
              <button
                onClick={handleReplyClick}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                Reply
              </button>
            )}
            {toast.userNotificationId && !toast.canReply && (
              <button
                onClick={handleMarkAsRead}
                className="text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors"
              >
                Mark as Read
              </button>
            )}
            {toast.canReply && toast.userNotificationId && (
              <button
                onClick={handleMarkAsRead}
                className="text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors"
              >
                Mark as Read
              </button>
            )}
          </div>
        )}

        {/* Reply Area */}
        {isReplying && (
          <div className="mt-3 bg-white/50 rounded p-2 border border-gray-200">
            <textarea
              className="w-full text-xs p-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
              placeholder="Your reply..."
              rows={2}
              maxLength={500}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              disabled={isSendingReply}
            />
            <div className="flex items-center justify-end gap-2 mt-1">
              <button
                onClick={() => onClose(toast.toastId)}
                className="text-[10px] uppercase font-bold text-gray-500 hover:text-gray-700 px-2 py-1"
                disabled={isSendingReply}
              >
                Cancel
              </button>
              <button
                onClick={handleSendReply}
                disabled={isSendingReply || !replyText.trim()}
                className="text-[10px] uppercase font-bold text-white bg-indigo-600 px-3 py-1 rounded shadow-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSendingReply ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={() => onClose(toast.toastId)}
        className="text-gray-400 hover:text-gray-600 text-lg leading-none flex-shrink-0"
      >
        ×
      </button>
    </div>
  );
};

const ToastContainer = () => {
  const { toasts, removeToast } = useNotifications();

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col items-end pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.toastId} className="pointer-events-auto">
          <Toast toast={toast} onClose={removeToast} />
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
