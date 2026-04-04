-- ============================================================
-- Real-Time Notification System — PostgreSQL Schema
-- Run this in Supabase SQL Editor or any PostgreSQL client
-- ============================================================

-- ── 1. USERS TABLE ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(100)  NOT NULL,
    email       VARCHAR(150)  NOT NULL UNIQUE,
    password    TEXT          NOT NULL,         -- bcrypt hash
    role        VARCHAR(20)   NOT NULL DEFAULT 'ROLE_USER'
                              CHECK (role IN ('ROLE_USER', 'ROLE_ADMIN')),
    branch      VARCHAR(20),
    year        VARCHAR(20),
    section     VARCHAR(10),
    student_id  VARCHAR(20)   UNIQUE,
    created_at  TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role  ON users(role);

-- ── 2. NOTIFICATIONS TABLE ───────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
    id          BIGSERIAL PRIMARY KEY,
    title       VARCHAR(200)  NOT NULL,
    message     TEXT          NOT NULL,
    type        VARCHAR(30)   NOT NULL DEFAULT 'INFO'
                              CHECK (type IN ('INFO','WARNING','SUCCESS','ERROR','ANNOUNCEMENT','EXAM_DATES','ASSIGNMENT_DEADLINES','PLACEMENT_DRIVE_ALERTS','HOLIDAY_ANNOUNCEMENTS','CLASSROOM_CHANGES','ATTENDANCE_WARNINGS')),
    sender_id   BIGINT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_sender     ON notifications(sender_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type       ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ── 3. USER_NOTIFICATIONS TABLE ──────────────────────────────
-- Junction table: tracks per-user read/unread state
CREATE TABLE IF NOT EXISTS user_notifications (
    id               BIGSERIAL PRIMARY KEY,
    user_id          BIGINT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_id  BIGINT    NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    is_read          BOOLEAN   NOT NULL DEFAULT FALSE,
    read_at          TIMESTAMP,
    UNIQUE (user_id, notification_id)   -- prevent duplicate rows
);

CREATE INDEX IF NOT EXISTS idx_un_user_id          ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_un_notification_id  ON user_notifications(notification_id);
CREATE INDEX IF NOT EXISTS idx_un_is_read          ON user_notifications(is_read);

-- ============================================================
-- SAMPLE TEST DATA
-- Passwords are bcrypt hashes of "password123"
-- ============================================================

INSERT INTO users (name, email, password, role) VALUES
  ('Admin User',  'admin@demo.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'ROLE_ADMIN'),
  ('Alice Smith', 'alice@demo.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'ROLE_USER'),
  ('Bob Jones',   'bob@demo.com',   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'ROLE_USER'),
  ('Carol White', 'carol@demo.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'ROLE_USER')
ON CONFLICT (email) DO NOTHING;

-- Sample notifications (sender = admin, id=1)
INSERT INTO notifications (title, message, type, sender_id) VALUES
  ('Welcome to NotifyHub!',   'Thank you for joining our platform. Explore the features!', 'SUCCESS', 1),
  ('Scheduled Maintenance',   'The system will be down for maintenance on Sunday 2–4 AM.', 'WARNING', 1),
  ('New Feature: Analytics',  'We have launched analytics dashboards for all users.',       'INFO',    1),
  ('Security Alert',          'Unusual login detected. Please verify your account.',        'ERROR',   1),
  ('Product Announcement',    'Version 2.0 is now live! Check the release notes.',          'ANNOUNCEMENT', 1)
ON CONFLICT DO NOTHING;

-- Assign notifications to all users
INSERT INTO user_notifications (user_id, notification_id, is_read)
SELECT u.id, n.id, FALSE
FROM users u, notifications n
ON CONFLICT (user_id, notification_id) DO NOTHING;

-- Mark some as read for demo
UPDATE user_notifications SET is_read = TRUE, read_at = NOW()
WHERE user_id = 2 AND notification_id IN (1, 2);

-- ============================================================
-- USEFUL QUERIES FOR MONITORING
-- ============================================================

-- Total unread per user
-- SELECT u.name, COUNT(*) AS unread
-- FROM user_notifications un JOIN users u ON u.id = un.user_id
-- WHERE un.is_read = FALSE GROUP BY u.name;

-- Recent notifications
-- SELECT n.title, n.type, u.name AS sender, n.created_at
-- FROM notifications n JOIN users u ON u.id = n.sender_id
-- ORDER BY n.created_at DESC LIMIT 10;
