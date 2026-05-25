import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from app.extensions import db
from app.models import Application, Notification

app = create_app()
with app.app_context():
    app_row = Application.query.order_by(Application.applied_at.desc()).first()
    if not app_row:
        print('No applications found. Apply to a job first.')
    else:
        job_title = app_row.job.title if app_row.job else f'Job #{app_row.job_id}'
        msg = f"Your application for '{job_title}' is now rejected."
        n = Notification(user_id=app_row.seeker_id, type='application_status', message=msg, job_id=app_row.job_id, application_id=app_row.id)
        db.session.add(n)
        db.session.commit()
        print('Created notification id=', n.id)
        print('seeker_id=', n.user_id)
        print('message=', n.message)
        print('You can refresh the seeker dashboard to view it and delete it via the UI.')
