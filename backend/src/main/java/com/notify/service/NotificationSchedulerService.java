package com.notify.service;

import com.notify.entity.Notification;
import com.notify.repository.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Scheduler that polls every 30 seconds for notifications whose scheduled
 * delivery time has passed and fires them via WebSocket.
 */
@Service
public class NotificationSchedulerService {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private NotificationService notificationService;

    @Scheduled(fixedDelay = 30000) // every 30 seconds
    @Transactional
    public void processScheduledNotifications() {
        List<Notification> due = notificationRepository
            .findByIsScheduledTrueAndScheduledAtBefore(LocalDateTime.now());

        if (due.isEmpty()) return;

        System.out.println("[Scheduler] Firing " + due.size() + " scheduled notification(s)...");

        for (Notification notification : due) {
            try {
                notificationService.fireScheduledNotification(notification);
                System.out.println("[Scheduler] Fired notification ID=" + notification.getId()
                    + " \"" + notification.getTitle() + "\"");
            } catch (Exception e) {
                System.err.println("[Scheduler] Failed to fire notification ID=" + notification.getId()
                    + ": " + e.getMessage());
            }
        }
    }
}
