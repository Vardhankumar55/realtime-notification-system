package com.notify.controller;

import com.notify.dto.NotificationDto;
import com.notify.entity.Notification;
import com.notify.entity.User;
import com.notify.repository.NotificationRepository;
import com.notify.repository.UserNotificationRepository;
import com.notify.service.AuthService;
import com.notify.service.NotificationService;
import com.notify.service.FileStorageService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.nio.file.Path;
import java.util.List;
import java.util.Map;

/**
 * REST controller for all notification operations.
 *
 * Role-based access:
 * - ROLE_ADMIN: can send, delete, and view all notifications
 * - ROLE_USER: can view their own, mark read, filter
 */
@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(origins = "*", maxAge = 3600)
@SuppressWarnings("null")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private FileStorageService fileStorageService;

    @Autowired
    private AuthService authService;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private UserNotificationRepository userNotificationRepository;

    @GetMapping("/download/{fileName:.+}")
    public ResponseEntity<Resource> downloadFile(@PathVariable String fileName) {
        try {
            requireAttachmentAccess(fileName);
            Path filePath = fileStorageService.loadFileAsResource(fileName);
            Resource resource = new UrlResource(filePath.toUri());

            if (resource.exists()) {
                return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + resource.getFilename() + "\"")
                    .body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (ResponseStatusException ex) {
            return ResponseEntity.status(ex.getStatusCode()).build();
        } catch (Exception ex) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/view/{fileName:.+}")
    public ResponseEntity<Resource> viewFile(@PathVariable String fileName) {
        try {
            requireAttachmentAccess(fileName);
            Path filePath = fileStorageService.loadFileAsResource(fileName);
            Resource resource = new UrlResource(filePath.toUri());

            if (resource.exists()) {
                String contentType = java.nio.file.Files.probeContentType(filePath);
                if (contentType == null) {
                    contentType = "application/octet-stream";
                }
                return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_TYPE, contentType)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                    .body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (ResponseStatusException ex) {
            return ResponseEntity.status(ex.getStatusCode()).build();
        } catch (Exception ex) {
            return ResponseEntity.internalServerError().build();
        }
    }

    // ─── Admin Endpoints ────────────────────────────────────────

    /** Send a notification to single/multiple/all users */
    @PostMapping(value = "/send", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<NotificationDto.ApiResponse<List<NotificationDto.NotificationResponse>>> send(
            @Valid @RequestPart("request") NotificationDto.SendRequest request,
            @RequestPart(value = "file", required = false) org.springframework.web.multipart.MultipartFile file) {
        List<NotificationDto.NotificationResponse> results = notificationService.sendNotification(request, file);
        return ResponseEntity.ok(NotificationDto.ApiResponse.success(
            "Notification sent to " + results.size() + " user(s)", results));
    }

    /** Admin: notify users that a notification is being edited */
    @PostMapping("/{id}/notify-editing")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<NotificationDto.ApiResponse<Void>> notifyEditing(@PathVariable("id") Long id) {
        notificationService.notifyEditing(id);
        return ResponseEntity.ok(NotificationDto.ApiResponse.success("Editing notification triggered", null));
    }

    /** Admin: get all notifications ever created */
    @GetMapping("/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<NotificationDto.ApiResponse<List<NotificationDto.NotificationResponse>>> getAllAdmin() {
        return ResponseEntity.ok(NotificationDto.ApiResponse.success(
            "All notifications", notificationService.getAllNotifications()));
    }

    /** Admin: delete a notification permanently for everyone */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<NotificationDto.ApiResponse<Void>> delete(@PathVariable("id") Long id) {
        notificationService.deleteNotification(id);
        return ResponseEntity.ok(NotificationDto.ApiResponse.success("Notification deleted permanently", null));
    }

    /** Admin: bulk delete notifications */
    @DeleteMapping("/bulk-delete")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<NotificationDto.ApiResponse<Void>> deleteBulk(@RequestBody List<Long> ids) {
        notificationService.deleteNotificationsBulk(ids);
        return ResponseEntity.ok(NotificationDto.ApiResponse.success(ids.size() + " notification(s) deleted permanently", null));
    }

    // ─── User Endpoints ─────────────────────────────────────────

    /** Get notifications for the currently logged-in user */
    @GetMapping("/my")
    public ResponseEntity<NotificationDto.ApiResponse<List<NotificationDto.NotificationResponse>>> getMyNotifications() {
        return ResponseEntity.ok(NotificationDto.ApiResponse.success(
            "Notifications fetched", notificationService.getMyNotifications()));
    }

    /** Get filtered notifications */
    @PostMapping("/filter")
    public ResponseEntity<NotificationDto.ApiResponse<List<NotificationDto.NotificationResponse>>> filter(
            @RequestBody NotificationDto.FilterRequest filter) {
        return ResponseEntity.ok(NotificationDto.ApiResponse.success(
            "Filtered notifications", notificationService.getFilteredNotifications(filter)));
    }

    /** Mark a single notification as read */
    @PatchMapping("/{userNotificationId}/read")
    public ResponseEntity<NotificationDto.ApiResponse<NotificationDto.NotificationResponse>> markAsRead(
            @PathVariable("userNotificationId") Long userNotificationId) {
        NotificationDto.NotificationResponse response = notificationService.markAsRead(userNotificationId);
        return ResponseEntity.ok(NotificationDto.ApiResponse.success("Marked as read", response));
    }

    /** Mark all notifications as read for current user */
    @PatchMapping("/read-all")
    public ResponseEntity<NotificationDto.ApiResponse<Void>> markAllRead() {
        notificationService.markAllAsRead();
        return ResponseEntity.ok(NotificationDto.ApiResponse.success("All marked as read", null));
    }

    /** Get unread notification count */
    @GetMapping("/unread-count")
    public ResponseEntity<NotificationDto.ApiResponse<Map<String, Long>>> getUnreadCount() {
        long count = notificationService.getUnreadCount();
        return ResponseEntity.ok(NotificationDto.ApiResponse.success("Unread count", Map.of("count", count)));
    }

    /** User: delete a notification from their view */
    @DeleteMapping("/user/{userNotificationId}")
    public ResponseEntity<NotificationDto.ApiResponse<Void>> deleteUserView(@PathVariable("userNotificationId") Long userNotificationId) {
        notificationService.deleteUserNotification(userNotificationId);
        return ResponseEntity.ok(NotificationDto.ApiResponse.success("Notification removed from view", null));
    }

    /** User: clear all notifications from their view */
    @DeleteMapping("/clear-all")
    public ResponseEntity<NotificationDto.ApiResponse<Void>> clearAllUserView() {
        notificationService.clearAllNotifications();
        return ResponseEntity.ok(NotificationDto.ApiResponse.success("All notifications cleared", null));
    }

    /** Pin/Unpin a notification */
    @PutMapping("/{userNotificationId}/pin")
    public ResponseEntity<NotificationDto.ApiResponse<NotificationDto.NotificationResponse>> togglePin(
            @PathVariable("userNotificationId") Long userNotificationId) {
        NotificationDto.NotificationResponse response = notificationService.togglePin(userNotificationId);
        return ResponseEntity.ok(NotificationDto.ApiResponse.success(
            response.getIsPinned() ? "Notification pinned" : "Notification unpinned", response));
    }

    /** Favorite/Unfavorite a notification */
    @PutMapping("/{userNotificationId}/favorite")
    public ResponseEntity<NotificationDto.ApiResponse<NotificationDto.NotificationResponse>> toggleFavorite(
            @PathVariable("userNotificationId") Long userNotificationId) {
        NotificationDto.NotificationResponse response = notificationService.toggleFavorite(userNotificationId);
        return ResponseEntity.ok(NotificationDto.ApiResponse.success(
            response.getIsFavorite() ? "Added to favorites" : "Removed from favorites", response));
    }

    /** Archive a notification */
    @PatchMapping("/{userNotificationId}/archive")
    public ResponseEntity<NotificationDto.ApiResponse<NotificationDto.NotificationResponse>> toggleArchive(
            @PathVariable("userNotificationId") Long userNotificationId) {
        NotificationDto.NotificationResponse response = notificationService.toggleArchive(userNotificationId);
        return ResponseEntity.ok(NotificationDto.ApiResponse.success(
            response.getIsArchived() ? "Notification archived" : "Notification unarchived", response));
    }

    /** Snooze a notification */
    @PostMapping("/{userNotificationId}/snooze")
    public ResponseEntity<NotificationDto.ApiResponse<NotificationDto.NotificationResponse>> snoozeNotification(
            @PathVariable("userNotificationId") Long userNotificationId,
            @Valid @RequestBody NotificationDto.SnoozeRequest request) {
        NotificationDto.NotificationResponse response = notificationService.snoozeNotification(userNotificationId, request);
        return ResponseEntity.ok(NotificationDto.ApiResponse.success(
            "Notification snoozed for " + request.getSnoozeMinutes() + " minutes", response));
    }

    @GetMapping("/offline-new")
    public ResponseEntity<NotificationDto.ApiResponse<List<NotificationDto.NotificationResponse>>> getOfflineNew() {
        return ResponseEntity.ok(NotificationDto.ApiResponse.success(
            "New notifications since last logout", notificationService.getNotificationsSinceLastLogout()));
    }

    /** User: reply to a notification */
    @PostMapping("/{id}/reply")
    public ResponseEntity<NotificationDto.ApiResponse<NotificationDto.ReplyResponse>> reply(
            @PathVariable("id") Long id,
            @Valid @RequestBody NotificationDto.ReplyRequest request) {
        NotificationDto.ReplyResponse response = notificationService.replyToNotification(id, request);
        return ResponseEntity.ok(NotificationDto.ApiResponse.success("Reply sent successfully", response));
    }

    private Notification requireAttachmentAccess(String fileName) {
        String attachmentUrl = "/api/notifications/download/" + fileName;
        Notification notification = notificationRepository.findByAttachmentUrl(attachmentUrl)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Attachment not found"));

        User currentUser = authService.getCurrentUser();
        boolean canAccess = currentUser.getRole() == User.Role.ROLE_ADMIN
            || notification.getSender().getId().equals(currentUser.getId())
            || userNotificationRepository.existsByUserIdAndNotificationId(currentUser.getId(), notification.getId());

        if (!canAccess) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not allowed to access this attachment");
        }

        return notification;
    }
}
