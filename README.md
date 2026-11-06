# BoardEase

![BoardEase Logo](frontend/public/logo.png)

A full-stack boarding house management system with tenant profiles, room management, payments, real-time messaging, and admin reporting — powered by JSON data storage, Kafka, RabbitMQ, and Docker.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18, CSS Modules |
| Backend | Node.js, Express.js, Socket.IO |
| Messaging | Apache Kafka (KafkaJS) |
| Event Queue | RabbitMQ (amqplib) |
| Data Store | JSON files (xmldom) |
| Reports | XSLT stylesheets → HTML / JSON |
| Auth | JWT + bcryptjs |
| Uploads | Multer |
| Container | Docker, Docker Compose |

---

## Project Structure

```
BoardEase/
├── backend/
│   ├── assets/          # Static room images (room1–4.jpg)
│   ├── controllers/     # Route handlers
│   ├── data/            # All runtime data (inside project)
│   │   ├── json/        # Live JSON database
│   │   ├── xml/         # XML files for XSLT reports
│   │   ├── uploads/     # Uploaded images
│   │   └── settings.json
│   ├── lib/             # kafka.js, rabbitmq.js
│   ├── middleware/      # auth.js (JWT)
│   ├── models/          # xmlModel.js (JSON-backed), xsltModel.js
│   ├── routes/          # All API routes
│   ├── scripts/         # seed-room-images.js, sync-rooms-xml.js
│   ├── uploads/         # Secondary upload directory (served at /uploads)
│   ├── xslt/            # XSLT stylesheets (3 files)
│   ├── .env
│   └── server.js
├── frontend/
│   ├── components/      # Sidebar, Toast, RoomCarousel, CreateGroupModal
│   ├── lib/             # api.js, socket.js
│   ├── pages/
│   │   ├── admin/       # dashboard, messages, payments, rooms, profile, reports
│   │   ├── user/        # dashboard, messages, payments, rooms, profile
│   │   ├── index.js     # Public landing page
│   │   ├── login.js
│   │   └── register.js  # Public tenant self-registration
│   ├── public/          # Static assets
│   └── styles/          # globals.css, landing.module.css
├── docs-part1.html      # System Overview & Architecture
├── docs-part2.html      # Feature Descriptions
├── docs-part3.html      # Technical Explanation & Challenges
├── docs-part4.html      # Screenshots & Outputs
├── docker-compose.yml
├── start.bat            # One-click Docker launcher
└── install.bat          # Local dev dependency installer
```

---

## Data Directory

All runtime data is stored inside the project at **`backend/data/`**.

```
backend/data/
├── json/                # Live data (JSON files)
│   ├── users.json
│   ├── rooms.json
│   ├── payments.json
│   ├── messages.json
│   ├── reservations.json
│   ├── groups.json
│   └── logs.json
├── xml/                 # XML files (auto-synced for XSLT reports)
│   ├── users.xml
│   ├── payments.xml
│   └── ...
├── uploads/             # Uploaded images (avatars, QR codes, room photos)
└── settings.json        # GCash/bank payment info
```

---

## Quick Start — Docker (Recommended, works offline)

> Requires [Docker Desktop](https://www.docker.com/products/docker-desktop) installed and running.
> Docker only runs the **infrastructure** (Kafka, RabbitMQ, Redis).
> Frontend and backend run in your terminal.

**Step 1 — Install dependencies (first time only):**
```bat
install.bat
```

**Step 2 — Start infrastructure:**
```bat
start.bat
```
Or manually:
```bash
docker compose up -d
```

**Step 3 — Run backend and frontend in two terminals:**
```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

**Services:**

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:5000 |
| RabbitMQ UI | http://localhost:15672 (guest/guest) |
| Redis | localhost:6379 |

Stop Docker infrastructure:
```bash
docker compose down
```

---

## Default Accounts

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| Tenant | daniela | daniela |
| Tenant | mico | mico |

---

## Environment Variables (backend/.env)

| Key | Local Dev | Docker |
|-----|-----------|--------|
| `PORT` | `5000` | `5000` |
| `JWT_SECRET` | `boardease_secret_key_2024` | same |
| `KAFKA_BROKER` | `localhost:9092` | `kafka:9092` |
| `RABBITMQ_URL` | `amqp://localhost` | `amqp://guest:guest@rabbitmq:5672` |
| `REDIS_URL` | `redis://127.0.0.1:6379` | `redis://redis:6379` |
| `NEXT_PUBLIC_API_URL` | `http://localhost:5000` | same |

---

## Data Files

All live data is stored in `backend/data/json/`:

| File | Purpose |
|------|---------|
| `users.json` | User accounts (admin + tenants) |
| `rooms.json` | Room listings and assignments |
| `payments.json` | Payment requests and status |
| `messages.json` | Chat message history |
| `reservations.json` | Room reservation requests |
| `groups.json` | Custom chat groups |
| `logs.json` | Activity audit trail |
| `../settings.json` | GCash/bank payment info |

---

## Upload Behavior

All uploaded files (profile avatars, QR codes, room images, payment proofs) are saved to `backend/uploads/` and served statically by the backend at `/uploads/<filename>`. A secondary copy may also exist under `backend/data/uploads/`.

Frontend image tags use a cache-busting `?t=<timestamp>` query parameter after any upload so the browser always fetches the latest image instead of showing a cached version.

---

## New Features

### Public Landing Page
The root route (`/`) is a public-facing landing page with animated hero section, about section, live room stats (fetched from `/api/rooms/stats`), and a contact form.

### Tenant Self-Registration
New tenants can create their own account at `/register` without admin involvement. Registered accounts default to the `tenant` role.

### Profile Pages (Admin & Tenant)
Both admin and tenant users have a dedicated profile page (`/admin/profile`, `/user/profile`) supporting:
- Edit personal details (full name, phone, birthday, address, emergency contact)
- Upload/change profile avatar
- Change password (requires current password verification)

### Reports Dashboard (Admin)
The `/admin/reports` page provides XSLT-transformed reports with 5 tabs:
- 💳 Payments Report (XSLT → HTML)
- 👥 Tenants Report (XSLT → HTML)
- `{}` Payments JSON (XML → JSON)
- `{}` Tenants JSON (XML → JSON)
- 📋 Activity Logs (from `logs.xml`)

### Utility Scripts
| Script | Purpose |
|--------|---------|
| `scripts/seed-room-images.js` | Seeds default room images into the data directory |
| `scripts/sync-rooms-xml.js` | Syncs `rooms.json` → `rooms.xml` for XSLT reports |

---

## Documentation

Open these HTML files in any browser and use **Print → Save as PDF**:

| File | Contents |
|------|---------|
| `docs-part1.html` | System Overview & Architecture |
| `docs-part2.html` | Feature Descriptions (Messaging, JSON/XML, XSLT, Scripting) |
| `docs-part3.html` | Technical Explanation & Challenges |
| `docs-part4.html` | Screenshots, Data Outputs & Deployment Guide |
