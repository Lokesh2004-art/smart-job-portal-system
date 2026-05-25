from flask import Flask, jsonify
from flask_cors import CORS

from .config import Config
from .extensions import db, jwt


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config())

    CORS(
        app,
        resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}},
        supports_credentials=False,
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )

    db.init_app(app)
    jwt.init_app(app)

    with app.app_context():
        # Ensure model metadata is registered before creating tables.
        from . import models  # noqa: F401
        db.create_all()

        seed_email = (app.config.get("ADMIN_SEED_EMAIL") or "").strip().lower() or None
        seed_password = app.config.get("ADMIN_SEED_PASSWORD")
        if seed_email and seed_password:
            from .models import RecruiterProfile, User

            existing = User.query.filter_by(email=seed_email).first()
            if not existing:
                user = User(email=seed_email, role="recruiter")
                user.set_password(seed_password)
                db.session.add(user)
                db.session.flush()
                db.session.add(RecruiterProfile(user_id=user.id))
                db.session.commit()

            admin_emails = set((app.config.get("ADMIN_EMAILS") or []))
            if seed_email not in admin_emails:
                app.config["ADMIN_EMAILS"] = sorted(list(admin_emails | {seed_email}))

    from .routes.auth import auth_bp
    from .routes.jobs import jobs_bp
    from .routes.profiles import profiles_bp
    from .routes.applications import applications_bp
    from .routes.saved_jobs import saved_jobs_bp
    from .routes.notifications import notifications_bp
    from .routes.admin import admin_bp
    from .routes.recruiter_metrics import recruiter_bp
    from .routes.collab import collab_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(jobs_bp, url_prefix="/api/jobs")
    app.register_blueprint(profiles_bp, url_prefix="/api/profile")
    app.register_blueprint(applications_bp, url_prefix="/api")
    app.register_blueprint(saved_jobs_bp, url_prefix="/api")
    app.register_blueprint(notifications_bp, url_prefix="/api")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(recruiter_bp, url_prefix="/api/recruiter")
    app.register_blueprint(collab_bp, url_prefix="/api/collab")

    @app.get("/api/health")
    def health():
        return {"status": "ok"}

    @app.errorhandler(404)
    def not_found(_):
        return jsonify({"message": "Not found"}), 404

    return app
