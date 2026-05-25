import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/client';
import CollabPanel from '../components/CollabPanel';
import EmptyState from '../components/EmptyState';

export default function ApplicantsPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusSavingId, setStatusSavingId] = useState(null);
  const [openAppId, setOpenAppId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkStatus, setBulkStatus] = useState('shortlisted');
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [messageTexts, setMessageTexts] = useState({});
  const [messageSendingId, setMessageSendingId] = useState(null);

  const statusOptions = [
    { value: 'applied', label: 'Applied' },
    { value: 'shortlisted', label: 'Shortlisted' },
    { value: 'interview', label: 'Interview' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'hired', label: 'Hired' },
  ];

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await api.get(`/api/jobs/${id}/applicants`);
        if (!active) return;
        setData(res.data);
      } catch (err) {
        if (!active) return;
        setError(err?.response?.data?.message || 'Failed to load applicants');
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [id]);

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

  async function onChangeStatus(applicationId, nextStatus) {
    setError('');
    setStatusSavingId(applicationId);
    try {
      await api.patch(`/api/applications/${applicationId}/status`, { status: nextStatus });
      setData((d) => {
        if (!d) return d;
        return {
          ...d,
          applicants: (d.applicants || []).map((a) =>
            a.application_id === applicationId ? { ...a, status: nextStatus } : a
          ),
        };
      });
    } catch (err) {
      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.message || err?.response?.data?.msg;
      const fallback = err?.message || 'Failed to update status';
      if (status === 401) {
        setError(serverMsg || 'Session expired. Please login again.');
      } else {
        setError(serverMsg || fallback);
      }
    } finally {
      setStatusSavingId(null);
    }
  }

  return (
    <div className="container page">
      <div className="row" style={{ justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 className="h1" style={{ marginTop: 0 }}>Applicants</h1>
          <p className="muted">Review candidate info and resumes.</p>
        </div>
        <Link className="btn btnGhost" to="/recruiter">Back</Link>
      </div>

      {error ? <div className="alert" style={{ marginTop: 14 }}>{error}</div> : null}

      {loading ? (
        <div className="card" style={{ marginTop: 14 }}>Loading...</div>
      ) : (
        <div className="card" style={{ marginTop: 14 }}>
          <h2 className="h2">{data?.job?.title}</h2>

          <div style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div>
                <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={data?.applicants && selectedIds.length > 0 && selectedIds.length === data.applicants.length}
                    onChange={(e) => {
                      if (!data?.applicants) return;
                      if (e.target.checked) setSelectedIds(data.applicants.map((x) => x.application_id));
                      else setSelectedIds([]);
                    }}
                  />
                  <span className="muted">Select all</span>
                </label>
              </div>
              <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                <select className="input" value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}>
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <button
                  className="btn btnPrimary"
                  disabled={bulkProcessing || !selectedIds.length}
                  onClick={async () => {
                    if (!selectedIds.length) return alert('Select at least one applicant');
                    if (!confirm(`Set ${bulkStatus} for ${selectedIds.length} applicants?`)) return;
                    try {
                      setBulkProcessing(true);
                      await api.patch(`/api/jobs/${id}/applications/bulk-status`, { application_ids: selectedIds, status: bulkStatus });
                      setData((d) => ({
                        ...d,
                        applicants: d.applicants.map((a) => (selectedIds.includes(a.application_id) ? { ...a, status: bulkStatus } : a)),
                      }));
                      setSelectedIds([]);
                    } catch (err) {
                      alert(err?.response?.data?.message || 'Bulk update failed');
                    } finally {
                      setBulkProcessing(false);
                    }
                  }}
                >
                  {bulkProcessing ? 'Applying...' : `Apply to ${selectedIds.length || 0}`}
                </button>
              </div>
            </div>

            {(data?.applicants || []).map((a) => (
              <div key={a.application_id} className="listItem">
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: '0 0 28px', display: 'flex', alignItems: 'center' }}>
                    <input type="checkbox" checked={selectedIds.includes(a.application_id)} onChange={(e) => {
                      if (e.target.checked) setSelectedIds((s) => [...new Set([...s, a.application_id])]);
                      else setSelectedIds((s) => s.filter((x) => x !== a.application_id));
                    }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="metaValue">{a.seeker?.full_name || a.seeker?.email}</div>
                    <div className="muted">{a.seeker?.location || '—'} · {a.seeker?.skills || '—'}</div>
                    <div className="row" style={{ gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                      <span className="pill">{a.status || 'applied'}</span>
                      <div className="row" style={{ gap: 8 }}>
                        <span className="muted" style={{ fontSize: 13 }}>Update status</span>
                        <select
                          className="input"
                          style={{ padding: '8px 10px', fontSize: 14, width: 190 }}
                          value={a.status || 'applied'}
                          disabled={statusSavingId === a.application_id}
                          onChange={(e) => onChangeStatus(a.application_id, e.target.value)}
                        >
                          {statusOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {a.cover_letter ? (
                      <div className="textBlock" style={{ marginTop: 6 }}>{a.cover_letter}</div>
                    ) : null}
                  </div>
                </div>
                <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                  {a.resume_filename ? (
                    <button className="btn btnPrimary" onClick={() => downloadResume(a.application_id)}>
                      Download Resume
                    </button>
                  ) : (
                    <span className="muted">No resume</span>
                  )}
                  <button className="btn" onClick={() => setOpenAppId(openAppId === a.application_id ? null : a.application_id)}>
                    {openAppId === a.application_id ? 'Hide' : 'Comments'}
                  </button>

                  <button className="btn" onClick={() => setMessageTexts((s) => ({ ...s, [a.application_id]: s[a.application_id] || '' }))}>
                    Message
                  </button>
                </div>
                {openAppId === a.application_id ? (
                  <CollabPanel applicationId={a.application_id} jobId={id} onClose={() => setOpenAppId(null)} />
                ) : null}

                {messageTexts[a.application_id] !== undefined ? (
                  <div style={{ marginTop: 8 }}>
                    <textarea
                      className="input"
                      placeholder="Write a private message to the applicant"
                      value={messageTexts[a.application_id]}
                      onChange={(e) => setMessageTexts((s) => ({ ...s, [a.application_id]: e.target.value }))}
                      style={{ minHeight: 80 }}
                    />
                    <div className="row" style={{ gap: 8, marginTop: 8 }}>
                      <button
                        className="btn btnPrimary"
                        disabled={messageSendingId === a.application_id || !(messageTexts[a.application_id] || '').trim()}
                        onClick={async () => {
                          const txt = (messageTexts[a.application_id] || '').trim();
                          if (!txt) return alert('Enter a message');
                          try {
                            setMessageSendingId(a.application_id);
                            await api.post(`/api/applications/${a.application_id}/message`, { message: txt });
                            alert('Message sent');
                            setMessageTexts((s) => ({ ...s, [a.application_id]: undefined }));
                          } catch (err) {
                            alert(err?.response?.data?.message || 'Failed to send message');
                          } finally {
                            setMessageSendingId(null);
                          }
                        }}
                      >
                        {messageSendingId === a.application_id ? 'Sending...' : 'Send message'}
                      </button>
                      <button className="btn btnGhost" onClick={() => setMessageTexts((s) => ({ ...s, [a.application_id]: undefined }))}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}

            {!(data?.applicants || []).length ? (
              <EmptyState title="No applicants yet" description="No one has applied to this job yet." />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
