# SketchWave AI Coding Guide

## Project Overview
**SketchWave** is a real-time collaborative sketchpad application built with Express.js, Socket.IO, and MySQL. It enables multiple users to draw, add shapes/text, and share boards with granular access controls.

**Tech Stack:**
- **Backend:** Node.js (ES modules), Express.js, Passport.js (local + Google OAuth)
- **Frontend:** HTML5 Canvas, Bootstrap 5, vanilla JavaScript
- **Real-time:** Socket.IO for collaborative drawing
- **Database:** MySQL with connection pooling
- **Session:** Express-session with MySQL store (stored at `sessions` table)

---

## Architecture & Data Flow

### Core Components

**1. Authentication Layer** ([auth.js](auth.js))
- **Strategies:** Passport Local (email/password) + Google OAuth20
- **User Serialization:** Stored in session using `user_id`
- **Key Patterns:**
  - Passwords hashed with bcrypt (10 rounds)
  - Google users created automatically on first login if email doesn't exist
  - User deserialization queries the `user` table per request
  
**2. Database Connection** ([db.js](db.js))
- **Connection Pool:** MySQL2/promise with 10 connection limit
- **Environment Variables:**
  - Supports both `DATABASE_URL` (parsed URL) and separate `MYSQL_HOST`, `MYSQL_USER`, etc.
  - Render-compatible: reads `/etc/secrets/.env` if available (overrides default .env)
  - SSL/TLS support: `DB_SSL=true`, with optional CA certificate via `DB_SSL_CA_PATH` or `DB_SSL_CA`
- **Key Note:** Always use parameterized queries to prevent SQL injection

