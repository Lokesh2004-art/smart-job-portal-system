from flask import Blueprint, jsonify, request

from ..extensions import db
from ..models import Application, Job, User
from ..utils.decorators import role_required


admin_bp = Blueprint("admin", __name__)


def serialize_user(u: User):
    return {
        "id": u.id,
        "email": u.email,
        "role": u.role,
        "created_at": u.created_at.isoformat(),
    }


def serialize_job(j: Job):
    return {
        "id": j.id,
        "recruiter_id": j.recruiter_id,
        "title": j.title,
        "location": j.location,
        "job_type": j.job_type,
        "created_at": j.created_at.isoformat(),
    }


def serialize_application(a: Application):
    return {
        "id": a.id,
        "job_id": a.job_id,
        "seeker_id": a.seeker_id,
        "status": a.status,
        "applied_at": a.applied_at.isoformat(),
    }


@admin_bp.get("/overview")
@role_required("admin")
def overview():
    return jsonify(
        {
            "users": User.query.count(),
            "jobs": Job.query.count(),
            "applications": Application.query.count(),
        }
    )


@admin_bp.get("/users")
@role_required("admin")
def list_users():
    limit = min(int(request.args.get("limit", 50)), 200)
    rows = User.query.order_by(User.created_at.desc()).limit(limit).all()
    return jsonify([serialize_user(u) for u in rows])


@admin_bp.delete("/users/<int:user_id>")
@role_required("admin")
def delete_user(user_id: int):
    u = User.query.get(user_id)
    if not u:
        return jsonify({"message": "User not found"}), 404

    db.session.delete(u)
    db.session.commit()
    return jsonify({"message": "Deleted"})


@admin_bp.get("/jobs")
@role_required("admin")
def list_jobs():
    limit = min(int(request.args.get("limit", 50)), 200)
    rows = Job.query.order_by(Job.created_at.desc()).limit(limit).all()
    return jsonify([serialize_job(j) for j in rows])


@admin_bp.delete("/jobs/<int:job_id>")
@role_required("admin")
def delete_job(job_id: int):
    j = Job.query.get(job_id)
    if not j:
        return jsonify({"message": "Job not found"}), 404

    db.session.delete(j)
    db.session.commit()
    return jsonify({"message": "Deleted"})


@admin_bp.get("/applications")
@role_required("admin")
def list_applications():
    limit = min(int(request.args.get("limit", 50)), 200)
    rows = Application.query.order_by(Application.applied_at.desc()).limit(limit).all()
    return jsonify([serialize_application(a) for a in rows])


@admin_bp.delete("/applications/<int:application_id>")
@role_required("admin")
def delete_application(application_id: int):
    a = Application.query.get(application_id)
    if not a:
        return jsonify({"message": "Application not found"}), 404

    db.session.delete(a)
    db.session.commit()
    return jsonify({"message": "Deleted"})
