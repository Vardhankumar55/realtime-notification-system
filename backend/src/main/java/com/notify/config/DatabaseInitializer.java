package com.notify.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Automatically fixes database constraints if they fall out of sync with new Enum types.
 * Specifically handles the CHECK constraint on notifications.type column.
 */
@Component
public class DatabaseInitializer implements CommandLineRunner {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) throws Exception {
        try {
            System.out.println("Checking and updating database constraints...");
            
            // Drop the old constraint and add the updated one to match new NotificationType enum
            String sqlSnippet = "ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check; " +
                                "ALTER TABLE notifications ADD CONSTRAINT notifications_type_check " +
                                "CHECK (type IN ('INFO','WARNING','SUCCESS','ERROR','ANNOUNCEMENT', " +
                                "'EXAM_DATES', 'ASSIGNMENT_DEADLINES', 'PLACEMENT_DRIVE_ALERTS', " +
                                "'HOLIDAY_ANNOUNCEMENTS', 'CLASSROOM_CHANGES', 'ATTENDANCE_WARNINGS'));";
            
            jdbcTemplate.execute(sqlSnippet);
            System.out.println("Database constraints synchronized with NotificationType enum successfully.");

            // Data Initialization for existing users
            System.out.println("Initializing college details for existing users...");
            
            // Assign sequential student IDs and default college details for users who don't have them
            String userFixSql = "DO $$ " +
                                "DECLARE " +
                                "    r RECORD; " +
                                "    counter INT := 1; " +
                                "BEGIN " +
                                "    FOR r IN SELECT id FROM users WHERE student_id IS NULL ORDER BY id LOOP " +
                                "        UPDATE users SET " +
                                "            student_id = 'STU' || lpad(counter::text, 3, '0'), " +
                                "            branch = CASE WHEN counter = 1 THEN 'CSE' WHEN counter = 2 THEN 'CSE' WHEN counter = 3 THEN 'ECE' ELSE 'CSE' END, " +
                                "            year = CASE WHEN counter = 1 THEN '2nd Year' WHEN counter = 2 THEN '2nd Year' WHEN counter = 3 THEN '3rd Year' ELSE '4th Year' END, " +
                                "            section = CASE WHEN counter = 1 THEN 'A' WHEN counter = 2 THEN 'B' WHEN counter = 3 THEN 'A' ELSE 'C' END " +
                                "        WHERE id = r.id; " +
                                "        counter := counter + 1; " +
                                "    END LOOP; " +
                                "END $$;";
            
            jdbcTemplate.execute(userFixSql);
            System.out.println("Existing users initialized with default college details successfully.");
            
        } catch (Exception e) {
            System.err.println("Automatic database constraint check encountered an error: " + e.getMessage());
        }
    }
}
