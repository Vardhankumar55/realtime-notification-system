package com.notify.service;

import com.notify.dto.NotificationDto;
import com.notify.entity.Notification;
import com.notify.entity.NotificationReply;
import com.notify.entity.User;
import com.notify.entity.UserNotification;
import com.notify.repository.NotificationReplyRepository;
import com.notify.repository.NotificationRepository;
import com.notify.repository.UserNotificationRepository;
import com.notify.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Core notification business logic.
 *
 * Responsibilities:
 * 1. Create notifications and persist them in DB
 * 2. Link notifications to target users (user_notifications table)
 * 3. Push real-time notifications via WebSocket
 * 4. Mark notifications as read/unread
 * 5. Filter and retrieve notifications
 */
@Service
@Transactional
public class NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private UserNotificationRepository userNotificationRepository;

    @Autowired
    private NotificationReplyRepository notificationReplyRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private AuthService authService;

    @Autowired
    private FileStorageService fileStorageService;

    /**
     * Send a notification to one or more users (or all users).
     * After persisting, push via WebSocket to each recipient.
     */
    public List<NotificationDto.NotificationResponse> sendNotification(
            NotificationDto.SendRequest request, org.springframework.web.multipart.MultipartFile file) {

        User sender = authService.getCurrentUser();

        Notification notification = Notification.builder()
            .title(request.getTitle())
            .message(request.getMessage())
            .type(request.getType())
            .sender(sender)
            .canReply(request.getCanReply() != null ? request.getCanReply() : false)
            .targetType(request.getTargetType())
            .targetBranch(request.getBranch())
            .targetYear(request.getYear())
            .targetSection(request.getSection())
            .build();

        if (request.getTargetUserIds() != null && !request.getTargetUserIds().isEmpty()) {
            notification.setTargetUserIds(request.getTargetUserIds().stream()
                .map(String::valueOf).collect(Collectors.joining(",")));
        }

        notificationRepository.save(notification);

        if (file != null && !file.isEmpty()) {
            String storedFileName = fileStorageService.storeFile(file);
            notification.setAttachmentName(file.getOriginalFilename());
            notification.setAttachmentUrl("/api/notifications/download/" + storedFileName);
            notificationRepository.save(notification);
        }

        // Determine target users
        List<User> targets = getTargetUsers(notification);

        // Check if this is a scheduled notification
        boolean scheduled = Boolean.TRUE.equals(request.getIsScheduled()) && request.getScheduledAt() != null;
        if (scheduled) {
            notification.setIsScheduled(true);
            notification.setScheduledAt(request.getScheduledAt());
            notificationRepository.save(notification);
        }

        // Broadcast to all connected users immediately (only if not scheduled)
        if (!scheduled && "ALL".equalsIgnoreCase(notification.getTargetType())) {
            messagingTemplate.convertAndSend("/topic/notifications/all",
                NotificationDto.WebSocketNotification.builder()
                    .id(notification.getId())
                    .title(notification.getTitle())
                    .message(notification.getMessage())
                    .type(notification.getType().name())
                    .senderId(sender.getId())
                    .senderName(sender.getName())
                    .createdAt(notification.getCreatedAt())
                    .canReply(notification.getCanReply())
                    .attachmentUrl(notification.getAttachmentUrl())
                    .attachmentName(notification.getAttachmentName())
                    .action("PUSH")
                    .build());
        }

        // Create UserNotification records and push targeted WebSocket pulses
        for (User target : targets) {
            // Find override if exists
            NotificationDto.UserOverride override = request.getUserOverrides() == null ? null :
                request.getUserOverrides().stream()
                    .filter(o -> o.getUserId() != null && o.getUserId().equals(target.getId()))
                    .findFirst()
                    .orElse(null);

            String finalTitle = override != null && override.getTitle() != null ? override.getTitle() : notification.getTitle();
            String finalMessage = override != null && override.getMessage() != null ? override.getMessage() : notification.getMessage();

            UserNotification un = UserNotification.builder()
                .user(target)
                .notification(notification)
                .isRead(false)
                .titleOverride(override != null ? override.getTitle() : null)
                .messageOverride(override != null ? override.getMessage() : null)
                .build();
            userNotificationRepository.save(un);

            // Targeted push for individuals (if not already broadcast and not scheduled)
            if (!scheduled && !"ALL".equalsIgnoreCase(notification.getTargetType())) {
                messagingTemplate.convertAndSend(
                    "/topic/notifications/" + target.getEmail(),
                    NotificationDto.WebSocketNotification.builder()
                        .id(notification.getId())
                        .title(finalTitle)
                        .message(finalMessage)
                        .type(notification.getType().name())
                        .senderId(sender.getId())
                        .senderName(sender.getName())
                        .createdAt(notification.getCreatedAt())
                        .userNotificationId(un.getId())
                        .canReply(notification.getCanReply())
                        .attachmentUrl(notification.getAttachmentUrl())
                        .attachmentName(notification.getAttachmentName())
                        .action("PUSH")
                        .build()
                );
            }
        }

        return targets.stream()
            .map(t -> toResponse(notification, sender,
                userNotificationRepository.findByUserIdAndNotificationId(
                    t.getId(), notification.getId()).orElse(null)))
            .collect(Collectors.toList());
    }

    /**
     * Notify all recipients that the admin has started editing a notification.
     */
    public void notifyEditing(Long notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
            .orElseThrow(() -> new RuntimeException("Notification not found"));
        User sender = authService.getCurrentUser();

        // Find all UserNotification records for this notification to get the emails
        List<UserNotification> userNotifications = userNotificationRepository.findByNotificationId(notificationId);
        
        for (UserNotification un : userNotifications) {
            messagingTemplate.convertAndSend("/topic/notifications/" + un.getUser().getEmail(),
                NotificationDto.WebSocketNotification.builder()
                    .id(notification.getId())
                    .title(notification.getTitle())
                    .message("Admin is Editing the Notification please wait")
                    .type(notification.getType().name())
                    .senderId(sender.getId())
                    .senderName(sender.getName())
                    .createdAt(notification.getCreatedAt())
                    .userNotificationId(un.getId())
                    .adminId(sender.getId())
                    .action("EDITING")
                    .build());
        }
    }

    /**
     * Called by the scheduler to fire a pending scheduled notification.
     * Pushes WebSocket events to all linked users.
     */
    public void fireScheduledNotification(Notification notification) {
        User sender = notification.getSender();
        List<UserNotification> userNotifications =
            userNotificationRepository.findByNotificationId(notification.getId());

        boolean isAll = userNotifications.size() > 5; // heuristic for broadcast

        if (isAll) {
            messagingTemplate.convertAndSend("/topic/notifications/all",
                NotificationDto.WebSocketNotification.builder()
                    .id(notification.getId())
                    .title(notification.getTitle())
                    .message(notification.getMessage())
                    .type(notification.getType().name())
                    .senderId(sender.getId())
                    .senderName(sender.getName())
                    .createdAt(notification.getCreatedAt())
                    .canReply(notification.getCanReply())
                    .attachmentUrl(notification.getAttachmentUrl())
                    .attachmentName(notification.getAttachmentName())
                    .action("PUSH")
                    .build());
        } else {
            for (UserNotification un : userNotifications) {
                messagingTemplate.convertAndSend(
                    "/topic/notifications/" + un.getUser().getEmail(),
                    NotificationDto.WebSocketNotification.builder()
                        .id(notification.getId())
                        .title(notification.getTitle())
                        .message(notification.getMessage())
                        .type(notification.getType().name())
                        .senderId(sender.getId())
                        .senderName(sender.getName())
                        .createdAt(notification.getCreatedAt())
                        .userNotificationId(un.getId())
                        .canReply(notification.getCanReply())
                        .attachmentUrl(notification.getAttachmentUrl())
                        .attachmentName(notification.getAttachmentName())
                        .action("PUSH")
                        .build()
                );
            }
        }

        // Mark as no longer scheduled
        notification.setIsScheduled(false);
        notificationRepository.save(notification);
    }

    /**
     * Get all notifications for the currently logged-in user.
     */
    public List<NotificationDto.NotificationResponse> getMyNotifications() {
        User user = authService.getCurrentUser();
        return userNotificationRepository
            .findByUserIdOrderByIsPinnedDescNotificationCreatedAtDesc(user.getId())
            .stream()
            .map(un -> toResponse(un.getNotification(), un.getNotification().getSender(), un))
            .collect(Collectors.toList());
    }

    /**
     * Get filtered notifications.
     */
    public List<NotificationDto.NotificationResponse> getFilteredNotifications(
            NotificationDto.FilterRequest filter) {

        User user = authService.getCurrentUser();

        Notification.NotificationType type = null;
        if (filter.getType() != null && !filter.getType().isEmpty()) {
            type = Notification.NotificationType.valueOf(filter.getType());
        }

        LocalDateTime startDate = filter.getStartDate() != null
            ? LocalDateTime.parse(filter.getStartDate()) : null;
        LocalDateTime endDate = filter.getEndDate() != null
            ? LocalDateTime.parse(filter.getEndDate()) : null;

        List<UserNotification> results = userNotificationRepository
            .findWithFilters(user.getId(), type, startDate, endDate, filter.getIsFavorite());

        if (filter.getIsRead() != null) {
            results = results.stream()
                .filter(un -> un.getIsRead().equals(filter.getIsRead()))
                .collect(Collectors.toList());
        }

        return results.stream()
            .map(un -> toResponse(un.getNotification(), un.getNotification().getSender(), un))
            .collect(Collectors.toList());
    }

    /**
     * Mark a specific user_notification as read.
     */
    public NotificationDto.NotificationResponse markAsRead(Long userNotificationId) {
        UserNotification un = userNotificationRepository.findById(userNotificationId)
            .orElseThrow(() -> new RuntimeException("Notification not found: " + userNotificationId));

        un.setIsRead(true);
        un.setReadAt(LocalDateTime.now());
        userNotificationRepository.save(un);

        return toResponse(un.getNotification(), un.getNotification().getSender(), un);
    }

    /**
     * Mark all notifications for current user as read.
     */
    public void markAllAsRead() {
        User user = authService.getCurrentUser();
        List<UserNotification> unread = userNotificationRepository
            .findByUserIdAndIsRead(user.getId(), false);
        LocalDateTime now = LocalDateTime.now();
        unread.forEach(un -> {
            un.setIsRead(true);
            un.setReadAt(now);
        });
        userNotificationRepository.saveAll(unread);

        // Broadcast to user's specific topic
        messagingTemplate.convertAndSend("/topic/notifications/" + user.getEmail(),
            NotificationDto.WebSocketNotification.builder()
                .action("MARK_ALL_READ")
                .build());
    }

    /**
     * Get unread count for current user.
     */
    public long getUnreadCount() {
        User user = authService.getCurrentUser();
        return userNotificationRepository.countByUserIdAndIsReadFalse(user.getId());
    }

    /**
     * Delete a notification system-wide (admin only).
     */
    public void deleteNotification(Long notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
            .orElseThrow(() -> new RuntimeException("Notification not found: " + notificationId));
        
        // Broadcast deletion BEFORE deleting from DB to ensure we have the ID for the message
        messagingTemplate.convertAndSend("/topic/notifications/all",
            NotificationDto.WebSocketNotification.builder()
                .id(notificationId)
                .title(notification.getTitle())
                .action("DELETE")
                .build());
                
        notificationRepository.delete(notification);
    }

    /** Bulk delete notifications */
    public void deleteNotificationsBulk(List<Long> notificationIds) {
        if (notificationIds == null || notificationIds.isEmpty()) return;
        notificationIds.forEach(this::deleteNotification);
    }

    /**
     * Delete a notification for specific users only.
     */
    public void deleteForSpecificUsers(Long notificationId, List<Long> userIds) {
        if (userIds == null || userIds.isEmpty()) return;
        
        Notification notification = notificationRepository.findById(notificationId)
            .orElseThrow(() -> new RuntimeException("Notification not found: " + notificationId));
            
        for (Long userId : userIds) {
            UserNotification un = userNotificationRepository.findByUserIdAndNotificationId(userId, notificationId)
                .orElse(null);
            
            if (un != null) {
                // Broadcast deletion to this specific user
                messagingTemplate.convertAndSend("/topic/notifications/" + un.getUser().getEmail(),
                    NotificationDto.WebSocketNotification.builder()
                        .id(notificationId)
                        .userNotificationId(un.getId())
                        .title(un.getTitleOverride() != null ? un.getTitleOverride() : notification.getTitle())
                        .action("DELETE")
                        .build());
                        
                userNotificationRepository.delete(un);
            }
        }
        
        // If no users have this notification anymore, we could optionally delete the global notification,
        // but for audit logs it usually stays. We'll leave it in the DB.
    }


    /**
     * Delete a notification from a specific user's view.
     */
    public void deleteUserNotification(Long userNotificationId) {
        UserNotification un = userNotificationRepository.findById(userNotificationId)
            .orElseThrow(() -> new RuntimeException("Notification link not found"));
        
        // Security check: ensure user only deletes their own
        User currentUser = authService.getCurrentUser();
        if (!un.getUser().getId().equals(currentUser.getId()) && currentUser.getRole() != User.Role.ROLE_ADMIN) {
            throw new RuntimeException("Not authorized to delete this notification");
        }

        // Broadcast deletion to user's specific topic
        messagingTemplate.convertAndSend("/topic/notifications/" + un.getUser().getEmail(),
            NotificationDto.WebSocketNotification.builder()
                .id(un.getNotification().getId())
                .userNotificationId(userNotificationId)
                .title(un.getTitleOverride() != null ? un.getTitleOverride() : un.getNotification().getTitle())
                .action("DELETE")
                .build());
        
        userNotificationRepository.delete(un);
    }

    /**
     * Clear all notifications for the current user.
     */
    public void clearAllNotifications() {
        User user = authService.getCurrentUser();
        List<UserNotification> all = userNotificationRepository.findByUserIdOrderByIsPinnedDescNotificationCreatedAtDesc(user.getId());
        userNotificationRepository.deleteAll(all);

        // Broadcast to user's specific topic
        messagingTemplate.convertAndSend("/topic/notifications/" + user.getEmail(),
            NotificationDto.WebSocketNotification.builder()
                .action("CLEAR_ALL")
                .build());
    }

    /**
     * Get all notifications with recipient lists (admin view).
     */
    public List<NotificationDto.NotificationResponse> getAllNotifications() {
        return notificationRepository.findAllByOrderByCreatedAtDesc().stream()
            .map(n -> {
                List<NotificationDto.RecipientInfo> recipients = n.getUserNotifications().stream()
                    .map(un -> NotificationDto.RecipientInfo.builder()
                        .id(un.getUser().getId())
                        .name(un.getUser().getName())
                        .email(un.getUser().getEmail())
                        .titleOverride(un.getTitleOverride())
                        .messageOverride(un.getMessageOverride())
                        .build())
                    .collect(Collectors.toList());
                
                NotificationDto.NotificationResponse resp = toResponse(n, n.getSender(), null);
                resp.setRecipients(recipients);
                return resp;
            })
            .collect(Collectors.toList());
    }

    /**
     * Update a notification for all users (global update).
     */
    public NotificationDto.NotificationResponse updateNotification(Long id, NotificationDto.UpdateRequest req) {
        User currentUser = authService.getCurrentUser();
        Notification n = notificationRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Notification not found"));

        n.setTitle(req.getTitle());
        n.setMessage(req.getMessage());
        if (req.getType() != null) {
            n.setType(req.getType());
        }
        if (req.getCanReply() != null) {
            n.setCanReply(req.getCanReply());
        }
        n.setEditedAt(LocalDateTime.now());
        n.setUpdatedBy(currentUser);
        notificationRepository.save(n);

        // Re-sync recipients: Ensure anyone who deleted it gets it back as "New"
        List<User> targets = getTargetUsers(n);
        for (User target : targets) {
            if (!userNotificationRepository.existsByUserIdAndNotificationId(target.getId(), n.getId())) {
                UserNotification un = UserNotification.builder()
                    .user(target)
                    .notification(n)
                    .isRead(false)
                    .build();
                userNotificationRepository.save(un);
            }
        }

        // Notify all recipients individually to provide their specific userNotificationId (critical for deletions/read status)
        for (User target : targets) {
            UserNotification un = userNotificationRepository.findByUserIdAndNotificationId(target.getId(), n.getId())
                .orElse(null);
                
            messagingTemplate.convertAndSend("/topic/notifications/" + target.getEmail(),
                NotificationDto.WebSocketNotification.builder()
                    .id(n.getId())
                    .title(n.getTitle())
                    .message(n.getMessage())
                    .type(n.getType().name())
                    .senderId(n.getSender().getId())
                    .senderName(n.getSender().getName())
                    .createdAt(n.getCreatedAt())
                    .editedAt(n.getEditedAt())
                    .canReply(n.getCanReply())
                    .adminId(currentUser.getId())
                    .attachmentUrl(n.getAttachmentUrl())
                    .attachmentName(n.getAttachmentName())
                    .userNotificationId(un != null ? un.getId() : null)
                    .action("UPDATE")
                    .build());
        }

        return toResponse(n, n.getSender(), null);
    }

    /**
     * Update a notification for a specific user (individual override).
     */
    public NotificationDto.NotificationResponse updateUserNotification(Long notificationId, Long userId, NotificationDto.UpdateRequest req) {
        Notification n = notificationRepository.findById(notificationId)
            .orElseThrow(() -> new RuntimeException("Notification not found"));
        
        User targetUser = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("Target user not found"));

        UserNotification un = userNotificationRepository.findByUserIdAndNotificationId(userId, notificationId)
            .orElseThrow(() -> new RuntimeException("Notification link not found for this user"));

        un.setTitleOverride(req.getTitle());
        un.setMessageOverride(req.getMessage());
        un.setEditedAt(LocalDateTime.now());
        userNotificationRepository.save(un);

        // Notify specific user about the update
        messagingTemplate.convertAndSend("/topic/notifications/" + targetUser.getEmail(),
            NotificationDto.WebSocketNotification.builder()
                .id(n.getId())
                .title(un.getTitleOverride())
                .message(un.getMessageOverride())
                .type(n.getType().name())
                .senderId(n.getSender().getId())
                .senderName(n.getSender().getName())
                .createdAt(n.getCreatedAt())
                .editedAt(un.getEditedAt())
                .userNotificationId(un.getId())
                .canReply(n.getCanReply())
                .attachmentUrl(n.getAttachmentUrl())
                .attachmentName(n.getAttachmentName())
                .action("UPDATE")
                .build());

        return toResponse(n, n.getSender(), un);
    }

    /**
     * Update a notification for multiple specific users with different content for each.
     */
    public void updateMultipleUserNotifications(Long notificationId, NotificationDto.MultiUserUpdateRequest request) {
        Notification n = notificationRepository.findById(notificationId)
            .orElseThrow(() -> new RuntimeException("Notification not found"));
            
        if (request.getType() != null) {
            n.setType(request.getType());
            notificationRepository.save(n);
        }

        for (NotificationDto.UserOverride override : request.getUpdates()) {
            User targetUser = userRepository.findById(override.getUserId())
                .orElseThrow(() -> new RuntimeException("Target user not found: " + override.getUserId()));

            UserNotification un = userNotificationRepository.findByUserIdAndNotificationId(override.getUserId(), notificationId)
                .orElseThrow(() -> new RuntimeException("Notification link not found for user: " + override.getUserId()));

            un.setTitleOverride(override.getTitle());
            un.setMessageOverride(override.getMessage());
            un.setEditedAt(LocalDateTime.now());
            userNotificationRepository.save(un);

            // Notify specific user about their unique update
            messagingTemplate.convertAndSend("/topic/notifications/" + targetUser.getEmail(),
                NotificationDto.WebSocketNotification.builder()
                    .id(n.getId())
                    .title(un.getTitleOverride())
                    .message(un.getMessageOverride())
                    .type(n.getType().name())
                    .senderId(n.getSender().getId())
                    .senderName(n.getSender().getName())
                    .createdAt(n.getCreatedAt())
                    .editedAt(un.getEditedAt())
                    .userNotificationId(un.getId())
                    .canReply(n.getCanReply())
                    .attachmentUrl(n.getAttachmentUrl())
                    .attachmentName(n.getAttachmentName())
                    .action("UPDATE")
                    .build());
        }
    }

    /** Toggle pinned status */
    public NotificationDto.NotificationResponse togglePin(Long userNotificationId) {
        UserNotification un = userNotificationRepository.findById(userNotificationId)
            .orElseThrow(() -> new RuntimeException("Notification link not found"));
        
        un.setIsPinned(!un.getIsPinned());
        userNotificationRepository.save(un);

        // Broadcast change to all user sessions
        broadcastStateChange(un, "PIN");

        return toResponse(un.getNotification(), un.getNotification().getSender(), un);
    }

    /** Toggle favorite status */
    public NotificationDto.NotificationResponse toggleFavorite(Long userNotificationId) {
        UserNotification un = userNotificationRepository.findById(userNotificationId)
            .orElseThrow(() -> new RuntimeException("Notification link not found"));
        
        un.setIsFavorite(!un.getIsFavorite());
        userNotificationRepository.save(un);

        // Broadcast change to all user sessions
        broadcastStateChange(un, "FAVORITE");

        return toResponse(un.getNotification(), un.getNotification().getSender(), un);
    }

    public List<NotificationDto.NotificationResponse> getNotificationsSinceLastLogout() {
        User user = authService.getCurrentUser();
        LocalDateTime lastLogout = user.getLastLogoutAt();
        
        if (lastLogout == null) {
            return List.of();
        }
        
        return userNotificationRepository
            .findByUserIdAndNotificationCreatedAtAfter(user.getId(), lastLogout)
            .stream()
            .map(un -> toResponse(un.getNotification(), un.getNotification().getSender(), un))
            .collect(Collectors.toList());
    }

    private void broadcastStateChange(UserNotification un, String action) {
        messagingTemplate.convertAndSend("/topic/notifications/" + un.getUser().getEmail(),
            NotificationDto.WebSocketNotification.builder()
                .id(un.getNotification().getId())
                .title(un.getTitleOverride() != null ? un.getTitleOverride() : un.getNotification().getTitle())
                .message(un.getMessageOverride() != null ? un.getMessageOverride() : un.getNotification().getMessage())
                .type(un.getNotification().getType().name())
                .senderId(un.getNotification().getSender().getId())
                .senderName(un.getNotification().getSender().getName())
                .createdAt(un.getNotification().getCreatedAt())
                .editedAt(un.getEditedAt())
                .userNotificationId(un.getId())
                .isPinned(un.getIsPinned())
                .isFavorite(un.getIsFavorite())
                .canReply(un.getNotification().getCanReply())
                .attachmentUrl(un.getNotification().getAttachmentUrl())
                .attachmentName(un.getNotification().getAttachmentName())
                .action(action)
                .build());
    }

    // ─── Reply Logic ──────────────────────────────────────────

    public NotificationDto.ReplyResponse replyToNotification(Long notificationId, NotificationDto.ReplyRequest request) {
        User user = authService.getCurrentUser();
        Notification notification = notificationRepository.findById(notificationId)
            .orElseThrow(() -> new RuntimeException("Notification not found"));

        if (notification.getCanReply() == null || !notification.getCanReply()) {
            throw new RuntimeException("Replies are not allowed for this notification");
        }

        NotificationReply reply = NotificationReply.builder()
            .notification(notification)
            .user(user)
            .replyMessage(request.getMessage())
            .build();

        notificationReplyRepository.save(reply);
        NotificationDto.ReplyResponse response = toReplyResponse(reply);

        // Notify admins about new reply
        messagingTemplate.convertAndSend("/topic/admin/replies", response);

        return response;
    }

    public List<NotificationDto.ReplyResponse> getAllReplies() {
        return notificationReplyRepository.findAllByOrderByCreatedAtDesc()
            .stream()
            .map(this::toReplyResponse)
            .collect(Collectors.toList());
    }

    public List<NotificationDto.ReplyResponse> getRepliesForNotification(Long notificationId) {
        return notificationReplyRepository.findByNotificationIdOrderByCreatedAtDesc(notificationId)
            .stream()
            .map(this::toReplyResponse)
            .collect(Collectors.toList());
    }

    public void markReplyAsRead(Long replyId) {
        NotificationReply reply = notificationReplyRepository.findById(replyId)
            .orElseThrow(() -> new RuntimeException("Reply not found"));
        reply.setIsReadByAdmin(true);
        notificationReplyRepository.save(reply);
    }

    public long getUnreadReplyCount() {
        return notificationReplyRepository.countByIsReadByAdminFalse();
    }

    private NotificationDto.ReplyResponse toReplyResponse(NotificationReply r) {
        User u = r.getUser();
        return NotificationDto.ReplyResponse.builder()
            .id(r.getId())
            .notificationId(r.getNotification().getId())
            .notificationTitle(r.getNotification().getTitle())
            .userId(u.getId())
            .userName(u.getName())
            .userEmail(u.getEmail())
            .studentId(u.getStudentId())
            .branch(u.getBranch())
            .year(u.getYear())
            .section(u.getSection())
            .replyMessage(r.getReplyMessage())
            .createdAt(r.getCreatedAt())
            .isReadByAdmin(r.getIsReadByAdmin())
            .build();
    }


    // ─── Mapper ────────────────────────────────────────────────

    private NotificationDto.NotificationResponse toResponse(
            Notification n, User sender, UserNotification un) {

        String displayTitle = (un != null && un.getTitleOverride() != null) ? un.getTitleOverride() : n.getTitle();
        String displayMessage = (un != null && un.getMessageOverride() != null) ? un.getMessageOverride() : n.getMessage();
        LocalDateTime displayEditedAt = (un != null && un.getEditedAt() != null) ? un.getEditedAt() : n.getEditedAt();

        return NotificationDto.NotificationResponse.builder()
            .id(n.getId())
            .title(displayTitle)
            .message(displayMessage)
            .type(n.getType().name())
            .sender(NotificationDto.SenderInfo.builder()
                .id(sender.getId())
                .name(sender.getName())
                .email(sender.getEmail())
                .build())
            .createdAt(n.getCreatedAt())
            .editedAt(displayEditedAt)
            .updatedBy(n.getUpdatedBy() != null ? NotificationDto.SenderInfo.builder()
                .id(n.getUpdatedBy().getId())
                .name(n.getUpdatedBy().getName())
                .email(n.getUpdatedBy().getEmail())
                .build() : null)
            .userNotificationId(un != null ? un.getId() : null)
            .isRead(un != null ? un.getIsRead() : null)
            .isPinned(un != null ? un.getIsPinned() : null)
            .isFavorite(un != null ? un.getIsFavorite() : null)
            .readAt(un != null ? un.getReadAt() : null)
            .canReply(n.getCanReply())
            .isScheduled(n.getIsScheduled())
            .scheduledAt(n.getScheduledAt())
            .attachmentUrl(n.getAttachmentUrl())
            .attachmentName(n.getAttachmentName())
            .build();
    }

    /**
     * Helper to re-calculate target users from saved metadata.
     */
    private List<User> getTargetUsers(Notification n) {
        String tt = n.getTargetType() == null ? "" : n.getTargetType().trim().toUpperCase();
        switch (tt) {
            case "ALL":
                return userRepository.findAll();
            case "MULTIPLE":
            case "SINGLE":
            case "INDIVIDUAL":
                if (n.getTargetUserIds() == null || n.getTargetUserIds().isEmpty()) {
                    return new java.util.ArrayList<>();
                }
                List<Long> ids = java.util.Arrays.stream(n.getTargetUserIds().split(","))
                    .map(Long::valueOf).collect(Collectors.toList());
                return userRepository.findAllById(ids);
            case "GROUP":
                String branch = "All".equalsIgnoreCase(n.getTargetBranch()) ? null : n.getTargetBranch();
                String year = "All".equalsIgnoreCase(n.getTargetYear()) ? null : n.getTargetYear();
                String section = "All".equalsIgnoreCase(n.getTargetSection()) ? null : n.getTargetSection();
                return userRepository.findByCollegeDetails(branch, year, section);
            default:
                return new java.util.ArrayList<>();
        }
    }
}
