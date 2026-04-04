package com.notify.controller;

import com.notify.dto.NotificationDto;
import com.notify.service.NotificationService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for admin-level notification management.
 * Provides APIs for updating existing notifications.
 */
@RestController
@RequestMapping("/api/admin/notifications")
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
@CrossOrigin(origins = "*", maxAge = 3600)
public class AdminNotificationController {

    @Autowired
    private NotificationService notificationService;

    /**
     * Update a notification globally for all targeted users.
     */
    @PutMapping("/{id}")
    public ResponseEntity<NotificationDto.ApiResponse<NotificationDto.NotificationResponse>> updateNotification(
            @PathVariable("id") Long id,
            @Valid @RequestBody NotificationDto.UpdateRequest request) {
        
        NotificationDto.NotificationResponse response = notificationService.updateNotification(id, request);
        return ResponseEntity.ok(NotificationDto.ApiResponse.success("Notification updated globally", response));
    }

    /**
     * Update a notification for a single specific user (individual override).
     */
    @PutMapping("/{id}/user/{userId}")
    public ResponseEntity<NotificationDto.ApiResponse<NotificationDto.NotificationResponse>> updateUserNotification(
            @PathVariable("id") Long id,
            @PathVariable("userId") Long userId,
            @Valid @RequestBody NotificationDto.UpdateRequest request) {
        
        NotificationDto.NotificationResponse response = notificationService.updateUserNotification(id, userId, request);
        return ResponseEntity.ok(NotificationDto.ApiResponse.success("Individual notification override applied", response));
    }

    /**
     * Update a notification for multiple users with different content for each.
     */
    @PutMapping("/{id}/multiple-user-updates")
    public ResponseEntity<NotificationDto.ApiResponse<Void>> updateMultipleUserNotifications(
            @PathVariable("id") Long id,
            @Valid @RequestBody NotificationDto.MultiUserUpdateRequest request) {
        
        notificationService.updateMultipleUserNotifications(id, request);
        return ResponseEntity.ok(NotificationDto.ApiResponse.success("Multiple individual overrides applied", null));
    }

    /**
     * Delete a notification for specific users only.
     */
    @DeleteMapping("/{id}/users")
    public ResponseEntity<NotificationDto.ApiResponse<Void>> deleteForSpecificUsers(
            @PathVariable("id") Long id,
            @RequestBody java.util.List<Long> userIds) {
        
        notificationService.deleteForSpecificUsers(id, userIds);
        return ResponseEntity.ok(NotificationDto.ApiResponse.success("Notification deleted for selected users", null));
    }
}
