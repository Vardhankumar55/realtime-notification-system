package com.notify.service;

import com.notify.entity.Notification;
import com.notify.entity.UserNotification;
import com.notify.repository.NotificationRepository;
import com.notify.repository.UserNotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Scheduler service responsible for:
 * 1. Firing pending scheduled notifications (every 30s)
 * 2. Waking up snoozed notifications whose snooze period has expired (every 60s)
 * 3. Auto-archiving expired notifications (every 10 minutes)
 * 4. Sending daily digest emails (once per day at 08:00 AM)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationSchedulerService {

    private final NotificationRepository notificationRepository;
    private final UserNotificationRepository userNotificationRepository;
    private final NotificationService notificationService;
    private final JavaMailSender mailSender;

    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("MMM d, HH:mm");

    // ─────────────────────────────────────────────────────────────────────
    // 1. Fire scheduled (queued) notifications
    // ─────────────────────────────────────────────────────────────────────

    @Scheduled(fixedDelay = 30_000) // every 30 seconds
    @Transactional
    public void processScheduledNotifications() {
        List<Notification> due = notificationRepository
                .findByIsScheduledTrueAndScheduledAtBefore(LocalDateTime.now());

        if (due.isEmpty()) return;

        log.info("[Scheduler] Firing {} scheduled notification(s)...", due.size());

        for (Notification notification : due) {
            try {
                notificationService.fireScheduledNotification(notification);
                log.info("[Scheduler] Fired notification id={} \"{}\"",
                        notification.getId(), notification.getTitle());
            } catch (Exception e) {
                log.error("[Scheduler] Failed to fire notification id={}: {}",
                        notification.getId(), e.getMessage());
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // 2. Wake up snoozed notifications
    // ─────────────────────────────────────────────────────────────────────

    @Scheduled(fixedDelay = 60_000) // every 60 seconds
    @Transactional
    public void wakeUpSnoozedNotifications() {
        LocalDateTime now = LocalDateTime.now();
        List<UserNotification> toWake = userNotificationRepository.findSnoozedExpiredBefore(now);

        if (toWake.isEmpty()) return;

        log.info("[Scheduler] Waking {} snoozed notification(s)...", toWake.size());

        for (UserNotification un : toWake) {
            un.setSnoozedUntil(null); // clear the snooze — notification becomes active again
            userNotificationRepository.save(un);
            log.debug("[Scheduler] Woke snoozed un.id={} for user.id={}",
                    un.getId(), un.getUser().getId());
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // 3. Auto-archive expired notifications
    // ─────────────────────────────────────────────────────────────────────

    @Scheduled(fixedDelay = 600_000) // every 10 minutes
    @Transactional
    public void archiveExpiredNotifications() {
        LocalDateTime now = LocalDateTime.now();
        List<UserNotification> expired = userNotificationRepository.findExpiredNotificationEntries(now);

        if (expired.isEmpty()) return;

        log.info("[Scheduler] Auto-archiving {} expired notification(s)...", expired.size());

        for (UserNotification un : expired) {
            un.setIsArchived(true);
            userNotificationRepository.save(un);
        }

        log.info("[Scheduler] Archived {} expired entries.", expired.size());
    }

    // ─────────────────────────────────────────────────────────────────────
    // 4. Daily digest email  (every day at 08:00 AM)
    // ─────────────────────────────────────────────────────────────────────

    @Scheduled(cron = "${app.digest.cron:0 0 8 * * *}") // default: 8 AM daily
    @Transactional(readOnly = true)
    public void sendDailyDigest() {
        LocalDateTime now = LocalDateTime.now();

        // Group all unread entries by user
        List<UserNotification> allUnread = userNotificationRepository.findAllUnreadForDigest(now);

        if (allUnread.isEmpty()) {
            log.info("[Digest] No unread notifications to digest today.");
            return;
        }

        Map<Long, List<UserNotification>> byUser = allUnread.stream()
                .collect(Collectors.groupingBy(un -> un.getUser().getId()));

        log.info("[Digest] Sending digest to {} user(s)...", byUser.size());

        for (Map.Entry<Long, List<UserNotification>> entry : byUser.entrySet()) {
            List<UserNotification> items = entry.getValue();
            try {
                sendDigestEmail(items);
            } catch (MailException ex) {
                log.error("[Digest] Failed to send email to user id={}: {}",
                        entry.getKey(), ex.getMessage());
            }
        }
    }

    /**
     * Compose and send a digest email for a single user's unread notifications.
     */
    private void sendDigestEmail(List<UserNotification> items) {
        if (items.isEmpty()) return;

        var user = items.get(0).getUser();
        String userName = user.getName() != null ? user.getName() : "there";
        String email = user.getEmail();
        if (email == null || email.isBlank()) return;

        // Prioritize: show URGENT first, then HIGH, then the rest
        List<UserNotification> sorted = items.stream()
                .sorted(Comparator.comparingInt(un -> -priorityScore(un.getNotification().getPriority())))
                .toList();

        StringBuilder body = new StringBuilder();
        body.append("Hi ").append(userName).append(",\n\n");
        body.append("You have ").append(items.size())
                .append(" unread notification(s). Here's your daily summary:\n\n");
        body.append("─".repeat(50)).append("\n");

        int shown = 0;
        for (UserNotification un : sorted) {
            if (shown >= 10) { // cap at 10 items in digest
                body.append("\n... and ").append(items.size() - 10).append(" more.\n");
                break;
            }
            Notification n = un.getNotification();
            String title = un.getTitleOverride() != null ? un.getTitleOverride() : n.getTitle();
            String time = n.getCreatedAt() != null ? n.getCreatedAt().format(TIME_FMT) : "";
            body.append("[").append(n.getPriority() != null ? n.getPriority() : "MEDIUM").append("] ")
                    .append(title).append("  ").append(time).append("\n");
            if (n.getSummary() != null && !n.getSummary().isBlank()) {
                body.append("  ↳ ").append(n.getSummary()).append("\n");
            }
            shown++;
        }

        body.append("─".repeat(50)).append("\n\n");
        body.append("Log in to view and manage all your notifications.\n\n");
        body.append("— The Notification System Team");

        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setTo(email);
        msg.setSubject("📬 Your Daily Notification Digest (" + items.size() + " unread)");
        msg.setText(body.toString());
        mailSender.send(msg);

        log.info("[Digest] Sent digest to {} ({} items)", email, shown);
    }

    private int priorityScore(Notification.NotificationPriority p) {
        if (p == null) return 1;
        return switch (p) {
            case URGENT -> 4;
            case HIGH   -> 3;
            case MEDIUM -> 2;
            case LOW    -> 1;
        };
    }
}
