import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/LiveContext";
import NotificationBellV2 from "../notifications/NotificationBellV2";

const NavbarV2 = () => {
  const { user, logout, isAdmin } = useAuth();
  const { wsConnected, unreadMessagesCount } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navLinks = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/notifications", label: "Notifications" },
    { to: "/messages", label: "Messages", badge: unreadMessagesCount },
    { to: "/profile", label: "Profile" },
    ...(isAdmin ? [{ to: "/admin", label: "Admin Panel" }] : []),
  ];

  return (
    <nav className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link to="/dashboard" className="group flex items-center gap-2 transition-transform active:scale-95">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg shadow-indigo-200 transition-transform group-hover:rotate-12">
              <span className="text-base font-black text-white">N</span>
            </div>
            <span className="hidden text-xl font-black tracking-tight text-gray-900 sm:block">
              Notify<span className="text-indigo-600">Hub</span>
            </span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => {
              const active = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`relative rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                    active ? "bg-indigo-50 text-indigo-700 shadow-sm" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  {link.label}
                  {link.badge > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
                      {link.badge > 99 ? "99+" : link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-4">
            <div
              className="hidden items-center gap-2 rounded-full border border-gray-100 bg-gray-50 px-3 py-1.5 sm:flex"
              title={wsConnected ? "Real-time connected" : "Connecting..."}
            >
              <span className={`h-2 w-2 rounded-full ${wsConnected ? "animate-pulse-dot bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-yellow-500"}`} />
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                {wsConnected ? "Live" : "Connecting"}
              </span>
            </div>

            <NotificationBellV2 />

            <div className="flex items-center gap-3 border-l border-gray-100 pl-3">
              <Link to="/profile" className="group flex items-center gap-3">
                <div className="relative">
                  <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-sm font-black text-white shadow-md shadow-indigo-100 transition-transform group-hover:scale-105">
                    {user?.profileImage ? (
                      <img src={user.profileImage} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      (user?.name || user?.email || "?").charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="absolute -right-0.5 -bottom-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-green-500" />
                </div>
                <div className="hidden lg:block">
                  <p className="text-sm font-black uppercase tracking-tight text-gray-900 transition-colors group-hover:text-indigo-600">
                    {user?.name || user?.username}
                  </p>
                  <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    {isAdmin ? "Admin Console" : "Personal Hub"}
                  </p>
                </div>
              </Link>
              <button
                onClick={handleLogout}
                className="group ml-2 flex h-10 w-10 items-center justify-center rounded-xl text-gray-400 transition-all active:scale-95 hover:bg-red-50 hover:text-red-500"
                title="Sign Out"
              >
                <svg className="h-5 w-5 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavbarV2;
