package com.notify.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

public class ProfileDto {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProfileResponse {
        private Long id;
        private String name;
        private String username;
        private String fullName;
        private String email;
        private String profileImage;
        private String role;
        private LocalDateTime createdAt;
        private Boolean isEnabled;

        // Preferences
        private Boolean pushEnabled;
        private Boolean emailEnabled;
        private Boolean soundEnabled;
        private Boolean darkModeEnabled;
        private Boolean emailAlertsEnabled;

        private String branch;
        private String year;
        private String section;
        private String studentId;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateRequest {
        @NotBlank(message = "Name is required")
        private String name;

        @NotBlank(message = "Username is required")
        private String username;

        @NotBlank(message = "Full name is required")
        private String fullName;

        private String profileImage;

        private String branch;
        private String year;
        private String section;
        private String studentId;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PasswordUpdateRequest {
        @NotBlank(message = "Current password is required")
        private String currentPassword;

        @NotBlank(message = "New password is required")
        @Size(min = 8, message = "New password must be at least 8 characters")
        private String newPassword;

        @NotBlank(message = "Confirm password is required")
        private String confirmPassword;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PreferencesRequest {
        private Boolean pushEnabled;
        private Boolean emailEnabled;
        private Boolean soundEnabled;
        private Boolean darkModeEnabled;
        private Boolean emailAlertsEnabled;
    }
}
