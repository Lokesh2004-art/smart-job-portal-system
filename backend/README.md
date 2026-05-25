# Smart Job Portal System — Backend (Flask + MySQL)

## Features
- REST APIs with JWT auth (Job Seeker / Recruiter)
- Job CRUD (recruiter)
- Apply to jobs + resume upload (seeker)
- View applicants + download resumes (recruiter)
- Profile management for both roles

## Setup
1) Create the MySQL DB and tables:
- Run: `backend/sql/schema.sql`

2) Create environment file:
- Copy `backend/.env.example` to `backend/.env` and update values

3) Create venv and install deps:
- `python -m venv .venv`
- Activate, then: `pip install -r requirements.txt`

4) Run:
- `python run.py`

API base URL: `http://127.0.0.1:5000`

## Notes
- Uploads are stored in `backend/uploads/resumes/`.
