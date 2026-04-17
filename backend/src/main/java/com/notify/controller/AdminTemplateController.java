package com.notify.controller;

import com.notify.dto.NotificationDto;
import com.notify.dto.TemplateDto;
import com.notify.entity.NotificationTemplate;
import com.notify.service.TemplateService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/templates")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminTemplateController {

    private final TemplateService templateService;

    @PostMapping
    public ResponseEntity<NotificationDto.ApiResponse<NotificationTemplate>> createTemplate(
            @RequestBody TemplateDto.TemplateRequest request) {
        return ResponseEntity.ok(NotificationDto.ApiResponse.success(
                "Template created successfully", templateService.createTemplate(request)));
    }

    @GetMapping
    public ResponseEntity<NotificationDto.ApiResponse<List<NotificationTemplate>>> getAllTemplates() {
        return ResponseEntity.ok(NotificationDto.ApiResponse.success(
                "Fetched templates", templateService.getAllTemplates()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<NotificationDto.ApiResponse<NotificationTemplate>> getTemplate(
            @PathVariable Long id) {
        return ResponseEntity.ok(NotificationDto.ApiResponse.success(
                "Fetched template", templateService.getTemplate(id)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<NotificationDto.ApiResponse<NotificationTemplate>> updateTemplate(
            @PathVariable Long id, @RequestBody TemplateDto.TemplateRequest request) {
        return ResponseEntity.ok(NotificationDto.ApiResponse.success(
                "Template updated", templateService.updateTemplate(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<NotificationDto.ApiResponse<Void>> deleteTemplate(@PathVariable Long id) {
        templateService.deleteTemplate(id);
        return ResponseEntity.ok(NotificationDto.ApiResponse.success("Template deleted", null));
    }
}
