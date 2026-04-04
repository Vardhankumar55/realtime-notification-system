import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { profileAPI } from "../services/api";
import { useNotifications } from "../context/NotificationContext";
import Navbar from "../components/common/Navbar";

const Profile = () => {
    const { user, setUser } = useAuth();
    const { addToast } = useNotifications();

    const [profile, setProfile] = useState({
        name: "",
        username: "",
        fullName: "",
        profileImage: "",
        branch: "",
        year: "",
        section: "",
        studentId: "",
    });

    const [passwordData, setPasswordData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });

    const [prefs, setPrefs] = useState({
        pushEnabled: true,
        emailEnabled: false,
        soundEnabled: true,
        darkModeEnabled: false,
        emailAlertsEnabled: false,
    });

    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        if (user) {
            setProfile({
                name: user.name || "",
                username: user.username || "",
                fullName: user.fullName || "",
                profileImage: user.profileImage || "",
                branch: user.branch || "",
                year: user.year || "",
                section: user.section || "",
                studentId: user.studentId || "",
            });
            setPrefs({
                pushEnabled: user.pushEnabled ?? true,
                emailEnabled: user.emailEnabled ?? false,
                soundEnabled: user.soundEnabled ?? true,
                darkModeEnabled: user.darkModeEnabled ?? false,
                emailAlertsEnabled: user.emailAlertsEnabled ?? false,
            });
        }
    }, [user]);

    const handleProfileUpdate = async (e) => {
        e.preventDefault();

        // Validation
        if (!profile.fullName.trim()) {
            addToast({ title: "Required", message: "Full Name cannot be empty", type: "ERROR" });
            return;
        }
        if (!profile.username.trim()) {
            addToast({ title: "Required", message: "Username cannot be empty", type: "ERROR" });
            return;
        }

        setLoading(true);
        try {
            const res = await profileAPI.update(profile);
            setUser({ ...user, ...res.data.data });
            setIsEditing(false); // Close edit mode
            addToast({
                title: "Success",
                message: "Profile updated successfully",
                type: "SUCCESS"
            });
        } catch (err) {
            addToast({
                title: "Update Failed",
                message: err.response?.status === 400
                    ? "Username already taken or invalid data."
                    : "Unable to update profile. Please try again.",
                type: "ERROR"
            });
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordUpdate = async (e) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            addToast({
                title: "Validation Error",
                message: "New passwords do not match",
                type: "WARNING"
            });
            return;
        }
        setLoading(true);
        try {
            await profileAPI.updatePassword(passwordData);
            setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
            addToast({
                title: "Security Updated",
                message: "Password updated successfully",
                type: "SUCCESS"
            });
        } catch (err) {
            addToast({
                title: "Security Alert",
                message: err.response?.data?.message || "Failed to update password",
                type: "ERROR"
            });
        } finally {
            setLoading(false);
        }
    };

    const handlePrefToggle = async (key) => {
        const newPrefs = { ...prefs, [key]: !prefs[key] };
        setPrefs(newPrefs);
        try {
            const res = await profileAPI.updatePreferences(newPrefs);
            setUser({ ...user, ...res.data.data });
            // Subtle feedback? Maybe no toast for toggle to avoid spam
        } catch (err) {
            setPrefs(prefs); // Revert
            addToast({
                title: "Preference Error",
                message: "Failed to update settings",
                type: "ERROR"
            });
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column: Profile Card */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
                            <div className="relative inline-block">
                                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 mx-auto flex items-center justify-center text-white text-4xl font-black shadow-xl overflow-hidden">
                                    {profile.profileImage ? (
                                        <img src={profile.profileImage} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        profile.name?.charAt(0).toUpperCase()
                                    )}
                                </div>
                                <div className="absolute bottom-1 right-1 w-8 h-8 bg-indigo-600 rounded-full border-4 border-white flex items-center justify-center">
                                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                            </div>
                            <h2 className="mt-4 text-xl font-black text-gray-900 uppercase tracking-tight">{profile.fullName || profile.name}</h2>
                            <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">{user?.role === "ROLE_ADMIN" ? "Administrator" : "User Account"}</p>
                            <div className="mt-6 pt-6 border-t border-gray-100 text-left space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Email</span>
                                    <span className="text-gray-700 font-medium">{user?.email}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Username</span>
                                    <span className="text-gray-700 font-medium">@{user?.username || "unset"}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Joined</span>
                                    <span className="text-gray-700 font-medium">{new Date(user?.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-50">
                                    <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Student ID</span>
                                    <span className="text-gray-700 font-medium">{user?.studentId || "N/A"}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Branch / Year</span>
                                    <span className="text-gray-700 font-medium">{user?.branch || "N/A"} - {user?.year || "N/A"}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Section</span>
                                    <span className="text-gray-700 font-medium">{user?.section || "N/A"}</span>
                                </div>
                            </div>
                            {!isEditing && (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="mt-6 w-full py-3 border-2 border-indigo-600 text-indigo-600 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                >
                                    🛠️ Edit Profile Details
                                </button>
                            )}
                        </div>

                        {/* Notification Preferences */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6">Preferences</h3>
                            <div className="space-y-4">
                                {[
                                    { id: "pushEnabled", label: "Push Notifications", icon: "🔔" },
                                    { id: "emailEnabled", label: "Email Notifications", icon: "📧" },
                                    { id: "soundEnabled", label: "Sound Effects", icon: "🔊" },
                                    { id: "darkModeEnabled", label: "Dark Mode", icon: "🌙" },
                                    { id: "emailAlertsEnabled", label: "Critical Email Alerts", icon: "⚡" },
                                ].map((item) => (
                                    <div key={item.id} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="text-lg">{item.icon}</span>
                                            <span className="text-sm font-bold text-gray-700">{item.label}</span>
                                        </div>
                                        <button
                                            onClick={() => handlePrefToggle(item.id)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none 
                                                ${prefs[item.id] ? "bg-indigo-600" : "bg-gray-200"}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform 
                                                ${prefs[item.id] ? "translate-x-6" : "translate-x-1"}`} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Edit Forms */}
                    <div className="lg:col-span-2 space-y-6">
                        {isEditing ? (
                            <>
                                {/* Edit Profile Form */}
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Modify Identity</h3>
                                        <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600 text-[10px] font-black uppercase tracking-widest">✕ Cancel</button>
                                    </div>
                                    <form onSubmit={handleProfileUpdate} className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Account Email (Static)</label>
                                            <input
                                                type="email"
                                                value={user?.email}
                                                disabled
                                                className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 text-gray-400 font-medium cursor-not-allowed"
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Display Name</label>
                                                <input
                                                    type="text"
                                                    value={profile.name}
                                                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Username</label>
                                                <input
                                                    type="text"
                                                    value={profile.username}
                                                    onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Full Name</label>
                                            <input
                                                type="text"
                                                value={profile.fullName}
                                                onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium"
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Student ID</label>
                                                <input
                                                    type="text"
                                                    value={profile.studentId}
                                                    onChange={(e) => setProfile({ ...profile, studentId: e.target.value })}
                                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Branch</label>
                                                <select
                                                    value={profile.branch}
                                                    onChange={(e) => setProfile({ ...profile, branch: e.target.value })}
                                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium bg-white"
                                                >
                                                    <option value="">Select Branch</option>
                                                    <option value="CSE">CSE</option>
                                                    <option value="ECE">ECE</option>
                                                    <option value="EEE">EEE</option>
                                                    <option value="IT">IT</option>
                                                    <option value="CIVIL">CIVIL</option>
                                                    <option value="MECH">MECH</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Year</label>
                                                <select
                                                    value={profile.year}
                                                    onChange={(e) => setProfile({ ...profile, year: e.target.value })}
                                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium bg-white"
                                                >
                                                    <option value="">Select Year</option>
                                                    <option value="1st Year">1st Year</option>
                                                    <option value="2nd Year">2nd Year</option>
                                                    <option value="3rd Year">3rd Year</option>
                                                    <option value="4th Year">4th Year</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Section</label>
                                                <select
                                                    value={profile.section}
                                                    onChange={(e) => setProfile({ ...profile, section: e.target.value })}
                                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium bg-white"
                                                >
                                                    <option value="">Select Section</option>
                                                    <option value="A">A</option>
                                                    <option value="B">B</option>
                                                    <option value="C">C</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Profile Photo Coverage</label>
                                            <div className="flex flex-col sm:flex-row gap-4">
                                                <div className="flex-1">
                                                    <input
                                                        type="text"
                                                        value={profile.profileImage}
                                                        onChange={(e) => setProfile({ ...profile, profileImage: e.target.value })}
                                                        placeholder="Image URL"
                                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-xs font-medium"
                                                    />
                                                </div>
                                                <div className="relative">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => {
                                                            const file = e.target.files[0];
                                                            if (file) {
                                                                const reader = new FileReader();
                                                                reader.onloadend = () => setProfile({ ...profile, profileImage: reader.result });
                                                                reader.readAsDataURL(file);
                                                            }
                                                        }}
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                    />
                                                    <div className="px-6 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-colors pointer-events-none">
                                                        📁 Upload File
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50"
                                        >
                                            {loading ? "Updating..." : "Save Identity Changes"}
                                        </button>
                                    </form>
                                </div>

                                {/* Change Password Form */}
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 animate-fade-in">
                                    <div className="flex items-center gap-2 mb-6">
                                        <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                                            <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                        </div>
                                        <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Security Credentials</h3>
                                    </div>
                                    <form onSubmit={handlePasswordUpdate} className="space-y-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Current Password</label>
                                            <input
                                                type="password"
                                                required
                                                value={passwordData.currentPassword}
                                                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">New Password</label>
                                                <input
                                                    type="password"
                                                    required
                                                    value={passwordData.newPassword}
                                                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Confirm New Password</label>
                                                <input
                                                    type="password"
                                                    required
                                                    value={passwordData.confirmPassword}
                                                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                                                />
                                            </div>
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="px-6 py-3 bg-red-600 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-red-700 shadow-lg shadow-red-100 transition-all active:scale-95 disabled:opacity-50"
                                        >
                                            {loading ? "Updating..." : "Update Password"}
                                        </button>
                                    </form>
                                </div>
                            </>
                        ) : (
                            <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-12 text-center">
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl">👤</span>
                                </div>
                                <h3 className="text-gray-900 font-black uppercase tracking-tight">Identity Vault</h3>
                                <p className="text-sm text-gray-400 mt-2 max-w-xs mx-auto">Click "Edit Profile Details" in the identity card to modify your credentials and personal information.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Profile;
