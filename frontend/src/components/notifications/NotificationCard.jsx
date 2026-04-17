import React, { useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { useNotifications } from "../../context/LiveContext";

/**
 * Reusable card for displaying a single notification.
 * Shows: type badge, title, message, sender, time, read status.
 * Actions: mark as read, delete (admin).
 */

const TYPE_CONFIG = {
  INFO: {
    bg: "bg-blue-50/50",
    border: "border-blue-100",
    badge: "bg-blue-100 text-blue-700",
    icon: (
      <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  SUCCESS: {
    bg: "bg-green-50/50",
    border: "border-green-100",
    badge: "bg-green-100 text-green-700",
    icon: (
      <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  WARNING: {
    bg: "bg-yellow-50/50",
    border: "border-yellow-100",
    badge: "bg-yellow-100 text-yellow-700",
    icon: (
      <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    )
  },
  ERROR: {
    bg: "bg-red-50/50",
    border: "border-red-100",
    badge: "bg-red-100 text-red-700",
    icon: (
      <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  ANNOUNCEMENT: {
    bg: "bg-purple-50/50",
    border: "border-purple-100",
    badge: "bg-purple-100 text-purple-700",
    icon: (
      <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
      </svg>
    )
  },
  EXAM_DATES: {
    bg: "bg-indigo-50/50",
    border: "border-indigo-100",
    badge: "bg-indigo-100 text-indigo-700",
    icon: (
      <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )
  },
  ASSIGNMENT_DEADLINES: {
    bg: "bg-orange-50/50",
    border: "border-orange-100",
    badge: "bg-orange-100 text-orange-700",
    icon: (
      <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  PLACEMENT_DRIVE_ALERTS: {
    bg: "bg-emerald-50/50",
    border: "border-emerald-100",
    badge: "bg-emerald-100 text-emerald-700",
    icon: (
      <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    )
  },
  HOLIDAY_ANNOUNCEMENTS: {
    bg: "bg-rose-50/50",
    border: "border-rose-100",
    badge: "bg-rose-100 text-rose-700",
    icon: (
      <svg className="w-5 h-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
    )
  },
  CLASSROOM_CHANGES: {
    bg: "bg-cyan-50/50",
    border: "border-cyan-100",
    badge: "bg-cyan-100 text-cyan-700",
    icon: (
      <svg className="w-5 h-5 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    )
  },
  ATTENDANCE_WARNINGS: {
    bg: "bg-amber-50/50",
    border: "border-amber-100",
    badge: "bg-amber-100 text-amber-700",
    icon: (
      <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    )
  },
};

const NotificationCard = ({ notification, onMarkRead, onDelete, onPin, onFavorite, showActions = true }) => {
  const cfg = TYPE_CONFIG[notification.type] || TYPE_CONFIG.INFO;
  const isRead = notification.isRead;
  const isPinned = notification.isPinned;
  const isFavorite = notification.isFavorite;
  const canReply = notification.canReply;
  const date = notification.createdAt ? new Date(notification.createdAt) : null;

  const { sendReply } = useNotifications();
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);

  const handleSendReply = async () => {
    if (!replyText.trim()) return;
    setIsSendingReply(true);
    try {
      await sendReply(notification.id, replyText.trim());
      setIsReplying(false);
      setReplyText("");
    } catch (e) {
      console.error(e);
    } finally {
      setIsSendingReply(false);
    }
  };

  return (
    <div className={`relative rounded-xl border p-4 transition-all duration-200
      ${isRead ? "bg-white border-gray-200" : `${cfg.bg} ${cfg.border}`}
      hover:shadow-md`}>

      {/* Unread indicator line */}
      {!isRead && <div className="absolute left-0 top-2 bottom-2 w-1 bg-indigo-500 rounded-full" />}

      <div className="flex items-start gap-3 pl-2">
        {/* Type icon */}
        <div className="flex-shrink-0 mt-0.5">{cfg.icon}</div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.badge}`}>
              {notification.type.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')}
            </span>
            {!isRead && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                NEW
              </span>
            )}
            {isPinned && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22L12,22.8L12.8,22V16H18V14L16,12Z" /></svg>
                PINNED
              </span>
            )}
          </div>

          <h3 className={`mt-1.5 text-sm font-semibold ${isRead ? "text-gray-700" : "text-gray-900"}`}>
            {notification.title}
          </h3>
          <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">{notification.message}</p>

          {/* Attachment Download */}
          {notification.attachmentUrl && (
            <div className="mt-3 flex flex-col gap-2">
              {/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(notification.attachmentName || notification.attachmentUrl) && (
                 <div className="relative inline-block w-fit">
                   <img 
                      src={`${(process.env.REACT_APP_API_URL || 'http://localhost:8080/api').replace(/\/api$/, '')}${notification.attachmentUrl.replace('/download/', '/view/')}`} 
                      alt="attachment preview" 
                      className="h-24 max-w-sm rounded-lg border border-gray-200 object-cover cursor-pointer hover:opacity-90 shadow-sm transition-opacity"
                      onClick={(e) => {
                         e.stopPropagation();
                         const apiRoot = (process.env.REACT_APP_API_URL || 'http://localhost:8080/api').replace(/\/api$/, '');
                         window.open(`${apiRoot}${notification.attachmentUrl}`, '_blank');
                      }}
                   />
                 </div>
              )}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50/50 border border-indigo-100 rounded-xl text-indigo-700 hover:bg-indigo-100/50 transition-all cursor-pointer group w-fit"
                     onClick={(e) => {
                       e.stopPropagation();
                       const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';
                       const apiRoot = apiBase.replace(/\/api$/, '');
                       window.open(`${apiRoot}${notification.attachmentUrl}`, '_blank');
                     }}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span className="text-xs font-bold truncate max-w-[200px]">
                    {notification.attachmentName || "Download Attachment"}
                  </span>
                  <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* Meta */}
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 flex-wrap">
            {notification.sender?.name && (
              <span>From: <strong className="text-gray-500">{notification.sender.name}</strong></span>
            )}
            {date && (
              <>
                <span>·</span>
                <span title={format(date, "PPpp")}>{formatDistanceToNow(date, { addSuffix: true })}</span>
              </>
            )}
            {isRead && notification.readAt && (
              <>
                <span>·</span>
                <span className="text-green-500">Read {formatDistanceToNow(new Date(notification.readAt), { addSuffix: true })}</span>
              </>
            )}
          </div>

          {/* Reply Section */}
          {canReply && showActions && (
            <div className="mt-4 border-t pt-3 border-gray-100">
              {!isReplying ? (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsReplying(true)}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline px-2 py-1 rounded transition-colors"
                  >
                    Reply
                  </button>
                  {!isRead && onMarkRead && (
                    <button
                      onClick={() => onMarkRead(notification.userNotificationId)}
                      className="text-sm font-medium text-gray-600 hover:text-gray-800 hover:underline px-2 py-1 rounded transition-colors"
                    >
                      Mark as Read
                    </button>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 shadow-inner mt-2 transition-all">
                  <p className="text-xs text-gray-700 font-medium mb-1">Replying to {notification.sender?.name || "Admin"}</p>
                  <textarea
                    className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-y min-h-[80px]"
                    placeholder="Type your reply here..."
                    maxLength={500}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    disabled={isSendingReply}
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500">{replyText.length}/500</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setIsReplying(false);
                          setReplyText("");
                        }}
                        disabled={isSendingReply}
                        className="px-3 py-1.5 text-sm rounded bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSendReply}
                        disabled={isSendingReply || !replyText.trim()}
                        className="px-3 py-1.5 text-sm rounded bg-indigo-600 text-white font-medium hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 flex items-center gap-2"
                      >
                        {isSendingReply ? "Sending..." : "Send"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex gap-1 flex-shrink-0">
            {onPin && (
              <button
                onClick={() => onPin(notification.userNotificationId)}
                className={`p-1.5 rounded-lg transition-all duration-200 active:scale-90 ${isPinned ? "bg-orange-100 text-orange-600 shadow-sm" : "hover:bg-gray-100 text-gray-400 hover:text-orange-500"}`}
                title={isPinned ? "Unpin" : "Pin"}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill={isPinned ? "currentColor" : "none"} stroke={isPinned ? "none" : "currentColor"}>
                  {isPinned ? (
                    <path fillRule="evenodd" d="M10 2a2 2 0 00-2 2v8l-2 2v2h5v6l1 1 1-1v-6h5v-2l-2-2V4a2 2 0 00-2-2h-4z" clipRule="evenodd" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 4v8l2 2v2h-5v6l-1 1-1-1v-6H6v-2l2-2V4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2z" />
                  )}
                </svg>
              </button>
            )}
            {onFavorite && (
              <button
                onClick={() => onFavorite(notification.userNotificationId)}
                className={`p-1.5 rounded-lg transition-all duration-200 active:scale-90 ${isFavorite ? "bg-yellow-100 text-yellow-600 shadow-sm" : "hover:bg-gray-100 text-gray-400 hover:text-yellow-500"}`}
                title={isFavorite ? "Remove from favorites" : "Add to favorites"}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill={isFavorite ? "currentColor" : "none"} stroke={isFavorite ? "none" : "currentColor"}>
                  {isFavorite ? (
                    <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l2.07 6.323a1 1 0 00.95.69h6.69c.969 0 1.371 1.24.588 1.81l-5.414 3.935a1 1 0 00-.364 1.118l2.07 6.323c.3.921-.755 1.688-1.54 1.118l-5.414-3.935a1 1 0 00-1.175 0l-5.414 3.935c-.785.57-1.84-.197-1.54-1.118l2.07-6.323a1 1 0 00-.364-1.118L2.34 11.75c-.783-.57-.38-1.81.588-1.81h6.69a1 1 0 00.95-.69l2.07-6.323z" />
                  )}
                </svg>
              </button>
            )}
            {!isRead && onMarkRead && !canReply && (
              <button
                onClick={() => onMarkRead(notification.userNotificationId)}
                className="p-1.5 rounded-lg hover:bg-indigo-100 text-indigo-600 transition-all duration-200 active:scale-90"
                title="Mark as read"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(notification.userNotificationId)} // Fix: use userNotificationId
                className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 transition-all duration-200 active:scale-90"
                title="Delete"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationCard;
