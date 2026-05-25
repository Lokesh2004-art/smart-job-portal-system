from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity, get_jwt

from ..extensions import db
from ..models import (
    Comment,
    Shortlist,
    ShortlistItem,
    ShortlistMember,
    Application,
    Job,
    User,
)
from ..utils.decorators import role_required


collab_bp = Blueprint("collab", __name__)


@collab_bp.post("/comments")
@role_required("recruiter", "admin")
def create_comment():
    user_id = int(get_jwt_identity())
    claims = get_jwt() or {}
    payload = request.get_json(silent=True) or {}
    application_id = payload.get("application_id")
    text = (payload.get("text") or "").strip()
    is_private = bool(payload.get("is_private"))

    if not application_id or not text:
        return jsonify({"message": "application_id and text required"}), 400

    app_row = Application.query.get(application_id)
    if not app_row:
        return jsonify({"message": "Application not found"}), 404

    # only the recruiter who owns the job (or admin) can comment here
    job = app_row.job
    if not job:
        return jsonify({"message": "Job not found"}), 404
    if claims.get("role") != "admin" and job.recruiter_id != user_id:
        return jsonify({"message": "Forbidden"}), 403

    comment = Comment(application_id=application_id, author_id=user_id, text=text, is_private=is_private)
    db.session.add(comment)
    db.session.commit()

    return jsonify({"message": "Comment added", "comment_id": comment.id}), 201


@collab_bp.get("/comments/<int:application_id>")
@role_required("recruiter", "admin", "seeker")
def list_comments(application_id: int):
    # allow seeker to view their own application comments (non-private)
    from flask_jwt_extended import verify_jwt_in_request

    verify_jwt_in_request()
    claims = get_jwt() or {}
    user_id = int(get_jwt_identity())
    role = claims.get("role")

    app_row = Application.query.get(application_id)
    if not app_row:
        return jsonify({"message": "Application not found"}), 404

    if role == "seeker" and app_row.seeker_id != user_id:
        return jsonify({"message": "Forbidden"}), 403
    if role == "recruiter" and app_row.job and app_row.job.recruiter_id != user_id:
        return jsonify({"message": "Forbidden"}), 403

    comments = Comment.query.filter_by(application_id=application_id).order_by(Comment.created_at.desc()).all()
    result = []
    for c in comments:
        if c.is_private and role == "seeker":
            continue
        result.append({
            "id": c.id,
            "application_id": c.application_id,
            "author_id": c.author_id,
            "text": c.text,
            "is_private": c.is_private,
            "created_at": c.created_at.isoformat(),
        })

    return jsonify(result)


@collab_bp.post("/shortlists")
@role_required("recruiter", "admin")
def create_shortlist():
    user_id = int(get_jwt_identity())
    payload = request.get_json(silent=True) or {}
    job_id = payload.get("job_id")
    name = (payload.get("name") or "").strip() or "Default"
    is_shared = bool(payload.get("is_shared", True))
    members = payload.get("members") or []

    if not job_id:
        return jsonify({"message": "job_id required"}), 400

    job = Job.query.get(job_id)
    if not job:
        return jsonify({"message": "Job not found"}), 404
    if job.recruiter_id != user_id:
        return jsonify({"message": "Forbidden"}), 403

    sl = Shortlist(job_id=job_id, name=name, created_by=user_id, is_shared=is_shared)
    db.session.add(sl)
    db.session.flush()

    for m in members:
        # members can be user ids or email addresses
        uid = None
        try:
            uid = int(m)
        except Exception:
            # try email lookup
            if isinstance(m, str) and "@" in m:
                user = User.query.filter_by(email=m.strip().lower()).first()
                if user:
                    uid = user.id
        if uid:
            db.session.add(ShortlistMember(shortlist_id=sl.id, user_id=uid))

    db.session.commit()
    return jsonify({"message": "Shortlist created", "shortlist_id": sl.id}), 201


@collab_bp.get("/shortlists/<int:job_id>")
@role_required("recruiter", "admin")
def list_shortlists(job_id: int):
    user_id = int(get_jwt_identity())
    job = Job.query.get(job_id)
    if not job:
        return jsonify({"message": "Job not found"}), 404
    if job.recruiter_id != user_id:
        return jsonify({"message": "Forbidden"}), 403

    sls = Shortlist.query.filter_by(job_id=job_id).all()
    out = []
    for s in sls:
        out.append({
            "id": s.id,
            "name": s.name,
            "created_at": s.created_at.isoformat(),
            "is_shared": s.is_shared,
            "items_count": len(s.items),
        })
    return jsonify(out)


@collab_bp.post("/shortlists/<int:shortlist_id>/items")
@role_required("recruiter", "admin")
def add_shortlist_item(shortlist_id: int):
    user_id = int(get_jwt_identity())
    payload = request.get_json(silent=True) or {}
    application_id = payload.get("application_id")

    sl = Shortlist.query.get(shortlist_id)
    if not sl:
        return jsonify({"message": "Shortlist not found"}), 404

    job = Job.query.get(sl.job_id)
    if not job or job.recruiter_id != user_id:
        return jsonify({"message": "Forbidden"}), 403

    app_row = Application.query.get(application_id)
    if not app_row:
        return jsonify({"message": "Application not found"}), 404

    # prevent duplicates
    exists = ShortlistItem.query.filter_by(shortlist_id=shortlist_id, application_id=application_id).first()
    if exists:
        return jsonify({"message": "Already in shortlist"}), 200

    item = ShortlistItem(shortlist_id=shortlist_id, application_id=application_id, added_by=user_id)
    db.session.add(item)
    db.session.commit()

    return jsonify({"message": "Added", "item_id": item.id}), 201


@collab_bp.post("/shortlists/<int:shortlist_id>/members")
@role_required("recruiter", "admin")
def add_shortlist_member(shortlist_id: int):
    user_id = int(get_jwt_identity())
    payload = request.get_json(silent=True) or {}
    user_identifier = payload.get("user_id") or payload.get("email")

    sl = Shortlist.query.get(shortlist_id)
    if not sl:
        return jsonify({"message": "Shortlist not found"}), 404

    job = Job.query.get(sl.job_id)
    if not job or job.recruiter_id != user_id:
        return jsonify({"message": "Forbidden"}), 403

    target_uid = None
    if isinstance(user_identifier, int):
        target_uid = user_identifier
    else:
        if isinstance(user_identifier, str) and "@" in user_identifier:
            user = User.query.filter_by(email=user_identifier.strip().lower()).first()
            if user:
                target_uid = user.id

    if not target_uid:
        return jsonify({"message": "User not found"}), 404

    exists = ShortlistMember.query.filter_by(shortlist_id=shortlist_id, user_id=target_uid).first()
    if exists:
        return jsonify({"message": "Member already exists"}), 200

    member = ShortlistMember(shortlist_id=shortlist_id, user_id=target_uid)
    db.session.add(member)
    db.session.commit()

    return jsonify({"message": "Member added", "member_id": member.id}), 201
