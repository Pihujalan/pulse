# 🌟 Pulse — Performance Management System

A full-stack goal-setting, check-in, and alignment platform built with **Django + Next.js 14**.

---

## 🗂 Project Structure

```
pulse/
├── backend/          ← Django 4.2 REST API
│   ├── apps/
│   │   ├── users/        User model + JWT auth
│   │   ├── goals/        GoalSheet, GoalEntry, SharedGoal + signals
│   │   ├── checkins/     Quarterly check-ins with window enforcement
│   │   ├── cycles/       QuarterWindow management + Celery tasks
│   │   ├── audit/        Immutable audit log
│   │   ├── escalations/  Escalation tracking
│   │   └── ai/           Groq AI endpoints (suggestions + comments)
│   ├── services/
│   │   ├── progress.py   ProgressCalculator (all 4 UoM formulas)
│   │   ├── graph.py      Alignment map data builder
│   │   └── export.py     CSV/Excel achievement reports
│   └── scripts/
│       └── seed.py       Demo data (7 users, full workflow)
│
├── frontend/         ← Next.js 14 App Router
│   └── app/
│       ├── (auth)/login/           Login page
│       ├── employee/
│       │   ├── dashboard/          Progress overview
│       │   ├── goals/              Goal CRUD + AI suggestions
│       │   └── checkins/           Quarterly check-in submission
│       ├── manager/
│       │   ├── dashboard/          Team overview
│       │   ├── review/             Approve/return/inline-edit goals
│       │   └── checkins/           Team check-in matrix + AI comments
│       └── admin/
│           ├── dashboard/          Org-wide metrics + charts
│           ├── alignment-map/      D3 force-graph
│           ├── matrix/             Heatmap grid
│           ├── shared-goals/       Cross-team goal distribution
│           ├── cycles/             Quarter window management
│           ├── escalations/        Escalation tracker
│           ├── export/             Excel/CSV download
│           └── audit/              Immutable audit trail
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 🚀 Local Setup (Docker — Recommended)

### Prerequisites
- Docker Desktop installed and running
- That's it.

### Step 1 — Clone and configure

```bash
git clone <your-repo>
cd pulse
cp .env.example .env
```

The `.env` already has your Groq API key pre-filled. Change `SECRET_KEY` for production.

### Step 2 — Start everything

```bash
docker-compose up --build
```

This starts:
- **PostgreSQL** on port 5432
- **Redis** on port 6379
- **Django API** on http://localhost:8000
- **Celery** worker + beat scheduler
- **Next.js** frontend on http://localhost:3000

### Step 3 — Run migrations and seed

In a second terminal:

```bash
# Run migrations
docker-compose exec backend python manage.py migrate

# Create Django superuser (optional, for /admin/)
docker-compose exec backend python manage.py createsuperuser

# Seed demo data (7 users + realistic goals/check-ins)
docker-compose exec backend python scripts/seed.py
```

### Step 4 — Open the app

👉 **http://localhost:3000**

---

## 👤 Demo Accounts

| Role | Email | Password | Notes |
|------|-------|----------|-------|
| Admin/HR | `admin@pulse.demo` | `pulse123` | Full access, all dashboards |
| Manager (Sales) | `manager@pulse.demo` | `pulse123` | Rahul Mehta — Sales team |
| Manager (Eng) | `manager2@pulse.demo` | `pulse123` | Ananya Iyer — Engineering team |
| Employee | `employee@pulse.demo` | `pulse123` | Aditya Kumar — Approved sheet + Q1 check-ins done |
| Employee | `employee2@pulse.demo` | `pulse123` | Sneha Patel — Approved |
| Employee | `employee3@pulse.demo` | `pulse123` | Vikram Singh — Pending manager review |
| Employee | `employee4@pulse.demo` | `pulse123` | Meera Nair — Returned for rework |
| Employee | `employee5@pulse.demo` | `pulse123` | Rohan Das — Draft in progress |

**Q2 check-in window is OPEN** in seed data.

---

## 🌐 Railway Deployment

### Prerequisites
- Railway account at https://railway.app
- Railway CLI: `npm install -g @railway/cli`

### Step 1 — Login

```bash
railway login
```

### Step 2 — Create a new project

```bash
railway new
# Name it "pulse"
```

### Step 3 — Add services

In Railway dashboard, create these services:
1. **PostgreSQL** (click "+ New" → Database → PostgreSQL)
2. **Redis** (click "+ New" → Database → Redis)
3. **Backend** (click "+ New" → GitHub Repo → select `pulse/backend`)
4. **Frontend** (click "+ New" → GitHub Repo → select `pulse/frontend`)

### Step 4 — Set environment variables

**Backend service variables:**
```
SECRET_KEY=<generate-a-long-random-string>
DEBUG=False
GROQ_API_KEY=your_groq_api_key_here
DATABASE_URL=<auto-filled from Railway PostgreSQL>
REDIS_URL=<auto-filled from Railway Redis>
ALLOWED_HOSTS=<your-backend-railway-domain>
FRONTEND_URL=https://<your-frontend-railway-domain>
```

**Frontend service variables:**
```
NEXT_PUBLIC_API_URL=https://<your-backend-railway-domain>
```

### Step 5 — Deploy

Railway auto-deploys when you push to GitHub. Or manually:

```bash
cd backend && railway up
cd ../frontend && railway up
```

### Step 6 — Run seed data on Railway

```bash
railway run python scripts/seed.py
```

---

## 🔧 Development (Without Docker)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Set env vars
export DATABASE_URL=postgresql://localhost:5432/pulse
export REDIS_URL=redis://localhost:6379/0
export GROQ_API_KEY=your_groq_api_key_here
export SECRET_KEY=dev-secret

python manage.py migrate
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
npm run dev
```

