# 🔔 Real-Time Notification System

> A full-stack, production-ready notification platform built with **React + Spring Boot + PostgreSQL + WebSocket/STOMP**.

---

## 📚 Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Project Structure](#2-project-structure)
3. [Database Design](#3-database-design)
4. [Backend Setup](#4-backend-setup)
5. [Frontend Setup](#5-frontend-setup)
6. [Environment Variables](#6-environment-variables)
7. [How to Connect Supabase](#7-how-to-connect-supabase-postgresql)
8. [Running Locally](#8-running-locally)
9. [API Reference & Postman Testing](#9-api-reference--postman-testing)
10. [WebSocket Testing](#10-websocket-testing)
11. [Sample Test Data](#11-sample-test-data)
12. [Deployment](#12-deployment)
13. [Best Practices & Security](#13-best-practices--security)
14. [Future Enhancements](#14-future-enhancements)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                  React.js Frontend                  │
│   (Axios REST calls + SockJS/STOMP WebSocket)       │
└────────────────────┬───────────────┬────────────────┘
                     │ HTTP/REST     │ WebSocket
                     ▼               ▼
┌─────────────────────────────────────────────────────┐
│               Spring Boot Backend                   │
│  ┌──────────┐ ┌───────────┐ ┌────────────────────┐ │
│  │Controller│ │  Service  │ │  WebSocket/STOMP   │ │
│  └──────────┘ └───────────┘ └────────────────────┘ │
│  ┌──────────┐ ┌───────────┐ ┌────────────────────┐ │
│  │ Security │ │    JWT    │ │   Spring Data JPA  │ │
│  └──────────┘ └───────────┘ └────────────────────┘ │
└────────────────────────┬────────────────────────────┘
                         │ JDBC/JPA
                         ▼
              ┌─────────────────────┐
              │  Supabase PostgreSQL │
              │  (Hosted Database)   │
              └─────────────────────┘
```

### How real-time notifications work:

```
Admin sends notification (HTTP POST)
  └─→ Backend saves to DB
  └─→ Backend calls messagingTemplate.convertAndSendToUser()
        └─→ STOMP broker delivers to each user's WebSocket session
              └─→ React client receives message
                    └─→ Toast popup shown instantly
                    └─→ Bell badge count incremented
                    └─→ Notification list updated
```

### Tech Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Frontend    | React 18, Tailwind CSS, React Router |
| State       | Context API (Auth + Notifications)  |
| HTTP Client | Axios                               |
| Real-time   | SockJS + STOMP (WebSocket)          |
| Backend     | Spring Boot 3.2, Java 17            |
| Auth        | Spring Security + JWT (jjwt)        |
| ORM         | Spring Data JPA + Hibernate         |
| Database    | PostgreSQL (hosted on Supabase)     |
| Build       | Maven (backend), npm (frontend)     |

---

## 2. Project Structure

```
realtime-notification-system/
├── backend/
│   ├── pom.xml                          # Maven dependencies
│   ├── .env.example                     # Backend env vars template
│   └── src/main/
│       ├── java/com/notify/
│       │   ├── NotificationSystemApplication.java   # Main class
│       │   ├── config/
│       │   │   ├── SecurityConfig.java              # Spring Security + CORS
│       │   │   ├── WebSocketConfig.java             # STOMP configuration
│       │   │   └── GlobalExceptionHandler.java      # Centralized errors
│       │   ├── controller/
│       │   │   ├── AuthController.java              # /api/auth/**
│       │   │   └── NotificationController.java      # /api/notifications/**
│       │   ├── service/
│       │   │   ├── AuthService.java                 # Auth business logic
│       │   │   └── NotificationService.java         # Notification logic + WS push
│       │   ├── repository/
│       │   │   ├── UserRepository.java
│       │   │   ├── NotificationRepository.java
│       │   │   └── UserNotificationRepository.java
│       │   ├── entity/
│       │   │   ├── User.java
│       │   │   ├── Notification.java
│       │   │   └── UserNotification.java
│       │   ├── dto/
│       │   │   ├── AuthDto.java
│       │   │   └── NotificationDto.java
│       │   └── security/
│       │       ├── JwtUtils.java
│       │       ├── JwtAuthFilter.java
│       │       └── UserDetailsServiceImpl.java
│       └── resources/
│           └── application.properties
│
├── frontend/
│   ├── package.json
│   ├── tailwind.config.js
│   ├── .env.example
│   └── src/
│       ├── App.jsx                      # Root with routing
│       ├── index.js                     # Entry point
│       ├── index.css                    # Tailwind + custom CSS
│       ├── context/
│       │   ├── AuthContext.jsx          # Auth state (login/logout/user)
│       │   └── NotificationContext.jsx  # Notifications + WebSocket lifecycle
│       ├── services/
│       │   ├── api.js                   # Axios instance + all API calls
│       │   └── websocket.js             # STOMP/SockJS service singleton
│       ├── components/
│       │   ├── common/
│       │   │   ├── Navbar.jsx           # Top navigation bar
│       │   │   ├── ProtectedRoute.jsx   # Auth guard + admin guard
│       │   │   └── ToastContainer.jsx   # Real-time toast popups
│       │   └── notifications/
│       │       ├── NotificationBell.jsx # Bell icon + dropdown
│       │       └── NotificationCard.jsx # Reusable notification card
│       └── pages/
│           ├── Login.jsx
│           ├── Register.jsx
│           ├── Dashboard.jsx
│           ├── NotificationCenter.jsx
│           └── AdminPanel.jsx
│
└── database/
    └── schema.sql                       # Full DB schema + seed data
```

---

## 3. Database Design

### Entity Relationship Diagram

```
users                    notifications              user_notifications
─────────────────        ─────────────────────      ────────────────────────
id (PK)                  id (PK)                    id (PK)
name                     title                      user_id (FK → users.id)
email (UNIQUE)           message                    notification_id (FK → notifications.id)
password (bcrypt)        type (ENUM)                is_read (BOOLEAN)
role (ENUM)              sender_id (FK → users.id)  read_at (TIMESTAMP)
created_at               created_at
```

### Why this design?

- **`notifications`** stores the notification content once (no duplication).
- **`user_notifications`** is the junction table — one row per (user, notification) pair. This is how we track whether *each user* has read *each notification* independently.
- If you send to 100 users: 1 row in `notifications` + 100 rows in `user_notifications`.

---

## 4. Backend Setup

### Prerequisites

- Java 17+
- Maven 3.8+
- PostgreSQL (or Supabase account)

### Install dependencies

```bash
cd backend
mvn clean install
```

### Key dependencies in `pom.xml`

| Dependency | Purpose |
|------------|---------|
| `spring-boot-starter-web` | REST API |
| `spring-boot-starter-security` | JWT auth |
| `spring-boot-starter-websocket` | STOMP/WebSocket |
| `spring-boot-starter-data-jpa` | Database ORM |
| `spring-boot-starter-validation` | @Valid annotations |
| `postgresql` | PostgreSQL JDBC driver |
| `jjwt-api/impl/jackson` | JWT token library |
| `lombok` | Boilerplate reduction |

### Layered Architecture Explained

```
Request → Controller → Service → Repository → Database
                ↓            ↓
              DTO          Entity
```

- **Controller**: Receives HTTP requests, validates input, returns responses. No business logic.
- **Service**: All business logic lives here (create notification, push via WS).
- **Repository**: Database queries (Spring Data JPA auto-implements).
- **DTO**: What we send/receive over the API (never expose raw entities).
- **Entity**: Maps directly to database tables.
- **Security**: JWT filter runs before every request.

---

## 5. Frontend Setup

### Prerequisites

- Node.js 18+
- npm 9+

### Install dependencies

```bash
cd frontend
npm install
```

### Key libraries

| Library | Purpose |
|---------|---------|
| `react-router-dom` | Client-side navigation |
| `axios` | HTTP requests with JWT interceptor |
| `@stomp/stompjs` | WebSocket STOMP protocol |
| `sockjs-client` | WebSocket with browser fallbacks |
| `date-fns` | Date formatting |
| `tailwindcss` | Utility-first styling |

### Component Architecture

```
App.jsx (Router)
├── AuthProvider (Context)
│   └── NotificationProvider (Context + WebSocket)
│       ├── ToastContainer (real-time popups, always visible)
│       └── Pages...
│           └── Navbar (NotificationBell inside)
```

---

## 6. Environment Variables

### Backend — `backend/.env` (copy from `.env.example`)

```env
DB_URL=jdbc:postgresql://db.YOURREF.supabase.co:5432/postgres
DB_USERNAME=postgres
DB_PASSWORD=your_supabase_db_password
JWT_SECRET=your_minimum_32_char_secret_key_here
JWT_EXPIRATION=86400000
CORS_ORIGINS=http://localhost:3000
```

### Frontend — `frontend/.env` (copy from `.env.example`)

```env
REACT_APP_API_URL=http://localhost:8080/api
REACT_APP_WS_URL=http://localhost:8080/ws
```

---

## 7. How to Connect Supabase PostgreSQL

### Step 1 — Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign up.
2. Click **"New Project"**, choose a name and strong database password.
3. Wait ~2 minutes for the project to initialize.

### Step 2 — Get your connection string

1. In your Supabase project, go to **Settings → Database**.
2. Under **Connection string**, select **URI** tab.
3. Copy the connection string. It looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxx.supabase.co:5432/postgres
   ```

### Step 3 — Convert to JDBC format

Change `postgresql://` to `jdbc:postgresql://`:
```
jdbc:postgresql://db.xxxxxxxx.supabase.co:5432/postgres
```

### Step 4 — Run the schema

1. In Supabase, go to **SQL Editor**.
2. Paste the contents of `database/schema.sql`.
3. Click **Run** — this creates all tables and inserts sample data.

### Step 5 — Configure Spring Boot

Set in `backend/.env`:
```env
DB_URL=jdbc:postgresql://db.xxxxxxxx.supabase.co:5432/postgres
DB_USERNAME=postgres
DB_PASSWORD=the_password_you_set_when_creating_the_project
```

> ⚠️ Supabase enforces SSL by default. If you get SSL errors, add `?sslmode=require` to the URL.

---

## 8. Running Locally

### Start the Backend

```bash
cd backend

# Option A: Using Maven wrapper
./mvnw spring-boot:run

# Option B: Using system Maven
mvn spring-boot:run

# Option C: Build JAR first, then run
mvn clean package -DskipTests
java -jar target/notification-system-1.0.0.jar
```

Backend starts at: **http://localhost:8080**

### Start the Frontend

```bash
cd frontend
npm start
```

Frontend starts at: **http://localhost:3000**

### Verify both are running

- Open http://localhost:3000/login
- Register as admin (select "Administrator" role)
- Open a second browser tab in incognito
- Register as a regular user
- From the admin tab, send a notification — it should appear instantly in the user tab!

---

## 9. API Reference & Postman Testing

### Base URL: `http://localhost:8080/api`

### Authentication APIs

#### POST `/auth/register`
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "ROLE_USER"
}
```
Response:
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiJ9...",
    "type": "Bearer",
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "ROLE_USER"
  }
}
```

#### POST `/auth/login`
```json
{
  "email": "admin@demo.com",
  "password": "password123"
}
```

#### GET `/auth/me`
```
Authorization: Bearer <token>
```

#### GET `/auth/users` *(admin only)*
```
Authorization: Bearer <admin-token>
```

---

### Notification APIs

> All notification endpoints require `Authorization: Bearer <token>`

#### POST `/notifications/send` *(admin only)*

Send to all users:
```json
{
  "title": "System Update",
  "message": "The platform has been updated to v2.0",
  "type": "ANNOUNCEMENT",
  "targetType": "ALL"
}
```

Send to specific users:
```json
{
  "title": "Personal Message",
  "message": "Your account has been verified.",
  "type": "SUCCESS",
  "targetType": "MULTIPLE",
  "targetUserIds": [2, 3]
}
```

Send to single user:
```json
{
  "title": "Warning Notice",
  "message": "Your session will expire soon.",
  "type": "WARNING",
  "targetType": "SINGLE",
  "targetUserIds": [2]
}
```

#### GET `/notifications/my`
Returns all notifications for the logged-in user.

#### POST `/notifications/filter`
```json
{
  "type": "WARNING",
  "isRead": false,
  "startDate": "2024-01-01T00:00:00",
  "endDate": "2024-12-31T23:59:59"
}
```

#### PATCH `/notifications/{userNotificationId}/read`
Marks a specific notification as read for the current user.

#### PATCH `/notifications/read-all`
Marks all notifications as read for the current user.

#### GET `/notifications/unread-count`
```json
{ "success": true, "data": { "count": 5 } }
```

#### DELETE `/notifications/{id}` *(admin only)*
Deletes a notification and all its user_notification records.

#### GET `/notifications/all` *(admin only)*
Returns all notifications system-wide.

---

### Setting up Postman

1. Open Postman → Create a new Collection called "NotifyHub".
2. Add a **Collection Variable**: `baseUrl = http://localhost:8080/api`
3. Add a **Collection Variable**: `token = ` (leave empty for now)
4. On the **Login** request, add a **Test script**:
   ```javascript
   const res = pm.response.json();
   pm.collectionVariables.set("token", res.data.token);
   ```
5. For all other requests, set **Authorization → Bearer Token → `{{token}}`**

---

## 10. WebSocket Testing

### Using the browser console (easiest)

Open the app, log in, then in DevTools console:

```javascript
// The app already has WebSocket connected.
// Watch the console for messages like:
// ✅ WebSocket connected
// Then from another browser/tab, have an admin send a notification.
// You'll see the toast appear and console log the WS message.
```

### Manual test with STOMP.js in browser console

```javascript
// Load SockJS + STOMP in a test HTML file
const socket = new SockJS('http://localhost:8080/ws');
const client = Stomp.over(socket);
client.connect({}, function(frame) {
  console.log('Connected:', frame);
  client.subscribe('/user/queue/notifications', function(msg) {
    console.log('Received:', JSON.parse(msg.body));
  });
});
```

### Verify real-time flow

1. Open two browser windows side by side.
2. **Window A**: Log in as admin.
3. **Window B**: Log in as a regular user.
4. In Window A, go to Admin Panel → Send a notification to "All Users".
5. In Window B, watch the notification bell badge increment and a toast popup appear — **instantly**.

---

## 11. Sample Test Data

After running `database/schema.sql`:

| Email | Password | Role |
|-------|----------|------|
| admin@demo.com | password123 | ROLE_ADMIN |
| alice@demo.com | password123 | ROLE_USER |
| bob@demo.com | password123 | ROLE_USER |
| carol@demo.com | password123 | ROLE_USER |

5 sample notifications are pre-created and assigned to all users.

---

## 12. Deployment

### Frontend on Vercel

```bash
cd frontend
npm run build

# Install Vercel CLI
npm i -g vercel
vercel --prod
```

In Vercel dashboard, set environment variables:
```
REACT_APP_API_URL = https://your-backend.onrender.com/api
REACT_APP_WS_URL  = https://your-backend.onrender.com/ws
```

### Backend on Render

1. Push your code to GitHub.
2. Go to [render.com](https://render.com) → New → Web Service.
3. Connect your GitHub repo.
4. Set:
   - **Build Command**: `cd backend && mvn clean package -DskipTests`
   - **Start Command**: `java -jar backend/target/notification-system-1.0.0.jar`
   - **Environment**: Java 17
5. Add Environment Variables (same as `.env.example`).
6. Deploy!

### Backend on Railway

```bash
# Install Railway CLI
npm install -g @railway/cli
railway login
cd backend
railway init
railway up
```

Set environment variables in Railway dashboard.

### Database on Supabase

Already hosted! Just make sure:
- Your Supabase project's database password is set.
- The schema has been run in the SQL editor.
- Your backend's `DB_URL` and credentials are correct.
- In Supabase → Settings → API → verify your project ref.

### Production CORS update

Update `CORS_ORIGINS` in backend `.env`:
```env
CORS_ORIGINS=https://your-app.vercel.app,https://your-custom-domain.com
```

---

## 13. Best Practices & Security

### Security

| Practice | Implementation |
|----------|---------------|
| Password hashing | BCrypt with strength 10 |
| JWT expiry | 24 hours (configurable) |
| Role-based access | `@PreAuthorize` on controllers |
| CORS restriction | Whitelist of allowed origins only |
| No SQL injection | Spring Data JPA parameterized queries |
| Input validation | `@Valid` + Bean Validation annotations |
| Stateless sessions | No server-side sessions — JWT is the truth |

### Error Handling

- `GlobalExceptionHandler` catches all exceptions and returns structured JSON.
- Validation errors return field-level messages (e.g., `{ "email": "must be valid" }`).
- 401 errors auto-redirect to login in the frontend Axios interceptor.

### Clean Code

- DTOs separate API contracts from internal entities.
- Services contain all business logic — controllers stay thin.
- Context API keeps global state clean and avoids prop drilling.
- WebSocket singleton prevents duplicate connections.

---

## 14. Future Enhancements

### Email Notifications
Add `spring-boot-starter-mail` + configure SMTP (Gmail, SendGrid):
```java
javaMailSender.send(buildEmailMessage(user.getEmail(), notification));
```

### Push Notifications (Browser/PWA)
Use the Web Push API + a service worker. Libraries: `web-push` for Node, or integrate Firebase Cloud Messaging.

### SMS Notifications
Integrate Twilio:
```xml
<dependency>
  <groupId>com.twilio.sdk</groupId>
  <artifactId>twilio</artifactId>
  <version>9.3.0</version>
</dependency>
```

### Kafka Integration (for scale)
Instead of pushing directly to WebSocket:
- Admin sends → backend publishes to Kafka topic
- Consumer service reads from Kafka → pushes via WebSocket
- Decouples notification creation from delivery at high scale

### Redis Caching
Cache unread counts and recent notifications:
```java
@Cacheable(value = "unreadCount", key = "#userId")
public long getUnreadCount(Long userId) { ... }
```

### Notification Templates
Store reusable templates in DB:
```sql
CREATE TABLE notification_templates (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100),
  title_template TEXT,
  message_template TEXT,
  type VARCHAR(30)
);
```

### Pagination
Add `Pageable` to repositories for large datasets:
```java
Page<UserNotification> findByUserId(Long userId, Pageable pageable);
```
