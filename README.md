# Smart Job Portal System

Full-stack recruitment platform:
- Frontend: React (Vite) + React Router DOM + Axios
- Backend: Python Flask (REST) + JWT auth + CORS
- Database: MySQL (relational schema)

## Project structure
- `frontend/` — React UI
- `backend/` — Flask API + uploads + MySQL integration

## Backend setup (Flask + MySQL)
1) Create the DB + tables
- Run: `backend/sql/schema.sql` in your MySQL client

2) Configure environment
- Copy `backend/.env.example` → `backend/.env`
- Update MySQL credentials and secrets

3) Install and run
- From `backend/`:
  - `python -m venv .venv`
  - Activate venv
  - `pip install -r requirements.txt`
  - `python run.py`

API: `http://127.0.0.1:5000`

## Frontend setup (React)
1) Configure environment
- Copy `frontend/.env.example` → `frontend/.env`

2) Install and run
- From `frontend/`:
  - `npm install`
  - `npm run dev`

UI: `http://localhost:5173`

## Core features
### Authentication
- Role-based: `seeker` and `recruiter`
- Password hashing (Werkzeug)
- JWT-protected routes and APIs

### Job seekers
- Register/login
- Update profile + upload resume
- Browse/search/filter jobs
- Apply to jobs (with optional resume upload)
- Track application history

### Recruiters
- Register/login
- Company profile management
- Post/edit/delete jobs
- View applicants + download resumes

## API endpoints (high level)
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/profile` / `PUT /api/profile`
- `POST /api/profile/resume`
- `GET /api/jobs` / `GET /api/jobs/:id`
- `POST /api/jobs` / `PUT /api/jobs/:id` / `DELETE /api/jobs/:id`
- `GET /api/jobs/mine`
- `POST /api/jobs/:id/apply`
- `GET /api/applications/me`
- `GET /api/jobs/:id/applicants`
- `GET /api/applications/:id/resume`

## Deployment notes (Vercel + Render)
- Frontend (Vercel): set `VITE_API_URL` to your backend URL
- Backend (Render): set `DB_HOST/DB_USER/DB_PASSWORD/DB_NAME`, `JWT_SECRET_KEY`, `SECRET_KEY`, `CORS_ORIGINS` (frontend URL)
