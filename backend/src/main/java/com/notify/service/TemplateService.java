package com.notify.service;

import com.notify.dto.TemplateDto;
import com.notify.entity.NotificationTemplate;
import com.notify.repository.NotificationTemplateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class TemplateService {

    private final NotificationTemplateRepository repository;

    public NotificationTemplate createTemplate(TemplateDto.TemplateRequest request) {
        if (repository.findByName(request.getName()).isPresent()) {
            throw new RuntimeException("Template with this name already exists");
        }

        NotificationTemplate template = NotificationTemplate.builder()
                .name(request.getName())
                .titleTemplate(request.getTitleTemplate())
                .messageTemplate(request.getMessageTemplate())
                .summaryTemplate(request.getSummaryTemplate())
                .type(request.getType() != null ? request.getType() : com.notify.entity.Notification.NotificationType.INFO)
                .priority(request.getPriority() != null ? request.getPriority() : com.notify.entity.Notification.NotificationPriority.MEDIUM)
                .actionButtonText(request.getActionButtonText())
                .actionButtonUrl(request.getActionButtonUrl())
                .build();

        NotificationTemplate saved = repository.save(template);
        return saved;
    }

    public List<NotificationTemplate> getAllTemplates() {
        return repository.findAll();
    }

    public NotificationTemplate getTemplate(Long id) {
        NotificationTemplate t = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Template not found"));
        return t;
    }

    public NotificationTemplate updateTemplate(Long id, TemplateDto.TemplateRequest request) {
        NotificationTemplate template = getTemplate(id);

        if (!template.getName().equals(request.getName()) && repository.findByName(request.getName()).isPresent()) {
            throw new RuntimeException("Template with this name already exists");
        }

        template.setName(request.getName());
        template.setTitleTemplate(request.getTitleTemplate());
        template.setMessageTemplate(request.getMessageTemplate());
        template.setSummaryTemplate(request.getSummaryTemplate());
        template.setType(request.getType());
        template.setPriority(request.getPriority());
        template.setActionButtonText(request.getActionButtonText());
        template.setActionButtonUrl(request.getActionButtonUrl());

        NotificationTemplate saved = repository.save(template);
        return saved;
    }

    public void deleteTemplate(Long id) {
        repository.deleteById(id);
    }
}
