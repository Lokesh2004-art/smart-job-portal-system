from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt

from ..extensions import db
from ..models import RecruiterProfile, SeekerProfile, User


auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/register")
def register():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    role = (data.get("role") or "").strip().lower()

    if not email or not password or role not in {"seeker", "recruiter"}:
        return jsonify({"message": "Invalid registration data"}), 400
    if len(password) < 6:
        return jsonify({"message": "Password must be at least 6 characters"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"message": "Email already registered"}), 409

    user = User(email=email, role=role)
    user.set_password(password)
    db.session.add(user)
    db.session.flush()

    if role == "seeker":
        db.session.add(SeekerProfile(user_id=user.id))
    else:
        db.session.add(RecruiterProfile(user_id=user.id))

    db.session.commit()

    return jsonify({"message": "Registered successfully"}), 201


@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"message": "Invalid credentials"}), 401

    admin_emails = set((current_app.config.get("ADMIN_EMAILS") or []))
    role_claim = "admin" if user.email in admin_emails else user.role
    token = create_access_token(identity=str(user.id), additional_claims={"role": role_claim})

    return jsonify(
        {
            "access_token": token,
            "user": {"id": user.id, "email": user.email, "role": role_claim},
        }
    )


@auth_bp.get("/me")
@jwt_required()
def me():
    user_id = int(get_jwt_identity())
    claims = get_jwt()

    user = User.query.get(user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404

    return jsonify({"id": user.id, "email": user.email, "role": claims.get("role")})
