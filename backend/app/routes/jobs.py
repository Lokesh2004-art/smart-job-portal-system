from datetime import datetime
from typing import Optional

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from ..extensions import db
from ..models import Job, JobPostingState, User
from ..utils.decorators import role_required


jobs_bp = Blueprint("jobs", __name__)


def _get_state_map(job_ids):
    if not job_ids:
        return {}
    states = JobPostingState.query.filter(JobPostingState.job_id.in_(job_ids)).all()
    return {s.job_id: s for s in states}


def serialize_job(job: Job, state: Optional[JobPostingState] = None):
    return {
        "id": job.id,
        "recruiter_id": job.recruiter_id,
        "title": job.title,
        "description": job.description,
        "location": job.location,
        "skills_required": job.skills_required,
        "salary_min": job.salary_min,
        "salary_max": job.salary_max,
        "job_type": job.job_type,
        "experience_min": job.experience_min,
        "experience_max": job.experience_max,
        "is_open": True if state is None else bool(state.is_open),
        "closed_at": None if state is None else (state.closed_at.isoformat() if state.closed_at else None),
        "created_at": job.created_at.isoformat(),
        "updated_at": job.updated_at.isoformat() if job.updated_at else None,
    }


@jobs_bp.get("")
def list_jobs():
    search = (request.args.get("q") or "").strip()
    skill = (request.args.get("skill") or "").strip()
    location = (request.args.get("location") or "").strip()
    min_salary = request.args.get("minSalary")
    max_salary = request.args.get("maxSalary")

    query = Job.query

    if search:
        like = f"%{search}%"
        query = query.filter((Job.title.ilike(like)) | (Job.description.ilike(like)))

    if skill:
        query = query.filter(Job.skills_required.ilike(f"%{skill}%"))

    if location:
        query = query.filter(Job.location.ilike(f"%{location}%"))

    if min_salary:
        try:
            query = query.filter(Job.salary_min >= int(min_salary))
        except ValueError:
            return jsonify({"message": "minSalary must be a number"}), 400

    if max_salary:
        try:
            query = query.filter(Job.salary_max <= int(max_salary))
        except ValueError:
            return jsonify({"message": "maxSalary must be a number"}), 400

    jobs = query.order_by(Job.created_at.desc()).limit(200).all()
    state_by_job_id = _get_state_map([j.id for j in jobs])
    return jsonify([serialize_job(j, state_by_job_id.get(j.id)) for j in jobs])


@jobs_bp.get("/mine")
@role_required("recruiter")
def my_jobs():
    recruiter_id = int(get_jwt_identity())
    jobs = (
        Job.query.filter_by(recruiter_id=recruiter_id)
        .order_by(Job.created_at.desc())
        .limit(200)
        .all()
    )
    state_by_job_id = _get_state_map([j.id for j in jobs])
    return jsonify([serialize_job(j, state_by_job_id.get(j.id)) for j in jobs])


@jobs_bp.get("/<int:job_id>")
def get_job(job_id: int):
    job = Job.query.get(job_id)
    if not job:
        return jsonify({"message": "Job not found"}), 404
    state = JobPostingState.query.get(job.id)
    return jsonify(serialize_job(job, state))


