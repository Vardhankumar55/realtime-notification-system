package com.notify.controller;

import com.notify.dto.AuthDto;
import com.notify.dto.NotificationDto.ApiResponse;
import com.notify.entity.User;
import com.notify.service.AuthService;
import com.notify.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/users")
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

    @Autowired
    private UserService userService;

    @Autowired
    private AuthService authService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<AuthDto.UserSummary>>> getAllUsers() {
        return ResponseEntity.ok(ApiResponse.success("Users fetched", userService.getAllUsers()));
    }

    @PutMapping("/{id}/disable")
    public ResponseEntity<ApiResponse<Void>> disableUser(@PathVariable("id") Long id) {
        userService.disableUser(id);
        return ResponseEntity.ok(ApiResponse.success("User disabled", null));
    }

    @PutMapping("/{id}/enable")
    public ResponseEntity<ApiResponse<Void>> enableUser(@PathVariable("id") Long id) {
        userService.enableUser(id);
        return ResponseEntity.ok(ApiResponse.success("User enabled", null));
    }

    @PutMapping("/{id}/role")
    public ResponseEntity<ApiResponse<Void>> changeRole(@PathVariable("id") Long id, @RequestBody Map<String, String> request) {
        userService.changeRole(id, request.get("role"));
        return ResponseEntity.ok(ApiResponse.success("Role updated", null));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable("id") Long id) {
        User currentAdmin = authService.getCurrentUser();
        userService.deleteUser(id, currentAdmin.getId());
        return ResponseEntity.ok(ApiResponse.success("User deleted successfully", null));
    }
}
