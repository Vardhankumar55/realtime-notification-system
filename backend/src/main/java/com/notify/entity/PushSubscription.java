package com.notify.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Stores Web Push API subscription data for each user's browser/device.
 * When the user grants notification permission, the browser generates a unique
 * push subscription (endpoint + keys). The server uses these to push
 * notifications even when the user has closed the website.
 */
@Entity
@Table(name = "push_subscriptions", uniqueConstraints = {
    @UniqueConstraint(columnNames = "endpoint")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PushSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** The push service URL provided by the browser (e.g., https://fcm.googleapis.com/...) */
    @Column(nullable = false, columnDefinition = "TEXT")
    private String endpoint;

    /** The client's public key (Base64 URL-safe encoded) */
    @Column(name = "p256dh_key", nullable = false, columnDefinition = "TEXT")
    private String p256dhKey;

    /** The client's auth secret (Base64 URL-safe encoded) */
    @Column(name = "auth_secret", nullable = false, length = 512)
    private String authSecret;

    /** User agent string for debugging which browser/device this is */
    @Column(name = "user_agent", length = 512)
    private String userAgent;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
