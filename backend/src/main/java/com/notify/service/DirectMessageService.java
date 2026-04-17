package com.notify.service;

import com.notify.dto.MessageDto;
import com.notify.entity.DirectMessage;
import com.notify.entity.User;
import com.notify.entity.UserBlock;
import com.notify.repository.DirectMessageRepository;
import com.notify.repository.UserBlockRepository;
import com.notify.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.notify.entity.Notification;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional
public class DirectMessageService {

    @Autowired
    private DirectMessageRepository directMessageRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserBlockRepository userBlockRepository;

    @Autowired
    private AuthService authService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private WebPushService webPushService;

    public List<MessageDto.UserPreview> getAvailableUsers() {
        User currentUser = authService.getCurrentUser();
        return userRepository.findAll().stream()
            .filter(user -> !user.getId().equals(currentUser.getId()))
            .filter(user -> Boolean.TRUE.equals(user.getIsEnabled()))
            .map(user -> toUserPreview(user, currentUser))
            .sorted((left, right) -> left.getName().compareToIgnoreCase(right.getName()))
            .collect(Collectors.toList());
    }

    public List<MessageDto.UserPreview> getBlockedUsers() {
        User currentUser = authService.getCurrentUser();
        return userBlockRepository.findByBlockerIdOrderByCreatedAtDesc(currentUser.getId()).stream()
            .map(UserBlock::getBlocked)
            .map(user -> toUserPreview(user, currentUser))
            .collect(Collectors.toList());
    }

    public List<MessageDto.ConversationSummary> getConversationSummaries() {
        User currentUser = authService.getCurrentUser();
        List<DirectMessage> allMessages = directMessageRepository.findAllForUser(currentUser.getId());

        Map<Long, Long> unreadCounts = allMessages.stream()
            .filter(message -> message.getRecipient().getId().equals(currentUser.getId()))
            .filter(message -> message.getReadAt() == null)
            .collect(Collectors.groupingBy(message -> message.getSender().getId(), Collectors.counting()));

        Map<Long, MessageDto.ConversationSummary> summaries = new LinkedHashMap<>();
        for (DirectMessage message : allMessages) {
            User otherUser = message.getSender().getId().equals(currentUser.getId())
                ? message.getRecipient()
                : message.getSender();

            summaries.computeIfAbsent(otherUser.getId(), ignored -> MessageDto.ConversationSummary.builder()
                .otherUser(toUserPreview(otherUser, currentUser))
                .lastMessage(message.getContent())
                .lastMessageAt(message.getCreatedAt())
                .unreadCount(unreadCounts.getOrDefault(otherUser.getId(), 0L))
                .deepLink(buildDeepLink(otherUser.getId()))
                .build());
        }

        return new ArrayList<>(summaries.values());
    }

