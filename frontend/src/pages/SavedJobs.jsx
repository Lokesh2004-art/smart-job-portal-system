import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import JobCard from '../components/JobCard';

export default function SavedJobs() {
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await api.get('/api/saved-jobs');
        if (!active) return;
        setSaved(res.data);
      } catch (err) {
        if (!active) return;
        setError(err?.response?.data?.message || 'Failed to load saved jobs');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  return (
    <div className="container page">
      <div className="row" style={{ justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1 className="h1" style={{ marginTop: 0 }}>Saved Jobs</h1>
          <p className="muted">Jobs you've bookmarked.</p>
        </div>
        <Link className="btn btnGhost" to="/jobs">Browse</Link>
      </div>

      {error ? <div className="alert">{error}</div> : null}
      {loading ? <div className="card">Loading...</div> : null}
      {!loading && !saved.length ? <div className="card">No saved jobs yet.</div> : null}

      <div style={{ marginTop: 12 }}>
        {saved.map((s) => (
          <div key={s.id} style={{ marginBottom: 10 }}>
            <JobCard
              job={s.job}
              onUnsave={(jobId) => setSaved((cur) => cur.filter((x) => x.job && x.job.id !== jobId))}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