### Celery (separate terminal)

```bash
cd backend
celery -A config worker -l info --beat
```

---

## 🧠 AI Features (Groq)

The Groq API key is already configured. Two AI-powered features:

1. **Goal Suggestion** — When adding a goal, type a draft title and click "AI Suggest" to get 2-3 SMART reformulations with UoM recommendations.

2. **Check-in Comment Drafting** — Managers reviewing check-ins can click "AI Draft Comment" to get a professionally written feedback comment pre-filled based on planned vs actual achievement.

Both responses are cached in Redis (24h for suggestions, 1h for comments).

**Model:** `llama-3.3-70b-versatile` (Groq's best free model)

---

## 📐 Business Rules Implemented

| Rule | Implementation |
|------|---------------|
| Max 8 goals per employee per cycle | Enforced in API + frontend |
| Min 10% weightage per goal | Serializer validation |
| Total weightage must = 100% | Pre-submission check |
| Goal sheet locked on approval | Django signal |
| Shared goal achievement syncs | `post_save` signal on GoalEntry |
| Check-ins only during open windows | `QuarterWindow` model + API check |
| Manager can inline-edit during review | Role + status check in views |
| Admin can unlock approved sheets | Separate endpoint with audit log |
| Immutable audit trail | `AuditLog.objects.create()` on all state changes |
| ZERO UoM: zero = 100% score | `ProgressCalculator._zero_score()` |
| MAX UoM: lower = better | `ProgressCalculator._max_score()` = target/achievement |

---

## 📊 API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login/` | JWT login |
| GET | `/api/auth/me/` | Current user |
| GET/POST | `/api/goals/sheets/` | Goal sheets (role-filtered) |
| POST | `/api/goals/sheets/:id/goals/` | Add goal |
| PUT | `/api/goals/sheets/:id/goals/:id/` | Edit goal |
| POST | `/api/goals/sheets/:id/submit/` | Submit for review |
| POST | `/api/goals/sheets/:id/approve/` | Approve / move to review |
| POST | `/api/goals/sheets/:id/return/` | Return for rework |
| POST | `/api/goals/sheets/:id/unlock/` | Admin unlock |
| GET/POST | `/api/goals/shared/` | Shared goals |
| GET | `/api/goals/alignment-map/` | D3 graph data |
| PATCH | `/api/goals/entries/:id/achievement/` | Log achievement |
| GET/POST | `/api/checkins/goal/:id/` | Check-ins |
| GET | `/api/checkins/team/` | Team check-in matrix |
| GET | `/api/checkins/export/` | Download report |
| GET/POST | `/api/cycles/windows/` | Quarter windows |
| GET | `/api/audit/logs/` | Audit trail |
| GET/POST | `/api/escalations/` | Escalations |
| POST | `/api/ai/suggest-goal/` | AI goal suggestions |
| POST | `/api/ai/draft-checkin-comment/` | AI comment draft |

---

## 🛠 Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Django 4.2, Django REST Framework, Celery, django-celery-beat |
| Database | PostgreSQL 15 |
| Cache / Queue | Redis 7 |
| Auth | JWT (SimpleJWT) |
| AI | Groq API (llama-3.3-70b-versatile) |
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Charts | Recharts |
| Graph | D3.js v7 (force simulation) |
| Export | pandas + openpyxl |
| Infra | Docker Compose (local), Railway (cloud) |

---

## 🐛 Troubleshooting

**"Connection refused" on backend startup**
→ Wait for PostgreSQL to be healthy. Run `docker-compose up db redis` first, then `docker-compose up`.

**Migrations fail**
→ `docker-compose exec backend python manage.py migrate --run-syncdb`

**Frontend shows blank page**
→ Check `NEXT_PUBLIC_API_URL` in your `.env` — it must match where the backend is running.

**AI features return fallback responses**
→ Check that `GROQ_API_KEY` is set in `.env`. The key is pre-filled in `.env.example`.

**Check-in window closed**
→ In Railway/admin, go to Cycles & Windows and toggle Q2 to OPEN.
