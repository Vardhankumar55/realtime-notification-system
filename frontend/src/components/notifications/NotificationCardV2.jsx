import React, { useState } from "react";
import { Link } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { useNotifications } from "../../context/LiveContext";
import { buildProtectedAssetUrl } from "../../services/api";

const TYPE_CONFIG = {
  INFO: { bg: "bg-blue-50/50", border: "border-blue-100", badge: "bg-blue-100 text-blue-700" },
  SUCCESS: { bg: "bg-green-50/50", border: "border-green-100", badge: "bg-green-100 text-green-700" },
  WARNING: { bg: "bg-yellow-50/50", border: "border-yellow-100", badge: "bg-yellow-100 text-yellow-700" },
  ERROR: { bg: "bg-red-50/50", border: "border-red-100", badge: "bg-red-100 text-red-700" },
  ANNOUNCEMENT: { bg: "bg-purple-50/50", border: "border-purple-100", badge: "bg-purple-100 text-purple-700" },
  EXAM_DATES: { bg: "bg-indigo-50/50", border: "border-indigo-100", badge: "bg-indigo-100 text-indigo-700" },
  ASSIGNMENT_DEADLINES: { bg: "bg-orange-50/50", border: "border-orange-100", badge: "bg-orange-100 text-orange-700" },
  PLACEMENT_DRIVE_ALERTS: { bg: "bg-emerald-50/50", border: "border-emerald-100", badge: "bg-emerald-100 text-emerald-700" },
  HOLIDAY_ANNOUNCEMENTS: { bg: "bg-rose-50/50", border: "border-rose-100", badge: "bg-rose-100 text-rose-700" },
  CLASSROOM_CHANGES: { bg: "bg-cyan-50/50", border: "border-cyan-100", badge: "bg-cyan-100 text-cyan-700" },
  ATTENDANCE_WARNINGS: { bg: "bg-amber-50/50", border: "border-amber-100", badge: "bg-amber-100 text-amber-700" },
};

const PRIORITY_STYLES = {
  LOW: "bg-slate-100 text-slate-700",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};

