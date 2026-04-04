package com.notify.dto;

import com.notify.entity.Notification;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DTOs for notification creation, listing, and real-time delivery.
 */
public class NotificationDto {

    // ─── Request DTOs ──────────────────────────────────────────

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SendRequest {
        @NotBlank(message = "Title is required")
        @Size(max = 200, message = "Title must not exceed 200 characters")
        private String title;

        @NotBlank(message = "Message is required")
        private String message;

        @NotNull(message = "Notification type is required")
        private Notification.NotificationType type;

        @NotBlank(message = "Target type is required")
        private String targetType;

        private List<Long> targetUserIds;
        private String branch;
        private String year;
        private String section;
        private Boolean canReply;
        private Boolean isScheduled;
        private LocalDateTime scheduledAt;
        private List<UserOverride> userOverrides;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReplyRequest {
        @NotBlank(message = "Reply message cannot be empty")
        @Size(max = 500, message = "Reply must not exceed 500 characters")
        private String message;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateRequest {
        @NotBlank(message = "Title is required")
        @Size(max = 200, message = "Title must not exceed 200 characters")
        private String title;
        @NotBlank(message = "Message is required")
        @Size(max = 1000, message = "Message must not exceed 1000 characters")
        private String message;
        private Notification.NotificationType type;
        private Boolean canReply;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MultiUserUpdateRequest {
        @NotNull(message = "Update list cannot be empty")
        @Size(min = 1, message = "At least one update must be provided")
        private List<UserOverride> updates;
        private Notification.NotificationType type;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserOverride {
        @NotNull(message = "User ID is required")
        private Long userId;
        @NotBlank(message = "Title is required")
        private String title;
        @NotBlank(message = "Message is required")
        private String message;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FilterRequest {
        private String type;
        private Boolean isRead;
        private String startDate;
        private String endDate;
        private Boolean isFavorite;
    }

    // ─── Response DTOs ─────────────────────────────────────────

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class NotificationResponse {
        private Long id;
        private String title;
        private String message;
        private String type;
        private SenderInfo sender;
        private LocalDateTime createdAt;
        private LocalDateTime editedAt;
        private SenderInfo updatedBy;
        private List<RecipientInfo> recipients;
        private Boolean canReply;
        // Per-user fields (populated when fetching for a specific user)
        private Long userNotificationId;
        private Boolean isRead;
        private Boolean isPinned;
        private Boolean isFavorite;
        private LocalDateTime readAt;
        private Boolean isScheduled;
        private LocalDateTime scheduledAt;
        private String attachmentUrl;
        private String attachmentName;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReplyResponse {
        private Long id;
        private Long notificationId;
        private String notificationTitle;
        private Long userId;
        private String userName;
        private String userEmail;
        private String studentId;
        private String branch;
        private String year;
        private String section;
        private String replyMessage;
        private LocalDateTime createdAt;
        private Boolean isReadByAdmin;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecipientInfo {
        private Long id;
        private String name;
        private String email;
        private String titleOverride;
        private String messageOverride;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SenderInfo {
        private Long id;
        private String name;
        private String email;
    }

    // ─── WebSocket Payload ─────────────────────────────────────

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WebSocketNotification {
        private Long id;
        private String title;
        private String message;
        private String type;
        private Long senderId;
        private String senderName;
        private LocalDateTime createdAt;
        private LocalDateTime editedAt;
        private Long userNotificationId;
        private Boolean isPinned;
        private Boolean isFavorite;
        private Boolean canReply;
        private Long adminId; // ID of the admin who triggered the action
        private String attachmentUrl;
        private String attachmentName;
        private String action; // "PUSH", "UPDATE", "PIN", "FAVORITE", "EDITING"
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ApiResponse<T> {
        private boolean success;
        private String message;
        private T data;

        public static <T> ApiResponse<T> success(String message, T data) {
            return ApiResponse.<T>builder()
                .success(true)
                .message(message)
                .data(data)
                .build();
        }

        public static <T> ApiResponse<T> error(String message) {
            return ApiResponse.<T>builder()
                .success(false)
                .message(message)
                .build();
        }
    }
}
