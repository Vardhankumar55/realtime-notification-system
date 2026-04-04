package com.notify.controller;

import com.notify.dto.AuthDto;
import com.notify.dto.NotificationDto;
import com.notify.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for authentication endpoints.
 * Public routes: /api/auth/register, /api/auth/login
 * Protected route: /api/auth/users (admin only)
 */
@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*", maxAge = 3600)
public class AuthController {

    @Autowired
    private AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<NotificationDto.ApiResponse<AuthDto.AuthResponse>> register(
            @Valid @RequestBody AuthDto.RegisterRequest request) {
        AuthDto.AuthResponse response = authService.register(request);
        return ResponseEntity.ok(NotificationDto.ApiResponse.success("User registered successfully", response));
    }

    @PostMapping("/login")
    public ResponseEntity<NotificationDto.ApiResponse<AuthDto.AuthResponse>> login(
            @Valid @RequestBody AuthDto.LoginRequest request) {
        AuthDto.AuthResponse response = authService.login(request);
        return ResponseEntity.ok(NotificationDto.ApiResponse.success("Login successful", response));
    }

    @GetMapping("/me")
    public ResponseEntity<NotificationDto.ApiResponse<AuthDto.UserSummary>> getCurrentUser() {
        var user = authService.getCurrentUser();
        AuthDto.UserSummary summary = AuthDto.UserSummary.builder()
            .id(user.getId())
            .name(user.getName())
            .username(user.getUsername())
            .email(user.getEmail())
            .role(user.getRole())
            .createdAt(user.getCreatedAt() != null ? user.getCreatedAt().toString() : null)
            .isEnabled(user.getIsEnabled())
            .branch(user.getBranch())
            .year(user.getYear())
            .section(user.getSection())
            .studentId(user.getStudentId())
            .lastLogoutAt(user.getLastLogoutAt())
            .fullName(user.getFullName())
            .profileImage(user.getProfileImage())
            .pushEnabled(user.getPushEnabled())
            .emailEnabled(user.getEmailEnabled())
            .soundEnabled(user.getSoundEnabled())
            .darkModeEnabled(user.getDarkModeEnabled())
            .emailAlertsEnabled(user.getEmailAlertsEnabled())
            .build();
        return ResponseEntity.ok(NotificationDto.ApiResponse.success("User fetched", summary));
    }

    @GetMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<NotificationDto.ApiResponse<List<AuthDto.UserSummary>>> getAllUsers() {
        List<AuthDto.UserSummary> users = authService.getAllUsers();
        return ResponseEntity.ok(NotificationDto.ApiResponse.success("Users fetched", users));
    }

    @PostMapping("/logout")
    public ResponseEntity<NotificationDto.ApiResponse<Void>> logout() {
        authService.logout();
        return ResponseEntity.ok(NotificationDto.ApiResponse.success("Logout successful", null));
    }
}
