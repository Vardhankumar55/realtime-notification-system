/**
 * Web Push Notification Service
 *
 * This service handles:
 * 1. Registering the Service Worker
 * 2. Requesting notification permission from the user
 * 3. Subscribing to push notifications (getting browser subscription)
 * 4. Sending the subscription to our backend
 * 5. Handling notification clicks (deep link navigation)
 *
 * WHY THIS IS NEEDED:
 * WebSocket (STOMP) only works when the browser tab is open.
 * Web Push uses a Service Worker that runs in the background,
 * so notifications arrive even when the user has CLOSED the website.
 * This is exactly how WhatsApp Web, Gmail, Slack, etc. work.
 */

import { notificationAPI } from './api';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || '';

class PushNotificationService {
  constructor() {
    this.swRegistration = null;
    this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
    this.vapidPublicKey = null;
  }

  /**
   * Initialize the push service:
   * 1. Register the Service Worker
   * 2. Fetch the VAPID public key from the server
   */
  async init() {
    if (!this.isSupported) {
      console.warn('⚠️ Push notifications are not supported in this browser');
      return false;
    }

    try {
      // Register the service worker
      this.swRegistration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      console.log('✅ Service Worker registered:', this.swRegistration.scope);

      // Listen for messages from the service worker (e.g., notification clicks)
      navigator.serviceWorker.addEventListener('message', this._handleSwMessage);

      // Fetch the VAPID public key from the server
      await this._fetchVapidPublicKey();

      return true;
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
      return false;
    }
  }

  /**
   * Fetch the VAPID public key from the backend.
   * This key is used by the browser to verify push messages are from our server.
   */
  async _fetchVapidPublicKey() {
    try {
      const res = await axios.get(`${API_BASE}/api/push/vapid-public-key`);
      this.vapidPublicKey = res.data?.data?.publicKey;
      console.log('🔑 VAPID public key fetched');
    } catch (error) {
      console.error('Failed to fetch VAPID public key:', error);
    }
  }

  /**
   * Check if the user has already granted notification permission.
   */
  getPermissionState() {
    if (!this.isSupported) return 'unsupported';
    return Notification.permission; // 'granted', 'denied', or 'default'
  }

  /**
   * Request notification permission and subscribe to push.
   * Returns true if subscription was successful.
   */
  async subscribe(authToken) {
    if (!this.isSupported) {
      console.warn('Push not supported');
      return false;
    }

    if (!this.vapidPublicKey) {
      await this._fetchVapidPublicKey();
      if (!this.vapidPublicKey) {
        console.error('No VAPID key available');
        return false;
      }
    }

    try {
      // Ask for permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('🚫 Notification permission denied');
        return false;
      }

      // Wait for service worker to be ready
      const registration = await navigator.serviceWorker.ready;

      // Check if already subscribed
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        // Create a new subscription
        const applicationServerKey = this._urlBase64ToUint8Array(this.vapidPublicKey);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey,
        });
        console.log('✅ Push subscription created');
      } else {
        console.log('ℹ️ Already subscribed to push');
      }

      // Send the subscription to our backend
      await this._sendSubscriptionToServer(subscription, authToken);

      return true;
    } catch (error) {
      console.error('❌ Push subscription failed:', error);
      return false;
    }
  }

  /**
   * Unsubscribe from push notifications.
   */
  async unsubscribe(authToken) {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Tell the server to remove the subscription
        await axios.post(
          `${API_BASE}/api/push/unsubscribe`,
          { endpoint: subscription.endpoint },
          { headers: { Authorization: `Bearer ${authToken}` } }
        );

        // Unsubscribe from the browser
        await subscription.unsubscribe();
        console.log('🗑️ Push subscription removed');
      }

      return true;
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      return false;
    }
  }

  /**
   * Check if the user is currently subscribed to push.
   */
  async isSubscribed() {
    if (!this.isSupported) return false;
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      return !!subscription;
    } catch {
      return false;
    }
  }

  /**
   * Send the browser's push subscription to our backend for storage.
   */
  async _sendSubscriptionToServer(subscription, authToken) {
    const subscriptionJSON = subscription.toJSON();
    try {
      await axios.post(
        `${API_BASE}/api/push/subscribe`,
        {
          endpoint: subscriptionJSON.endpoint,
          keys: subscriptionJSON.keys,
          userAgent: navigator.userAgent,
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );
      console.log('✅ Subscription sent to server');
    } catch (error) {
      console.error('Failed to send subscription to server:', error);
      throw error;
    }
  }

  /**
   * Handle messages from the Service Worker (e.g., notification click deep links).
   */
  _handleSwMessage = (event) => {
    if (event.data?.type === 'NOTIFICATION_CLICK') {
      const deepLink = event.data.deepLink;
      if (deepLink && window.location.pathname !== deepLink) {
        window.location.href = deepLink;
      }
    }
  };

  /**
   * Convert a VAPID key from URL-safe base64 to a Uint8Array.
   * Required by the Push API's applicationServerKey parameter.
   */
  _urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

// Singleton instance
const pushService = new PushNotificationService();
export default pushService;
