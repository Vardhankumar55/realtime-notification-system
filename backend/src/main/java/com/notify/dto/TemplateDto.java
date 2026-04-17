package com.notify.dto;

import com.notify.entity.Notification;
import lombok.Data;

public class TemplateDto {

    @Data
    public static class TemplateRequest {
        private String name;
        private String titleTemplate;
        private String messageTemplate;
        private String summaryTemplate;
        private Notification.NotificationType type;
        private Notification.NotificationPriority priority;
        private String actionButtonText;
        private String actionButtonUrl;
    }

}
