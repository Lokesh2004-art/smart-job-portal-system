import React from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

function formatSalary(job) {
  const min = job.salary_min;
  const max = job.salary_max;
  if (min && max) return `${min} - ${max}`;
  if (min) return `From ${min}`;
  if (max) return `Up to ${max}`;
  return 'Not specified';
}

export default function JobCard({ job, matchPercent, isSaved: initialSaved, onUnsave }) {
  const [isSaved, setIsSaved] = React.useState(Boolean(initialSaved));

  async function toggleSave(e) {
    e.preventDefault();
      try {
      if (isSaved) {
        await api.delete(`/api/saved-jobs/${job.id}`);
        setIsSaved(false);
        if (typeof onUnsave === 'function') onUnsave(job.id);
      } else {
        await api.post(`/api/saved-jobs/${job.id}`);
        setIsSaved(true);
      }
    } catch (err) {
      // ignore errors for now
      console.error(err?.response?.data || err.message || err);
    }
  }
  return (
    <div className="card jobCard">
      <div className="jobHeader">
        <div>
          <h3 className="jobTitle">{job.title}</h3>
          <div className="muted">{job.location || 'Remote/Not specified'}</div>
        </div>
        <div className="row" style={{ gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <div className="pill">{job.job_type || 'Role'}</div>
          {typeof matchPercent === 'number' ? (
            <div className="pill" title="Based on your profile skills vs required skills">
              Match {matchPercent}%
            </div>
          ) : null}
          <button
            className={`btn btnGhost ${isSaved ? 'savedActive' : ''}`}
            onClick={toggleSave}
            title={isSaved ? 'Unsave job' : 'Save job'}
          >
            {isSaved ? '★' : '☆'}
          </button>
        </div>
      </div>

      <div className="jobMeta">
        <div>
          <div className="metaLabel">Skills</div>
          <div className="metaValue">{job.skills_required || '—'}</div>
        </div>
        <div>
          <div className="metaLabel">Salary</div>
          <div className="metaValue">{formatSalary(job)}</div>
        </div>
      </div>

      <div className="jobActions">
        <Link className="btn btnPrimary" to={`/jobs/${job.id}`}>
          View Details
        </Link>
      </div>
    </div>
  );
}
