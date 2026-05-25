import sys
import os
from datetime import datetime, timedelta

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from app.extensions import db
from app.models import User, SeekerProfile, RecruiterProfile, Job, Application, Notification


def make_user(email, role, password='password'):
    u = User.query.filter_by(email=email).first()
    if u:
        return u
    u = User(email=email, role=role)
    u.set_password(password)
    db.session.add(u)
    db.session.flush()
    if role == 'seeker':
        db.session.add(SeekerProfile(user_id=u.id, full_name='Demo Seeker'))
    else:
        db.session.add(RecruiterProfile(user_id=u.id, company_name='Demo Co'))
    db.session.commit()
    return u


def seed():
    app = create_app()
    with app.app_context():
        # create recruiter
        rec = make_user('demo_recruiter@example.com', 'recruiter')

        # create seeker
        seeker = make_user('demo_seeker@example.com', 'seeker')

        # create a job if none
        job = Job.query.filter_by(title='Demo Frontend Developer').first()
        if not job:
            job = Job(
                recruiter_id=rec.id,
                title='Demo Frontend Developer',
                description='Build modern UIs',
                location='Hyderabad',
                job_type='Full-time',
            )
            db.session.add(job)
            db.session.commit()

        # create an application
        existing = Application.query.filter_by(job_id=job.id, seeker_id=seeker.id).first()
        if not existing:
            app_row = Application(job_id=job.id, seeker_id=seeker.id, status='applied')
            db.session.add(app_row)
            db.session.commit()
        else:
            app_row = existing

        # create a demo notification for the seeker
        n = Notification(user_id=seeker.id, type='system', message=f'You have applied to {job.title}', job_id=job.id, application_id=app_row.id)
        db.session.add(n)
        db.session.commit()

        print('Seeded demo data:')
        print(' recruiter:', rec.email)
        print(' seeker:', seeker.email)
        print(' job id:', job.id)
        print(' application id:', app_row.id)
        print(' notification id:', n.id)


if __name__ == '__main__':
    seed()
