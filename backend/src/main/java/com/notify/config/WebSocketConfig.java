package com.notify.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.util.Arrays;
import org.springframework.lang.NonNull;

/**
 * WebSocket + STOMP configuration.
 *
 * STOMP (Simple Text Oriented Messaging Protocol) sits on top of WebSocket
 * and provides a message-broker pattern with topics and queues.
 *
 * Topic structure:
 * /topic/notifications/all → broadcasts to all connected users
 * /user/{email}/queue/notifications → sends to a specific user
 *
 * How real-time delivery works:
 * 1. React client connects to /ws endpoint via SockJS
 * 2. Client subscribes to /user/queue/notifications
 * 3. Backend calls messagingTemplate.convertAndSendToUser(email, ...) when
 * sending
 * 4. Spring WebSocket routes the message to the correct client session
 */
@Configuration
@EnableWebSocketMessageBroker
@SuppressWarnings("null")
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Value("${app.cors.allowed-origins}")
    private String allowedOrigins;

    @Override
    public void configureMessageBroker(@org.springframework.lang.NonNull MessageBrokerRegistry registry) {
        // Enable in-memory broker for /topic (broadcast) and /user (individual)
        registry.enableSimpleBroker("/topic", "/user");
        // Prefix for messages sent FROM the client TO the server
        registry.setApplicationDestinationPrefixes("/app");
        // Prefix for user-specific destinations
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(@org.springframework.lang.NonNull StompEndpointRegistry registry) {
        // Main WebSocket endpoint; SockJS is a fallback for browsers that
        // don't support native WebSocket
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(Arrays.stream(allowedOrigins.split(","))
                        .map(String::trim)
                        .toArray(String[]::new))
                .withSockJS();
    }
}
