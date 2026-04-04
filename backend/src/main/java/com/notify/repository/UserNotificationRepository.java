package com.notify.repository;

import com.notify.entity.UserNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Repository for managing user-notification relationships.
 * Provides custom queries for filtering notifications.
 */
@Repository
public interface UserNotificationRepository extends JpaRepository<UserNotification, Long> {

    @Query("SELECT un FROM UserNotification un WHERE un.user.id = :userId " +
           "ORDER BY un.isPinned DESC, un.notification.createdAt DESC")
    List<UserNotification> findByUserIdOrderByIsPinnedDescNotificationCreatedAtDesc(@Param("userId") Long userId);

    List<UserNotification> findByUserIdAndIsFavoriteOrderByIsPinnedDescNotificationCreatedAtDesc(Long userId, Boolean isFavorite);

    Optional<UserNotification> findByUserIdAndNotificationId(Long userId, Long notificationId);

    long countByUserIdAndIsReadFalse(Long userId);

    List<UserNotification> findByUserIdAndIsRead(Long userId, Boolean isRead);

    @Query("SELECT un FROM UserNotification un " +
           "JOIN FETCH un.notification n " +
           "WHERE un.user.id = :userId " +
           "AND (:type IS NULL OR n.type = :type) " +
           "AND (:startDate IS NULL OR n.createdAt >= :startDate) " +
           "AND (:endDate IS NULL OR n.createdAt <= :endDate) " +
           "AND (:isFavorite IS NULL OR un.isFavorite = :isFavorite) " +
           "ORDER BY un.isPinned DESC, n.createdAt DESC")
    List<UserNotification> findWithFilters(
        @Param("userId") Long userId,
        @Param("type") com.notify.entity.Notification.NotificationType type,
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate,
        @Param("isFavorite") Boolean isFavorite
    );

    List<UserNotification> findByUserIdAndNotificationCreatedAtAfter(Long userId, LocalDateTime createdAt);

    boolean existsByUserIdAndNotificationId(Long userId, Long notificationId);

    @Query("SELECT un FROM UserNotification un JOIN FETCH un.user WHERE un.notification.id = :notificationId")
    List<UserNotification> findByNotificationId(@Param("notificationId") Long notificationId);
}
