package com.notify.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

/**
 * User entity mapped to the "users" table in PostgreSQL.
 * Stores user credentials, roles, and metadata.
 */
@Entity
@Table(name = "users", uniqueConstraints = {
        @UniqueConstraint(columnNames = "email"),
        @UniqueConstraint(columnNames = "username")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(unique = true, length = 50)
    private String username;

    @Column(name = "full_name", length = 150)
    private String fullName;

    @Column(nullable = false, length = 150)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(name = "profile_image", columnDefinition = "TEXT")
    private String profileImage;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role;

    @Builder.Default
    @Column(name = "is_enabled", nullable = false)
    private Boolean isEnabled = true;

    // Preferences
    @Builder.Default
    @Column(name = "notification_push_enabled")
    private Boolean pushEnabled = true;

    @Builder.Default
    @Column(name = "notification_email_enabled")
    private Boolean emailEnabled = false;

    @Builder.Default
    @Column(name = "sound_enabled")
    private Boolean soundEnabled = true;

    @Builder.Default
    @Column(name = "dark_mode_enabled")
    private Boolean darkModeEnabled = false;

    @Builder.Default
    @Column(name = "email_alerts_enabled")
    private Boolean emailAlertsEnabled = false;

    // College Details
    @Column(length = 20)
    private String branch;

    @Column(length = 20)
    private String year;

    @Column(length = 10)
    private String section;

    @Column(name = "student_id", unique = true, length = 20)
    private String studentId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "last_logout_at")
    private LocalDateTime lastLogoutAt;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Set<UserNotification> userNotifications = new HashSet<>();

    public enum Role {
        ROLE_USER,
        ROLE_ADMIN
    }
}
