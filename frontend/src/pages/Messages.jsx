import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "../components/common/NavbarV2";
import { messageAPI } from "../services/api";
import { useNotifications } from "../context/LiveContext";

const Messages = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedUserId = searchParams.get("user");
  const { 
    addToast, 
    messageRefreshKey, 
    markConversationRead, 
    unreadMessagesCount,
    lastIncomingMessage,
    setLastIncomingMessage
  } = useNotifications();

  const [users, setUsers] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [draft, setDraft] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");

  const userMap = useMemo(() => {
    const map = new Map();
    users.forEach((user) => map.set(String(user.id), user));
    conversations.forEach((conversation) => map.set(String(conversation.otherUser.id), conversation.otherUser));
    blockedUsers.forEach((user) => map.set(String(user.id), user));
    return map;
  }, [blockedUsers, conversations, users]);

  const loadSidebarData = async () => {
    try {
      const [usersRes, conversationsRes, blockedRes] = await Promise.all([
        messageAPI.getUsers(),
        messageAPI.getConversations(),
        messageAPI.getBlockedUsers(),
      ]);
      setUsers(usersRes.data.data || []);
      setConversations(conversationsRes.data.data || []);
      setBlockedUsers(blockedRes.data.data || []);
    } catch (error) {
      console.error("Failed to load messages sidebar", error);
      addToast({
        title: "Messages Unavailable",
        message: "Unable to load your conversations right now.",
        type: "ERROR",
        isSystem: true,
      });
    }
  };

  const loadConversation = async (userId) => {
    if (!userId) {
      setMessages([]);
      setSelectedUser(null);
      return;
    }

    setLoadingConversation(true);
    try {
      const res = await messageAPI.getConversation(userId);
      const data = res.data.data;
      setSelectedUser(data.otherUser);
      setMessages(data.messages || []);
      await markConversationRead(userId);
    } catch (error) {
      console.error("Failed to load conversation", error);
      addToast({
        title: "Conversation Error",
        message: "Unable to load this conversation.",
        type: "ERROR",
        isSystem: true,
      });
    } finally {
      setLoadingConversation(false);
    }
  };

  useEffect(() => {
    loadSidebarData();
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      loadConversation(selectedUserId);
    } else {
      setSelectedUser(null);
      setMessages([]);
    }
  }, [selectedUserId]); // Only re-fetch on user change, NOT on refresh key

  // Smoothly append incoming messages to current chat
  useEffect(() => {
    if (lastIncomingMessage && String(lastIncomingMessage.senderId) === selectedUserId) {
      // Prevent duplicates if already fetched
      setMessages((prev) => {
        const exists = prev.some(m => m.id === lastIncomingMessage.id);
        if (exists) return prev;
        
        // Map WS event to MessageResponse format
        const newMessage = {
          id: lastIncomingMessage.id,
          senderId: lastIncomingMessage.senderId,
          senderName: lastIncomingMessage.senderName,
          recipientId: lastIncomingMessage.recipientId,
          recipientName: lastIncomingMessage.recipientName,
          content: lastIncomingMessage.content,
          createdAt: lastIncomingMessage.createdAt,
          priority: lastIncomingMessage.priority,
          isMine: false // It's incoming
        };
        return [...prev, newMessage];
      });
      
      // Also update sidebar summary without full refresh
      setConversations((prev) => prev.map(conv => 
        String(conv.otherUser.id) === selectedUserId
          ? { ...conv, lastMessage: lastIncomingMessage.content, lastMessageAt: lastIncomingMessage.createdAt }
          : conv
      ));

      setLastIncomingMessage(null); // Clear after consumption
    }
  }, [lastIncomingMessage, selectedUserId, setLastIncomingMessage]);

  const filteredUsers = users.filter((user) => {
    const needle = search.toLowerCase();
    if (!needle) return true;
    return (
      user.name?.toLowerCase().includes(needle) ||
      user.email?.toLowerCase().includes(needle) ||
      user.username?.toLowerCase().includes(needle)
    );
  });

  const handleSelectUser = (user) => {
    setSearchParams({ user: String(user.id) });
  };

  const handleSend = async (event) => {
    event.preventDefault();
    if (!selectedUser || !draft.trim()) return;

    try {
      const res = await messageAPI.send({ recipientId: selectedUser.id, content: draft.trim(), priority });
      const sentMessage = res.data.data;
      
      setDraft("");
      setPriority("MEDIUM");

      // Append locally for instant feedback
      setMessages((prev) => [...prev, sentMessage]);
      
      // Update sidebar summary
      setConversations((prev) => {
        const existing = prev.find(c => String(c.otherUser.id) === selectedUserId);
        if (existing) {
          return prev.map(c => String(c.otherUser.id) === selectedUserId 
            ? { ...c, lastMessage: sentMessage.content, lastMessageAt: sentMessage.createdAt }
            : c
          );
        }
        return [{ otherUser: selectedUser, lastMessage: sentMessage.content, lastMessageAt: sentMessage.createdAt, unreadCount: 0 }, ...prev];
      });

      await loadSidebarData(); 
      addToast({
        title: "Message Sent",
        message: `Your message to ${selectedUser.name} has been delivered.`,
        type: "SUCCESS",
        isSystem: true,
      });
    } catch (error) {
      addToast({
        title: "Message Failed",
        message: error.response?.data?.message || "Unable to send the message.",
        type: "ERROR",
        isSystem: true,
      });
    } finally {
      setSending(false);
    }
  };

  const handleToggleBlock = async () => {
    if (!selectedUser) return;
    try {
      if (selectedUser.isBlocked) {
        await messageAPI.unblock(selectedUser.id);
        addToast({
          title: "User Unblocked",
          message: `${selectedUser.name} can message you again.`,
          type: "SUCCESS",
          isSystem: true,
        });
      } else {
        await messageAPI.block(selectedUser.id);
        addToast({
          title: "User Blocked",
          message: `${selectedUser.name} has been added to your block list.`,
          type: "SUCCESS",
          isSystem: true,
        });
      }
      await Promise.all([loadSidebarData(), loadConversation(selectedUser.id)]);
    } catch (error) {
      addToast({
        title: "Block Update Failed",
        message: error.response?.data?.message || "Unable to update block status.",
        type: "ERROR",
        isSystem: true,
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/60">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] gap-6">
          <aside className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-black text-gray-900 tracking-tight">Messages</h1>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 mt-1">
                    {unreadMessagesCount > 0 ? `${unreadMessagesCount} unread` : "Inbox clear"}
                  </p>
                </div>
              </div>
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search people..."
                className="mt-4 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-medium outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500"
              />
            </div>

            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              <section>
                <p className="px-2 text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Recent</p>
                <div className="space-y-2">
                  {conversations.length === 0 ? (
                    <p className="px-2 py-4 text-sm text-gray-400">No conversations yet.</p>
                  ) : (
                    conversations.map((conversation) => (
                      <button
                        key={conversation.otherUser.id}
                        onClick={() => handleSelectUser(conversation.otherUser)}
                        className={`w-full text-left rounded-2xl border px-4 py-3 transition-all ${
                          String(conversation.otherUser.id) === selectedUserId
                            ? "border-indigo-200 bg-indigo-50 shadow-sm"
                            : "border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-gray-900">{conversation.otherUser.name}</p>
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{conversation.lastMessage}</p>
                          </div>
                          {conversation.unreadCount > 0 && (
                            <span className="min-w-[24px] h-6 px-2 rounded-full bg-red-500 text-white text-[11px] font-black flex items-center justify-center">
                              {conversation.unreadCount}
                            </span>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </section>

              <section>
                <p className="px-2 text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Start New</p>
                <div className="space-y-2">
                  {filteredUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleSelectUser(user)}
                      className="w-full text-left rounded-2xl border border-gray-100 bg-white px-4 py-3 hover:border-gray-200 hover:bg-gray-50 transition-all"
                    >
                      <p className="text-sm font-bold text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500 mt-1">{user.email}</p>
                    </button>
                  ))}
                </div>
              </section>

              {blockedUsers.length > 0 && (
                <section>
                  <p className="px-2 text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Blocked</p>
                  <div className="space-y-2">
                    {blockedUsers.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleSelectUser(user)}
                        className="w-full text-left rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 hover:bg-amber-100 transition-all"
                      >
                        <p className="text-sm font-bold text-gray-900">{user.name}</p>
                        <p className="text-xs text-amber-700 mt-1">Blocked contact</p>
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </aside>

          <section className="bg-white rounded-3xl border border-gray-100 shadow-xl min-h-[70vh] flex flex-col overflow-hidden">
            {selectedUser ? (
              <>
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black text-gray-900">{selectedUser.name}</h2>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 mt-1">
                      {selectedUser.email}
                    </p>
                  </div>
                  <button
                    onClick={handleToggleBlock}
                    className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all ${
                      selectedUser.isBlocked
                        ? "bg-green-50 text-green-700 hover:bg-green-100"
                        : "bg-red-50 text-red-600 hover:bg-red-100"
                    }`}
                  >
                    {selectedUser.isBlocked ? "Unblock" : "Block"}
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-6 bg-gray-50/70 space-y-3">
                  {loadingConversation ? (
                    <div className="h-full flex items-center justify-center text-sm text-gray-400">Loading conversation...</div>
                  ) : messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-sm text-gray-400">
                      No messages yet. Start the conversation below.
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={`max-w-xl rounded-3xl px-4 py-3 shadow-sm ${
                          message.isMine
                            ? "ml-auto bg-indigo-600 text-white"
                            : "bg-white border border-gray-100 text-gray-800"
                        }`}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                        <p className={`text-[11px] mt-2 font-bold flex items-center gap-2 ${message.isMine ? "text-indigo-100" : "text-gray-400"}`}>
                          {(message.priority === "HIGH" || message.priority === "URGENT") && (
                            <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider ${message.priority === "URGENT" ? "bg-red-500 text-white" : "bg-orange-100 text-orange-600"}`}>
                              {message.priority}
                            </span>
                          )}
                          {new Date(message.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleSend} className="p-5 border-t border-gray-100 bg-white">
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-3">
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                        disabled={selectedUser.isBlocked || sending}
                        className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-medium outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 disabled:bg-gray-50"
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="URGENT">Urgent!</option>
                      </select>
                      <textarea
                        rows={3}
                        value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      disabled={selectedUser.isBlocked || sending}
                      placeholder={selectedUser.isBlocked ? "Unblock this user to send a message." : "Type your message..."}
                      className="flex-1 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-medium outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 resize-none disabled:bg-gray-50"
                    />
                    <button
                      type="submit"
                      disabled={!draft.trim() || selectedUser.isBlocked || sending}
                      className="self-end px-5 py-3 rounded-2xl bg-indigo-600 text-white text-sm font-black uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all disabled:opacity-50"
                    >
                      {sending ? "Sending" : "Send"}
                    </button>
                    </div>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center px-6">
                <div>
                  <h2 className="text-2xl font-black text-gray-900">Choose a conversation</h2>
                  <p className="text-sm text-gray-500 mt-2">Open an existing chat or start a new message from the left panel.</p>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default Messages;
