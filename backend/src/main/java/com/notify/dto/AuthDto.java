package com.notify.dto;

import com.notify.entity.User;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Data Transfer Objects for authentication requests and responses.
 * DTOs prevent exposing internal entity structures to clients.
 */
public class AuthDto {

    // ─── Request DTOs ──────────────────────────────────────────

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RegisterRequest {
        @NotBlank(message = "Name is required")
        @Size(min = 2, max = 100, message = "Name must be between 2 and 100 characters")
        private String name;

        @NotBlank(message = "Email is required")
        @Email(message = "Please provide a valid email address")
        private String email;

        @NotBlank(message = "Password is required")
        @Size(min = 6, max = 50, message = "Password must be between 6 and 50 characters")
        private String password;

        // Optional: defaults to ROLE_USER if not provided
        private String role;

        private String branch;
        private String year;
        private String section;
        private String studentId;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LoginRequest {
        @NotBlank(message = "Email is required")
        @Email(message = "Please provide a valid email address")
        private String email;

        @NotBlank(message = "Password is required")
        private String password;
    }

    // ─── Response DTOs ─────────────────────────────────────────

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AuthResponse {
        private String token;
        @Builder.Default
        private String type = "Bearer";
        private Long id;
        private String name;
        private String email;
        private String role;
        private String username;
        private String fullName;
        private String profileImage;
        private Boolean isEnabled;
        private Boolean pushEnabled;
        private Boolean emailEnabled;
        private Boolean soundEnabled;
        private Boolean darkModeEnabled;
        private Boolean emailAlertsEnabled;
        
        private String branch;
        private String year;
        private String section;
        private String studentId;
        private java.time.LocalDateTime lastLogoutAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserSummary {
        private Long id;
        private String name;
        private String email;
        private String username;
        private String fullName;
        private User.Role role;
        private String createdAt;
        private Boolean isEnabled;
        
        private String branch;
        private String year;
        private String section;
        private String studentId;
        private java.time.LocalDateTime lastLogoutAt;
        private String profileImage;
        private Boolean pushEnabled;
        private Boolean emailEnabled;
        private Boolean soundEnabled;
        private Boolean darkModeEnabled;
        private Boolean emailAlertsEnabled;
    }
}
