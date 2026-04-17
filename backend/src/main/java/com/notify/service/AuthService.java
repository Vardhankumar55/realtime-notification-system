package com.notify.service;

import com.notify.dto.AuthDto;
import com.notify.entity.User;
import com.notify.repository.UserRepository;
import com.notify.security.JwtUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Business logic for user registration and authentication.
 */
@Service
@Transactional
@SuppressWarnings("null")
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private JwtUtils jwtUtils;

    public AuthDto.AuthResponse register(AuthDto.RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email is already registered: " + request.getEmail());
        }

        User.Role role = User.Role.ROLE_USER;
        if ("ROLE_ADMIN".equalsIgnoreCase(request.getRole())) {
            role = User.Role.ROLE_ADMIN;
        }

        User user = User.builder()
            .name(request.getName())
            .email(request.getEmail())
            .password(passwordEncoder.encode(request.getPassword()))
            .role(role)
            .branch(request.getBranch())
            .year(request.getYear())
            .section(request.getSection())
            .studentId(request.getStudentId())
            .build();

        userRepository.save(user);

        // Auto-login after registration
        Authentication auth = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );
        SecurityContextHolder.getContext().setAuthentication(auth);
        String token = jwtUtils.generateToken(auth);

        return AuthDto.AuthResponse.builder()
            .token(token)
            .type("Bearer")
            .id(user.getId())
            .name(user.getName())
            .email(user.getEmail())
            .role(user.getRole().name())
            .username(user.getUsername())
            .fullName(user.getFullName())
            .profileImage(user.getProfileImage())
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
            .lastLogoutAt(user.getLastLogoutAt())
            .build();
    }

    public AuthDto.AuthResponse login(AuthDto.LoginRequest request) {
        Authentication auth = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );
        SecurityContextHolder.getContext().setAuthentication(auth);
        String token = jwtUtils.generateToken(auth);

        User user = userRepository.findByEmail(request.getEmail())
            .orElseThrow(() -> new RuntimeException("User not found"));

        if (!user.getIsEnabled()) {
            throw new RuntimeException("Account is disabled. Please contact admin.");
        }

        return AuthDto.AuthResponse.builder()
            .token(token)
            .type("Bearer")
            .id(user.getId())
            .name(user.getName())
            .email(user.getEmail())
            .role(user.getRole().name())
            .username(user.getUsername())
            .fullName(user.getFullName())
            .profileImage(user.getProfileImage())
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
            .lastLogoutAt(user.getLastLogoutAt())
            .build();
    }

    public void logout() {
        User user = getCurrentUser();
        user.setLastLogoutAt(java.time.LocalDateTime.now());
        userRepository.save(user);
    }

    public User getCurrentUser() {
        UserDetails userDetails = (UserDetails) SecurityContextHolder.getContext()
            .getAuthentication().getPrincipal();
        return userRepository.findByEmail(userDetails.getUsername())
            .orElseThrow(() -> new RuntimeException("User not found"));
    }

    public List<AuthDto.UserSummary> getAllUsers() {
        return userRepository.findAll().stream()
            .map(u -> AuthDto.UserSummary.builder()
                .id(u.getId())
                .name(u.getName())
                .username(u.getUsername())
                .email(u.getEmail())
                .role(u.getRole())
                .createdAt(u.getCreatedAt() != null ? u.getCreatedAt().toString() : null)
                .branch(u.getBranch())
                .year(u.getYear())
                .section(u.getSection())
                .studentId(u.getStudentId())
                .lastLogoutAt(u.getLastLogoutAt())
                .build())
            .collect(Collectors.toList());
    }
}
