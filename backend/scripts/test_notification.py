import sys
import os

# Ensure project root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from app.extensions import db
from app.models import User, Notification

app = create_app()
with app.app_context():
    # find any seeker user
    seeker = User.query.filter_by(role='seeker').first()
    if not seeker:
        print('No seeker user found; create one via /api/auth/register first.')
    else:
        n = Notification(user_id=seeker.id, type='system', message='Test notification for deletion', job_id=None, application_id=None)
        db.session.add(n)
        db.session.commit()
        print('Created notification id=', n.id)

        # confirm exists
        found = Notification.query.get(n.id)
        print('Found before delete:', bool(found))

        # delete
        db.session.delete(found)
        db.session.commit()

        found2 = Notification.query.get(n.id)
        print('Found after delete:', bool(found2))
