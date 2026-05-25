import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import JobCard from '../components/JobCard';
import EmptyState from '../components/EmptyState';
import { useAuth } from '../context/AuthContext';
import { computeJobMatchPercent } from '../utils/match';

function uniqStrings(values) {
  const out = [];
  const seen = new Set();
  for (const raw of values) {
    const v = (raw || '').toString().trim();
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

function pickSuggestions(values, query, limit = 7) {
  const q = (query || '').toString().trim().toLowerCase();
  const all = uniqStrings(values);
  if (!q) return all.slice(0, limit);
  return all.filter((x) => x.toLowerCase().includes(q)).slice(0, limit);
}

const DEFAULT_Q_SUGGESTIONS = [
  'Frontend Developer',
  'Full Stack Developer',
  'Python Developer',
  'UI/UX Designer',
  'Data Analyst',
  'DevOps Engineer',
  'QA Engineer',
];

const DEFAULT_SKILL_SUGGESTIONS = ['React', 'JavaScript', 'Python', 'Flask', 'SQL', 'Java', 'Node.js'];

const DEFAULT_LOCATION_SUGGESTIONS = ['Remote', 'Hyderabad', 'Bengaluru', 'Chennai', 'Delhi', 'Mumbai'];

export default function JobListings() {
  const { user, profile } = useAuth();
  const [filters, setFilters] = useState({
    q: '',
    skill: '',
    location: '',
    minSalary: '',
    maxSalary: '',
  });

  const [jobs, setJobs] = useState([]);
  const [suggestJobs, setSuggestJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [openSuggest, setOpenSuggest] = useState(null); // 'q' | 'skill' | 'location' | null
  const [activeIndex, setActiveIndex] = useState(-1);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== null && v !== undefined && String(v).trim() !== '') params.set(k, v);
    });
    return params.toString();
  }, [filters]);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await api.get(`/api/jobs${queryString ? `?${queryString}` : ''}`);
        if (!active) return;
        setJobs(res.data);
        setSuggestJobs((prev) => (prev.length ? prev : res.data));
      } catch (err) {
        if (!active) return;
        setError(err?.response?.data?.message || 'Failed to load jobs');
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [queryString]);

  function onChange(e) {
    setFilters((s) => ({ ...s, [e.target.name]: e.target.value }));
    setActiveIndex(-1);
  }

  function clear() {
    setFilters({ q: '', skill: '', location: '', minSalary: '', maxSalary: '' });
    setOpenSuggest(null);
    setActiveIndex(-1);
  }

  const qSuggestions = useMemo(() => {
    return pickSuggestions(
      [...suggestJobs.flatMap((j) => [j?.title, j?.job_type]), ...DEFAULT_Q_SUGGESTIONS],
      filters.q
    );
  }, [suggestJobs, filters.q]);

  const skillSuggestions = useMemo(() => {
    const rawSkills = suggestJobs
      .map((j) => j?.skills_required)
      .filter(Boolean)
      .flatMap((s) => s.split(/[,/]/g).map((x) => x.trim()).filter(Boolean));
    return pickSuggestions([...rawSkills, ...DEFAULT_SKILL_SUGGESTIONS], filters.skill);
  }, [suggestJobs, filters.skill]);

  const locationSuggestions = useMemo(() => {
    return pickSuggestions([...suggestJobs.map((j) => j?.location), ...DEFAULT_LOCATION_SUGGESTIONS], filters.location);
  }, [suggestJobs, filters.location]);

  function applySuggestion(name, value) {
    setFilters((s) => ({ ...s, [name]: value }));
    setOpenSuggest(null);
    setActiveIndex(-1);
  }

  function onKeyDownSuggest(e, name, suggestions) {
    if (!openSuggest || openSuggest !== name) return;
    if (e.key === 'Escape') {
      setOpenSuggest(null);
      setActiveIndex(-1);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        e.preventDefault();
        applySuggestion(name, suggestions[activeIndex]);
      }
    }
  }

  return (
    <div className="container page">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'end', gap: 12 }}>
        <div>
          <h1 className="h1" style={{ marginTop: 0 }}>Job Listings</h1>
          <p className="muted">Search and filter by skills, location, and salary.</p>
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="grid gridFilters">
          <div className="field">
            <label className="label" htmlFor="q">Search</label>
            <div className="suggestWrap">
              <input
                className="input"
                id="q"
                name="q"
                value={filters.q}
                onChange={onChange}
                onFocus={() => { setOpenSuggest('q'); setActiveIndex(-1); }}
                onBlur={() => setTimeout(() => setOpenSuggest((s) => (s === 'q' ? null : s)), 120)}
                onKeyDown={(e) => onKeyDownSuggest(e, 'q', qSuggestions)}
                placeholder="e.g., Frontend, Python, Designer"
                autoComplete="off"
              />
              {openSuggest === 'q' && qSuggestions.length ? (
                <div className="suggestList" role="listbox" aria-label="Search suggestions">
                  {qSuggestions.map((s, idx) => (
                    <button
                      key={s}
                      type="button"
                      className={`suggestItem ${idx === activeIndex ? 'suggestItemActive' : ''}`}
                      onMouseDown={(e) => { e.preventDefault(); applySuggestion('q', s); }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <div className="field">
            <label className="label" htmlFor="skill">Skill</label>
            <div className="suggestWrap">
              <input
                className="input"
                id="skill"
                name="skill"
                value={filters.skill}
                onChange={onChange}
                onFocus={() => { setOpenSuggest('skill'); setActiveIndex(-1); }}
                onBlur={() => setTimeout(() => setOpenSuggest((s) => (s === 'skill' ? null : s)), 120)}
                onKeyDown={(e) => onKeyDownSuggest(e, 'skill', skillSuggestions)}
                placeholder="e.g., React"
                autoComplete="off"
              />
              {openSuggest === 'skill' && skillSuggestions.length ? (
                <div className="suggestList" role="listbox" aria-label="Skill suggestions">
                  {skillSuggestions.map((s, idx) => (
                    <button
                      key={s}
                      type="button"
                      className={`suggestItem ${idx === activeIndex ? 'suggestItemActive' : ''}`}
                      onMouseDown={(e) => { e.preventDefault(); applySuggestion('skill', s); }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <div className="field">
            <label className="label" htmlFor="location">Location</label>
            <div className="suggestWrap">
              <input
                className="input"
                id="location"
                name="location"
                value={filters.location}
                onChange={onChange}
                onFocus={() => { setOpenSuggest('location'); setActiveIndex(-1); }}
                onBlur={() => setTimeout(() => setOpenSuggest((s) => (s === 'location' ? null : s)), 120)}
                onKeyDown={(e) => onKeyDownSuggest(e, 'location', locationSuggestions)}
                placeholder="e.g., New York"
                autoComplete="off"
              />
              {openSuggest === 'location' && locationSuggestions.length ? (
                <div className="suggestList" role="listbox" aria-label="Location suggestions">
                  {locationSuggestions.map((s, idx) => (
                    <button
                      key={s}
                      type="button"
                      className={`suggestItem ${idx === activeIndex ? 'suggestItemActive' : ''}`}
                      onMouseDown={(e) => { e.preventDefault(); applySuggestion('location', s); }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <div className="field">
            <label className="label" htmlFor="minSalary">Min salary</label>
            <input
              className="input"
              id="minSalary"
              name="minSalary"
              value={filters.minSalary}
              onChange={onChange}
              inputMode="numeric"
              placeholder="e.g., 60000"
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="maxSalary">Max salary</label>
            <input
              className="input"
              id="maxSalary"
              name="maxSalary"
              value={filters.maxSalary}
              onChange={onChange}
              inputMode="numeric"
              placeholder="e.g., 120000"
            />
          </div>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 10, gap: 10 }}>
          <button className="btn btnGhost" type="button" onClick={clear}>
            Clear
          </button>
        </div>
      </div>

      {error ? <div className="alert" style={{ marginTop: 14 }}>{error}</div> : null}

      {loading ? (
        <div className="card" style={{ marginTop: 14 }}>Loading jobs...</div>
      ) : jobs.length ? (
        <div className="grid" style={{ marginTop: 14 }}>
          {jobs
            .filter((job) => {
              const t = (job?.title || '').toString().trim();
              // hide seeded/demo jobs that start with 'Demo' or 'Demo '
              if (!t) return false;
              if (/^demo\b/i.test(t)) return false;
              return true;
            })
            .map((job) => {
            const matchPercent =
              user?.role === 'seeker'
                ? computeJobMatchPercent({
                  profileSkills: profile?.skills,
                  hasResume: Boolean(profile?.resume_filename),
                  jobSkillsRequired: job?.skills_required,
                })
                : null;

            return <JobCard key={job.id} job={job} matchPercent={matchPercent} isSaved={job.is_open === false ? false : job.is_saved} />;
          })}
        </div>
      ) : (
        <div style={{ marginTop: 14 }}>
          <EmptyState
            title="No jobs found"
            description="Try clearing filters or check back later."
            actionLabel="Clear filters"
            onAction={clear}
          />
        </div>
      )}
    </div>
  );
}
