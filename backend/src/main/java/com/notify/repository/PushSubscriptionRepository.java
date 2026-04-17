package com.notify.repository;

import com.notify.entity.PushSubscription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/**
 * Data access for push subscriptions.
 */
public interface PushSubscriptionRepository extends JpaRepository<PushSubscription, Long> {

    /** Find all subscriptions for a user (they may have multiple browsers/devices). */
    List<PushSubscription> findByUserId(Long userId);

    /** Find a specific subscription by its push endpoint URL. */
    Optional<PushSubscription> findByEndpoint(String endpoint);

    /** Delete all subscriptions for a user (e.g., on account deletion). */
    void deleteByUserId(Long userId);

    /** Delete a specific subscription by endpoint (e.g., when user unsubscribes). */
    void deleteByEndpoint(String endpoint);
}
