import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api/client';

export default function PostJob() {
  const navigate = useNavigate();
  const params = useParams();
  const jobId = params.id;

  const [form, setForm] = useState({
    title: '',
    description: '',
    location: '',
    skills_required: '',
    salary_min: '',
    salary_max: '',
    job_type: '',
    experience_min: '',
    experience_max: '',
  });

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [missingFields, setMissingFields] = useState([]);
  const [loading, setLoading] = useState(Boolean(jobId));

  useEffect(() => {
    let active = true;

    async function loadJob() {
      if (!jobId) return;
      setLoading(true);
      setError('');
      try {
        const res = await api.get(`/api/jobs/${jobId}`);
        if (!active) return;
        const j = res.data;
        setForm({
          title: j.title || '',
          description: j.description || '',
          location: j.location || '',
          skills_required: j.skills_required || '',
          salary_min: j.salary_min ?? '',
          salary_max: j.salary_max ?? '',
          job_type: j.job_type || '',
          experience_min: j.experience_min ?? '',
          experience_max: j.experience_max ?? '',
        });
      } catch (err) {
        if (!active) return;
        setError(err?.response?.data?.message || 'Failed to load job');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadJob();
    return () => {
      active = false;
    };
  }, [jobId]);

  function onChange(e) {
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }));
  }

  function validate() {
    if (!form.title.trim()) return 'Title is required';
    if (!form.description.trim()) return 'Description is required';
    return '';
  }

  async function onSubmit(e) {
    e.preventDefault();
    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }

    setSaving(true);
    setError('');

    const payload = {
      ...form,
      salary_min: form.salary_min === '' ? null : Number(form.salary_min),
      salary_max: form.salary_max === '' ? null : Number(form.salary_max),
    };

    try {
      if (jobId) {
        await api.put(`/api/jobs/${jobId}`, payload);
      } else {
        await api.post('/api/jobs', payload);
      }
      navigate('/recruiter');
    } catch (err) {
      const server = err?.response?.data || {};
      setError(server.message || 'Failed to save job');
      setMissingFields(server.missing_fields || []);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container page">
      <div className="row" style={{ justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 className="h1" style={{ marginTop: 0 }}>{jobId ? 'Edit Job' : 'Post a Job'}</h1>
          <p className="muted">Create a professional job posting for candidates.</p>
        </div>
        <Link className="btn btnGhost" to="/recruiter">Back</Link>
      </div>

      {error ? <div className="alert" style={{ marginTop: 14 }}>{error}</div> : null}
      {missingFields && missingFields.length ? (
        <div style={{ marginTop: 8 }}>
          <div className="muted">Missing profile fields: {missingFields.join(', ')}</div>
          <Link className="btn btnPrimary" to="/profile" style={{ marginTop: 8 }}>Complete Company Profile</Link>
        </div>
      ) : null}

      {loading ? (
        <div className="card" style={{ marginTop: 14 }}>Loading...</div>
      ) : (
        <div className="card" style={{ marginTop: 14 }}>
          <form className="form" onSubmit={onSubmit}>
            <div className="field">
              <label className="label" htmlFor="title">Title</label>
              <input className="input" id="title" name="title" value={form.title} onChange={onChange} placeholder="e.g., React Developer" />
            </div>
            <div className="field">
              <label className="label" htmlFor="description">Description</label>
              <textarea className="input" id="description" name="description" rows={6} value={form.description} onChange={onChange} placeholder="Describe responsibilities, requirements, etc." />
            </div>

            <div className="grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
              <div className="field">
                <label className="label" htmlFor="location">Location</label>
                <input className="input" id="location" name="location" value={form.location} onChange={onChange} placeholder="e.g., Remote / London" />
              </div>
              <div className="field">
                <label className="label" htmlFor="job_type">Job type</label>
                <input className="input" id="job_type" name="job_type" value={form.job_type} onChange={onChange} placeholder="e.g., Full-time" />
              </div>
            </div>

            <div className="field">
              <label className="label" htmlFor="skills_required">Skills</label>
              <input className="input" id="skills_required" name="skills_required" value={form.skills_required} onChange={onChange} placeholder="e.g., React, JavaScript, REST" />
            </div>

            <div className="grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
              <div className="field">
                <label className="label" htmlFor="salary_min">Salary min</label>
                <input className="input" id="salary_min" name="salary_min" value={form.salary_min} onChange={onChange} inputMode="numeric" placeholder="e.g., 60000" />
              </div>
              <div className="field">
                <label className="label" htmlFor="salary_max">Salary max</label>
                <input className="input" id="salary_max" name="salary_max" value={form.salary_max} onChange={onChange} inputMode="numeric" placeholder="e.g., 120000" />
              </div>
            </div>

            <div className="grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
              <div className="field">
                <label className="label" htmlFor="experience_min">Experience min (years)</label>
                <input className="input" id="experience_min" name="experience_min" value={form.experience_min} onChange={onChange} inputMode="numeric" placeholder="e.g., 1" />
              </div>
              <div className="field">
                <label className="label" htmlFor="experience_max">Experience max (years)</label>
                <input className="input" id="experience_max" name="experience_max" value={form.experience_max} onChange={onChange} inputMode="numeric" placeholder="e.g., 5" />
              </div>
            </div>

            <button className="btn btnPrimary" disabled={saving}>
              {saving ? 'Saving...' : jobId ? 'Update Job' : 'Create Job'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
