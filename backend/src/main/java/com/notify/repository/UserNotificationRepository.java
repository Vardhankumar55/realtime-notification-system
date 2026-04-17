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

    @Query("SELECT un FROM UserNotification un JOIN un.notification n WHERE un.user.id = :userId " +
           "AND un.isArchived = false " +
           "AND (un.snoozedUntil IS NULL OR un.snoozedUntil <= CURRENT_TIMESTAMP) " +
           "AND (n.expiresAt IS NULL OR n.expiresAt >= CURRENT_TIMESTAMP) " +
           "ORDER BY un.isPinned DESC, n.createdAt DESC")
    List<UserNotification> findActiveByUserId(@Param("userId") Long userId);

    List<UserNotification> findByUserIdAndIsFavoriteOrderByIsPinnedDescNotificationCreatedAtDesc(Long userId, Boolean isFavorite);

    Optional<UserNotification> findByUserIdAndNotificationId(Long userId, Long notificationId);

    @Query("SELECT COUNT(un) FROM UserNotification un JOIN un.notification n WHERE un.user.id = :userId AND un.isRead = false " +
           "AND un.isArchived = false " +
           "AND (un.snoozedUntil IS NULL OR un.snoozedUntil <= CURRENT_TIMESTAMP) " +
           "AND (n.expiresAt IS NULL OR n.expiresAt >= CURRENT_TIMESTAMP)")
    long countActiveUnreadByUserId(@Param("userId") Long userId);

    List<UserNotification> findByUserIdAndIsRead(Long userId, Boolean isRead);

    @Query("SELECT un FROM UserNotification un " +
           "JOIN FETCH un.notification n " +
           "WHERE un.user.id = :userId " +
           "AND (:type IS NULL OR n.type = :type) " +
           "AND (:startDate IS NULL OR n.createdAt >= :startDate) " +
           "AND (:endDate IS NULL OR n.createdAt <= :endDate) " +
           "AND (:isFavorite IS NULL OR un.isFavorite = :isFavorite) " +
           "AND (:isArchived IS NULL OR un.isArchived = :isArchived) " +
           "AND (un.snoozedUntil IS NULL OR un.snoozedUntil <= CURRENT_TIMESTAMP) " +
           "AND (n.expiresAt IS NULL OR n.expiresAt >= CURRENT_TIMESTAMP) " +
           "ORDER BY un.isPinned DESC, n.createdAt DESC")
    List<UserNotification> findWithFilters(
        @Param("userId") Long userId,
        @Param("type") com.notify.entity.Notification.NotificationType type,
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate,
        @Param("isFavorite") Boolean isFavorite,
        @Param("isArchived") Boolean isArchived
    );

    List<UserNotification> findByUserIdAndNotificationCreatedAtAfter(Long userId, LocalDateTime createdAt);

    boolean existsByUserIdAndNotificationId(Long userId, Long notificationId);

    @Query("SELECT un FROM UserNotification un JOIN FETCH un.user WHERE un.notification.id = :notificationId")
    List<UserNotification> findByNotificationId(@Param("notificationId") Long notificationId);

    // ── Scheduler support ────────────────────────────────────────

    /** Find entries whose snooze period has just expired (wake them up). */
    @Query("SELECT un FROM UserNotification un " +
           "WHERE un.snoozedUntil IS NOT NULL " +
           "AND un.snoozedUntil <= :now " +
           "AND un.isArchived = false")
    List<UserNotification> findSnoozedExpiredBefore(@Param("now") LocalDateTime now);

    /** Find entries for notifications that have passed their expiry date. */
    @Query("SELECT un FROM UserNotification un " +
           "JOIN un.notification n " +
           "WHERE n.expiresAt IS NOT NULL " +
           "AND n.expiresAt < :now " +
           "AND un.isArchived = false")
    List<UserNotification> findExpiredNotificationEntries(@Param("now") LocalDateTime now);

    /** Fetch all unread, non-archived, non-snoozed notifications per user for digest. */
    @Query("SELECT un FROM UserNotification un " +
           "JOIN FETCH un.user u " +
           "JOIN FETCH un.notification n " +
           "WHERE un.isRead = false " +
           "AND un.isArchived = false " +
           "AND (un.snoozedUntil IS NULL OR un.snoozedUntil <= :now) " +
           "AND (n.expiresAt IS NULL OR n.expiresAt >= :now) " +
           "AND u.email IS NOT NULL " +
           "ORDER BY u.id, n.createdAt DESC")
    List<UserNotification> findAllUnreadForDigest(@Param("now") LocalDateTime now);
}
