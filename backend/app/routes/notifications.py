from datetime import datetime

from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity

from ..extensions import db
from ..models import Notification
from ..utils.decorators import role_required


notifications_bp = Blueprint("notifications", __name__)


def serialize_notification(n: Notification):
    return {
        "id": n.id,
        "type": n.type,
        "message": n.message,
        "job_id": n.job_id,
        "application_id": n.application_id,
        "created_at": n.created_at.isoformat(),
        "read_at": n.read_at.isoformat() if n.read_at else None,
        "is_read": bool(n.read_at),
    }


@notifications_bp.get("/notifications")
@role_required("seeker")
def list_notifications():
    user_id = int(get_jwt_identity())

    rows = (
        Notification.query.filter_by(user_id=user_id)
        .order_by(Notification.created_at.desc())
        .limit(200)
        .all()
    )

    return jsonify([serialize_notification(n) for n in rows])


@notifications_bp.patch("/notifications/<int:notification_id>/read")
@role_required("seeker")
def mark_read(notification_id: int):
    user_id = int(get_jwt_identity())

    n = Notification.query.get(notification_id)
    if not n or n.user_id != user_id:
        return jsonify({"message": "Not found"}), 404

    if not n.read_at:
        n.read_at = datetime.utcnow()
        db.session.commit()

    return jsonify(serialize_notification(n))


@notifications_bp.patch("/notifications/read-all")
@role_required("seeker")
def mark_all_read():
    user_id = int(get_jwt_identity())

    Notification.query.filter_by(user_id=user_id, read_at=None).update(
        {"read_at": datetime.utcnow()}
    )
    db.session.commit()

    return jsonify({"message": "Marked all as read"})


@notifications_bp.delete("/notifications/<int:notification_id>")
@role_required("seeker")
def delete_notification(notification_id: int):
    user_id = int(get_jwt_identity())

    n = Notification.query.get(notification_id)
    if not n or n.user_id != user_id:
        return jsonify({"message": "Not found"}), 404

    db.session.delete(n)
    db.session.commit()
    return jsonify({"message": "Deleted"})
