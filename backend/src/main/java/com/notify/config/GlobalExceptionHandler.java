package com.notify.config;

import com.notify.dto.NotificationDto;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

/**
 * Centralized exception handler for clean, consistent API error responses.
 * Returns structured JSON for all error types instead of Spring's default HTML error pages.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    /** Handles @Valid annotation violations — returns field-level errors */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<NotificationDto.ApiResponse<Map<String, String>>> handleValidationErrors(
            MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach(error -> {
            String field = ((FieldError) error).getField();
            String message = error.getDefaultMessage();
            errors.put(field, message);
        });
        return ResponseEntity.badRequest()
            .body(NotificationDto.ApiResponse.error("Validation failed: " + errors));
    }

    /** Handles wrong password or email during login */
    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<NotificationDto.ApiResponse<Void>> handleBadCredentials(
            BadCredentialsException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
            .body(NotificationDto.ApiResponse.error("Invalid email or password"));
    }

    /** Handles role-based access control violations */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<NotificationDto.ApiResponse<Void>> handleAccessDenied(
            AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(NotificationDto.ApiResponse.error("Access denied: insufficient permissions"));
    }

    /** Handles business logic errors (e.g., user not found, duplicate email) */
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<NotificationDto.ApiResponse<Void>> handleRuntimeException(
            RuntimeException ex) {
        return ResponseEntity.badRequest()
            .body(NotificationDto.ApiResponse.error(ex.getMessage()));
    }

    /** Catch-all for unexpected server errors */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<NotificationDto.ApiResponse<Void>> handleGeneralException(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(NotificationDto.ApiResponse.error("Internal server error: " + ex.getMessage()));
    }
}
