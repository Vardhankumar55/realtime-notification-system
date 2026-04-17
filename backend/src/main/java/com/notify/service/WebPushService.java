package com.notify.service;

import com.notify.entity.PushSubscription;
import com.notify.entity.User;
import com.notify.repository.PushSubscriptionRepository;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.annotation.PostConstruct;
import java.security.GeneralSecurityException;
import java.security.Security;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Manages Web Push subscriptions and sends push notifications via the W3C Push API.
 *
 * How Web Push works:
 * 1. User visits site → browser Service Worker registers
 * 2. User grants notification permission → browser calls pushManager.subscribe()
 * 3. Browser returns a PushSubscription (endpoint + keys)
 * 4. Frontend sends this subscription to our backend (stored in DB)
 * 5. When a notification is sent, this service uses the VAPID keys + subscription
 *    to send a push message via the browser's push service (FCM, Mozilla, etc.)
 * 6. The Service Worker in the user's browser wakes up and shows a native notification
 *    — EVEN IF the site is closed.
 */
@Service
@Transactional
@SuppressWarnings("null")
public class WebPushService {

    private static final Logger log = LoggerFactory.getLogger(WebPushService.class);

    @Autowired
    private PushSubscriptionRepository pushSubscriptionRepository;

    @Value("${app.push.vapid.public-key}")
    private String vapidPublicKey;

    @Value("${app.push.vapid.private-key}")
    private String vapidPrivateKey;

    @Value("${app.push.vapid.subject:mailto:admin@notifyhub.com}")
    private String vapidSubject;

    private PushService pushService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @PostConstruct
    public void init() {
        try {
            Security.addProvider(new BouncyCastleProvider());
            pushService = new PushService();
            pushService.setPublicKey(vapidPublicKey);
            pushService.setPrivateKey(vapidPrivateKey);
            pushService.setSubject(vapidSubject);
            log.info("✅ Web Push service initialized with VAPID keys");
        } catch (GeneralSecurityException e) {
            log.error("❌ Failed to initialize Web Push service: {}", e.getMessage(), e);
        }
    }

    /**
     * Returns the VAPID public key so the frontend can use it to subscribe.
     */
    public String getVapidPublicKey() {
        return vapidPublicKey;
    }

    /**
     * Save or update a push subscription for a user.
     * A user can have multiple subscriptions (different browsers/devices).
     */
    public PushSubscription saveSubscription(User user, String endpoint, String p256dhKey, String authSecret, String userAgent) {
        // Check if this endpoint already exists (re-subscribe from same browser)
        Optional<PushSubscription> existing = pushSubscriptionRepository.findByEndpoint(endpoint);
        if (existing.isPresent()) {
            PushSubscription sub = existing.get();
            sub.setUser(user);
            sub.setP256dhKey(p256dhKey);
            sub.setAuthSecret(authSecret);
            sub.setUserAgent(userAgent);
            log.info("🔄 Updated push subscription for user {} (endpoint already existed)", user.getEmail());
            return pushSubscriptionRepository.save(sub);
        }

        PushSubscription sub = PushSubscription.builder()
            .user(user)
            .endpoint(endpoint)
            .p256dhKey(p256dhKey)
            .authSecret(authSecret)
            .userAgent(userAgent)
            .build();
        log.info("✅ New push subscription saved for user {}", user.getEmail());
        return pushSubscriptionRepository.save(sub);
    }

    /**
     * Remove a push subscription (user unsubscribed or subscription expired).
     */
    public void removeSubscription(String endpoint) {
        pushSubscriptionRepository.deleteByEndpoint(endpoint);
        log.info("🗑️ Push subscription removed: {}", endpoint);
    }

    /**
     * Send a push notification to ALL subscribed devices/browsers of a user.
     * This is what makes notifications appear even when the tab is closed!
     */
    public void sendPushToUser(User user, String title, String message, String type,
                                String deepLink, String priority, String icon) {
        if (pushService == null) {
            log.warn("Push service not initialized, skipping push for user {}", user.getEmail());
            return;
        }

        // Respect user's preference
        if (user.getPushEnabled() != null && !user.getPushEnabled()) {
            log.debug("Push disabled for user {}, skipping", user.getEmail());
            return;
        }

        List<PushSubscription> subscriptions = pushSubscriptionRepository.findByUserId(user.getId());
        if (subscriptions.isEmpty()) {
            log.debug("No push subscriptions for user {}", user.getEmail());
            return;
        }

        // Build the push payload (this is what the Service Worker receives)
        Map<String, Object> payload = new HashMap<>();
        payload.put("title", title);
        payload.put("body", message);
        payload.put("type", type != null ? type : "INFO");
        payload.put("deepLink", deepLink != null ? deepLink : "/notifications");
        payload.put("priority", priority != null ? priority : "MEDIUM");
        payload.put("icon", icon != null ? icon : "/favicon.png");
        payload.put("badge", "/favicon.png");
        payload.put("timestamp", System.currentTimeMillis());

        String payloadJson;
        try {
            payloadJson = objectMapper.writeValueAsString(payload);
        } catch (Exception e) {
            log.error("Failed to serialize push payload", e);
            return;
        }

        for (PushSubscription sub : subscriptions) {
            try {
                Notification notification = new Notification(
                    sub.getEndpoint(),
                    sub.getP256dhKey(),
                    sub.getAuthSecret(),
                    payloadJson
                );
                pushService.send(notification);
                log.debug("📤 Push sent to user {} (endpoint: {}...)",
                    user.getEmail(), sub.getEndpoint().substring(0, Math.min(50, sub.getEndpoint().length())));
            } catch (Exception e) {
                String errorMsg = e.getMessage() != null ? e.getMessage() : "";
                // 410 Gone or 404 Not Found = subscription expired, remove it
                if (errorMsg.contains("410") || errorMsg.contains("404")) {
                    log.info("🗑️ Push subscription expired for user {}, removing", user.getEmail());
                    pushSubscriptionRepository.delete(sub);
                } else {
                    log.error("❌ Failed to send push to user {}: {}", user.getEmail(), errorMsg);
                }
            }
        }
    }

    /**
     * Send push to multiple users (used for broadcast notifications).
     */
    public void sendPushToUsers(List<User> users, String title, String message,
                                 String type, String deepLink, String priority) {
        for (User user : users) {
            sendPushToUser(user, title, message, type, deepLink, priority, null);
        }
    }

    /**
     * Get subscription count for a user (useful for UI display).
     */
    public int getSubscriptionCount(User user) {
        return pushSubscriptionRepository.findByUserId(user.getId()).size();
    }
}