    public MessageDto.ConversationResponse getConversation(Long otherUserId) {
        User currentUser = authService.getCurrentUser();
        User otherUser = userRepository.findById(otherUserId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        List<MessageDto.MessageResponse> messages = directMessageRepository
            .findConversation(currentUser.getId(), otherUserId)
            .stream()
            .map(message -> toMessageResponse(message, currentUser))
            .collect(Collectors.toList());

        return MessageDto.ConversationResponse.builder()
            .otherUser(toUserPreview(otherUser, currentUser))
            .messages(messages)
            .build();
    }

    public MessageDto.MessageResponse sendMessage(MessageDto.SendRequest request) {
        User currentUser = authService.getCurrentUser();
        if (request.getRecipientId() == null) {
            throw new RuntimeException("Recipient is required");
        }

        User recipient = userRepository.findById(request.getRecipientId())
            .orElseThrow(() -> new RuntimeException("Recipient not found"));

        if (currentUser.getId().equals(recipient.getId())) {
            throw new RuntimeException("You cannot message yourself");
        }

        if (!Boolean.TRUE.equals(recipient.getIsEnabled())) {
            throw new RuntimeException("Recipient account is disabled");
        }

        enforceBlockRules(currentUser, recipient);

        Notification.NotificationPriority priority = Notification.NotificationPriority.MEDIUM;
        if (request.getPriority() != null && !request.getPriority().isEmpty()) {
            try {
                priority = Notification.NotificationPriority.valueOf(request.getPriority().toUpperCase());
            } catch (IllegalArgumentException e) {
                // Ignore and use default
            }
        }

        DirectMessage message = directMessageRepository.save(
            DirectMessage.builder()
                .sender(currentUser)
                .recipient(recipient)
                .content(request.getContent().trim())
                .priority(priority)
                .build()
        );

        MessageDto.MessageEvent event = MessageDto.MessageEvent.builder()
            .id(message.getId())
            .senderId(currentUser.getId())
            .senderName(currentUser.getName())
            .recipientId(recipient.getId())
            .recipientName(recipient.getName())
            .content(message.getContent())
            .createdAt(message.getCreatedAt())
            .deepLink(buildDeepLink(currentUser.getId()))
            .priority(message.getPriority().name())
            .build();

        messagingTemplate.convertAndSend("/topic/messages/" + recipient.getEmail().toLowerCase(), event);
        messagingTemplate.convertAndSend("/topic/messages/" + currentUser.getEmail().toLowerCase(), event);

        // 🔔 Send Web Push to recipient for direct message (works offline!)
        webPushService.sendPushToUser(recipient,
            "Message from " + currentUser.getName(),
            message.getContent(),
            "INFO",
            buildDeepLink(currentUser.getId()),
            message.getPriority().name(),
            null);

        return toMessageResponse(message, currentUser);
    }

    public void markConversationAsRead(Long otherUserId) {
        User currentUser = authService.getCurrentUser();
        directMessageRepository.markConversationAsRead(currentUser.getId(), otherUserId, LocalDateTime.now());
    }

    public long getUnreadCount() {
        return directMessageRepository.countByRecipientIdAndReadAtIsNull(authService.getCurrentUser().getId());
    }

    public void blockUser(Long blockedUserId) {
        User currentUser = authService.getCurrentUser();
        if (currentUser.getId().equals(blockedUserId)) {
            throw new RuntimeException("You cannot block yourself");
        }

        User blockedUser = userRepository.findById(blockedUserId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        if (!userBlockRepository.existsByBlockerIdAndBlockedId(currentUser.getId(), blockedUserId)) {
            userBlockRepository.save(UserBlock.builder()
                .blocker(currentUser)
                .blocked(blockedUser)
                .build());
        }
    }

    public void unblockUser(Long blockedUserId) {
        User currentUser = authService.getCurrentUser();
        userBlockRepository.findByBlockerIdAndBlockedId(currentUser.getId(), blockedUserId)
            .ifPresent(userBlockRepository::delete);
    }

    private void enforceBlockRules(User sender, User recipient) {
        if (userBlockRepository.existsByBlockerIdAndBlockedId(sender.getId(), recipient.getId())) {
            throw new RuntimeException("Unblock this user before sending a message");
        }
        if (userBlockRepository.existsByBlockerIdAndBlockedId(recipient.getId(), sender.getId())) {
            throw new RuntimeException("This user has blocked you");
        }
    }

    private MessageDto.UserPreview toUserPreview(User user, User currentUser) {
        return MessageDto.UserPreview.builder()
            .id(user.getId())
            .name(user.getName())
            .email(user.getEmail())
            .username(user.getUsername())
            .profileImage(user.getProfileImage())
            .role(user.getRole().name())
            .isBlocked(userBlockRepository.existsByBlockerIdAndBlockedId(currentUser.getId(), user.getId()))
            .build();
    }

    private MessageDto.MessageResponse toMessageResponse(DirectMessage message, User currentUser) {
        return MessageDto.MessageResponse.builder()
            .id(message.getId())
            .senderId(message.getSender().getId())
            .senderName(message.getSender().getName())
            .recipientId(message.getRecipient().getId())
            .recipientName(message.getRecipient().getName())
            .content(message.getContent())
            .createdAt(message.getCreatedAt())
            .readAt(message.getReadAt())
            .isMine(message.getSender().getId().equals(currentUser.getId()))
            .deepLink(buildDeepLink(message.getSender().getId().equals(currentUser.getId())
                ? message.getRecipient().getId()
                : message.getSender().getId()))
            .priority(message.getPriority().name())
            .build();
    }

    private String buildDeepLink(Long otherUserId) {
        return "/messages?user=" + otherUserId;
    }
}
