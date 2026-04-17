package com.notify.service;

import com.notify.dto.AuthDto;
import com.notify.dto.ProfileDto;
import com.notify.entity.User;
import com.notify.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
@SuppressWarnings("null")
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public ProfileDto.ProfileResponse toProfileResponse(User user) {
        return ProfileDto.ProfileResponse.builder()
            .id(user.getId())
            .name(user.getName())
            .username(user.getUsername())
            .fullName(user.getFullName())
            .email(user.getEmail())
            .profileImage(user.getProfileImage())
            .role(user.getRole().name())
            .createdAt(user.getCreatedAt())
            .isEnabled(user.getIsEnabled())
            .pushEnabled(user.getPushEnabled())
            .emailEnabled(user.getEmailEnabled())
            .soundEnabled(user.getSoundEnabled())
            .darkModeEnabled(user.getDarkModeEnabled())
            .emailAlertsEnabled(user.getEmailAlertsEnabled())
            .branch(user.getBranch())
            .year(user.getYear())
            .section(user.getSection())
            .studentId(user.getStudentId())
            .build();
    }

    public List<AuthDto.UserSummary> getAllUsers() {
        return userRepository.findAll().stream()
            .map(u -> AuthDto.UserSummary.builder()
                .id(u.getId())
                .name(u.getName())
                .email(u.getEmail())
                .username(u.getUsername())
                .fullName(u.getFullName())
                .role(u.getRole())
                .createdAt(u.getCreatedAt() != null ? u.getCreatedAt().toString() : null)
                .isEnabled(u.getIsEnabled())
                .branch(u.getBranch())
                .year(u.getYear())
                .section(u.getSection())
                .studentId(u.getStudentId())
                .build())
            .collect(Collectors.toList());
    }

    public User updateProfile(Long userId, ProfileDto.UpdateRequest request) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        user.setName(request.getName());
        user.setUsername(request.getUsername());
        user.setFullName(request.getFullName());
        user.setProfileImage(request.getProfileImage());
        user.setBranch(request.getBranch());
        user.setYear(request.getYear());
        user.setSection(request.getSection());
        user.setStudentId(request.getStudentId());
        return userRepository.save(user);
    }

    public void updatePassword(Long userId, ProfileDto.PasswordUpdateRequest request) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new RuntimeException("Current password does not match");
        }

        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new RuntimeException("New passwords do not match");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    public User updatePreferences(Long userId, ProfileDto.PreferencesRequest request) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        if (request.getPushEnabled() != null) user.setPushEnabled(request.getPushEnabled());
        if (request.getEmailEnabled() != null) user.setEmailEnabled(request.getEmailEnabled());
        if (request.getSoundEnabled() != null) user.setSoundEnabled(request.getSoundEnabled());
        if (request.getDarkModeEnabled() != null) user.setDarkModeEnabled(request.getDarkModeEnabled());
        if (request.getEmailAlertsEnabled() != null) user.setEmailAlertsEnabled(request.getEmailAlertsEnabled());

        return userRepository.save(user);
    }

    // Admin Operations
    public void disableUser(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        user.setIsEnabled(false);
        userRepository.save(user);
    }

    public void enableUser(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        user.setIsEnabled(true);
        userRepository.save(user);
    }

    public void changeRole(Long userId, String role) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        user.setRole(User.Role.valueOf(role.toUpperCase()));
        userRepository.save(user);
    }

    public void deleteUser(Long userId, Long currentAdminId) {
        if (userId.equals(currentAdminId)) {
            throw new RuntimeException("You cannot delete yourself");
        }
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        userRepository.delete(user);
    }
}