const NotificationCardV2 = ({
  notification,
  onMarkRead,
  onDelete,
  onPin,
  onFavorite,
  onArchive,
  onSnooze,
  showActions = true,
  highlighted = false,
}) => {
  const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.INFO;
  const isRead = notification.isRead;
  const isPinned = notification.isPinned;
  const isFavorite = notification.isFavorite;
  const canReply = notification.canReply;
  const date = notification.createdAt ? new Date(notification.createdAt) : null;
  const { sendReply } = useNotifications();
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [showSnoozeOptions, setShowSnoozeOptions] = useState(false);

  const downloadUrl = buildProtectedAssetUrl(notification.attachmentUrl);
  const previewUrl = notification.attachmentUrl
    ? buildProtectedAssetUrl(notification.attachmentUrl.replace("/download/", "/view/"))
    : "";
  const isImageAttachment = (notification.attachmentContentType || "").startsWith("image/")
    || /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i.test(notification.attachmentName || notification.attachmentUrl || "");

  const handleSendReply = async () => {
    if (!replyText.trim()) return;
    setIsSendingReply(true);
    try {
      await sendReply(notification.id, replyText.trim());
      setIsReplying(false);
      setReplyText("");
    } catch (error) {
      console.error(error);
    } finally {
      setIsSendingReply(false);
    }
  };

  return (
    <div
      className={`relative rounded-xl border p-4 transition-all duration-200 hover:shadow-md ${
        highlighted && !isRead
          ? "border-indigo-300 bg-indigo-50/60 ring-2 ring-indigo-200"
          : isRead
            ? "border-gray-200 bg-white"
            : `${config.bg} ${config.border}`
      }`}
    >
      {!isRead && <div className="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-indigo-500" />}

      <div className="flex items-start gap-3 pl-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${config.badge}`}>
              {notification.type.split("_").map((word) => word.charAt(0) + word.slice(1).toLowerCase()).join(" ")}
            </span>
            {notification.priority && (
              <span className={`rounded-full px-2 py-0.5 text-xs font-black uppercase ${PRIORITY_STYLES[notification.priority] || PRIORITY_STYLES.MEDIUM}`}>
                {notification.priority}
              </span>
            )}
            {!isRead && (
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                NEW
              </span>
            )}
            {isPinned && (
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                PINNED
              </span>
            )}
          </div>

          <h3 className={`mt-1.5 text-sm font-semibold ${isRead ? "text-gray-700" : "text-gray-900"}`}>
            {notification.title}
          </h3>
          {notification.summary && (
            <p className="mt-1 text-sm font-medium text-gray-800">{notification.summary}</p>
          )}
          <p className="mt-1 text-sm leading-relaxed text-gray-600">{notification.message}</p>

          {notification.deepLink && (
            <div className="mt-3">
              <Link
                to={notification.deepLink}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline"
              >
                Open related page
              </Link>
            </div>
          )}

          {downloadUrl && (
            <div className="mt-3 flex flex-col gap-2">
              {isImageAttachment && (
                <button
                  type="button"
                  onClick={() => window.open(previewUrl || downloadUrl, "_blank", "noopener,noreferrer")}
                  className="w-fit"
                >
                  <img
                    src={previewUrl || downloadUrl}
                    alt="attachment preview"
                    className="h-24 max-w-sm rounded-lg border border-gray-200 object-cover shadow-sm transition-opacity hover:opacity-90"
                  />
                </button>
              )}
              <button
                type="button"
                onClick={() => window.open(downloadUrl, "_blank", "noopener,noreferrer")}
                className="group flex w-fit items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50/50 px-3 py-2 text-indigo-700 transition-all hover:bg-indigo-100/50"
              >
                <span className="max-w-[200px] truncate text-xs font-bold">
                  {notification.attachmentName || "Download Attachment"}
                </span>
                {notification.attachmentSize && (
                  <span className="text-[10px] font-medium text-indigo-500">
                    {(notification.attachmentSize / 1024).toFixed(1)} KB
                  </span>
                )}
              </button>
            </div>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-400">
            {notification.sender?.name && (
              <span>
                From: <strong className="text-gray-500">{notification.sender.name}</strong>
              </span>
            )}
            {date && (
              <>
                <span>|</span>
                <span title={format(date, "PPpp")}>{formatDistanceToNow(date, { addSuffix: true })}</span>
              </>
            )}
            {isRead && notification.readAt && (
              <>
                <span>|</span>
                <span className="text-green-500">
                  Read {formatDistanceToNow(new Date(notification.readAt), { addSuffix: true })}
                </span>
              </>
            )}
          </div>

          {showActions && (
            <div className="mt-4 flex items-center gap-3 border-t border-gray-100 pt-3">
              {!isRead && onMarkRead && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkRead();
                  }}
                  className="flex items-center gap-2 rounded-lg bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-700 transition-all hover:bg-indigo-100 active:scale-95"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Mark as Read
                </button>
              )}
              
              {canReply && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsReplying(!isReplying);
                  }}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all active:scale-95 ${
                    isReplying 
                      ? "bg-gray-100 text-gray-700 hover:bg-gray-200" 
                      : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                  }`}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  {isReplying ? "Cancel Reply" : "Reply Instantly"}
                </button>
              )}
            </div>
          )}

          {canReply && showActions && isReplying && (
            <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50/30 p-4 shadow-sm transition-all animate-in fade-in slide-in-from-top-1">
                  <p className="mb-1 text-xs font-medium text-gray-700">
                    Replying to {notification.sender?.name || "Admin"}
                  </p>
                  <textarea
                    className="min-h-[80px] w-full resize-y rounded-md border border-gray-300 p-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                    placeholder="Type your reply here..."
                    maxLength={500}
                    value={replyText}
                    onChange={(event) => setReplyText(event.target.value)}
                    disabled={isSendingReply}
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-gray-500">{replyText.length}/500</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setIsReplying(false);
                          setReplyText("");
                        }}
                        disabled={isSendingReply}
                        className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSendReply}
                        disabled={isSendingReply || !replyText.trim()}
                        className="flex items-center gap-2 rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {isSendingReply ? "Sending..." : "Send"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
        </div>

        {showActions && (
          <div className="flex flex-shrink-0 gap-1">
            {onPin && (
              <button
                onClick={() => onPin(notification.userNotificationId)}
                className={`rounded-lg p-1.5 transition-all duration-200 active:scale-90 ${
                  isPinned ? "bg-orange-100 text-orange-600 shadow-sm" : "text-gray-400 hover:bg-gray-100 hover:text-orange-500"
                }`}
                title={isPinned ? "Unpin" : "Pin"}
              >
                Pin
              </button>
            )}
            {onFavorite && (
              <button
                onClick={() => onFavorite(notification.userNotificationId)}
                className={`rounded-lg p-1.5 transition-all duration-200 active:scale-90 ${
                  isFavorite ? "bg-yellow-100 text-yellow-600 shadow-sm" : "text-gray-400 hover:bg-gray-100 hover:text-yellow-500"
                }`}
                title={isFavorite ? "Remove from favorites" : "Add to favorites"}
              >
                Star
              </button>
            )}
            {!isRead && onMarkRead && !showActions && (
              <button
                onClick={onMarkRead}
                className="rounded-lg p-1.5 text-indigo-600 transition-all duration-200 active:scale-90 hover:bg-indigo-100"
                title="Mark as read"
              >
                Read
              </button>
            )}
            {onSnooze && !isRead && (
               <div className="relative">
                 <button
                   onClick={() => setShowSnoozeOptions(!showSnoozeOptions)}
                   className="rounded-lg p-1.5 text-gray-400 transition-all duration-200 active:scale-90 hover:bg-gray-100 hover:text-indigo-500"
                   title="Snooze"
                 >
                   Snooze
                 </button>
                 {showSnoozeOptions && (
                   <div className="absolute right-0 bottom-full mb-1 z-10 w-32 rounded-lg bg-white shadow-lg border border-gray-100 overflow-hidden">
                     <button onClick={() => { onSnooze(notification.userNotificationId, 60); setShowSnoozeOptions(false); }} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">1 Hour</button>
                     <button onClick={() => { onSnooze(notification.userNotificationId, 1440); setShowSnoozeOptions(false); }} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">Tomorrow</button>
                     <button onClick={() => { onSnooze(notification.userNotificationId, 10080); setShowSnoozeOptions(false); }} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">Next Week</button>
                   </div>
                 )}
               </div>
            )}
            {onArchive && (
              <button
                onClick={() => onArchive(notification.userNotificationId)}
                className={`rounded-lg p-1.5 transition-all duration-200 active:scale-90 ${
                  notification.isArchived ? "bg-gray-200 text-gray-600 shadow-sm" : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                }`}
                title="Archive"
              >
                Archive
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(notification.userNotificationId)}
                className="rounded-lg p-1.5 text-red-500 transition-all duration-200 active:scale-90 hover:bg-red-100"
                title="Delete"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationCardV2;
