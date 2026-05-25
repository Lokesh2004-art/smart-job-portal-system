import os
from datetime import datetime

from flask import Blueprint, current_app, jsonify, request, send_from_directory
from flask_jwt_extended import get_jwt, get_jwt_identity

from ..extensions import db
from ..models import (
    Application,
    ApplicationStatusEvent,
    Job,
    JobPostingState,
    Notification,
    Message,
    User,
)
from ..utils.decorators import role_required
from ..utils.file_upload import allowed_file, save_resume


applications_bp = Blueprint("applications", __name__)


ALLOWED_APPLICATION_STATUSES = {
    "applied",
    "shortlisted",
    "interview",
    "rejected",
    "hired",
    "withdrawn",
}


def serialize_application(app: Application):
    last_event = (
        ApplicationStatusEvent.query.filter_by(application_id=app.id)
        .order_by(ApplicationStatusEvent.changed_at.desc())
        .first()
    )
    return {
        "id": app.id,
        "job_id": app.job_id,
        "seeker_id": app.seeker_id,
        "cover_letter": app.cover_letter,
        "resume_filename": app.resume_filename,
        "status": app.status,
        "applied_at": app.applied_at.isoformat(),
        "status_updated_at": (
            last_event.changed_at.isoformat() if last_event else app.applied_at.isoformat()
        ),
        "job": {
            "id": app.job.id,
            "title": app.job.title,
            "location": app.job.location,
            "skills_required": app.job.skills_required,
            "salary_min": app.job.salary_min,
            "salary_max": app.job.salary_max,
            "job_type": app.job.job_type,
        }
        if app.job
        else None,
    }


@applications_bp.post("/jobs/<int:job_id>/apply")
@role_required("seeker")
def apply(job_id: int):
    user_id = int(get_jwt_identity())

    user = User.query.get(user_id)
    profile = user.seeker_profile if user else None
    missing = []
    if not profile or not (profile.full_name or '').strip():
        missing.append('full_name')
    if not profile or not (profile.phone or '').strip():
        missing.append('phone')
    if not profile or not (profile.location or '').strip():
        missing.append('location')
    if not profile or not (profile.skills or '').strip():
        missing.append('skills')
    if missing:
        return (
            jsonify(
                {
                    "message": "Complete your profile before applying.",
                    "missing_fields": missing,
                }
            ),
            400,
        )

    job = Job.query.get(job_id)
    if not job:
        return jsonify({"message": "Job not found"}), 404

    state = JobPostingState.query.get(job.id)
    if state and not state.is_open:
        return jsonify({"message": "This job is closed"}), 400

    if Application.query.filter_by(job_id=job_id, seeker_id=user_id).first():
        return jsonify({"message": "You already applied to this job"}), 409

    cover_letter = (request.form.get("cover_letter") or "").strip() or None

    resume_filename = None
    if "resume" in request.files:
        file = request.files["resume"]
        if file and file.filename:
            if not allowed_file(file.filename):
                return jsonify({"message": "Resume must be pdf/doc/docx"}), 400
            upload_dir = os.path.join(current_app.root_path, "..", current_app.config["UPLOAD_FOLDER"], "resumes")
            resume_filename = save_resume(file, upload_dir)

    if not resume_filename and profile and profile.resume_filename:
        resume_filename = profile.resume_filename

    application = Application(
        job_id=job_id,
        seeker_id=user_id,
        cover_letter=cover_letter,
        resume_filename=resume_filename,
    )

    db.session.add(application)
    db.session.commit()

    return jsonify({"message": "Applied successfully", "application_id": application.id}), 201


@applications_bp.get("/applications/me")
@role_required("seeker")
def my_applications():
    user_id = int(get_jwt_identity())
    apps = (
        Application.query.filter_by(seeker_id=user_id)
        .join(Job)
        .order_by(Application.applied_at.desc())
        .all()
    )
    return jsonify([serialize_application(a) for a in apps])


