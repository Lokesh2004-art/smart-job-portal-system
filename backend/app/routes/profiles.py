import os

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from ..extensions import db
from ..models import RecruiterProfile, SeekerProfile, User
from ..utils.decorators import role_required
from ..utils.file_upload import allowed_file, save_resume


profiles_bp = Blueprint("profiles", __name__)


@profiles_bp.get("")
@jwt_required()
def get_profile():
    user_id = int(get_jwt_identity())
    role = (get_jwt() or {}).get("role")

    user = User.query.get(user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404

    if role == "seeker":
        p = user.seeker_profile
        return jsonify(
            {
                "role": role,
                "email": user.email,
                "full_name": p.full_name,
                "phone": p.phone,
                "location": p.location,
                "skills": p.skills,
                "expected_salary": p.expected_salary,
                "summary": p.summary,
                "resume_filename": p.resume_filename,
            }
        )

    p = user.recruiter_profile
    return jsonify(
        {
            "role": role,
            "email": user.email,
            "company_name": p.company_name,
            "company_website": p.company_website,
            "company_location": p.company_location,
            "about": p.about,
        }
    )


@profiles_bp.put("")
@jwt_required()
def update_profile():
    user_id = int(get_jwt_identity())
    role = (get_jwt() or {}).get("role")

    data = request.get_json(silent=True) or {}

    user = User.query.get(user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404

    if role == "seeker":
        p: SeekerProfile = user.seeker_profile
        for field in ["full_name", "phone", "location", "skills", "summary"]:
            if field in data:
                setattr(p, field, (data.get(field) or "").strip() or None)
        if "expected_salary" in data:
            raw = data.get("expected_salary")
            if raw in (None, ""):
                p.expected_salary = None
            else:
                try:
                    p.expected_salary = int(raw)
                except (TypeError, ValueError):
                    return jsonify({"message": "expected_salary must be a number"}), 400
        db.session.commit()
        return jsonify({"message": "Profile updated"})

    p: RecruiterProfile = user.recruiter_profile
    for field in ["company_name", "company_website", "company_location", "about"]:
        if field in data:
            setattr(p, field, (data.get(field) or "").strip() or None)

    db.session.commit()
    return jsonify({"message": "Profile updated"})


@profiles_bp.post("/resume")
@role_required("seeker")
def upload_resume():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or not user.seeker_profile:
        return jsonify({"message": "User not found"}), 404

    if "resume" not in request.files:
        return jsonify({"message": "Resume file is required"}), 400

    file = request.files["resume"]
    if not file or not file.filename:
        return jsonify({"message": "Resume file is required"}), 400
    if not allowed_file(file.filename):
        return jsonify({"message": "Resume must be pdf/doc/docx"}), 400

    upload_dir = os.path.join(
        current_app.root_path, "..", current_app.config["UPLOAD_FOLDER"], "resumes"
    )
    filename = save_resume(file, upload_dir)
    user.seeker_profile.resume_filename = filename
    db.session.commit()

    return jsonify({"message": "Resume uploaded", "resume_filename": filename})
