import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import NotificationBell from "../notifications/NotificationBell";

/**
 * Top navigation bar — shown on all authenticated pages.
 * Contains: logo, nav links, WebSocket status, notification bell, user menu.
 */

const Navbar = () => {
  const { user, logout, isAdmin } = useAuth();
  const { wsConnected } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navLinks = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/notifications", label: "Notifications" },
    { to: "/profile", label: "Profile" },
    ...(isAdmin ? [{ to: "/admin", label: "Admin Panel" }] : []),
  ];

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2 transition-transform active:scale-95 group">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl
              flex items-center justify-center shadow-indigo-200 shadow-lg group-hover:rotate-12 transition-transform">
              <span className="text-white text-base font-black">N</span>
            </div>
            <span className="font-black text-gray-900 text-xl tracking-tight hidden sm:block">Notify<span className="text-indigo-600">Hub</span></span>
          </Link>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all
                  ${location.pathname === link.to
                    ? "bg-indigo-50 text-indigo-700 shadow-sm"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"}`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* WebSocket status indicator */}
            <div className="hidden sm:flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100" title={wsConnected ? "Real-time connected" : "Connecting..."}>
              <span className={`w-2 h-2 rounded-full ${wsConnected ? "bg-green-500 animate-pulse-dot shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-yellow-500"}`} />
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{wsConnected ? "Live" : "Connecting"}</span>
            </div>

            {/* Notification bell */}
            <NotificationBell />

            {/* User menu */}
            <div className="flex items-center gap-3 pl-3 border-l border-gray-100">
              <Link to="/profile" className="flex items-center gap-3 group">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500
                    flex items-center justify-center text-white text-sm font-black shadow-md shadow-indigo-100 group-hover:scale-105 transition-transform overflow-hidden">
                    {user?.profileImage ? (
                      <img src={user.profileImage} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      (user?.name || user?.email || "?").charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />
                </div>
                <div className="hidden lg:block">
                  <p className="text-sm font-black text-gray-900 leading-tight group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{user?.name || user?.username}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                    {isAdmin ? "Admin Console" : "Personal Hub"}
                  </p>
                </div>
              </Link>
              <button
                onClick={handleLogout}
                className="ml-2 w-10 h-10 flex items-center justify-center text-gray-400 hover:text-red-500
                  hover:bg-red-50 rounded-xl transition-all active:scale-95 group"
                title="Sign Out"
              >
                <svg className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

export default Navbar;
