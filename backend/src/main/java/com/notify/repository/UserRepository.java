package com.notify.repository;

import com.notify.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository interface for User entity.
 * Spring Data JPA auto-generates CRUD implementations.
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);
    Optional<User> findByUsername(String username);

    boolean existsByEmail(String email);
    boolean existsByUsername(String username);

    List<User> findByRole(User.Role role);
    
    @org.springframework.data.jpa.repository.Query("SELECT u FROM User u WHERE " +
           "(:branch IS NULL OR u.branch = :branch) AND " +
           "(:year IS NULL OR u.year = :year) AND " +
           "(:section IS NULL OR u.section = :section)")
    List<User> findByCollegeDetails(
        @org.springframework.data.repository.query.Param("branch") String branch, 
        @org.springframework.data.repository.query.Param("year") String year, 
        @org.springframework.data.repository.query.Param("section") String section);
}