@applications_bp.get("/jobs/<int:job_id>/applicants")
@role_required("recruiter")
def job_applicants(job_id: int):
    recruiter_id = int(get_jwt_identity())

    job = Job.query.get(job_id)
    if not job:
        return jsonify({"message": "Job not found"}), 404
    if job.recruiter_id != recruiter_id:
        return jsonify({"message": "Forbidden"}), 403

    apps = (
        Application.query.filter_by(job_id=job_id)
        .join(User)
        .order_by(Application.applied_at.desc())
        .all()
    )

    result = []
    for a in apps:
        seeker = a.seeker
        profile = seeker.seeker_profile
        result.append(
            {
                "application_id": a.id,
                "status": a.status,
                "applied_at": a.applied_at.isoformat(),
                "cover_letter": a.cover_letter,
                "resume_filename": a.resume_filename,
                "seeker": {
                    "id": seeker.id,
                    "email": seeker.email,
                    "full_name": profile.full_name if profile else None,
                    "location": profile.location if profile else None,
                    "skills": profile.skills if profile else None,
                },
            }
        )

    return jsonify({"job": {"id": job.id, "title": job.title}, "applicants": result})


@applications_bp.patch("/applications/<int:application_id>/status")
@role_required("recruiter")
def update_application_status(application_id: int):
    recruiter_id = int(get_jwt_identity())

    payload = request.get_json(silent=True) or {}
    status = (payload.get("status") or "").strip().lower()
    if status not in ALLOWED_APPLICATION_STATUSES:
        return (
            jsonify(
                {
                    "message": "Invalid status",
                    "allowed": sorted(list(ALLOWED_APPLICATION_STATUSES)),
                }
            ),
            400,
        )

    app_row = Application.query.get(application_id)
    if not app_row:
        return jsonify({"message": "Application not found"}), 404

    job = app_row.job
    if not job:
        return jsonify({"message": "Job not found"}), 404
    if job.recruiter_id != recruiter_id:
        return jsonify({"message": "Forbidden"}), 403

    old_status = app_row.status
    if old_status == status:
        return jsonify({"message": "No change", "application": serialize_application(app_row)}), 200

    app_row.status = status
    db.session.add(
        ApplicationStatusEvent(
            application_id=app_row.id,
            old_status=old_status,
            new_status=status,
            changed_by_user_id=recruiter_id,
        )
    )
    db.session.add(
        Notification(
            user_id=app_row.seeker_id,
            type="application_status",
            message=f"Your application for '{job.title}' is now {status}.",
            job_id=job.id,
            application_id=app_row.id,
        )
    )
    db.session.commit()

    return jsonify({"message": "Status updated", "application": serialize_application(app_row)})


@applications_bp.patch("/applications/<int:application_id>/withdraw")
@role_required("seeker")
def withdraw_application(application_id: int):
    seeker_id = int(get_jwt_identity())

    app_row = Application.query.get(application_id)
    if not app_row or app_row.seeker_id != seeker_id:
        return jsonify({"message": "Application not found"}), 404

    if app_row.status in {"hired"}:
        return jsonify({"message": "Cannot withdraw this application"}), 400

    old_status = app_row.status
    if old_status == "withdrawn":
        return jsonify({"message": "Already withdrawn", "application": serialize_application(app_row)}), 200

    app_row.status = "withdrawn"
    db.session.add(
        ApplicationStatusEvent(
            application_id=app_row.id,
            old_status=old_status,
            new_status="withdrawn",
            changed_by_user_id=seeker_id,
        )
    )
    db.session.commit()

    return jsonify({"message": "Withdrawn", "application": serialize_application(app_row)})


