import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { computeJobMatchPercent } from '../utils/match';

function formatSalary(job) {
  const min = job.salary_min;
  const max = job.salary_max;
  if (min && max) return `${min} - ${max}`;
  if (min) return `From ${min}`;
  if (max) return `Up to ${max}`;
  return 'Not specified';
}

export default function JobDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthed, user, profile } = useAuth();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [coverLetter, setCoverLetter] = useState('');
  const [resume, setResume] = useState(null);
  const [applyMsg, setApplyMsg] = useState('');
  const [applyErr, setApplyErr] = useState('');
  const [history, setHistory] = useState([]);
  const [applying, setApplying] = useState(false);

  const isOwnerRecruiter = useMemo(() => {
    return user?.role === 'recruiter' && job?.recruiter_id === user?.id;
  }, [user, job]);

  const matchPercent = useMemo(() => {
    if (user?.role !== 'seeker') return null;
    return computeJobMatchPercent({
      profileSkills: profile?.skills,
      hasResume: Boolean(profile?.resume_filename),
      jobSkillsRequired: job?.skills_required,
    });
  }, [user?.role, profile?.skills, profile?.resume_filename, job?.skills_required]);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await api.get(`/api/jobs/${id}`);
        if (!active) return;
        setJob(res.data);
        // fetch history if user is owner or seeker
        try {
          const histRes = await api.get(`/api/applications/${id}/history`);
          if (active) setHistory(histRes.data);
        } catch (err) {
          // ignore
        }
      } catch (err) {
        if (!active) return;
        setError(err?.response?.data?.message || 'Failed to load job');
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [id]);

  async function onApply(e) {
    e.preventDefault();
    setApplyMsg('');
    setApplyErr('');

    if (!isAuthed) {
      navigate('/login');
      return;
    }
    if (user?.role !== 'seeker') {
      setApplyErr('Only job seekers can apply.');
      return;
    }

    try {
      setApplying(true);
      const fd = new FormData();
      fd.append('cover_letter', coverLetter);
      if (resume) fd.append('resume', resume);

      await api.post(`/api/jobs/${id}/apply`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setApplyMsg('Application submitted successfully.');
      setCoverLetter('');
      setResume(null);
    } catch (err) {
      setApplyErr(err?.response?.data?.message || 'Failed to apply');
    } finally {
      setApplying(false);
    }
  }

  async function onDelete() {
    if (!isOwnerRecruiter) return;
    if (!confirm('Delete this job posting?')) return;

    try {
      await api.delete(`/api/jobs/${id}`);
      navigate('/recruiter');
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to delete job');
    }
  }

  if (loading) {
    return (
      <div className="container page">
        <div className="card">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container page">
        <div className="alert">{error}</div>
        <div style={{ marginTop: 12 }}>
          <Link className="btn btnGhost" to="/jobs">Back to jobs</Link>
        </div>
      </div>
    );
  }

  if (!job) return null;

  return (
    <div className="container page">
      <div className="row" style={{ justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 className="h1" style={{ marginTop: 0 }}>{job.title}</h1>
          <div className="muted">{job.location || 'Remote/Not specified'} · {job.job_type || 'Role'}</div>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <Link className="btn btnGhost" to="/jobs">Back</Link>
          {isOwnerRecruiter ? (
            <>
              <Link className="btn btnPrimary" to={`/recruiter/jobs/${job.id}/edit`}>Edit</Link>
              <button className="btn btnDanger" onClick={onDelete}>Delete</button>
            </>
          ) : null}
        </div>
      </div>

      <div className="grid" style={{ marginTop: 14 }}>
        <div className="card">
          <h2 className="h2">Description</h2>
          <p className="textBlock">{job.description}</p>
        </div>
        <div className="card">
          <h2 className="h2">Details</h2>
          <div className="jobMeta">
            <div>
              <div className="metaLabel">Skills</div>
              <div className="metaValue">{job.skills_required || '—'}</div>
            </div>
            <div>
              <div className="metaLabel">Salary</div>
              <div className="metaValue">{formatSalary(job)}</div>
            </div>
            <div>
              <div className="metaLabel">Experience</div>
              <div className="metaValue">{job.experience_min || job.experience_max ? `${job.experience_min ?? '—'} - ${job.experience_max ?? '—'} yrs` : 'Not specified'}</div>
            </div>
            {typeof matchPercent === 'number' ? (
              <div>
                <div className="metaLabel">Shortlist chance</div>
                <div className="metaValue">{matchPercent}% match</div>
                <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                  Based on your profile skills vs required skills.
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <h2 className="h2">Apply</h2>
        <p className="muted">Upload a resume (pdf/doc/docx) or use your saved profile resume.</p>

        {applyMsg ? <div className="success">{applyMsg}</div> : null}
        {applyErr ? <div className="alert">{applyErr}</div> : null}

        <form className="form" onSubmit={onApply}>
          <div className="field">
            <label className="label" htmlFor="cover">Cover letter (optional)</label>
            <textarea
              id="cover"
              className="input"
              rows={5}
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              placeholder="Write a short note to the recruiter"
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="resume">Resume (optional)</label>
            <input
              id="resume"
              className="input"
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setResume(e.target.files?.[0] || null)}
            />
          </div>

          <button className="btn btnPrimary" disabled={applying}>
            {applying ? 'Submitting...' : 'Submit application'}
          </button>
        </form>
      </div>
    </div>
  );
}
