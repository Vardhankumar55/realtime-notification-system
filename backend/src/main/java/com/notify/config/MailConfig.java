package com.notify.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessagePreparator;

import jakarta.mail.internet.MimeMessage;
import java.io.InputStream;
import java.util.Properties;

/**
 * Provides a no-op JavaMailSender when app.mail.enabled=false (default in dev).
 * This prevents application startup failure when no SMTP server is configured.
 *
 * To enable real emails:
 *   - Set MAIL_ENABLED=true
 *   - Set MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASS environment variables
 */
@Slf4j
@Configuration
public class MailConfig {

    /**
     * Real mail sender — only created when app.mail.enabled=true.
     * Spring Boot's auto-configuration handles creation from spring.mail.* properties.
     */

    /**
     * No-op mail sender — used in dev/test when app.mail.enabled=false.
     * Logs the email content instead of sending it.
     */
    @Bean
    @ConditionalOnProperty(name = "app.mail.enabled", havingValue = "false", matchIfMissing = true)
    public JavaMailSender noOpMailSender() {
        log.info("[MailConfig] Mail is DISABLED — using no-op sender. Set MAIL_ENABLED=true to enable.");

        return new JavaMailSender() {
            @Override
            public MimeMessage createMimeMessage() {
                return new JavaMailSenderImpl().createMimeMessage();
            }

            @Override
            public MimeMessage createMimeMessage(InputStream contentStream) throws MailException {
                return new JavaMailSenderImpl().createMimeMessage(contentStream);
            }

            @Override
            public void send(MimeMessage mimeMessage) throws MailException {
                log.info("[NoOpMailSender] Would send MimeMessage (suppressed in dev mode)");
            }

            @Override
            public void send(MimeMessage... mimeMessages) throws MailException {
                log.info("[NoOpMailSender] Would send {} MimeMessage(s) (suppressed in dev mode)", mimeMessages.length);
            }

            @Override
            public void send(MimeMessagePreparator mimeMessagePreparator) throws MailException {
                log.info("[NoOpMailSender] Would send prepared MimeMessage (suppressed in dev mode)");
            }

            @Override
            public void send(MimeMessagePreparator... mimeMessagePreparators) throws MailException {
                log.info("[NoOpMailSender] Would send {} prepared MimeMessage(s) (suppressed)", mimeMessagePreparators.length);
            }

            @Override
            public void send(SimpleMailMessage simpleMessage) throws MailException {
                log.info("[NoOpMailSender] 📧 Would send to: {} | Subject: {} | Body preview: {}...",
                        simpleMessage.getTo() != null ? simpleMessage.getTo()[0] : "N/A",
                        simpleMessage.getSubject(),
                        simpleMessage.getText() != null
                                ? simpleMessage.getText().substring(0, Math.min(100, simpleMessage.getText().length()))
                                : "");
            }

            @Override
            public void send(SimpleMailMessage... simpleMessages) throws MailException {
                for (SimpleMailMessage msg : simpleMessages) send(msg);
            }
        };
    }
}