@applications_bp.get("/applications/<int:application_id>/history")
def application_history(application_id: int):
    # Protected manually to support both seekers and recruiters with role checks
    from flask_jwt_extended import verify_jwt_in_request

    verify_jwt_in_request()
    claims = get_jwt()
    role = (claims or {}).get("role")
    user_id = int(get_jwt_identity())

    app_row = Application.query.get(application_id)
    if not app_row:
        return jsonify({"message": "Application not found"}), 404

    if role == "seeker" and app_row.seeker_id != user_id:
        return jsonify({"message": "Forbidden"}), 403
    if role == "recruiter" and app_row.job and app_row.job.recruiter_id != user_id:
        return jsonify({"message": "Forbidden"}), 403
    if role == "admin":
        pass
    if role not in {"seeker", "recruiter", "admin"}:
        return jsonify({"message": "Forbidden"}), 403

    events = (
        ApplicationStatusEvent.query.filter_by(application_id=application_id)
        .order_by(ApplicationStatusEvent.changed_at.desc())
        .limit(200)
        .all()
    )

    return jsonify(
        [
            {
                "id": e.id,
                "old_status": e.old_status,
                "new_status": e.new_status,
                "changed_by_user_id": e.changed_by_user_id,
                "changed_at": e.changed_at.isoformat(),
            }
            for e in events
        ]
    )



@applications_bp.get("/applications/<int:application_id>/messages")
def get_application_messages(application_id: int):
    # Protected manually to support both seekers and recruiters with role checks
    from flask_jwt_extended import verify_jwt_in_request

    verify_jwt_in_request()
    claims = get_jwt()
    role = (claims or {}).get("role")
    user_id = int(get_jwt_identity())

    app_row = Application.query.get(application_id)
    if not app_row:
        return jsonify({"message": "Application not found"}), 404

    if role == "seeker" and app_row.seeker_id != user_id:
        return jsonify({"message": "Forbidden"}), 403
    if role == "recruiter" and app_row.job and app_row.job.recruiter_id != user_id:
        return jsonify({"message": "Forbidden"}), 403

    msgs = (
        Message.query.filter_by(application_id=application_id)
        .order_by(Message.created_at.asc())
        .all()
    )

    return jsonify([
        {
            "id": m.id,
            "application_id": m.application_id,
            "sender_id": m.sender_id,
            "receiver_id": m.receiver_id,
            "text": m.text,
            "created_at": m.created_at.isoformat(),
        }
        for m in msgs
    ])


@applications_bp.post("/applications/<int:application_id>/messages")
def post_application_message(application_id: int):
    user_id = int(get_jwt_identity())
    payload = request.get_json(silent=True) or {}
    text = (payload.get("message") or "").strip()
    if not text:
        return jsonify({"message": "Message text is required"}), 400
    if len(text) > 255:
        return jsonify({"message": "Message is too long (max 255 chars)"}), 400

    app_row = Application.query.get(application_id)
    if not app_row:
        return jsonify({"message": "Application not found"}), 404

    job = app_row.job
    if not job:
        return jsonify({"message": "Job not found"}), 404

    # Determine sender and receiver
    sender = User.query.get(user_id)
    if not sender:
        return jsonify({"message": "User not found"}), 404

    # Only the recruiter or the seeker may post
    if sender.role == "recruiter":
        if job.recruiter_id != user_id:
            return jsonify({"message": "Forbidden"}), 403
        receiver_id = app_row.seeker_id
    elif sender.role == "seeker":
        if app_row.seeker_id != user_id:
            return jsonify({"message": "Forbidden"}), 403
        receiver_id = job.recruiter_id
    else:
        return jsonify({"message": "Forbidden"}), 403

    msg = Message(application_id=application_id, sender_id=user_id, receiver_id=receiver_id, text=text)
    db.session.add(msg)
    # also create a notification for receiver
    db.session.add(
        Notification(
            user_id=receiver_id,
            type="message",
            message=text,
            job_id=job.id,
            application_id=app_row.id,
        )
    )
    db.session.commit()

    return (
        jsonify({
            "id": msg.id,
            "application_id": msg.application_id,
            "sender_id": msg.sender_id,
            "receiver_id": msg.receiver_id,
            "text": msg.text,
            "created_at": msg.created_at.isoformat(),
        }),
        201,
    )



