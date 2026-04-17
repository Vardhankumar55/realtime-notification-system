package com.notify.controller;

import com.notify.dto.MessageDto;
import com.notify.dto.NotificationDto;
import com.notify.service.DirectMessageService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/messages")
public class DirectMessageController {

    @Autowired
    private DirectMessageService directMessageService;

    @GetMapping("/users")
    public ResponseEntity<NotificationDto.ApiResponse<List<MessageDto.UserPreview>>> getUsers() {
        return ResponseEntity.ok(NotificationDto.ApiResponse.success(
            "Message users fetched", directMessageService.getAvailableUsers()));
    }

    @GetMapping("/blocked")
    public ResponseEntity<NotificationDto.ApiResponse<List<MessageDto.UserPreview>>> getBlockedUsers() {
        return ResponseEntity.ok(NotificationDto.ApiResponse.success(
            "Blocked users fetched", directMessageService.getBlockedUsers()));
    }

    @GetMapping("/conversations")
    public ResponseEntity<NotificationDto.ApiResponse<List<MessageDto.ConversationSummary>>> getConversations() {
        return ResponseEntity.ok(NotificationDto.ApiResponse.success(
            "Conversations fetched", directMessageService.getConversationSummaries()));
    }

    @GetMapping("/conversation/{userId}")
    public ResponseEntity<NotificationDto.ApiResponse<MessageDto.ConversationResponse>> getConversation(
            @PathVariable("userId") Long userId) {
        return ResponseEntity.ok(NotificationDto.ApiResponse.success(
            "Conversation fetched", directMessageService.getConversation(userId)));
    }

    @PostMapping("/send")
    public ResponseEntity<NotificationDto.ApiResponse<MessageDto.MessageResponse>> send(
            @Valid @RequestBody MessageDto.SendRequest request) {
        return ResponseEntity.ok(NotificationDto.ApiResponse.success(
            "Message sent", directMessageService.sendMessage(request)));
    }

    @PatchMapping("/conversation/{userId}/read")
    public ResponseEntity<NotificationDto.ApiResponse<Void>> markConversationAsRead(
            @PathVariable("userId") Long userId) {
        directMessageService.markConversationAsRead(userId);
        return ResponseEntity.ok(NotificationDto.ApiResponse.success("Conversation marked as read", null));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<NotificationDto.ApiResponse<Map<String, Long>>> getUnreadCount() {
        return ResponseEntity.ok(NotificationDto.ApiResponse.success(
            "Unread message count", Map.of("count", directMessageService.getUnreadCount())));
    }

    @PutMapping("/block/{userId}")
    public ResponseEntity<NotificationDto.ApiResponse<Void>> blockUser(@PathVariable("userId") Long userId) {
        directMessageService.blockUser(userId);
        return ResponseEntity.ok(NotificationDto.ApiResponse.success("User blocked", null));
    }

    @DeleteMapping("/block/{userId}")
    public ResponseEntity<NotificationDto.ApiResponse<Void>> unblockUser(@PathVariable("userId") Long userId) {
        directMessageService.unblockUser(userId);
        return ResponseEntity.ok(NotificationDto.ApiResponse.success("User unblocked", null));
    }
}
