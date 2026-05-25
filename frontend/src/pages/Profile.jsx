import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

export default function Profile() {
  const { missingProfileFields, refreshProfile } = useAuth();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [resume, setResume] = useState(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await api.get('/api/profile');
        if (!active) return;
        setProfile(res.data);
        setForm(res.data);
      } catch (err) {
        if (!active) return;
        setError(err?.response?.data?.message || 'Failed to load profile');
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  function onChange(e) {
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }));
  }

  async function onSave(e) {
    e.preventDefault();
    setMessage('');
    setError('');

    try {
      await api.put('/api/profile', form);
      await refreshProfile();
      setMessage('Profile updated.');
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update profile');
    }
  }

  async function onUploadResume(e) {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!resume) {
      setError('Choose a resume file first.');
      return;
    }

    try {
      const fd = new FormData();
      fd.append('resume', resume);
      const res = await api.post('/api/profile/resume', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessage(res.data.message || 'Resume uploaded.');
      setProfile((p) => ({ ...p, resume_filename: res.data.resume_filename }));
      await refreshProfile();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to upload resume');
    }
  }

  if (loading) {
    return (
      <div className="container page">
        <div className="card">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container page">
      <div className="row" style={{ justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 className="h1" style={{ marginTop: 0 }}>Profile Management</h1>
          <p className="muted">Update your account and profile details.</p>
        </div>
      </div>

      {message ? <div className="success" style={{ marginTop: 14 }}>{message}</div> : null}
      {error ? <div className="alert" style={{ marginTop: 14 }}>{error}</div> : null}
      {missingProfileFields?.length ? (
        <div className="alert" style={{ marginTop: 14 }}>
          Please complete your profile to continue.
        </div>
      ) : null}

      <div className="grid" style={{ marginTop: 14 }}>
        <div className="card">
          <h2 className="h2">Details</h2>

          <form className="form" onSubmit={onSave}>
            {profile?.role === 'seeker' ? (
              <>
                <div className="field">
                  <label className="label" htmlFor="full_name">Full name</label>
                  <input className="input" id="full_name" name="full_name" value={form.full_name || ''} onChange={onChange} />
                </div>
                <div className="field">
                  <label className="label" htmlFor="phone">Phone</label>
                  <input className="input" id="phone" name="phone" value={form.phone || ''} onChange={onChange} />
                </div>
                <div className="field">
                  <label className="label" htmlFor="location">Location</label>
                  <input className="input" id="location" name="location" value={form.location || ''} onChange={onChange} />
                </div>
                <div className="field">
                  <label className="label" htmlFor="skills">Skills</label>
                  <input className="input" id="skills" name="skills" value={form.skills || ''} onChange={onChange} placeholder="e.g., React, Flask, SQL" />
                </div>
                <div className="field">
                  <label className="label" htmlFor="expected_salary">Expected salary</label>
                  <input className="input" id="expected_salary" name="expected_salary" value={form.expected_salary || ''} onChange={onChange} inputMode="numeric" />
                </div>
                <div className="field">
                  <label className="label" htmlFor="summary">Summary</label>
                  <textarea className="input" id="summary" name="summary" rows={5} value={form.summary || ''} onChange={onChange} />
                </div>
              </>
            ) : (
              <>
                <div className="field">
                  <label className="label" htmlFor="company_name">Company name</label>
                  <input className="input" id="company_name" name="company_name" value={form.company_name || ''} onChange={onChange} />
                </div>
                <div className="field">
                  <label className="label" htmlFor="company_website">Company website</label>
                  <input className="input" id="company_website" name="company_website" value={form.company_website || ''} onChange={onChange} placeholder="https://" />
                </div>
                <div className="field">
                  <label className="label" htmlFor="company_location">Company location</label>
                  <input className="input" id="company_location" name="company_location" value={form.company_location || ''} onChange={onChange} />
                </div>
                <div className="field">
                  <label className="label" htmlFor="about">About</label>
                  <textarea className="input" id="about" name="about" rows={6} value={form.about || ''} onChange={onChange} />
                </div>
              </>
            )}

            <button className="btn btnPrimary">Save changes</button>
          </form>
        </div>

        {profile?.role === 'seeker' ? (
          <div className="card">
            <h2 className="h2">Resume</h2>
            <p className="muted">Current: {profile.resume_filename ? 'Uploaded' : 'Not uploaded'}</p>

            <form className="form" onSubmit={onUploadResume}>
              <div className="field">
                <label className="label" htmlFor="resume">Upload resume</label>
                <input
                  id="resume"
                  className="input"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setResume(e.target.files?.[0] || null)}
                />
              </div>
              <button className="btn btnPrimary">Upload</button>
            </form>
          </div>
        ) : null}
      </div>
    </div>
  );
}