@applications_bp.post("/applications/<int:application_id>/message")
@role_required("recruiter")
def message_applicant(application_id: int):
    recruiter_id = int(get_jwt_identity())

    payload = request.get_json(silent=True) or {}
    text = (payload.get("message") or "").strip()
    if not text:
        return jsonify({"message": "Message text is required"}), 400
    if len(text) > 255:
        return jsonify({"message": "Message is too long (max 255 chars)"}), 400

    app_row = Application.query.get(application_id)
    if not app_row:
        return jsonify({"message": "Application not found"}), 404

    job = app_row.job
    if not job:
        return jsonify({"message": "Job not found"}), 404
    if job.recruiter_id != recruiter_id:
        return jsonify({"message": "Forbidden"}), 403

    # Create a visible notification for the seeker
    db.session.add(
        Notification(
            user_id=app_row.seeker_id,
            type="message",
            message=text,
            job_id=job.id,
            application_id=app_row.id,
        )
    )
    db.session.commit()

    return jsonify({"message": "Message sent"}), 201


@applications_bp.patch('/jobs/<int:job_id>/applications/bulk-status')
@role_required('recruiter')
def bulk_update_applications(job_id: int):
    recruiter_id = int(get_jwt_identity())
    payload = request.get_json(silent=True) or {}
    ids = payload.get('application_ids') or []
    status = (payload.get('status') or '').strip().lower()

    if not ids or not isinstance(ids, list):
        return jsonify({'message': 'application_ids must be a non-empty list'}), 400
    if status not in ALLOWED_APPLICATION_STATUSES:
        return jsonify({'message': 'Invalid status', 'allowed': sorted(list(ALLOWED_APPLICATION_STATUSES))}), 400

    # verify job exists and belongs to recruiter
    job = Job.query.get(job_id)
    if not job:
        return jsonify({'message': 'Job not found'}), 404
    if job.recruiter_id != recruiter_id:
        return jsonify({'message': 'Forbidden'}), 403

    apps = Application.query.filter(Application.id.in_(ids), Application.job_id == job_id).all()
    updated = []
    for a in apps:
        old = a.status
        if old == status:
            continue
        a.status = status
        db.session.add(ApplicationStatusEvent(application_id=a.id, old_status=old, new_status=status, changed_by_user_id=recruiter_id))
        db.session.add(Notification(user_id=a.seeker_id, type='application_status', message=f"Your application for '{job.title}' is now {status}.", job_id=job.id, application_id=a.id))
        updated.append(a.id)

    db.session.commit()
    return jsonify({'message': 'Bulk update complete', 'updated': updated})


@applications_bp.get("/applications/<int:application_id>/resume")
def download_resume(application_id: int):
    # Protected manually to support both seekers and recruiters with role checks
    from flask_jwt_extended import verify_jwt_in_request

    verify_jwt_in_request()
    claims = get_jwt()
    role = (claims or {}).get("role")
    user_id = int(get_jwt_identity())

    app_row = Application.query.get(application_id)
    if not app_row:
        return jsonify({"message": "Application not found"}), 404
    if not app_row.resume_filename:
        return jsonify({"message": "No resume uploaded"}), 404

    if role == "seeker" and app_row.seeker_id != user_id:
        return jsonify({"message": "Forbidden"}), 403
    if role == "recruiter" and app_row.job and app_row.job.recruiter_id != user_id:
        return jsonify({"message": "Forbidden"}), 403

    upload_dir = os.path.join(current_app.root_path, "..", current_app.config["UPLOAD_FOLDER"], "resumes")
    return send_from_directory(upload_dir, app_row.resume_filename, as_attachment=True)
