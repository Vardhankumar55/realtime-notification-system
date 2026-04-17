package com.notify.repository;

import com.notify.entity.DirectMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface DirectMessageRepository extends JpaRepository<DirectMessage, Long> {

    @Query("SELECT dm FROM DirectMessage dm " +
           "JOIN FETCH dm.sender " +
           "JOIN FETCH dm.recipient " +
           "WHERE (dm.sender.id = :userId AND dm.recipient.id = :otherUserId) " +
           "   OR (dm.sender.id = :otherUserId AND dm.recipient.id = :userId) " +
           "ORDER BY dm.createdAt ASC")
    List<DirectMessage> findConversation(@Param("userId") Long userId, @Param("otherUserId") Long otherUserId);

    @Query("SELECT dm FROM DirectMessage dm " +
           "JOIN FETCH dm.sender " +
           "JOIN FETCH dm.recipient " +
           "WHERE dm.sender.id = :userId OR dm.recipient.id = :userId " +
           "ORDER BY dm.createdAt DESC")
    List<DirectMessage> findAllForUser(@Param("userId") Long userId);

    long countByRecipientIdAndReadAtIsNull(Long recipientId);

    @Modifying
    @Query("UPDATE DirectMessage dm SET dm.readAt = :readAt " +
           "WHERE dm.recipient.id = :userId AND dm.sender.id = :otherUserId AND dm.readAt IS NULL")
    int markConversationAsRead(@Param("userId") Long userId,
                               @Param("otherUserId") Long otherUserId,
                               @Param("readAt") LocalDateTime readAt);
}
