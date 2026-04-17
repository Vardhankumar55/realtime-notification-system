package com.notify.repository;

import com.notify.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Repository for Notification entity CRUD operations.
 */
@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findAllByOrderByCreatedAtDesc();

    List<Notification> findByType(Notification.NotificationType type);

    List<Notification> findByIsScheduledTrueAndScheduledAtBefore(LocalDateTime now);

    Optional<Notification> findByAttachmentUrl(String attachmentUrl);
}
