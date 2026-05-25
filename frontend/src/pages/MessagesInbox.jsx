import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import CollabPanel from '../components/CollabPanel';

export default function MessagesInbox() {
  const { profile } = useAuth();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openAppId, setOpenAppId] = useState(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await api.get('/api/applications/me');
        if (!active) return;
        const myApps = res.data || [];

        // fetch last message for each application in parallel
        const previews = await Promise.all(myApps.map(async (a) => {
          try {
            const r = await api.get(`/api/applications/${a.id}/messages`);
            const msgs = r.data || [];
            const last = msgs.length ? msgs[msgs.length - 1] : null;
            return { id: a.id, last };
          } catch (e) {
            return { id: a.id, last: null };
          }
        }));

        const withPreview = myApps.map(a => ({ ...a, last_message: (previews.find(p => p.id === a.id) || {}).last || null }));
        setApps(withPreview);
      } catch (err) {
        if (!active) return;
        setError(err?.response?.data?.message || 'Failed to load applications');
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
          <h1 className="h1" style={{ marginTop: 0 }}>Messages</h1>
          <p className="muted">All conversations with recruiters for your applications.</p>
        </div>
        <Link className="btn btnGhost" to="/dashboard">Back</Link>
      </div>

      {error ? <div className="alert" style={{ marginTop: 14 }}>{error}</div> : null}

      {loading ? (
        <div className="card" style={{ marginTop: 14 }}>Loading...</div>
      ) : apps.length ? (
        <div className="card" style={{ marginTop: 14 }}>
          {apps.map((a) => (
            <div key={a.id} style={{ borderBottom: '1px solid #eee', padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <div className="metaValue">{a.job?.title || `Job #${a.job_id}`}</div>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {a.last_message ? (
                      <>
                        <span style={{ display: 'inline-block', maxWidth: 560, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.last_message.text}</span>
                        <span style={{ marginLeft: 8, color: '#889' }}>· {a.last_message.created_at}</span>
                      </>
                    ) : (
                      a.job?.location || 'No messages yet'
                    )}
                  </div>
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <button className="btn" onClick={() => setOpenAppId(openAppId === a.id ? null : a.id)}>
                    {openAppId === a.id ? 'Close' : 'Open'}
                  </button>
                </div>
              </div>
              {openAppId === a.id ? (
                <div style={{ marginTop: 12 }}>
                  <CollabPanel applicationId={a.id} jobId={a.job_id} onClose={() => setOpenAppId(null)} />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ marginTop: 14 }}>No conversations yet.</div>
      )}
    </div>
  );
}
