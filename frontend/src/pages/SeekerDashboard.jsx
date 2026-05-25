import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { computeJobMatchPercent } from '../utils/match';

function dateKeyLocal(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfDayLocal(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function prettyStatus(s) {
  const value = (s || 'applied').toString().trim().toLowerCase();
  if (!value) return 'Applied';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function SeekerDashboard() {
  const [profile, setProfile] = useState(null);
  const [apps, setApps] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const [p, appsRes, notifsRes] = await Promise.all([
          api.get('/api/profile'),
          api.get('/api/applications/me'),
          api.get('/api/notifications'),
        ]);
        if (!active) return;
        setProfile(p.data);
        setApps(appsRes.data);
        setNotifications(notifsRes.data || []);
      } catch (err) {
        if (!active) return;
        setError(err?.response?.data?.message || 'Failed to load dashboard');
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  const perf = useMemo(() => {
    const totalApplied = apps.length;
    const statusCounts = apps.reduce((acc, a) => {
      const key = (a?.status || 'applied').toString().trim().toLowerCase() || 'applied';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const replies = apps.filter((a) => {
      const s = (a?.status || 'applied').toString().trim().toLowerCase() || 'applied';
      return s !== 'applied';
    }).length;

    const inProgress = apps.filter((a) => {
      const s = (a?.status || 'applied').toString().trim().toLowerCase() || 'applied';
      return s === 'shortlisted' || s === 'interview';
    }).length;

    const rejected = apps.filter((a) => {
      const s = (a?.status || 'applied').toString().trim().toLowerCase() || 'applied';
      return s === 'rejected';
    }).length;

    const latestAppliedAt = apps[0]?.applied_at ? new Date(apps[0].applied_at) : null;

    const today = startOfDayLocal(new Date());
    const last7 = [];
    const last7Counts = [];
    const countsByDay = {};
    for (const a of apps) {
      if (!a?.applied_at) continue;
      const d = new Date(a.applied_at);
      if (Number.isNaN(d.getTime())) continue;
      const k = dateKeyLocal(d);
      countsByDay[k] = (countsByDay[k] || 0) + 1;
    }
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const k = dateKeyLocal(d);
      last7.push(d);
      last7Counts.push({ key: k, date: d, count: countsByDay[k] || 0 });
    }

    const appliedThisWeek = last7Counts.reduce((sum, x) => sum + x.count, 0);

    const statusRows = Object.entries(statusCounts)
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalApplied,
      replies,
      inProgress,
      rejected,
      appliedThisWeek,
      latestAppliedAt,
      last7Counts,
      statusRows,
    };
  }, [apps]);

  const updates = useMemo(() => notifications.slice(0, 6), [notifications]);

  return (
    <div className="container page">
      <div className="row" style={{ justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 className="h1" style={{ marginTop: 0 }}>User Dashboard</h1>
          <p className="muted">Track your profile and application history.</p>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <Link className="btn btnPrimary" to="/jobs">Browse Jobs</Link>
          <Link className="btn btnGhost" to="/applied">Applied Jobs</Link>
        </div>
      </div>

      {error ? <div className="alert" style={{ marginTop: 14 }}>{error}</div> : null}

      {loading ? (
        <div className="card" style={{ marginTop: 14 }}>Loading...</div>
      ) : (
        <div className="grid" style={{ marginTop: 14 }}>
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <div className="row" style={{ justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <h2 className="h2">Performance</h2>
                <p className="muted" style={{ margin: 0 }}>Applications and recruiter updates.</p>
              </div>
              <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
                <span className="pill">Applied: {perf.totalApplied}</span>
                <span className="pill">Replies: {perf.replies}</span>
              </div>
            </div>

            <div className="dashPerf" style={{ marginTop: 12 }}>
              <div>
                <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
                  <div className="metaValue">Applications (last 7 days)</div>
                  <div className="muted" style={{ fontSize: 13 }}>Total: {perf.appliedThisWeek}</div>
                </div>

                <div className="miniBars" style={{ marginTop: 10 }}>
                  {(() => {
                    const max = Math.max(1, ...perf.last7Counts.map((x) => x.count));
                    return perf.last7Counts.map((x) => {
                      const h = Math.round((x.count / max) * 100);
                      const day = x.date.toLocaleDateString(undefined, { weekday: 'short' });
                      return (
                        <div key={x.key} className="miniBarCol" title={`${x.key}: ${x.count}`}>
                          <div className="miniBarTrack">
                            <div className="miniBarFill" style={{ height: `${h}%` }} />
                          </div>
                          <div className="miniBarLabel">{day}</div>
                          <div className="miniBarValue">{x.count}</div>
                        </div>
                      );
                    });
                  })()}
                </div>

                <div style={{ marginTop: 14 }}>
                  <div className="metaValue">Status breakdown</div>
                  <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                    Replies count increases when recruiter updates your status.
                  </div>

                  <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
                    {(perf.statusRows.length ? perf.statusRows : [{ status: 'applied', count: 0 }]).slice(0, 5).map((row) => {
                      const pct = perf.totalApplied ? Math.round((row.count / perf.totalApplied) * 100) : 0;
                      return (
                        <div key={row.status} className="row" style={{ gap: 10, alignItems: 'center' }}>
                          <div style={{ width: 110 }} className="muted">{prettyStatus(row.status)}</div>
                          <div className="statusTrack" aria-label={`${row.status} ${pct}%`}>
                            <div className="statusFill" style={{ width: `${pct}%` }} />
                          </div>
                          <div style={{ width: 70, textAlign: 'right' }} className="muted">{row.count} ({pct}%)</div>
                        </div>
                      );
                    })}
                    {!perf.statusRows.length && !perf.totalApplied ? (
                      <div className="muted">No applications yet — apply to jobs to see stats.</div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="kpiCol">
                <div className="kpiGrid">
                  <div className="kpiCard">
                    <div className="metaLabel">Total applied</div>
                    <div className="kpiValue">{perf.totalApplied}</div>
                    <div className="muted" style={{ fontSize: 13 }}>All-time</div>
                  </div>
                  <div className="kpiCard">
                    <div className="metaLabel">Applied this week</div>
                    <div className="kpiValue">{perf.appliedThisWeek}</div>
                    <div className="muted" style={{ fontSize: 13 }}>Last 7 days</div>
                  </div>
                  <div className="kpiCard">
                    <div className="metaLabel">Replies received</div>
                    <div className="kpiValue">{perf.replies}</div>
                    <div className="muted" style={{ fontSize: 13 }}>
                      {perf.replies ? 'Recruiter updated status' : 'No updates yet'}
                    </div>
                  </div>
                  <div className="kpiCard">
                    <div className="metaLabel">In progress</div>
                    <div className="kpiValue">{perf.inProgress}</div>
                    <div className="muted" style={{ fontSize: 13 }}>Shortlisted/Interview</div>
                  </div>
                </div>

                <div className="card" style={{ marginTop: 12, padding: 14, background: 'color-mix(in srgb, var(--panel) 72%, transparent)' }}>
                  <div className="metaValue">Latest activity</div>
                  <div className="muted" style={{ marginTop: 6 }}>
                    {perf.latestAppliedAt ? perf.latestAppliedAt.toLocaleString() : '—'}
                  </div>
                  <div className="row" style={{ justifyContent: 'space-between', marginTop: 10 }}>
                    <span className="muted">Resume</span>
                    <span className="pill">{profile?.resume_filename ? 'Uploaded' : 'Not uploaded'}</span>
                  </div>
                  <div className="row" style={{ justifyContent: 'space-between', marginTop: 10 }}>
                    <span className="muted">Rejected</span>
                    <span className="pill">{perf.rejected}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <div className="row" style={{ justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <h2 className="h2">Notifications</h2>
                <p className="muted" style={{ margin: 0 }}>
                  Recruiter updates on your applications.
                </p>
              </div>
              <span className="pill">Updates: {updates.length}</span>
            </div>

            <div style={{ marginTop: 12 }}>
              {updates.map((n) => (
                <div key={n.id} className="listItem">
                  <div style={{ flex: 1 }}>
                    <div className="metaValue">{n.message}</div>
                    <div className="muted" style={{ marginTop: 4 }}>{new Date(n.created_at).toLocaleString()}</div>
                  </div>
                  <div className="row" style={{ gap: 8 }}>
                    {n.job_id ? <Link className="btn btnGhost" to={`/jobs/${n.job_id}`}>View</Link> : null}
                    {!n.is_read ? (
                      <button
                        className="btn btnPrimary"
                        onClick={async () => {
                          try {
                            await api.patch(`/api/notifications/${n.id}/read`);
                            setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true, read_at: new Date().toISOString() } : x)));
                          } catch (_) {}
                        }}
                      >
                        Mark read
                      </button>
                    ) : (
                      <span className="muted">Read</span>
                    )}
                    <button
                      className="btn btnDanger"
                      onClick={async () => {
                        if (!confirm('Delete this notification?')) return;
                        try {
                          const res = await api.delete(`/api/notifications/${n.id}`);
                          // refetch notifications to ensure UI matches server
                          const fresh = await api.get('/api/notifications');
                          setNotifications(fresh.data || []);
                        } catch (err) {
                          const msg = err?.response?.data?.message || err?.message || 'Failed to delete notification';
                          alert(msg);
                        }
                      }}
                      style={{ marginLeft: 8 }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {!updates.length ? (
                <div className="muted">
                  No recruiter updates yet. When a recruiter shortlists/rejects, it will appear here.
                </div>
              ) : null}
            </div>
          </div>

          <div className="card">
            <h2 className="h2">Profile</h2>
            <div className="kv">
              <div>
                <div className="metaLabel">Name</div>
                <div className="metaValue">{profile?.full_name || '—'}</div>
              </div>
              <div>
                <div className="metaLabel">Location</div>
                <div className="metaValue">{profile?.location || '—'}</div>
              </div>
              <div>
                <div className="metaLabel">Skills</div>
                <div className="metaValue">{profile?.skills || '—'}</div>
              </div>
              <div>
                <div className="metaLabel">Resume</div>
                <div className="metaValue">{profile?.resume_filename ? 'Uploaded' : 'Not uploaded'}</div>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <Link className="btn btnGhost" to="/profile">Manage Profile</Link>
            </div>
          </div>

          <div className="card">
            <h2 className="h2">Applications</h2>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="muted">Total applied</div>
              <div className="pill">{apps.length}</div>
            </div>
            <div style={{ marginTop: 12 }}>
              {apps.slice(0, 3).map((a) => (
                <div key={a.id} className="listItem">
                  <div>
                    <div className="metaValue">{a.job?.title}</div>
                    <div className="muted">{new Date(a.applied_at).toLocaleString()}</div>
                    <div className="row" style={{ gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                      <span className="pill">{prettyStatus(a.status)}</span>
                      {(() => {
                        const matchPercent = computeJobMatchPercent({
                          profileSkills: profile?.skills,
                          hasResume: Boolean(profile?.resume_filename),
                          jobSkillsRequired: a?.job?.skills_required,
                        });
                        return typeof matchPercent === 'number' ? (
                          <span className="pill" title="Based on your profile skills vs required skills">
                            Match {matchPercent}%
                          </span>
                        ) : null;
                      })()}
                    </div>
                  </div>
                  <Link className="btn btnGhost" to={`/jobs/${a.job_id}`}>View</Link>
                </div>
              ))}
              {!apps.length ? <div className="muted">No applications yet.</div> : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
