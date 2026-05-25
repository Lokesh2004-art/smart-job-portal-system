import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { computeJobMatchPercent } from '../utils/match';
// CollabPanel removed for seeker phase: messaging disabled for job seekers

export default function AppliedJobs() {
  const { profile } = useAuth();
  const [apps, setApps] = useState([]);
  // messaging UI removed for seekers
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function isUpdated(status) {
    const s = (status || 'applied').toString().trim().toLowerCase() || 'applied';
    return s !== 'applied';
  }

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await api.get('/api/applications/me');
        if (!active) return;
        setApps(res.data);
      } catch (err) {
        if (!active) return;
        setError(err?.response?.data?.message || 'Failed to load applications');
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  async function downloadResume(applicationId) {
    const res = await api.get(`/api/applications/${applicationId}/resume`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resume-${applicationId}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="container page">
      <div className="row" style={{ justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 className="h1" style={{ marginTop: 0 }}>Applied Jobs</h1>
          <p className="muted">Track your applications and status.</p>
        </div>
        <Link className="btn btnGhost" to="/dashboard">Back to dashboard</Link>
      </div>

      {error ? <div className="alert" style={{ marginTop: 14 }}>{error}</div> : null}

      {loading ? (
        <div className="card" style={{ marginTop: 14 }}>Loading...</div>
      ) : apps.length ? (
        <div className="card" style={{ marginTop: 14 }}>
          <div className="table">
            <div className="thead">
              <div>Job</div>
              <div>Applied</div>
              <div>Match</div>
              <div>Status</div>
              <div>Resume</div>
            </div>
            {apps.map((a) => {
              const matchPercent = computeJobMatchPercent({
                profileSkills: profile?.skills,
                hasResume: Boolean(profile?.resume_filename),
                jobSkillsRequired: a?.job?.skills_required,
              });

              return (
                <div key={`wrap-${a.id}`}>
                  <div className="trow">
                    <div>
                      <Link to={`/jobs/${a.job_id}`}>{a.job?.title || `Job #${a.job_id}`}</Link>
                      {/* message button removed for seekers */}
                      <div className="muted">{a.job?.location || '—'}</div>
                    </div>
                    <div>{new Date(a.applied_at).toLocaleString()}</div>
                    <div>
                      {typeof matchPercent === 'number' ? (
                        <span className="pill">{matchPercent}%</span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </div>
                    <div>
                      <span className="pill">{a.status}</span>
                      {isUpdated(a.status) ? (
                        <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
                          Recruiter updated your application.
                        </div>
                      ) : null}
                    </div>
                    <div>
                      {a.resume_filename ? (
                        <button className="btn btnGhost" onClick={() => downloadResume(a.id)}>
                          Download
                        </button>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </div>
                  </div>
                  {/* CollabPanel is disabled for seekers in this phase */}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="card" style={{ marginTop: 14 }}>No applications yet.</div>
      )}
    </div>
  );
}
