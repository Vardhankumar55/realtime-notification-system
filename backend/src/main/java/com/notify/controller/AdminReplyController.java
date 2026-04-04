package com.notify.controller;

import com.notify.dto.NotificationDto;
import com.notify.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST controller for managing user replies (admin only).
 */
@RestController
@RequestMapping("/api/admin/notification-replies")
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
@CrossOrigin(origins = "*", maxAge = 3600)
public class AdminReplyController {

    @Autowired
    private NotificationService notificationService;

    /** Admin: get all user replies */
    @GetMapping
    public ResponseEntity<NotificationDto.ApiResponse<List<NotificationDto.ReplyResponse>>> getAllReplies() {
        return ResponseEntity.ok(NotificationDto.ApiResponse.success(
            "User replies fetched", notificationService.getAllReplies()));
    }

    /** Admin: get replies for a specific notification */
    @GetMapping("/{notificationId}")
    public ResponseEntity<NotificationDto.ApiResponse<List<NotificationDto.ReplyResponse>>> getReplies(
            @PathVariable("notificationId") Long notificationId) {
        return ResponseEntity.ok(NotificationDto.ApiResponse.success(
            "Replies for notification: " + notificationId, notificationService.getRepliesForNotification(notificationId)));
    }

    /** Admin: mark a reply as read */
    @PatchMapping("/{replyId}/read")
    public ResponseEntity<NotificationDto.ApiResponse<Void>> markAsRead(
            @PathVariable("replyId") Long replyId) {
        notificationService.markReplyAsRead(replyId);
        return ResponseEntity.ok(NotificationDto.ApiResponse.success("Reply marked as read", null));
    }

    /** Admin: get unread reply count for badge */
    @GetMapping("/unread-count")
    public ResponseEntity<NotificationDto.ApiResponse<Map<String, Long>>> getUnreadCount() {
        long count = notificationService.getUnreadReplyCount();
        return ResponseEntity.ok(NotificationDto.ApiResponse.success("Unread count", Map.of("count", count)));
    }
}
