package com.notify.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "notification_templates")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "title_template", nullable = false, length = 200)
    private String titleTemplate;

    @Column(name = "message_template", nullable = false, columnDefinition = "TEXT")
    private String messageTemplate;

    @Column(name = "summary_template", length = 280)
    private String summaryTemplate;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    @Builder.Default
    private Notification.NotificationType type = Notification.NotificationType.INFO;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    @Builder.Default
    private Notification.NotificationPriority priority = Notification.NotificationPriority.MEDIUM;

    @Column(name = "action_button_text", length = 50)
    private String actionButtonText;

    @Column(name = "action_button_url", length = 200)
    private String actionButtonUrl;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
