import React, { useState, useEffect } from "react";
import { notificationAPI, adminAPI } from "../services/api";
import { useNotifications } from "../context/LiveContext";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/common/NavbarV2";
import NotificationCard from "../components/notifications/NotificationCardV2";
import AdminTemplatesTab from "../components/notifications/AdminTemplatesTab";

const TYPES = [
  "INFO", 
  "SUCCESS", 
  "WARNING", 
  "ERROR", 
  "ANNOUNCEMENT",
  "EXAM_DATES",
  "ASSIGNMENT_DEADLINES",
  "PLACEMENT_DRIVE_ALERTS",
  "HOLIDAY_ANNOUNCEMENTS",
  "CLASSROOM_CHANGES",
  "ATTENDANCE_WARNINGS"
];
const TARGET_TYPES = [
  { value: "ALL", label: "All Users", icon: "🌐" },
  { value: "GROUP", label: "Select Group", icon: "🏢" },
  { value: "MULTIPLE", label: "Multiple Users", icon: "👥" },
  { value: "SINGLE", label: "Single User", icon: "👤" },
];

const AdminPanel = () => {
  const { user: currentUser } = useAuth();
  const { fetchNotifications, addToast, replies, unreadReplyCount, fetchReplies, markReplyRead } = useNotifications();

  const [users, setUsers] = useState([]);
  const [allNotifications, setAllNotifications] = useState([]);
  const [tab, setTab] = useState("send"); // send | history | users

  const [form, setForm] = useState({
    title: "", message: "", type: "INFO", targetType: "ALL", targetUserIds: [],
    branch: "All", year: "All", section: "All", canReply: false,
    summary: "", priority: "MEDIUM", deepLink: "", isScheduled: false, scheduledAt: "", file: null,
    useOverrides: false, userOverrides: []
  });
  const [userFilters, setUserFilters] = useState({ 
    branch: "All", year: "All", section: "All", search: "" 
  });
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Edit states
  const [editingNotification, setEditingNotification] = useState(null);
  const [updateScope, setUpdateScope] = useState("ALL"); // ALL | SINGLE
  const [individualUpdates, setIndividualUpdates] = useState([]); // [{userId, title, message}]
  const [viewGroupModal, setViewGroupModal] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  
  // Specific delete states
  const [deletingNotification, setDeletingNotification] = useState(null);
  const [selectedDeleteUserIds, setSelectedDeleteUserIds] = useState([]);

  useEffect(() => {
    if (form.useOverrides && form.targetUserIds.length > 0) {
      setForm(prev => {
        const updatedOverrides = prev.targetUserIds.map(id => {
          const existing = (prev.userOverrides || []).find(o => o.userId === id);
          
          // Logic: Only sync if the field has NOT been manually customized
          // or if the customized content was cleared (is empty).
          const useGlobalTitle = !existing || !existing.titleCustomized || existing.title === "";
          const useGlobalMessage = !existing || !existing.messageCustomized || existing.message === "";

          return {
            ...existing,
            userId: id,
            title: useGlobalTitle ? (prev.title || "") : existing.title,
            message: useGlobalMessage ? (prev.message || "") : existing.message,
            titleCustomized: existing?.titleCustomized || false,
            messageCustomized: existing?.messageCustomized || false
          };
        });
        
        if (JSON.stringify(prev.userOverrides) !== JSON.stringify(updatedOverrides)) {
          return { ...prev, userOverrides: updatedOverrides };
        }
        return prev;
      });
    }
  }, [form.title, form.message, form.useOverrides, form.targetUserIds]);

  useEffect(() => {
    loadUsers();
    loadHistory();
  }, []);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const r = await adminAPI.getAllUsers();
      setUsers(r.data.data || []);
    } catch (e) {
      console.error("Failed to load users", e);
    }
    setLoadingUsers(false);
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const r = await notificationAPI.getAll();
      setAllNotifications(r.data.data || []);
    } catch (e) {
      console.error("Failed to load history", e);
    }
    setLoadingHistory(false);
  };

  const handleUserToggle = (userId) => {
    setForm((f) => ({
      ...f,
      targetUserIds: f.targetUserIds.includes(userId)
        ? f.targetUserIds.filter((id) => id !== userId)
        : [...f.targetUserIds, userId],
    }));
  };

  const handleOverrideChange = (userId, field, value) => {
    setForm(prev => {
      const overrides = [...(prev.userOverrides || [])];
      const idx = overrides.findIndex(o => o.userId === userId);
      if (idx > -1) {
        overrides[idx] = { ...overrides[idx], [field]: value, [`${field}Customized`]: true };
      } else {
        overrides.push({ userId, [field]: value, [`${field}Customized`]: true });
      }
      return { ...prev, userOverrides: overrides };
    });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setSendResult(null);
    if ((form.targetType === "SINGLE" || form.targetType === "MULTIPLE") && form.targetUserIds.length === 0) {
      setSendResult({ success: false, message: "Please select at least one user." });
      return;
    }
    if (form.isScheduled && !form.scheduledAt) {
      setSendResult({ success: false, message: "Please select a schedule date and time." });
      return;
    }
    if (form.isScheduled && new Date(form.scheduledAt) <= new Date()) {
      setSendResult({ success: false, message: "Scheduled time must be in the future." });
      return;
    }
    if (form.useOverrides) {
      const mainContentFilled = form.title?.trim() && form.message?.trim();
      const allOverridesFilled = form.targetUserIds.every(userId => {
        const override = (form.userOverrides || []).find(o => o.userId === userId);
        return override && override.title?.trim() && override.message?.trim();
      });

      if (!mainContentFilled && !allOverridesFilled) {
        setSendResult({ success: false, message: "Please either provide global content or fill individual overrides for every selected user." });
        return;
      }
    }
    setSending(true);
    try {
      const formData = new FormData();
      const payload = {
        title: form.title || (form.useOverrides ? "Individual Notification" : ""),
        message: form.message || (form.useOverrides ? "Check override for content." : ""),
        summary: form.summary,
        type: form.type,
        priority: form.priority,
        deepLink: form.deepLink,
        targetType: form.targetType,
        targetUserIds: form.targetUserIds,
        branch: form.branch,
        year: form.year,
        section: form.section,
        canReply: form.canReply,
        isScheduled: form.isScheduled,
        scheduledAt: form.isScheduled && form.scheduledAt ? form.scheduledAt : undefined,
        userOverrides: form.useOverrides 
          ? (form.userOverrides || []).filter(o => o.title?.trim() || o.message?.trim())
          : undefined
      };
      
      formData.append("request", new Blob([JSON.stringify(payload)], { type: "application/json" }));
      if (form.file) {
        formData.append("file", form.file);
      }

      const res = await notificationAPI.send(formData);
      
      addToast({
        title: form.isScheduled ? "Notification Scheduled" : "Notification Sent Successfully",
        message: form.isScheduled
          ? `Will be delivered at ${new Date(form.scheduledAt).toLocaleString()}`
          : "Your notification has been delivered successfully.",
        type: "SUCCESS"
      });

      setSendResult({ success: true, message: res.data.message || (form.isScheduled ? "Notification scheduled." : "Notification sent.") });
      setForm({ title: "", message: "", type: "INFO", targetType: "ALL", targetUserIds: [], branch: "All", year: "All", section: "All", canReply: false, summary: "", priority: "MEDIUM", deepLink: "", isScheduled: false, scheduledAt: "", file: null, useOverrides: false, userOverrides: [] });
      // Reset file input manually if needed, but since it's a re-render it should clear if we are careful.
      // Easiest way in React is to key the input or use a ref.
      await loadHistory();
      await fetchNotifications();
    } catch (err) {
      setSendResult({ success: false, message: err.response?.data?.message || "Failed to send." });
    } finally {
      setSending(false);
    }
  };

  const handleDeleteClick = (notification) => {
    if (notification.recipients && notification.recipients.length > 1) {
      setDeletingNotification(notification);
      setSelectedDeleteUserIds(notification.recipients.map(r => r.id)); // select all initially
    } else {
      if (!window.confirm("Delete this notification permanently? This will remove it for ALL users.")) return;
      handleDeleteNotification(notification.id);
    }
  };

  const handleDeleteNotification = async (id) => {
    try {
      await notificationAPI.deletePermanently(id);
      setAllNotifications((prev) => prev.filter((n) => n.id !== id));
      addToast({ title: "Success", message: "Notification deleted successfully", type: "SUCCESS" });
    } catch (e) {
      addToast({ title: "Delete Failed", message: "Failed to delete notification", type: "ERROR" });
    }
  };

  const submitSpecificDelete = async () => {
    if (!deletingNotification) return;
    
    // Check if we selected ALL users
    if (selectedDeleteUserIds.length === (deletingNotification.recipients?.length || 0)) {
      setDeletingNotification(null);
      handleDeleteNotification(deletingNotification.id);
      return;
    }
    
    // Check if we selected 0 users
    if (selectedDeleteUserIds.length === 0) {
      setDeletingNotification(null);
      return;
    }

    try {
      await adminAPI.deleteForUsers(deletingNotification.id, selectedDeleteUserIds);
      
      // Update local state by removing the selected users from this notification's recipients
      setAllNotifications(prev => prev.map(n => {
        if (n.id === deletingNotification.id) {
          return {
            ...n,
            recipients: n.recipients.filter(r => !selectedDeleteUserIds.includes(r.id))
          };
        }
        return n;
      }));

      addToast({ title: "Success", message: `Notification deleted for ${selectedDeleteUserIds.length} users`, type: "SUCCESS" });
      setDeletingNotification(null);
    } catch (e) {
      addToast({ title: "Delete Failed", message: "Failed to delete notification for selected users", type: "ERROR" });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to permanently delete ${selectedIds.length} notifications?`)) return;
    
    setLoadingHistory(true);
    try {
      await notificationAPI.bulkDelete(selectedIds);
      addToast({
        title: "Bulk Delete Successful",
        message: `${selectedIds.length} notifications removed from history.`,
        type: "SUCCESS"
      });
      setSelectedIds([]);
      setSelectionMode(false);
      loadHistory();
    } catch (e) {
      console.error("Bulk delete failed", e);
      addToast({
        title: "Delete Failed",
        message: "Unable to delete selected notifications",
        type: "ERROR"
      });
    }
    setLoadingHistory(false);
  };

  const handleUpdateNotification = async () => {
    if (updateScope === "ALL" && (!editingNotification.title || !editingNotification.message)) return;
    setSending(true);
    try {
      if (updateScope === "ALL") {
        await adminAPI.updateNotification(editingNotification.id, {
          title: editingNotification.title,
          message: editingNotification.message,
          summary: editingNotification.summary,
          type: editingNotification.type,
          priority: editingNotification.priority,
          deepLink: editingNotification.deepLink,
          canReply: editingNotification.canReply
        });
      } else {
        // Validation
        if (individualUpdates.some(up => !up.userId || !up.title || !up.message)) {
          addToast({ title: "Validation Error", message: "Please fill all fields for each user override.", type: "ERROR" });
          setSending(false);
          return;
        }
        await adminAPI.updateMultipleUserNotifications(editingNotification.id, {
          type: editingNotification.type,
          updates: individualUpdates.map(up => ({
            userId: parseInt(up.userId),
            title: up.title,
            message: up.message
          }))
        });
      }

      addToast({
        title: "Success",
        message: "Notification updated successfully",
        type: "SUCCESS"
      });

      setEditingNotification(null);
      setUpdateScope("ALL");
      setIndividualUpdates([]);
      loadHistory();
    } catch (err) {
      console.error("Update Notification Failed:", err);
      const errorMsg = err.response?.data?.message || err.message || "Failed to update notification.";
      addToast({
        title: "Update Failed",
        message: errorMsg,
        type: "ERROR"
      });
    } finally {
      setSending(false);
    }
  };

  // User Management Actions
  const handleDisableUser = async (id) => {
    if (!window.confirm("Are you sure you want to disable this user? They will not be able to log in.")) return;
    try {
      await adminAPI.disableUser(id);
      loadUsers();
      addToast({ title: "User Status", message: "User has been disabled", type: "SUCCESS" });
    } catch (e) {
      addToast({ title: "Action Failed", message: "Failed to disable user", type: "ERROR" });
    }
  };

  const handleEnableUser = async (id) => {
    try {
      await adminAPI.enableUser(id);
      loadUsers();
      addToast({ title: "User Status", message: "User has been enabled", type: "SUCCESS" });
    } catch (e) {
      addToast({ title: "Action Failed", message: "Failed to enable user", type: "ERROR" });
    }
  };

  const handleRoleChange = async (id, newRole) => {
    try {
      await adminAPI.changeRole(id, newRole);
      loadUsers();
      addToast({ title: "Role Update", message: `User role updated to ${newRole}`, type: "SUCCESS" });
    } catch (e) {
      addToast({ title: "Action Failed", message: "Failed to update role", type: "ERROR" });
    }
  };

  const handleDeleteUser = async (id) => {
    if (id === currentUser?.id) {
      addToast({ title: "Action Restricted", message: "You cannot delete yourself!", type: "ERROR" });
      return;
    }
    if (!window.confirm("Are you sure you want to permanently DELETE this user? This action cannot be undone.")) return;
    try {
      await adminAPI.deleteUser(id);
      loadUsers();
      addToast({ title: "User Deleted", message: "User deleted successfully", type: "SUCCESS" });
    } catch (e) {
      addToast({ title: "Action Failed", message: "Failed to delete user", type: "ERROR" });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
              <span className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </span>
              Admin Control Center
            </h1>
            <p className="text-gray-500 font-bold mt-2 ml-1 uppercase tracking-widest text-xs">Orchestrate system-wide communication notifications</p>
          </div>
          <div className="flex gap-2.5">
            <button onClick={loadUsers} className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-400 hover:text-indigo-600 transition-all shadow-sm">
                <svg className={`w-5 h-5 ${loadingUsers ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-white rounded-2xl border border-gray-100 p-1.5 shadow-sm w-fit mb-8 overflow-x-auto max-w-full">
          {[
            { id: "send", label: "Create Notification", icon: "🚀" },
            { id: "templates", label: "Templates", icon: "📋" },
            { id: "users", label: "Manage Users", icon: "👥" },
            { id: "history", label: "Audit Logs", icon: "📜" },
            { id: "replies", label: "Replies From Users", icon: "💬", badge: unreadReplyCount }
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap relative
                ${tab === t.id ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50/80"}`}>
              <span>{t.icon}</span>
              {t.label}
              {t.badge > 0 && (
                <span className={`absolute -top-1.5 -right-1.5 min-w-[20px] h-5 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${tab === t.id ? "bg-white text-indigo-600 border-indigo-600" : "bg-red-500 text-white border-white shadow-sm"}`}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── TEMPLATES TAB ── */}
        {tab === "templates" && (
          <div className="animate-fade-in">
            <AdminTemplatesTab onApplyTemplate={handleApplyTemplate} />
          </div>
        )}

        {/* ── SEND TAB ── */}
        {tab === "send" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-8">
                <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2 uppercase tracking-tight">
                  <span className="w-2 h-6 bg-indigo-600 rounded-full" />
                  Compose New Notification
                </h2>
                {sendResult && (
                  <div className={`mb-6 p-4 rounded-2xl text-sm font-bold border animate-fade-in ${sendResult.success ? "bg-green-50 border-green-100 text-green-700" : "bg-red-50 border-red-100 text-red-600"}`}>
                    <div className="flex items-center gap-2">{sendResult.message}</div>
                  </div>
                )}
                <form onSubmit={handleSend} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-500 ml-1">Notification Title</label>
                    <input type="text" required={!form.useOverrides} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none text-sm font-medium transition-all" placeholder="Notification Title" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-500 ml-1">Detailed Content</label>
                    <textarea required={!form.useOverrides} rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none text-sm font-medium transition-all resize-none" placeholder="Notification Message" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-500 ml-1">Summary</label>
                      <input
                        type="text"
                        value={form.summary}
                        onChange={(e) => setForm({ ...form, summary: e.target.value })}
                        className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none text-sm font-medium transition-all"
                        placeholder="Short one-line summary for popups"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-500 ml-1">Priority</label>
                      <select
                        value={form.priority}
                        onChange={(e) => setForm({ ...form, priority: e.target.value })}
                        className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 text-sm font-medium bg-white outline-none focus:ring-4 focus:ring-indigo-50 transition-all cursor-pointer"
                      >
                        {["LOW", "MEDIUM", "HIGH", "URGENT"].map((priority) => (
                          <option key={priority} value={priority}>{priority}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-500 ml-1">Redirect Link</label>
                    <input
                      type="text"
                      value={form.deepLink}
                      onChange={(e) => setForm({ ...form, deepLink: e.target.value })}
                      className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none text-sm font-medium transition-all"
                      placeholder="/messages?user=12 or /notifications"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-500 ml-1">Category</label>
                      <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 text-sm font-medium bg-white outline-none focus:ring-4 focus:ring-indigo-50 transition-all cursor-pointer">
                        {TYPES.map((t) => <option key={t} value={t}>{t.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-500 ml-1">Audience</label>
                      <select value={form.targetType} onChange={(e) => setForm({ ...form, targetType: e.target.value, targetUserIds: [] })} className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 text-sm font-medium bg-white outline-none focus:ring-4 focus:ring-indigo-50 transition-all cursor-pointer">
                        {TARGET_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-200">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={form.canReply} 
                        onChange={(e) => setForm({ ...form, canReply: e.target.checked })} 
                      />
                      <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">Allow User Reply</h4>
                      <p className="text-xs text-gray-500 font-medium">When enabled, users can respond to this notification.</p>
                    </div>
                  </div>

                  {/* ──────────────── GROUP SELECTION ──────────────── */}
                  {form.targetType === "GROUP" && (
                    <div className="space-y-4 animate-slide-in p-6 bg-indigo-50/30 rounded-3xl border border-indigo-100">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Branch</label>
                          <select 
                            value={form.branch} 
                            onChange={(e) => setForm({ ...form, branch: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-white bg-white shadow-sm text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                          >
                            {["All", "CSE", "ECE", "EEE", "IT", "CIVIL", "MECH"].map(b => <option key={b} value={b}>{b}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Year</label>
                          <select 
                            value={form.year} 
                            onChange={(e) => setForm({ ...form, year: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-white bg-white shadow-sm text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                          >
                            {["All", "1st Year", "2nd Year", "3rd Year", "4th Year"].map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Section</label>
                          <select 
                            value={form.section} 
                            onChange={(e) => setForm({ ...form, section: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-white bg-white shadow-sm text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                          >
                            {["All", "A", "B", "C"].map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">
                          🎯 {users.filter(u => 
                            (form.branch === "All" || u.branch === form.branch) && 
                            (form.year === "All" || u.year === form.year) && 
                            (form.section === "All" || u.section === form.section)
                          ).length} students selected
                        </span>
                        <button 
                          type="button"
                          onClick={() => setViewGroupModal(true)}
                          className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                        >
                          View Selected Students
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ──────────────── INDIVIDUAL SELECTION WITH FILTERS ──────────────── */}
                  {(form.targetType === "SINGLE" || form.targetType === "MULTIPLE") && (
                    <div className="space-y-4 animate-slide-in">
                      <div className="flex items-center justify-between ml-1">
                        <label className="text-sm font-medium text-gray-500">Select Recipients</label>
                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                          {form.targetUserIds.length} Selected
                        </span>
                      </div>

                      {/* Filter Row */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-2xl">
                          <select 
                            value={userFilters.branch} 
                            onChange={(e) => setUserFilters({ ...userFilters, branch: e.target.value })}
                            className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold transition-all focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="All">All Branches</option>
                            {["CSE", "ECE", "EEE", "IT", "CIVIL", "MECH"].map(b => <option key={b} value={b}>{b}</option>)}
                          </select>
                          <select 
                            value={userFilters.year} 
                            onChange={(e) => setUserFilters({ ...userFilters, year: e.target.value })}
                            className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold transition-all focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="All">All Years</option>
                            {["1st Year", "2nd Year", "3rd Year", "4th Year"].map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                          <select 
                            value={userFilters.section} 
                            onChange={(e) => setUserFilters({ ...userFilters, section: e.target.value })}
                            className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold transition-all focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="All">All Sections</option>
                            {["A", "B", "C"].map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <input 
                            type="text" 
                            placeholder="Search name, email, ID..."
                            value={userFilters.search}
                            onChange={(e) => setUserFilters({ ...userFilters, search: e.target.value })}
                            className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-xs font-bold transition-all focus:ring-2 focus:ring-indigo-500 col-span-2 lg:col-span-1"
                          />
                      </div>

                      <div className="max-h-56 overflow-y-auto border border-gray-200 rounded-2xl divide-y divide-gray-50 bg-gray-50/30">
                        {users
                          .filter(u => {
                            const bMatch = userFilters.branch === "All" || u.branch === userFilters.branch;
                            const yMatch = userFilters.year === "All" || u.year === userFilters.year;
                            const sMatch = userFilters.section === "All" || u.section === userFilters.section;
                            const searchLower = userFilters.search.toLowerCase();
                            const srchMatch = !userFilters.search || 
                              u.name?.toLowerCase().includes(searchLower) ||
                              u.email?.toLowerCase().includes(searchLower) ||
                              u.studentId?.toLowerCase().includes(searchLower);
                            return bMatch && yMatch && sMatch && srchMatch;
                          })
                          .map((u) => (
                            <label key={u.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white cursor-pointer transition-colors group">
                                <input type={form.targetType === "SINGLE" ? "radio" : "checkbox"} checked={form.targetUserIds.includes(u.id)} onChange={() => form.targetType === "SINGLE" ? setForm(f => ({ ...f, targetUserIds: [u.id] })) : handleUserToggle(u.id)} className="w-5 h-5 rounded-lg border-gray-300 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer" />
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold uppercase">{u.name?.charAt(0)}</div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-bold text-gray-900 truncate">{u.name}</p>
                                        <span className="text-[10px] font-black text-gray-400">{u.studentId}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <p className="text-[11px] text-gray-400 font-medium truncate">{u.email}</p>
                                        <p className="text-[9px] font-bold text-indigo-400 tracking-tighter uppercase">{u.branch} - {u.year} - {u.section}</p>
                                    </div>
                                </div>
                            </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Individual Overrides Section */}
                  {form.targetType === "MULTIPLE" && form.targetUserIds.length > 0 && (
                    <div className="mt-8 space-y-6 animate-slide-in p-6 bg-purple-50/30 rounded-3xl border border-purple-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-gray-900">Customize for individual users</h4>
                          <p className="text-xs text-gray-500 font-medium">Override the title and message for specific students.</p>
                        </div>
                        <button 
                          type="button"
                          onClick={() => {
                            const becomingActive = !form.useOverrides;
                            setForm(prev => ({
                              ...prev,
                              useOverrides: becomingActive,
                              userOverrides: becomingActive ? prev.targetUserIds.map(id => ({
                                userId: id,
                                title: prev.title || "",
                                message: prev.message || ""
                              })) : prev.userOverrides
                            }));
                          }}
                          className={`w-12 h-6 rounded-full transition-all relative ${form.useOverrides ? 'bg-purple-600' : 'bg-gray-300'}`}
                        >
                          <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all ${form.useOverrides ? 'translate-x-6' : ''}`} />
                        </button>
                      </div>

                      {form.useOverrides && (
                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                          {form.targetUserIds.map(userId => {
                            const student = users.find(u => u.id === userId);
                            const override = (form.userOverrides || []).find(o => o.userId === userId);
                            return (
                              <div key={userId} className="p-4 bg-white rounded-2xl border border-purple-100 shadow-sm space-y-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-[10px] font-black uppercase">
                                    {(student?.name || "?").charAt(0)}
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-gray-900">{student?.name}</p>
                                    <p className="text-[10px] text-gray-400 font-medium tracking-tight uppercase">{student?.studentId} · {student?.branch} · {student?.year}</p>
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Title Override</label>
                                    <input 
                                      placeholder={form.title || "Custom Title"}
                                      value={override?.title || ""}
                                      onChange={(e) => handleOverrideChange(userId, 'title', e.target.value)}
                                      className="w-full px-4 py-2 rounded-xl border border-gray-100 text-xs font-medium focus:ring-2 focus:ring-purple-500 outline-none bg-gray-50/50"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Message Override</label>
                                    <input 
                                      placeholder={form.message || "Custom Message"}
                                      value={override?.message || ""}
                                      onChange={(e) => handleOverrideChange(userId, 'message', e.target.value)}
                                      className="w-full px-4 py-2 rounded-xl border border-gray-100 text-xs font-medium focus:ring-2 focus:ring-purple-500 outline-none bg-gray-50/50"
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ──────────────── DELIVERY SCHEDULE ──────────────── */}
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-gray-900">📅 Delivery</span>
                      <div className="flex gap-2 ml-auto">
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, isScheduled: false, scheduledAt: "" })}
                          className={`px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                            !form.isScheduled
                              ? "bg-indigo-600 text-white shadow-md"
                              : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          Send Now
                        </button>
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, isScheduled: true })}
                          className={`px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                            form.isScheduled
                              ? "bg-purple-600 text-white shadow-md"
                              : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          Send Later
                        </button>
                      </div>
                    </div>

                    {form.isScheduled && (
                      <div className="animate-fade-in space-y-1">
                        <label className="text-[10px] font-black text-purple-500 uppercase tracking-widest ml-1">Schedule Date & Time</label>
                        <input
                          type="datetime-local"
                          required={form.isScheduled}
                          value={form.scheduledAt}
                          min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                          onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                          className="w-full px-5 py-3 rounded-2xl border border-purple-200 focus:ring-4 focus:ring-purple-50 focus:border-purple-500 outline-none text-sm font-medium transition-all bg-white"
                        />
                        {form.scheduledAt && (
                          <p className="text-xs text-purple-600 font-medium ml-1 mt-1">
                            ⏰ Will be delivered: {new Date(form.scheduledAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                    )}

                    {/* File Attachment */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Attachment (Optional)</label>
                      <input 
                        type="file" 
                        key={form.file ? 'file-selected' : 'file-empty'} /* Reset trick */
                        onChange={(e) => setForm({ ...form, file: e.target.files[0] })}
                        className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none text-[11px] font-medium transition-all bg-white file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
                      />
                    </div>
                  </div>

                  <button type="submit" disabled={sending || (form.useOverrides && !(form.title?.trim() && form.message?.trim()) && form.targetUserIds.some(userId => {
                    const override = (form.userOverrides || []).find(o => o.userId === userId);
                    return !override || !override.title?.trim() || !override.message?.trim();
                  }))} className={`w-full py-4 text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:shadow-xl transition-all active:scale-[0.98] disabled:opacity-60 ${
                    form.isScheduled
                      ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:shadow-purple-100"
                      : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:shadow-indigo-100"
                  }`}>
                    {sending ? "Processing..." : form.isScheduled ? "⏰ Schedule Notification" : "🚀 Broadcast Notification"}
                  </button>
                </form>
              </div>
            </div>
            <div className="space-y-6">
                <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-6">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-6">Live Feedback</h3>
                    <NotificationCard notification={{ title: form.title || "Preview Title", message: form.message || "Preview Message content", type: form.type, sender: { name: "Admin" }, createdAt: new Date().toISOString(), isRead: false }} showActions={false} />
                </div>
            </div>
          </div>
        )}

        {/* ── USERS TAB ── */}
        {tab === "users" && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-sm font-medium text-gray-500 border-b border-gray-100">
                    <th className="px-6 py-4">Identity</th>
                    <th className="px-6 py-4">Role / Status</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Branch / Year</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Section</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Student ID</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Joined</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold uppercase">{u.name?.charAt(0)}</div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">{u.name}</p>
                            <p className="text-xs text-gray-400 font-medium">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1.5">
                            <span className={`w-fit px-2 py-0.5 rounded-lg text-[10px] font-medium uppercase tracking-tight ${u.role === 'ROLE_ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{u.role}</span>
                            <span className={`w-fit px-2 py-0.5 rounded-lg text-[10px] font-medium uppercase tracking-tight ${u.isEnabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{u.isEnabled ? 'Active' : 'Disabled'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                          <div className="flex flex-col gap-0.5">
                              <span className="text-sm font-bold text-gray-900">{u.branch || "N/A"}</span>
                              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{u.year || "N/A"}</span>
                          </div>
                      </td>
                      <td className="px-6 py-5">
                          <span className="text-sm font-bold text-gray-900">{u.section || "N/A"}</span>
                      </td>
                      <td className="px-6 py-5">
                          <span className="text-[11px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">{u.studentId || "N/A"}</span>
                      </td>
                      <td className="px-6 py-5">
                          <span className="text-xs text-gray-400 font-bold tracking-tight">{new Date(u.createdAt).toLocaleDateString()}</span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleRoleChange(u.id, u.role === 'ROLE_ADMIN' ? 'ROLE_USER' : 'ROLE_ADMIN')} className="p-2 rounded-xl bg-gray-50 text-gray-400 hover:text-indigo-600 hover:bg-white hover:border-indigo-100 border border-transparent transition-all" title="Toggle Role">⚡</button>
                          {u.isEnabled ? (
                            <button onClick={() => handleDisableUser(u.id)} className="p-2 rounded-xl bg-yellow-50 text-yellow-600 hover:bg-yellow-100 transition-all font-bold text-[10px] px-3 uppercase">Disable</button>
                          ) : (
                            <button onClick={() => handleEnableUser(u.id)} className="p-2 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 transition-all font-bold text-[10px] px-3 uppercase">Enable</button>
                          )}
                          <button onClick={() => handleDeleteUser(u.id)} className="p-2 rounded-xl bg-red-50 text-red-400 hover:text-red-600 hover:bg-red-100 transition-all" title="Delete Account">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {tab === "history" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest ml-2">Audit Logs</h3>
                <div className="flex gap-3">
                    {selectionMode ? (
                        <>
                            <button 
                                onClick={handleBulkDelete}
                                disabled={selectedIds.length === 0}
                                className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all disabled:opacity-50 shadow-lg shadow-red-100"
                            >
                                Delete ({selectedIds.length})
                            </button>
                            <button 
                                onClick={() => { setSelectionMode(false); setSelectedIds([]); }}
                                className="px-6 py-2 bg-gray-100 text-gray-400 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all"
                            >
                                Cancel
                            </button>
                        </>
                    ) : (
                        <button 
                            onClick={() => setSelectionMode(true)}
                            className="px-6 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-indigo-100 border border-indigo-100 transition-all"
                        >
                            Delete Multiple
                        </button>
                    )}
                </div>
            </div>
            <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-base font-medium text-gray-600 border-b border-gray-100">
                      {selectionMode && <th className="pl-6 py-5 w-10"></th>}
                      <th className="px-6 py-5">Notification Content</th>
                      <th className="px-6 py-5">Recipients</th>
                      <th className="px-6 py-5">Sent Info</th>
                      <th className="px-6 py-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {loadingHistory ? (
                      <tr><td colSpan={selectionMode ? 5 : 4} className="px-6 py-12 text-center text-gray-400 font-bold">Fetching Audit Logs...</td></tr>
                    ) : allNotifications.length === 0 ? (
                      <tr><td colSpan={selectionMode ? 5 : 4} className="px-6 py-12 text-center text-gray-400 font-bold">No notifications found in history.</td></tr>
                    ) : (
                      allNotifications.map((n) => (
                        <tr key={n.id} className={`hover:bg-gray-50/50 transition-colors group ${selectedIds.includes(n.id) ? 'bg-indigo-50/30' : ''}`}>
                          {selectionMode && (
                            <td className="pl-6 py-6 w-10">
                                <input 
                                    type="checkbox" 
                                    checked={selectedIds.includes(n.id)}
                                    onChange={(e) => {
                                        if (e.target.checked) setSelectedIds([...selectedIds, n.id]);
                                        else setSelectedIds(selectedIds.filter(id => id !== n.id));
                                    }}
                                    className="w-5 h-5 rounded-lg border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                />
                            </td>
                          )}
                          <td className="px-6 py-6 max-w-md">
                          <p className="text-base font-bold text-gray-900 truncate">{n.title}</p>
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{n.message}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {n.editedAt && (
                              <span className="inline-block px-2 py-0.5 bg-yellow-50 text-xs font-medium text-yellow-700 rounded-md">Edited</span>
                            )}
                            {n.isScheduled && (
                              <span className="inline-block px-2 py-0.5 bg-purple-50 text-xs font-bold text-purple-700 rounded-md">
                                ⏰ Scheduled: {new Date(n.scheduledAt).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex -space-x-2 overflow-hidden">
                            {n.recipients?.slice(0, 3).map((r, i) => (
                              <div key={i} className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-indigo-500 flex items-center justify-center text-[10px] text-white font-bold" title={r.name}>
                                {r.name?.charAt(0)}
                              </div>
                            ))}
                            {n.recipients?.length > 3 && (
                              <div className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-gray-100 flex items-center justify-center text-[10px] text-gray-400 font-bold">
                                +{n.recipients.length - 3}
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1 font-bold">{n.recipients?.length || 0} Total Targets</p>
                        </td>
                        <td className="px-6 py-6">
                          <p className="text-sm font-bold text-gray-700">{n.sender?.name}</p>
                          <p className="text-xs text-gray-500 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => {
                                const overrides = n.recipients
                                  ?.filter(r => r.titleOverride || r.messageOverride)
                                  ?.map(r => ({
                                    userId: r.id,
                                    title: r.titleOverride || n.title,
                                    message: r.messageOverride || n.message
                                  })) || [];
                                
                                setEditingNotification(n);
                                setIndividualUpdates(overrides.length > 0 ? overrides : [{ userId: "", title: n.title, message: n.message }]);
                                setUpdateScope(overrides.length > 0 ? "SINGLE" : "ALL");
                                // Signal to users that an admin is editing
                                try {
                                  notificationAPI.notifyEditing(n.id);
                                } catch (e) {
                                  console.error("Failed to notify editing", e);
                                }
                              }} 
                              className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all font-bold text-[10px] uppercase shadow-sm"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => handleDeleteClick(n)} 
                              className="p-1.5 rounded-xl bg-white border border-gray-100 text-gray-300 hover:text-red-500 hover:border-red-100 transition-all shadow-sm"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

        {/* ── EDIT MODAL ── */}
        {editingNotification && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-slide-up">
              
              {/* STICKY HEADER */}
              <div className="px-8 py-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center sticky top-0 z-10">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 uppercase">Edit Broadcast Notification</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Refining communication for existing targets</p>
                </div>
                <button onClick={() => setEditingNotification(null)} className="text-gray-400 hover:text-gray-900 p-2">✕</button>
              </div>
              
              {/* SCROLLABLE CONTENT AREA */}
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
                
                {/* Core Notification Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Notification Title</label>
                    <input 
                      type="text" 
                      value={editingNotification.title} 
                      onChange={(e) => setEditingNotification({...editingNotification, title: e.target.value})}
                      className="w-full px-5 py-3 rounded-2xl border border-gray-200 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none text-sm font-medium transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Category</label>
                    <select 
                      value={editingNotification.type} 
                      onChange={(e) => setEditingNotification({...editingNotification, type: e.target.value})}
                      className="w-full px-5 py-3 rounded-2xl border border-gray-200 text-sm font-medium bg-white outline-none focus:ring-4 focus:ring-indigo-50 transition-all cursor-pointer"
                    >
                      {TYPES.map((t) => <option key={t} value={t}>{t.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Update Scope</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setUpdateScope("ALL")}
                      className={`py-2.5 rounded-xl border-2 text-[10px] font-bold uppercase tracking-widest transition-all ${updateScope === 'ALL' ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-100 text-gray-500'}`}
                    >
                      All Recipients
                    </button>
                    <button 
                      onClick={() => setUpdateScope("SINGLE")}
                      className={`py-2.5 rounded-xl border-2 text-[10px] font-bold uppercase tracking-widest transition-all ${updateScope === 'SINGLE' ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-100 text-gray-500'}`}
                    >
                      Specific Users
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Default Content</label>
                  <textarea 
                    rows={3} 
                    value={editingNotification.message} 
                    onChange={(e) => setEditingNotification({...editingNotification, message: e.target.value})}
                    className="w-full px-5 py-3 rounded-2xl border border-gray-200 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none text-sm font-medium transition-all resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Summary</label>
                    <input
                      type="text"
                      value={editingNotification.summary || ""}
                      onChange={(e) => setEditingNotification({ ...editingNotification, summary: e.target.value })}
                      className="w-full px-5 py-3 rounded-2xl border border-gray-200 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none text-sm font-medium transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Priority</label>
                    <select
                      value={editingNotification.priority || "MEDIUM"}
                      onChange={(e) => setEditingNotification({ ...editingNotification, priority: e.target.value })}
                      className="w-full px-5 py-3 rounded-2xl border border-gray-200 text-sm font-medium bg-white outline-none focus:ring-4 focus:ring-indigo-50 transition-all cursor-pointer"
                    >
                      {["LOW", "MEDIUM", "HIGH", "URGENT"].map((priority) => (
                        <option key={priority} value={priority}>{priority}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Redirect Link</label>
                  <input
                    type="text"
                    value={editingNotification.deepLink || ""}
                    onChange={(e) => setEditingNotification({ ...editingNotification, deepLink: e.target.value })}
                    className="w-full px-5 py-3 rounded-2xl border border-gray-200 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none text-sm font-medium transition-all"
                  />
                </div>

                {updateScope === "ALL" && (
                  <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-200">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={editingNotification.canReply || false} 
                        onChange={(e) => setEditingNotification({ ...editingNotification, canReply: e.target.checked })} 
                      />
                      <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">Allow User Reply</h4>
                      <p className="text-xs text-gray-500 font-medium">When enabled, users can respond to this notification.</p>
                    </div>
                  </div>
                )}

                {/* Dynamic User Rows Section */}
                {updateScope === "SINGLE" && (
                  <div className="space-y-4 border-t border-gray-100 pt-8 animate-fade-in">
                    <div className="flex justify-between items-center bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                      <div>
                        <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest">Individual Overrides</h4>
                        <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">Specify unique content for each target</p>
                      </div>
                      <button 
                        onClick={() => setIndividualUpdates([...individualUpdates, { userId: "", title: editingNotification.title, message: editingNotification.message }])}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95"
                      >
                        + Add Another User
                      </button>
                    </div>

                    <div className="space-y-3">
                      {individualUpdates.map((update, index) => (
                        <div key={index} className="flex flex-col lg:flex-row items-start lg:items-center gap-4 p-5 bg-white border border-gray-200 rounded-3xl relative animate-slide-in group shadow-sm hover:border-indigo-100 transition-colors">
                          
                          {/* Choose User */}
                          <div className="w-full lg:w-48 shrink-0 space-y-1">
                            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1">Recipient</label>
                            <select 
                              value={update.userId} 
                              onChange={(e) => {
                                const newUpdates = [...individualUpdates];
                                newUpdates[index].userId = e.target.value;
                                setIndividualUpdates(newUpdates);
                              }}
                              className="w-full px-3 py-2.5 rounded-xl border border-gray-100 text-[11px] font-bold bg-gray-50/50"
                            >
                              <option value="">Choose User...</option>
                              {editingNotification.recipients?.map(r => (
                                <option key={r.id} value={r.id} disabled={individualUpdates.some((up, i) => up.userId == r.id && i !== index)}>
                                  {r.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Override Title */}
                          <div className="flex-1 w-full space-y-1">
                            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1">Personalized Title</label>
                            <input 
                              type="text" 
                              value={update.title} 
                              onChange={(e) => {
                                const newUpdates = [...individualUpdates];
                                newUpdates[index].title = e.target.value;
                                setIndividualUpdates(newUpdates);
                              }}
                              className="w-full px-3 py-2.5 rounded-xl border border-gray-100 text-[11px] font-medium"
                              placeholder="Title"
                            />
                          </div>

                          {/* Override Message */}
                          <div className="flex-[1.5] w-full space-y-1">
                            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1">Personalized Message</label>
                            <input 
                              type="text" 
                              value={update.message} 
                              onChange={(e) => {
                                const newUpdates = [...individualUpdates];
                                newUpdates[index].message = e.target.value;
                                setIndividualUpdates(newUpdates);
                              }}
                              className="w-full px-3 py-2.5 rounded-xl border border-gray-100 text-[11px] font-medium"
                              placeholder="Detailed message..."
                            />
                          </div>

                          {/* Options */}
                          <div className="lg:pt-4">
                            <button 
                              onClick={() => setIndividualUpdates(individualUpdates.filter((_, i) => i !== index))}
                              className="w-9 h-9 flex items-center justify-center bg-gray-50 text-gray-400 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all border border-transparent hover:border-red-100"
                              title="Remove override"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* STICKY FOOTER */}
              <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex gap-4 sticky bottom-0 z-10 shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
                <button 
                  onClick={() => setEditingNotification(null)} 
                  className="flex-1 py-3.5 border-2 border-gray-200 text-gray-500 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-gray-100 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleUpdateNotification}
                  disabled={sending || (updateScope === 'SINGLE' && individualUpdates.some(up => !up.userId))}
                  className="flex-[2] py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:shadow-xl hover:shadow-indigo-100 transition-all active:scale-[0.98] disabled:opacity-60"
                >
                  {sending ? "Processing..." : "Update & Push Broadcast"}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* ── SPECIFIC DELETE MODAL ── */}
        {deletingNotification && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up">
              <div className="px-6 py-5 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Delete Notification</h3>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-gray-400 mt-1">Select users to remove this from</p>
                </div>
                <button onClick={() => setDeletingNotification(null)} className="text-gray-400 hover:text-gray-900 p-2">✕</button>
              </div>

              <div className="p-6">
                <div className="mb-4 flex items-center justify-between bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                  <span className="text-xs font-bold text-indigo-900">
                    {selectedDeleteUserIds.length} of {deletingNotification.recipients?.length || 0} selected
                  </span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setSelectedDeleteUserIds(deletingNotification.recipients?.map(r=>r.id) || [])}
                      className="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-600 rounded-lg text-[10px] font-bold uppercase hover:bg-indigo-50 transition-all"
                    >
                      Select All
                    </button>
                    <button 
                      onClick={() => setSelectedDeleteUserIds([])}
                      className="px-3 py-1.5 bg-white border border-gray-200 text-gray-500 rounded-lg text-[10px] font-bold uppercase hover:bg-gray-50 transition-all"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto border border-gray-100 rounded-2xl divide-y divide-gray-50">
                  {deletingNotification.recipients?.map(r => (
                    <label key={r.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer transition-colors">
                      <input 
                        type="checkbox" 
                        checked={selectedDeleteUserIds.includes(r.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedDeleteUserIds([...selectedDeleteUserIds, r.id]);
                          else setSelectedDeleteUserIds(selectedDeleteUserIds.filter(id => id !== r.id));
                        }}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                      />
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-700 uppercase">
                        {r.name?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{r.name}</p>
                        <p className="text-[10px] text-gray-400 font-medium">{r.email}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="px-6 py-5 bg-gray-50 border-t border-gray-100 flex gap-3">
                <button 
                  onClick={() => setDeletingNotification(null)}
                  className="flex-1 py-3 border-2 border-gray-200 text-gray-500 rounded-xl font-bold uppercase text-xs hover:bg-gray-100 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={submitSpecificDelete}
                  disabled={selectedDeleteUserIds.length === 0}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold uppercase text-xs hover:bg-red-700 shadow-md shadow-red-100 transition-all disabled:opacity-50"
                >
                  Delete Selected
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── VIEW GROUP MODAL ── */}
        {viewGroupModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-slide-up">
              <div className="px-8 py-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center sticky top-0">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 uppercase">Selected Recipients</h3>
                  <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest mt-1">
                    {form.branch} • {form.year} • Section {form.section}
                  </p>
                </div>
                <button onClick={() => setViewGroupModal(false)} className="text-gray-400 hover:text-gray-900 p-2 text-xl">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-3">
                {users
                  .filter(u => 
                    (form.branch === "All" || u.branch === form.branch) && 
                    (form.year === "All" || u.year === form.year) && 
                    (form.section === "All" || u.section === form.section)
                  )
                  .map(u => (
                    <div key={u.id} className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50/50 border border-gray-100">
                      <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-indigo-600 font-bold uppercase border border-gray-100">
                        {u.name?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{u.name}</p>
                        <p className="text-[10px] text-gray-400 font-medium truncate">{u.email} • {u.studentId || 'No ID'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black text-indigo-400 uppercase">{u.branch}</p>
                        <p className="text-[9px] text-gray-400 font-bold">{u.year} - {u.section}</p>
                      </div>
                    </div>
                  ))}
                {users.filter(u => 
                  (form.branch === "All" || u.branch === form.branch) && 
                  (form.year === "All" || u.year === form.year) && 
                  (form.section === "All" || u.section === form.section)
                ).length === 0 && (
                  <div className="py-20 text-center text-gray-400 font-bold italic">No students match this group combination.</div>
                )}
              </div>
              <div className="p-6 bg-gray-50 border-t border-gray-100 text-center">
                <button onClick={() => setViewGroupModal(false)} className="px-10 py-3 bg-white border-2 border-gray-200 text-gray-500 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-gray-100 transition-all">Close</button>
              </div>
            </div>
          </div>
        )}

        {/* ── REPLIES TAB ── */}
        {tab === "replies" && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden pt-4 px-4 pb-4">
            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2 uppercase tracking-tight pl-2">
              <span className="w-2 h-6 bg-indigo-600 rounded-full" />
              Replies From Users
            </h2>
            <div className="overflow-x-auto border border-gray-100 rounded-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-sm font-medium text-gray-500 border-b border-gray-100">
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Original Notification</th>
                    <th className="px-6 py-4">Reply Message</th>
                    <th className="px-6 py-4">Time</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {replies.length === 0 ? (
                    <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-400 font-bold">No replies found.</td></tr>
                  ) : (
                    replies.map((r) => (
                      <tr key={r.id} className={`transition-colors group ${r.isReadByAdmin ? 'hover:bg-gray-50/50' : 'bg-indigo-50/30 hover:bg-indigo-50/50'}`}>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold uppercase shrink-0">
                              {r.userName?.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900">{r.userName}</p>
                              <p className="text-xs text-gray-500 font-medium">{r.studentId} • {r.branch}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <p className="text-xs font-bold text-gray-600 uppercase tracking-wide truncate max-w-[200px]" title={r.notificationTitle}>
                            {r.notificationTitle}
                          </p>
                        </td>
                        <td className="px-6 py-5">
                          <p className="text-sm text-gray-700 leading-relaxed max-w-sm whitespace-pre-wrap font-medium">
                            {r.replyMessage}
                          </p>
                        </td>
                        <td className="px-6 py-5">
                          <span className="text-xs text-gray-400 font-bold tracking-tight">
                            {new Date(r.createdAt).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          {r.isReadByAdmin ? (
                            <span className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                              Read
                            </span>
                          ) : (
                            <button
                              onClick={() => markReplyRead(r.id)}
                              className="px-3 py-1.5 text-[10px] font-bold text-indigo-600 bg-indigo-100 rounded-lg hover:bg-indigo-200 uppercase tracking-widest transition-all"
                            >
                              Mark Read
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};


export default AdminPanel;
