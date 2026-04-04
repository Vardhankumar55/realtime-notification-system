package com.notify.controller;

import com.notify.dto.NotificationDto.ApiResponse;
import com.notify.dto.ProfileDto;
import com.notify.entity.User;
import com.notify.service.AuthService;
import com.notify.service.UserService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    @Autowired
    private UserService userService;

    @Autowired
    private AuthService authService;

    @GetMapping
    public ResponseEntity<ApiResponse<ProfileDto.ProfileResponse>> getProfile() {
        User user = authService.getCurrentUser();
        return ResponseEntity.ok(ApiResponse.success("Profile fetched", userService.toProfileResponse(user)));
    }

    @PutMapping
    public ResponseEntity<ApiResponse<ProfileDto.ProfileResponse>> updateProfile(
            @Valid @RequestBody ProfileDto.UpdateRequest request) {
        User user = authService.getCurrentUser();
        User updated = userService.updateProfile(user.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Profile updated successfully", userService.toProfileResponse(updated)));
    }

    @PutMapping("/password")
    public ResponseEntity<ApiResponse<String>> updatePassword(
            @Valid @RequestBody ProfileDto.PasswordUpdateRequest request) {
        User user = authService.getCurrentUser();
        userService.updatePassword(user.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Password updated successfully", null));
    }

    @PutMapping("/preferences")
    public ResponseEntity<ApiResponse<ProfileDto.ProfileResponse>> updatePreferences(
            @RequestBody ProfileDto.PreferencesRequest request) {
        User user = authService.getCurrentUser();
        User updated = userService.updatePreferences(user.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Preferences updated successfully", userService.toProfileResponse(updated)));
    }
}
