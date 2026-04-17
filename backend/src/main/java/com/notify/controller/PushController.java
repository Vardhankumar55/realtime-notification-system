package com.notify.controller;

import com.notify.entity.User;
import com.notify.service.AuthService;
import com.notify.service.WebPushService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * REST endpoints for Web Push subscription management.
 *
 * Flow:
 * 1. GET /api/push/vapid-public-key — frontend gets the public key to subscribe
 * 2. POST /api/push/subscribe — frontend sends the browser subscription
 * 3. POST /api/push/unsubscribe — frontend removes a subscription
 */
@RestController
@RequestMapping("/api/push")
public class PushController {

    @Autowired
    private WebPushService webPushService;

    @Autowired
    private AuthService authService;

    /**
     * Returns the VAPID public key. The frontend needs this to call
     * pushManager.subscribe() with the applicationServerKey parameter.
     */
    @GetMapping("/vapid-public-key")
    public ResponseEntity<?> getVapidPublicKey() {
        return ResponseEntity.ok(Map.of(
            "success", true,
            "data", Map.of("publicKey", webPushService.getVapidPublicKey())
        ));
    }

    /**
     * Save a push subscription from the browser.
     * Called after the user grants notification permission and the browser
     * creates a PushSubscription object.
     */
    @PostMapping("/subscribe")
    public ResponseEntity<?> subscribe(@RequestBody Map<String, Object> body) {
        User user = authService.getCurrentUser();

        String endpoint = (String) body.get("endpoint");
        @SuppressWarnings("unchecked")
        Map<String, String> keys = (Map<String, String>) body.get("keys");
        String p256dh = keys.get("p256dh");
        String auth = keys.get("auth");
        String userAgent = (String) body.getOrDefault("userAgent", "");

        webPushService.saveSubscription(user, endpoint, p256dh, auth, userAgent);

        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "Push subscription saved successfully"
        ));
    }

    /**
     * Remove a push subscription (user manually unsubscribed or switched it off).
     */
    @PostMapping("/unsubscribe")
    public ResponseEntity<?> unsubscribe(@RequestBody Map<String, String> body) {
        String endpoint = body.get("endpoint");
        webPushService.removeSubscription(endpoint);

        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "Push subscription removed"
        ));
    }

    /**
     * Get the number of active push subscriptions for the current user.
     */
    @GetMapping("/status")
    public ResponseEntity<?> getStatus() {
        User user = authService.getCurrentUser();
        int count = webPushService.getSubscriptionCount(user);
        return ResponseEntity.ok(Map.of(
            "success", true,
            "data", Map.of(
                "subscriptionCount", count,
                "pushEnabled", user.getPushEnabled() != null ? user.getPushEnabled() : true
            )
        ));
    }
}
