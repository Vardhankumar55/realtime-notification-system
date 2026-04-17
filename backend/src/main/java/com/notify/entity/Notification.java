package com.notify.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

/**
 * Notification entity mapped to the "notifications" table.
 * Represents a notification created by an admin.
 */
@Entity
@Table(name = "notifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Column(length = 280)
    private String summary;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private NotificationType type;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false, length = 20, columnDefinition = "varchar(20) default 'MEDIUM'")
    private NotificationPriority priority = NotificationPriority.MEDIUM;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;
    
    @Builder.Default
    @Column(name = "can_reply")
    private Boolean canReply = false;

    @Column(name = "scheduled_at")
    private LocalDateTime scheduledAt;

    @Builder.Default
    @Column(name = "is_scheduled")
    private Boolean isScheduled = false;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "edited_at")
    private LocalDateTime editedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by_id")
    private User updatedBy;

    @Column(name = "attachment_url")
    private String attachmentUrl;

    @Column(name = "attachment_name")
    private String attachmentName;

    @Column(name = "attachment_content_type", length = 120)
    private String attachmentContentType;

    @Column(name = "attachment_size")
    private Long attachmentSize;

    @Column(name = "deep_link")
    private String deepLink;

    @Column(name = "target_type", length = 30)
    private String targetType;

    @Column(name = "target_branch", length = 20)
    private String targetBranch;

    @Column(name = "target_year", length = 20)
    private String targetYear;

    @Column(name = "target_section", length = 10)
    private String targetSection;

    @Column(name = "target_user_ids", columnDefinition = "TEXT")
    private String targetUserIds;

    @Column(name = "action_button_text", length = 50)
    private String actionButtonText;

    @Column(name = "action_button_url")
    private String actionButtonUrl;

    @Builder.Default
    @OneToMany(mappedBy = "notification", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Set<UserNotification> userNotifications = new HashSet<>();

    @Builder.Default
    @OneToMany(mappedBy = "notification", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Set<NotificationReply> replies = new HashSet<>();

    public enum NotificationType {
        INFO,
        WARNING,
        SUCCESS,
        ERROR,
        ANNOUNCEMENT,
        EXAM_DATES,
        ASSIGNMENT_DEADLINES,
        PLACEMENT_DRIVE_ALERTS,
        HOLIDAY_ANNOUNCEMENTS,
        CLASSROOM_CHANGES,
        ATTENDANCE_WARNINGS
    }

    public enum NotificationPriority {
        LOW,
        MEDIUM,
        HIGH,
        URGENT
    }
}
