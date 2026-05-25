from datetime import datetime, timedelta

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from sqlalchemy import func

from ..extensions import db
from ..models import Application, Job, JobPostingState
from ..utils.decorators import role_required


recruiter_bp = Blueprint("recruiter_metrics", __name__)


@recruiter_bp.get("/metrics")
@role_required("recruiter", "admin")
def metrics():
    # supported query params:
    # - days (int) fallback when start_date/end_date not provided
    # - start_date, end_date (YYYY-MM-DD) to specify exact range
    # - job_id (int) to limit to a single job
    # - status (string) to limit to a single application status
    try:
        days = int(request.args.get("days", 30))
    except Exception:
        days = 30
    days = max(1, min(days, 365))

    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    job_id = request.args.get("job_id")
    status_filter = request.args.get("status")

    verify_jwt_in_request()
    recruiter_id = int(get_jwt_identity())

    total_jobs_q = Job.query.filter_by(recruiter_id=recruiter_id)
    total_jobs = total_jobs_q.count()

    open_jobs = (
        db.session.query(func.count(Job.id))
        .join(JobPostingState, Job.id == JobPostingState.job_id)
        .filter(Job.recruiter_id == recruiter_id, JobPostingState.is_open == True)
        .scalar()
    )

    # base applicant query joined to Job
    base_q = db.session.query(Application).join(Job, Job.id == Application.job_id).filter(Job.recruiter_id == recruiter_id)
    if job_id:
        try:
            jid = int(job_id)
            base_q = base_q.filter(Job.id == jid)
        except Exception:
            pass
    if status_filter:
        base_q = base_q.filter(Application.status == status_filter)

    total_applicants = base_q.count()

    # status breakdown (respecting job filter but not date)
    status_rows_q = db.session.query(Application.status, func.count(Application.id)).join(Job, Job.id == Application.job_id).filter(Job.recruiter_id == recruiter_id)
    if job_id:
        try:
            jid = int(job_id)
            status_rows_q = status_rows_q.filter(Job.id == jid)
        except Exception:
            pass
    status_rows = status_rows_q.group_by(Application.status).all()
    status_counts = {r[0]: int(r[1]) for r in status_rows}

    # determine date range for trend
    if start_date and end_date:
        try:
            start = datetime.fromisoformat(start_date)
            end = datetime.fromisoformat(end_date) + timedelta(days=1)
        except Exception:
            end = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
            start = end - timedelta(days=days)
    else:
        end = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
        start = end - timedelta(days=days)

    # trend: counts per day for the selected range
    trend_q = db.session.query(func.date(Application.applied_at), func.count(Application.id)).join(Job, Job.id == Application.job_id).filter(Job.recruiter_id == recruiter_id, Application.applied_at >= start, Application.applied_at < end)
    if job_id:
        try:
            jid = int(job_id)
            trend_q = trend_q.filter(Job.id == jid)
        except Exception:
            pass
    if status_filter:
        trend_q = trend_q.filter(Application.status == status_filter)

    # total-per-day
    trend_rows = trend_q.group_by(func.date(Application.applied_at)).order_by(func.date(Application.applied_at)).all()
    def _date_key(d):
        try:
            return d.isoformat()
        except Exception:
            return str(d)
    counts_by_date = {_date_key(r[0]): int(r[1]) for r in trend_rows}

    trend = []
    cursor = start
    while cursor < end:
        key = cursor.date().isoformat()
        trend.append({"date": key, "count": counts_by_date.get(key, 0)})
        cursor += timedelta(days=1)

    # trend by status: fetch grouped by date and status
    status_trend_q = db.session.query(func.date(Application.applied_at), Application.status, func.count(Application.id)).join(Job, Job.id == Application.job_id).filter(Job.recruiter_id == recruiter_id, Application.applied_at >= start, Application.applied_at < end)
    if job_id:
        try:
            jid = int(job_id)
            status_trend_q = status_trend_q.filter(Job.id == jid)
        except Exception:
            pass
    # note: status_filter limits overall but for per-status view we still want all statuses unless explicitly filtered
    if status_filter:
        status_trend_q = status_trend_q.filter(Application.status == status_filter)

    status_rows = status_trend_q.group_by(func.date(Application.applied_at), Application.status).order_by(func.date(Application.applied_at)).all()

    # build mapping: status -> {date: count}
    status_date_map = {}
    for dt, st, cnt in status_rows:
        key = _date_key(dt)
        status_date_map.setdefault(st, {})[key] = int(cnt)

    trend_by_status = {}
    for st, date_map in status_date_map.items():
        lst = []
        cursor = start
        while cursor < end:
            key = cursor.date().isoformat()
            lst.append({"date": key, "count": date_map.get(key, 0)})
            cursor += timedelta(days=1)
        trend_by_status[st] = lst

    # top jobs by applicants
    top_jobs_rows = (
        db.session.query(Job.id, Job.title, func.count(Application.id).label('cnt'))
        .join(Application, Job.id == Application.job_id)
        .filter(Job.recruiter_id == recruiter_id)
        .group_by(Job.id)
        .order_by(func.count(Application.id).desc())
        .limit(5)
        .all()
    )
    top_jobs = [{"job_id": r[0], "title": r[1], "applicants": int(r[2])} for r in top_jobs_rows]

    # average applications per job
    avg_apps_per_job = 0.0
    if total_jobs:
        avg_apps_per_job = float(total_applicants or 0) / float(total_jobs)

    # average time to first application (in days) across recruiter's jobs that have at least one app
    first_app_rows = (
        db.session.query(Job.id, Job.created_at, func.min(Application.applied_at).label('first_at'))
        .join(Application, Job.id == Application.job_id)
        .filter(Job.recruiter_id == recruiter_id)
        .group_by(Job.id, Job.created_at)
        .all()
    )
    total_days = 0.0
    count_with_first = 0
    for j in first_app_rows:
        created = j[1]
        first_at = j[2]
        if created and first_at:
            delta = (first_at - created).total_seconds()
            days = delta / 86400.0
            total_days += days
            count_with_first += 1
    avg_time_to_first_app_days = float(total_days / count_with_first) if count_with_first else None

    return jsonify({
        "total_jobs": int(total_jobs),
        "open_jobs": int(open_jobs or 0),
        "total_applicants": int(total_applicants or 0),
        "status_counts": status_counts,
        "trend": trend,
        "trend_by_status": trend_by_status,
        "top_jobs": top_jobs,
        "avg_apps_per_job": avg_apps_per_job,
        "avg_time_to_first_app_days": avg_time_to_first_app_days,
    })
