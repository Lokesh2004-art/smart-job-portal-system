from datetime import datetime

from werkzeug.security import check_password_hash, generate_password_hash

from .extensions import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # seeker | recruiter
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    seeker_profile = db.relationship("SeekerProfile", back_populates="user", uselist=False)
    recruiter_profile = db.relationship(
        "RecruiterProfile", back_populates="user", uselist=False
    )

    jobs = db.relationship("Job", back_populates="recruiter", cascade="all, delete")
    applications = db.relationship(
        "Application", back_populates="seeker", cascade="all, delete"
    )

    def set_password(self, password: str):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)


class SeekerProfile(db.Model):
    __tablename__ = "seeker_profiles"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), unique=True)

    full_name = db.Column(db.String(120), nullable=True)
    phone = db.Column(db.String(30), nullable=True)
    location = db.Column(db.String(120), nullable=True)
    skills = db.Column(db.Text, nullable=True)  # comma-separated
    expected_salary = db.Column(db.Integer, nullable=True)
    summary = db.Column(db.Text, nullable=True)
    resume_filename = db.Column(db.String(255), nullable=True)

    user = db.relationship("User", back_populates="seeker_profile")


class RecruiterProfile(db.Model):
    __tablename__ = "recruiter_profiles"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), unique=True)

    company_name = db.Column(db.String(150), nullable=True)
    company_website = db.Column(db.String(255), nullable=True)
    company_location = db.Column(db.String(120), nullable=True)
    about = db.Column(db.Text, nullable=True)

    user = db.relationship("User", back_populates="recruiter_profile")


class Job(db.Model):
    __tablename__ = "jobs"

    id = db.Column(db.Integer, primary_key=True)
    recruiter_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    title = db.Column(db.String(160), nullable=False)
    description = db.Column(db.Text, nullable=False)
    location = db.Column(db.String(120), nullable=True)
    skills_required = db.Column(db.Text, nullable=True)  # comma-separated
    salary_min = db.Column(db.Integer, nullable=True)
    salary_max = db.Column(db.Integer, nullable=True)
    job_type = db.Column(db.String(50), nullable=True)  # Full-time, Part-time, Contract...
    experience_min = db.Column(db.Integer, nullable=True)
    experience_max = db.Column(db.Integer, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    recruiter = db.relationship("User", back_populates="jobs")
    applications = db.relationship(
        "Application", back_populates="job", cascade="all, delete-orphan"
    )


class Application(db.Model):
    __tablename__ = "applications"

    id = db.Column(db.Integer, primary_key=True)
    job_id = db.Column(db.Integer, db.ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    seeker_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    cover_letter = db.Column(db.Text, nullable=True)
    resume_filename = db.Column(db.String(255), nullable=True)
    status = db.Column(db.String(30), default="applied", nullable=False)
    applied_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (db.UniqueConstraint("job_id", "seeker_id", name="uq_job_seeker"),)

    job = db.relationship("Job", back_populates="applications")
    seeker = db.relationship("User", back_populates="applications")


class SavedJob(db.Model):
    __tablename__ = "saved_jobs"

    id = db.Column(db.Integer, primary_key=True)
    seeker_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    job_id = db.Column(db.Integer, db.ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (db.UniqueConstraint("seeker_id", "job_id", name="uq_savedjob_seeker_job"),)


class JobPostingState(db.Model):
    __tablename__ = "job_posting_states"

    job_id = db.Column(db.Integer, db.ForeignKey("jobs.id", ondelete="CASCADE"), primary_key=True)
    is_open = db.Column(db.Boolean, default=True, nullable=False)
    closed_at = db.Column(db.DateTime, nullable=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class ApplicationStatusEvent(db.Model):
    __tablename__ = "application_status_events"

    id = db.Column(db.Integer, primary_key=True)
    application_id = db.Column(db.Integer, db.ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    old_status = db.Column(db.String(30), nullable=True)
    new_status = db.Column(db.String(30), nullable=False)
    changed_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    changed_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class Notification(db.Model):
    __tablename__ = "notifications"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = db.Column(db.String(40), nullable=False)  # application_status, system
    message = db.Column(db.String(255), nullable=False)
    job_id = db.Column(db.Integer, db.ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True)
    application_id = db.Column(db.Integer, db.ForeignKey("applications.id", ondelete="SET NULL"), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    read_at = db.Column(db.DateTime, nullable=True)


class Comment(db.Model):
    __tablename__ = "comments"

    id = db.Column(db.Integer, primary_key=True)
    application_id = db.Column(db.Integer, db.ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    author_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    text = db.Column(db.Text, nullable=False)
    is_private = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    author = db.relationship("User")
    application = db.relationship("Application", backref="comments")


class Shortlist(db.Model):
    __tablename__ = "shortlists"

    id = db.Column(db.Integer, primary_key=True)
    job_id = db.Column(db.Integer, db.ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    name = db.Column(db.String(150), nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    is_shared = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    items = db.relationship("ShortlistItem", back_populates="shortlist", cascade="all, delete-orphan")
    members = db.relationship("ShortlistMember", back_populates="shortlist", cascade="all, delete-orphan")


class ShortlistItem(db.Model):
    __tablename__ = "shortlist_items"

    id = db.Column(db.Integer, primary_key=True)
    shortlist_id = db.Column(db.Integer, db.ForeignKey("shortlists.id", ondelete="CASCADE"), nullable=False)
    application_id = db.Column(db.Integer, db.ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    added_by = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    added_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    shortlist = db.relationship("Shortlist", back_populates="items")
    application = db.relationship("Application")


class ShortlistMember(db.Model):
    __tablename__ = "shortlist_members"

    id = db.Column(db.Integer, primary_key=True)
    shortlist_id = db.Column(db.Integer, db.ForeignKey("shortlists.id", ondelete="CASCADE"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = db.Column(db.String(30), default="viewer", nullable=False)
    added_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    shortlist = db.relationship("Shortlist", back_populates="members")
    user = db.relationship("User")


class Message(db.Model):
    __tablename__ = "messages"

    id = db.Column(db.Integer, primary_key=True)
    application_id = db.Column(db.Integer, db.ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    sender_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    receiver_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    text = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    sender = db.relationship("User", foreign_keys=[sender_id])
    receiver = db.relationship("User", foreign_keys=[receiver_id])
    application = db.relationship("Application", backref="messages")
