from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity
from typing import Optional

from ..extensions import db
from ..models import Job, SavedJob
from ..utils.decorators import role_required


saved_jobs_bp = Blueprint("saved_jobs", __name__)


def serialize_saved(saved: SavedJob, job: Optional[Job]):
    return {
        "id": saved.id,
        "job_id": saved.job_id,
        "created_at": saved.created_at.isoformat(),
        "job": {
            "id": job.id,
            "recruiter_id": job.recruiter_id,
            "title": job.title,
            "description": job.description,
            "location": job.location,
            "skills_required": job.skills_required,
            "salary_min": job.salary_min,
            "salary_max": job.salary_max,
            "job_type": job.job_type,
            "created_at": job.created_at.isoformat(),
            "updated_at": job.updated_at.isoformat() if job.updated_at else None,
        }
        if job
        else None,
    }


@saved_jobs_bp.get("/saved-jobs")
@role_required("seeker")
def list_saved_jobs():
    seeker_id = int(get_jwt_identity())

    rows = (
        SavedJob.query.filter_by(seeker_id=seeker_id)
        .order_by(SavedJob.created_at.desc())
        .limit(200)
        .all()
    )

    jobs = Job.query.filter(Job.id.in_([r.job_id for r in rows]) if rows else False).all()
    job_by_id = {j.id: j for j in jobs}

    return jsonify([serialize_saved(r, job_by_id.get(r.job_id)) for r in rows])


@saved_jobs_bp.get("/saved-jobs/ids")
@role_required("seeker")
def list_saved_job_ids():
    seeker_id = int(get_jwt_identity())
    ids = [r.job_id for r in SavedJob.query.filter_by(seeker_id=seeker_id).all()]
    return jsonify({"job_ids": ids})


@saved_jobs_bp.post("/saved-jobs/<int:job_id>")
@role_required("seeker")
def save_job(job_id: int):
    seeker_id = int(get_jwt_identity())

    job = Job.query.get(job_id)
    if not job:
        return jsonify({"message": "Job not found"}), 404

    existing = SavedJob.query.filter_by(seeker_id=seeker_id, job_id=job_id).first()
    if existing:
        return jsonify({"message": "Already saved"}), 200

    row = SavedJob(seeker_id=seeker_id, job_id=job_id)
    db.session.add(row)
    db.session.commit()

    return jsonify({"message": "Saved"}), 201


@saved_jobs_bp.delete("/saved-jobs/<int:job_id>")
@role_required("seeker")
def unsave_job(job_id: int):
    seeker_id = int(get_jwt_identity())

    row = SavedJob.query.filter_by(seeker_id=seeker_id, job_id=job_id).first()
    if not row:
        return jsonify({"message": "Not saved"}), 404

    db.session.delete(row)
    db.session.commit()
    return jsonify({"message": "Removed"})
