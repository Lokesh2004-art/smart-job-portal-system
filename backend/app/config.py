import os
from dataclasses import dataclass
from datetime import timedelta

from dotenv import load_dotenv


@dataclass
class Config:
    def __post_init__(self):
        load_dotenv()

        # In production, set these via environment variables.
        # For local development, fall back to non-empty defaults so the server can start.
        self.SECRET_KEY = os.getenv("SECRET_KEY") or "dev-secret"
        self.JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY") or "dev-jwt-secret"

        # Database
        # Preferred: explicit DB_URL (MySQL recommended for this project)
        db_url = os.getenv("DB_URL")
        if db_url:
            self.SQLALCHEMY_DATABASE_URI = db_url
        else:
            db_host = os.getenv("DB_HOST")
            db_port = os.getenv("DB_PORT", "3306")
            db_user = os.getenv("DB_USER")
            db_password = os.getenv("DB_PASSWORD")
            db_name = os.getenv("DB_NAME")

            if all([db_host, db_user, db_password, db_name]):
                self.SQLALCHEMY_DATABASE_URI = (
                    f"mysql+pymysql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
                )
            else:
                # Fallback for local demo/dev when MySQL is not configured.
                # This keeps the API reachable so the frontend can be tested.
                self.SQLALCHEMY_DATABASE_URI = "sqlite:///dev.db"

        self.SQLALCHEMY_TRACK_MODIFICATIONS = False

        cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173")
        self.CORS_ORIGINS = [origin.strip() for origin in cors_origins.split(",") if origin.strip()]

        admin_emails = os.getenv("ADMIN_EMAILS", "")
        self.ADMIN_EMAILS = [email.strip().lower() for email in admin_emails.split(",") if email.strip()]

        self.ADMIN_SEED_EMAIL = (os.getenv("ADMIN_SEED_EMAIL") or "").strip().lower() or None
        self.ADMIN_SEED_PASSWORD = os.getenv("ADMIN_SEED_PASSWORD") or None

        self.UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "uploads")
        self.MAX_CONTENT_LENGTH = int(os.getenv("MAX_CONTENT_LENGTH_MB", "10")) * 1024 * 1024

        self.JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)

        admin_emails = os.getenv("ADMIN_EMAILS", "")
        self.ADMIN_EMAILS = [e.strip().lower() for e in admin_emails.split(",") if e.strip()]
