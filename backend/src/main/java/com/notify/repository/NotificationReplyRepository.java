package com.notify.repository;

import com.notify.entity.NotificationReply;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for managing notification replies.
 */
@Repository
public interface NotificationReplyRepository extends JpaRepository<NotificationReply, Long> {
    List<NotificationReply> findByNotificationIdOrderByCreatedAtDesc(Long notificationId);
    List<NotificationReply> findAllByOrderByCreatedAtDesc();
    long countByIsReadByAdminFalse();
}
