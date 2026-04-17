import React, { useState, useEffect } from "react";
import { useNotifications } from "../../context/LiveContext";

/**
 * Push Notification Banner
 *
 * Shows a beautiful, non-intrusive banner asking the user to enable
 * push notifications. Appears only when:
 * - Push is supported by the browser
 * - User hasn't subscribed yet
 * - User hasn't permanently dismissed it
 *
 * This is what allows notifications to arrive even when the site is closed.
 */
const PushNotificationBanner = () => {
  const {
    pushSupported,
    pushSubscribed,
    pushPermission,
    enablePushNotifications,
  } = useNotifications();

  const [visible, setVisible] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if user has permanently dismissed this banner
    const wasDismissed = localStorage.getItem("push_banner_dismissed");
    if (wasDismissed) {
      setDismissed(true);
      return;
    }

    // Show banner if push is supported but not yet subscribed
    if (pushSupported && !pushSubscribed && pushPermission !== "denied") {
      // Slight delay so it doesn't appear instantly on page load
      const timer = setTimeout(() => setVisible(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [pushSupported, pushSubscribed, pushPermission]);

  const handleEnable = async () => {
    setEnabling(true);
    try {
      await enablePushNotifications();
      setVisible(false);
    } catch (error) {
      console.error("Failed to enable push:", error);
    } finally {
      setEnabling(false);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
  };

  const handleDismissPermanently = () => {
    localStorage.setItem("push_banner_dismissed", "true");
    setDismissed(true);
    setVisible(false);
  };

  if (!visible || dismissed || pushSubscribed || pushPermission === "denied") {
    return null;
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.banner}>
        <div style={styles.iconContainer}>
          <div style={styles.bellIcon}>🔔</div>
          <div style={styles.pulseRing}></div>
        </div>
        <div style={styles.content}>
          <h3 style={styles.title}>Stay Updated — Even When Away!</h3>
          <p style={styles.description}>
            Enable push notifications to receive alerts even when you've closed
            this site. Never miss an important message.
          </p>
        </div>
        <div style={styles.actions}>
          <button
            onClick={handleEnable}
            disabled={enabling}
            style={{
              ...styles.enableButton,
              opacity: enabling ? 0.7 : 1,
            }}
          >
            {enabling ? (
              <span style={styles.spinner}></span>
            ) : (
              "Enable Notifications"
            )}
          </button>
          <div style={styles.secondaryActions}>
            <button onClick={handleDismiss} style={styles.laterButton}>
              Later
            </button>
            <button
              onClick={handleDismissPermanently}
              style={styles.neverButton}
            >
              Don't ask again
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pushBannerSlideIn {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes pushPulse {
          0% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.3); opacity: 0; }
          100% { transform: scale(1); opacity: 0; }
        }
        @keyframes pushSpinner {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

const styles = {
  overlay: {
    position: "fixed",
    top: 20,
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 10000,
    animation: "pushBannerSlideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
    maxWidth: "520px",
    width: "calc(100% - 32px)",
  },
  banner: {
    background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)",
    borderRadius: "16px",
    padding: "20px 24px",
    boxShadow: "0 20px 60px rgba(67, 56, 202, 0.4), 0 4px 16px rgba(0, 0, 0, 0.2)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    backdropFilter: "blur(20px)",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    alignItems: "center",
    textAlign: "center",
  },
  iconContainer: {
    position: "relative",
    width: "48px",
    height: "48px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  bellIcon: {
    fontSize: "32px",
    filter: "drop-shadow(0 2px 8px rgba(255, 255, 255, 0.3))",
  },
  pulseRing: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: "48px",
    height: "48px",
    border: "2px solid rgba(255, 255, 255, 0.4)",
    borderRadius: "50%",
    transform: "translate(-50%, -50%)",
    animation: "pushPulse 2s ease-out infinite",
  },
  content: {
    flex: 1,
  },
  title: {
    margin: "0 0 6px",
    fontSize: "16px",
    fontWeight: "700",
    color: "#fff",
    letterSpacing: "-0.02em",
  },
  description: {
    margin: 0,
    fontSize: "13px",
    color: "rgba(255, 255, 255, 0.75)",
    lineHeight: "1.5",
  },
  actions: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    alignItems: "center",
    width: "100%",
  },
  enableButton: {
    background: "linear-gradient(135deg, #818cf8, #6366f1)",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "10px 24px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    boxShadow: "0 4px 12px rgba(99, 102, 241, 0.4)",
    width: "100%",
    justifyContent: "center",
  },
  secondaryActions: {
    display: "flex",
    gap: "16px",
  },
  laterButton: {
    background: "none",
    border: "none",
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: "12px",
    cursor: "pointer",
    padding: "4px 8px",
    transition: "color 0.2s",
  },
  neverButton: {
    background: "none",
    border: "none",
    color: "rgba(255, 255, 255, 0.35)",
    fontSize: "11px",
    cursor: "pointer",
    padding: "4px 8px",
    transition: "color 0.2s",
  },
  spinner: {
    display: "inline-block",
    width: "16px",
    height: "16px",
    border: "2px solid rgba(255, 255, 255, 0.3)",
    borderTopColor: "#fff",
    borderRadius: "50%",
    animation: "pushSpinner 0.6s linear infinite",
  },
};

export default PushNotificationBanner;