**3. Board Access Control** ([server.js](server.js#L105-L130))
- **Three Access Levels:**
  1. Public boards (`is_public = 1`) → anyone can view
  2. Owner → full read/write access
  3. Invited users → via `board_access` table with role (viewer/editor)
  4. Friends of owner → if `friendship.status = 'accepted'`
- **Share Tokens:** HMAC-SHA256 signed tokens with optional TTL (env: `SHARE_TTL_HOURS`)
- **Socket.IO Authorization:** `board:join` event validates access before room subscription

**4. Real-time Collaboration** (Socket.IO)
- **Room-based:** Each board is a socket.io room (`board:{boardId}`)
- **Events:** 
  - `draw:point` → broadcast to room (point-by-point streaming)
  - `draw:stroke:end` → marks line completion
  - `shape:add`, `text:add`, `board:clear`, `board:sync` → propagate to other clients
- **Session Sharing:** Socket.IO middleware wraps Express session + Passport for auth

**5. Canvas State Persistence** ([sketchpad.js](public/js/sketchpad.js#L40-L55))
- **Autosave:** Triggers every 1.5s of inactivity (via `/board/{id}/autosave` POST)
- **Canvas Objects:** Array stored in DB containing `{type, x, y, width, height, color, content, points}`
- **Undo/Redo:** Client-side stacks (max 30 snapshots per `maxSnapshots`)

---

## Critical Development Workflows

### Running the Application
```bash
# Development (with auto-reload via nodemon)
npm run dev

# Production
npm start
```

### Environment Setup
Create a `.env` file in the root with:
```
DATABASE_URL=mysql://user:password@host:port/database?ssl-mode=REQUIRED
SESSION_SECRET=your-session-secret-key
SHARE_SECRET=your-share-secret
GOOGLE_CLIENT_ID=xxx (optional)
GOOGLE_CLIENT_SECRET=yyy (optional)
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
```

### Database Initialization
- Tables: `user`, `board`, `board_access`, `friendship`, `canvas_snapshot`, `sessions`
- Seed file: [sketchwave_plsplsfunguj.sql](sketchwave_plsplsfunguj.sql)
- Session table auto-created by express-mysql-session middleware

### Docker Deployment
Use [docker-compose.yml](docker-compose.yml) and [Dockerfile](Dockerfile) for containerized deployment.

---

## Project-Specific Patterns

### 1. EJS Templating with User Context
- All views receive `user` object (from Passport) and `friends` array
- Use guards: `<% if (user) { ... } %>`
- User data always available at `req.user` after authentication
- Example: [Views/main.ejs](Views/main.ejs#L10-L20)

### 2. Board Owner Queries
All queries checking board ownership follow this pattern:
```javascript
const [[row]] = await db.query('SELECT owner_id, is_public FROM board WHERE board_id = ?', [boardId]);
if (row.owner_id === userId) { /* full access */ }
```

### 3. Friendship Relations
Stored bidirectionally in `friendship` table with `status IN ('pending', 'accepted')`:
```javascript
// Query accepted friends (handles both directions)
SELECT ... FROM friendship f
WHERE (f.user_id1 = ? OR f.user_id2 = ?) AND f.status = 'accepted'
```

### 4. Canvas Object Storage
Each drawing element stored as JSON in `canvas_snapshot`:
- **type:** 'line' | 'shape' | 'text'
- **points:** Array for lines; shape/text use x, y, width, height
- **color, fontSize, lineWidth:** Preserved for re-rendering

### 5. Error Handling on Routes
Standard patterns:
- **Auth errors:** Redirect to `/login` via `ensureAuthenticated` middleware
- **Validation errors:** Return 400 with plain text error message
- **DB errors:** Log to console, return 500 response
- **Socket errors:** Emit `board:error` event to client

---

## Key Files & Their Responsibilities

| File | Purpose | Key Functions |
|------|---------|---|
| [server.js](server.js) | Express app setup, routes, Socket.IO | `hasBoardAccess()`, `canEditBoard()`, board CRUD |
| [auth.js](auth.js) | Passport strategies (Local + Google) | `serializeUser()`, `deserializeUser()` |
| [db.js](db.js) | MySQL connection pool initialization | `buildDbConfig()`, handles URL parsing + SSL |
| [middleware.js](middleware.js) | Auth guards | `ensureAuthenticated()`, `ensureGuest()` |
| [public/js/sketchpad.js](public/js/sketchpad.js) | Canvas drawing engine + Socket.IO client | `setTool()`, `draw()`, `runAutosave()` |
| [Views/main.ejs](Views/main.ejs) | Dashboard & drawing workspace | Sidebar controls, canvas containers |
| [docker-compose.yml](docker-compose.yml) | Local MySQL + app orchestration | Service definitions for MySQL, app |

---

## Common Modification Points

### Adding a New Board Feature
1. **Database:** Add column to `board` table and migration
2. **Backend:** Update `hasBoardAccess()` and `canEditBoard()` logic if access changes
3. **Socket Handler:** Add event listener in `io.on('connection')` block
4. **Frontend:** Add UI in [Views/main.ejs](Views/main.ejs) and handler in [sketchpad.js](public/js/sketchpad.js)

### Extending Authentication
- Add new Passport strategy in [auth.js](auth.js)
- Create route handler (e.g., `/auth/provider/callback`)
- Ensure serialization works with `user_id` field

### Scaling Database Queries
- Connection pool: Increase `connectionLimit` in [db.js](db.js) if needed
- Socket.IO session: Ensure `sessionStore` persists to DB for multi-instance deployments

---

## Debugging Tips

- **Socket.IO Issues:** Check browser console + server logs for `board:join` / `board:error` events
- **Auth Failures:** Inspect `req.user` and session data; bcrypt comparison is async
- **DB Connection:** Test with `/health/db` endpoint
- **Canvas Rendering:** Verify `canvasObjects` array structure before autosave
- **Session Persistence:** Confirm `sessions` table created and writable

---

## Code Quality Conventions

- **Naming:** camelCase (JS), snake_case (SQL columns)
- **Async:** Always use async/await; avoid callback hell
- **SQL:** Parameterized queries only (prevent injection)
- **Socket Rooms:** Format as `board:{boardId}` (integer)
- **Error Messages:** User-facing messages in Czech (locale)
