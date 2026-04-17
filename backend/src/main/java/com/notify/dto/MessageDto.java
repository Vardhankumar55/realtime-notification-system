package com.notify.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

public class MessageDto {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SendRequest {
        private Long recipientId;

        @NotBlank(message = "Message is required")
        @Size(max = 1000, message = "Message must not exceed 1000 characters")
        private String content;

        private String priority;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserPreview {
        private Long id;
        private String name;
        private String email;
        private String username;
        private String profileImage;
        private String role;
        private Boolean isBlocked;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MessageResponse {
        private Long id;
        private Long senderId;
        private String senderName;
        private Long recipientId;
        private String recipientName;
        private String content;
        private LocalDateTime createdAt;
        private LocalDateTime readAt;
        private Boolean isMine;
        private String deepLink;
        private String priority;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ConversationSummary {
        private UserPreview otherUser;
        private String lastMessage;
        private LocalDateTime lastMessageAt;
        private Long unreadCount;
        private String deepLink;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ConversationResponse {
        private UserPreview otherUser;
        private List<MessageResponse> messages;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MessageEvent {
        private Long id;
        private Long senderId;
        private String senderName;
        private Long recipientId;
        private String recipientName;
        private String content;
        private LocalDateTime createdAt;
        private String deepLink;
        private String priority;
    }
}