@jobs_bp.post("")
@role_required("recruiter")
def create_job():
    data = request.get_json(silent=True) or {}

    recruiter_id = int(get_jwt_identity())
    recruiter = User.query.get(recruiter_id)
    profile = recruiter.recruiter_profile if recruiter else None
    missing = []
    if not profile or not (profile.company_name or '').strip():
        missing.append('company_name')
    if not profile or not (profile.company_location or '').strip():
        missing.append('company_location')
    if missing:
        return (
            jsonify(
                {
                    "message": "Complete your profile before posting jobs.",
                    "missing_fields": missing,
                }
            ),
            400,
        )

    title = (data.get("title") or "").strip()
    description = (data.get("description") or "").strip()

    if not title or not description:
        return jsonify({"message": "Title and description are required"}), 400

    salary_min = data.get("salary_min")
    salary_max = data.get("salary_max")
    exp_min = data.get("experience_min")
    exp_max = data.get("experience_max")

    for key, raw in [("salary_min", salary_min), ("salary_max", salary_max)]:
        if raw in (None, ""):
            continue
        try:
            int(raw)
        except (TypeError, ValueError):
            return jsonify({"message": f"{key} must be a number"}), 400
    for key, raw in [("experience_min", exp_min), ("experience_max", exp_max)]:
        if raw in (None, ""):
            continue
        try:
            int(raw)
        except (TypeError, ValueError):
            return jsonify({"message": f"{key} must be a number"}), 400

    job = Job(
        recruiter_id=recruiter_id,
        title=title,
        description=description,
        location=(data.get("location") or "").strip() or None,
        skills_required=(data.get("skills_required") or "").strip() or None,
        salary_min=int(salary_min) if salary_min not in (None, "") else None,
        salary_max=int(salary_max) if salary_max not in (None, "") else None,
        job_type=(data.get("job_type") or "").strip() or None,
        experience_min=int(exp_min) if exp_min not in (None, "") else None,
        experience_max=int(exp_max) if exp_max not in (None, "") else None,
    )

    db.session.add(job)
    db.session.commit()

    if not JobPostingState.query.get(job.id):
        db.session.add(JobPostingState(job_id=job.id, is_open=True))
        db.session.commit()

    return jsonify(serialize_job(job)), 201


@jobs_bp.put("/<int:job_id>")
@role_required("recruiter")
def update_job(job_id: int):
    job = Job.query.get(job_id)
    if not job:
        return jsonify({"message": "Job not found"}), 404

    user_id = int(get_jwt_identity())
    if job.recruiter_id != user_id:
        return jsonify({"message": "Forbidden"}), 403

    data = request.get_json(silent=True) or {}

    for field in ["title", "description", "location", "skills_required", "job_type"]:
        if field in data:
            value = (data.get(field) or "").strip()
            setattr(job, field, value or None)

    for field in ["experience_min", "experience_max"]:
        if field in data:
            raw = data.get(field)
            if raw in (None, ""):
                setattr(job, field, None)
            else:
                try:
                    setattr(job, field, int(raw))
                except (TypeError, ValueError):
                    return jsonify({"message": f"{field} must be a number"}), 400

    for field in ["salary_min", "salary_max"]:
        if field in data:
            raw = data.get(field)
            if raw in (None, ""):
                setattr(job, field, None)
            else:
                try:
                    setattr(job, field, int(raw))
                except (TypeError, ValueError):
                    return jsonify({"message": f"{field} must be a number"}), 400

    if not job.title or not job.description:
        return jsonify({"message": "Title and description are required"}), 400

    db.session.commit()
    state = JobPostingState.query.get(job.id)
    return jsonify(serialize_job(job, state))


@jobs_bp.delete("/<int:job_id>")
@role_required("recruiter")
def delete_job(job_id: int):
    job = Job.query.get(job_id)
    if not job:
        return jsonify({"message": "Job not found"}), 404

    user_id = int(get_jwt_identity())
    if job.recruiter_id != user_id:
        return jsonify({"message": "Forbidden"}), 403

    db.session.delete(job)
    db.session.commit()
    return jsonify({"message": "Deleted"})


@jobs_bp.patch("/<int:job_id>/state")
@role_required("recruiter")
def set_job_state(job_id: int):
    job = Job.query.get(job_id)
    if not job:
        return jsonify({"message": "Job not found"}), 404

    user_id = int(get_jwt_identity())
    if job.recruiter_id != user_id:
        return jsonify({"message": "Forbidden"}), 403

    data = request.get_json(silent=True) or {}
    if "is_open" not in data:
        return jsonify({"message": "is_open is required"}), 400

    is_open = bool(data.get("is_open"))
    state = JobPostingState.query.get(job.id)
    if not state:
        state = JobPostingState(job_id=job.id)
        db.session.add(state)

    state.is_open = is_open
    state.closed_at = None if is_open else datetime.utcnow()
    db.session.commit()

    return jsonify({"job_id": job.id, "is_open": state.is_open, "closed_at": state.closed_at.isoformat() if state.closed_at else None})
