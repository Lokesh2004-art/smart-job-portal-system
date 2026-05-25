import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';

function MultiStatusChart({ trend, trendByStatus }) {
  // trend: [{date, count}], trendByStatus: {status: [{date,count}]}
  const width = 640;
  const height = 120;
  const pad = 24;
  const dates = (trend || []).map((d) => d.date);
  if (!dates.length) return <div className="muted">No recent activity</div>;

  const max = Math.max(...(trend || []).map((d) => d.count), 1);
  const step = (width - pad * 2) / Math.max(dates.length - 1, 1);

  const statusKeys = Object.keys(trendByStatus || {});
  const colors = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  const [hoverIndex, setHoverIndex] = useState(-1);

  function xFor(i) {
    return pad + i * step;
  }

  function yFor(value) {
    return height - pad - (value / max) * (height - pad * 2);
  }

  const paths = statusKeys.map((st, si) => {
    const pts = (trendByStatus[st] || []).map((d, i) => {
      const x = xFor(i);
      const y = yFor(d.count || 0);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    }).join(' ');
    return { status: st, path: pts, color: colors[si % colors.length] };
  });

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: height }} onMouseLeave={() => setHoverIndex(-1)}>
        {paths.map((p) => (
          <path key={p.status} d={p.path} fill="none" stroke={p.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        ))}

        {/* hover vertical line and points */}
        {hoverIndex >= 0 ? (
          <g>
            <line x1={xFor(hoverIndex)} x2={xFor(hoverIndex)} y1={pad} y2={height - pad} stroke="#ffffff55" strokeWidth={1} />
            {statusKeys.map((st, si) => {
              const v = (trendByStatus[st] || [])[hoverIndex]?.count || 0;
              const cx = xFor(hoverIndex);
              const cy = yFor(v);
              return <circle key={st} cx={cx} cy={cy} r={3} fill={colors[si % colors.length]} />;
            })}
          </g>
        ) : null}

        {/* invisible rect to capture mouse moves */}
        <rect x={pad} y={pad} width={width - pad * 2} height={height - pad * 2} fill="transparent"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const idx = Math.round((x / rect.width) * (dates.length - 1));
            setHoverIndex(Math.max(0, Math.min(dates.length - 1, idx)));
          }}
        />
      </svg>

      {/* tooltip */}
      {hoverIndex >= 0 ? (
        <div style={{ position: 'absolute', left: xFor(hoverIndex), top: 0, transform: 'translateX(8px)', background: '#0b1220', color: '#fff', padding: 8, borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.5)', fontSize: 12 }}>
          <div style={{ fontWeight: 600 }}>{dates[hoverIndex]}</div>
          {statusKeys.map((st, si) => (
            <div key={st} style={{ color: colors[si % colors.length], display: 'flex', justifyContent: 'space-between' }}>
              <span>{st}</span>
              <span style={{ marginLeft: 12 }}>{(trendByStatus[st] || [])[hoverIndex]?.count || 0}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function StatusPieChart({ counts }) {
  const entries = Object.entries(counts || {}).filter(([,v])=> (v||0) > 0);
  if (!entries.length) return <div className="muted">No status data to display</div>;
  const total = entries.reduce((s, [, v])=> s + (v || 0), 0) || 1;
  let angle = 0;
  const radius = 80;
  const cx = 100;
  const cy = 100;
  const colors = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
  return (
    <svg viewBox="0 0 200 200" width={200} height={200}>
      {entries.map(([k, v], i)=>{
        const frac = (v||0)/total;
        const start = angle * Math.PI/180;
        const end = (angle + frac*360) * Math.PI/180;
        const x1 = cx + radius * Math.cos(start);
        const y1 = cy + radius * Math.sin(start);
        const x2 = cx + radius * Math.cos(end);
        const y2 = cy + radius * Math.sin(end);
        const large = frac > 0.5 ? 1 : 0;
        const path = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} Z`;
        angle += frac*360;
        return <path key={k} d={path} fill={colors[i % colors.length]} stroke="#0b1220" strokeWidth={0.5} />;
      })}
      {/* legend */}
      {entries.map(([k,v], i)=> (
        <g key={k} transform={`translate(10, ${10 + i*16})`}>
          <rect width="12" height="12" fill={['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'][i % 6]} />
          <text x="18" y="10" fontSize="11" fill="#cbd5e1">{k} ({v})</text>
        </g>
      ))}
    </svg>
  );
}

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

const DEFAULT_RECRUITER_SUGGESTIONS = [
  'Frontend Developer',
  'Full Stack Developer',
  'Python Developer',
  'Remote',
  'Hyderabad',
  'Full-time',
  'Internship',
];

export default function RecruiterDashboard() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [metrics, setMetrics] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [rangeDays, setRangeDays] = useState(30);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [chartMode, setChartMode] = useState('multi');

  const [search, setSearch] = useState('');
  const [openSuggest, setOpenSuggest] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const suggestions = useMemo(() => {
    return pickSuggestions(
      [...jobs.flatMap((j) => [j?.title, j?.location, j?.job_type]), ...DEFAULT_RECRUITER_SUGGESTIONS],
      search
    );
  }, [jobs, search]);

  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((j) => {
      const hay = `${j?.title || ''} ${j?.location || ''} ${j?.job_type || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [jobs, search]);

  async function loadJobs() {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/jobs/mine');
      setJobs(res.data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }

  async function loadMetrics() {
    setMetricsLoading(true);
    try {
      const params = {};
      if (rangeDays) params.days = rangeDays;
      if (selectedJobId) params.job_id = selectedJobId;
      if (selectedStatus) params.status = selectedStatus;
      const res = await api.get('/api/recruiter/metrics', { params });
      setMetrics(res.data);
    } catch (err) {
      // non-fatal
      console.error('Failed to load metrics', err?.response?.data || err);
      setMetrics(null);
    } finally {
      setMetricsLoading(false);
    }
  }

  useEffect(() => {
    loadJobs();
    loadMetrics();
  }, []);

  // reload metrics when filters change
  useEffect(() => {
    loadMetrics();
  }, [rangeDays, selectedJobId, selectedStatus]);

  async function onDelete(id) {
    if (!confirm('Delete this job posting?')) return;
    try {
      await api.delete(`/api/jobs/${id}`);
      await loadJobs();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to delete job');
    }
  }

  function applySuggestion(value) {
    setSearch(value);
    setOpenSuggest(false);
    setActiveIndex(-1);
  }

  function onKeyDownSuggest(e) {
    if (!openSuggest) return;
    if (e.key === 'Escape') {
      setOpenSuggest(false);
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
        applySuggestion(suggestions[activeIndex]);
      }
    }
  }

  return (
    <div className="container page">
      <div className="row" style={{ justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 className="h1" style={{ marginTop: 0 }}>Recruiter Dashboard</h1>
          <p className="muted">Manage job listings and view applicants.</p>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <Link className="btn btnPrimary" to="/recruiter/post-job">Post Job</Link>
          <Link className="btn btnGhost" to="/profile">Company Profile</Link>
        </div>
      </div>

      {error ? <div className="alert" style={{ marginTop: 14 }}>{error}</div> : null}

      {/* Metrics + Trend */}
      <div style={{ marginTop: 14 }}>
        {!metricsLoading && metrics ? (
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
              <div style={{ minWidth: 160 }} className="statCard">
                <div className="muted">Total Jobs</div>
                <div className="h2">{metrics.total_jobs}</div>
              </div>
              <div style={{ minWidth: 160 }} className="statCard">
                <div className="muted">Open Jobs</div>
                <div className="h2">{metrics.open_jobs}</div>
              </div>
              <div style={{ minWidth: 160 }} className="statCard">
                <div className="muted">Total Applicants</div>
                <div className="h2">{metrics.total_applicants}</div>
              </div>
              <div style={{ flex: '1 1 320px' }}>
                <div className="muted">Applications (trend)</div>
                <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <label className="label" style={{ margin: 0 }}>Chart:</label>
                    <button className={`btn ${chartMode==='multi'?'btnPrimary':'btnGhost'}`} onClick={()=>setChartMode('multi')}>Multi-line</button>
                    <button className={`btn ${chartMode==='pie'?'btnPrimary':'btnGhost'}`} onClick={()=>setChartMode('pie')}>Status Pie</button>
                  </div>
                  {chartMode === 'multi' ? (
                    <MultiStatusChart trend={metrics.trend} trendByStatus={metrics.trend_by_status} />
                  ) : (
                    <div style={{ maxWidth: 420 }}>
                      <StatusPieChart counts={metrics.status_counts || {}} />
                    </div>
                  )}
                </div>
              </div>
            </div>
              <div style={{ marginTop: 10 }} className="muted">Status breakdown: {Object.entries(metrics.status_counts || {}).map(([k,v])=> `${k}: ${v}`).join(' • ')}</div>
              <div style={{ marginTop: 12 }}>
                <div className="muted">Average applications per job: <strong>{metrics.avg_apps_per_job ? metrics.avg_apps_per_job.toFixed(2) : '—'}</strong></div>
                <div className="muted">Avg time to first application: <strong>{metrics.avg_time_to_first_app_days !== null ? metrics.avg_time_to_first_app_days.toFixed(1) + ' days' : '—'}</strong></div>
                <div style={{ marginTop: 8 }}>
                  <div className="muted">Top jobs by applicants:</div>
                  <ul style={{ margin: '6px 0 0 14px' }}>
                    {(metrics.top_jobs || []).map(t=> (
                      <li key={t.job_id}>{t.title} — {t.applicants}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div style={{ marginTop: 12 }} className="row" style={{ gap: 8, alignItems: 'center' }}>
                <label className="label" style={{ margin: 0 }}>Range:</label>
                <select className="input" value={rangeDays} onChange={(e)=>setRangeDays(parseInt(e.target.value || 30))} style={{ width: 120 }}>
                  <option value={7}>Last 7 days</option>
                  <option value={30}>Last 30 days</option>
                  <option value={90}>Last 90 days</option>
                  <option value={180}>Last 180 days</option>
                </select>

                <label className="label" style={{ margin: 0 }}>Job:</label>
                <select className="input" value={selectedJobId} onChange={(e)=>setSelectedJobId(e.target.value)} style={{ minWidth: 160 }}>
                  <option value="">All jobs</option>
                  {jobs.map(j=> (
                    <option key={j.id} value={j.id}>{j.title}</option>
                  ))}
                </select>

                <label className="label" style={{ margin: 0 }}>Status:</label>
                <select className="input" value={selectedStatus} onChange={(e)=>setSelectedStatus(e.target.value)} style={{ minWidth: 160 }}>
                  <option value="">All statuses</option>
                  {Object.keys(metrics.status_counts || {}).map(s=> (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                <button className="btn btnGhost" onClick={()=>loadMetrics()}>Refresh</button>
              </div>
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="card" style={{ marginTop: 14 }}>Loading...</div>
      ) : (
        <div className="card" style={{ marginTop: 14 }}>
          <div className="row" style={{ justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
            <div style={{ minWidth: 320, flex: '1 1 320px' }}>
              <div className="field" style={{ margin: 0 }}>
                <label className="label" htmlFor="recruiterSearch">Search postings</label>
                <div className="suggestWrap">
                  <input
                    className="input"
                    id="recruiterSearch"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setActiveIndex(-1); }}
                    onFocus={() => { setOpenSuggest(true); setActiveIndex(-1); }}
                    onBlur={() => setTimeout(() => setOpenSuggest(false), 120)}
                    onKeyDown={onKeyDownSuggest}
                    placeholder="e.g., Frontend, Hyderabad, Full-time"
                    autoComplete="off"
                  />
                  {openSuggest && suggestions.length ? (
                    <div className="suggestList" role="listbox" aria-label="Recruiter search suggestions">
                      {suggestions.map((s, idx) => (
                        <button
                          key={s}
                          type="button"
                          className={`suggestItem ${idx === activeIndex ? 'suggestItemActive' : ''}`}
                          onMouseDown={(e) => { e.preventDefault(); applySuggestion(s); }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
            {search.trim() ? (
              <div className="row" style={{ gap: 10 }}>
                <span className="pill">Showing: {filteredJobs.length}</span>
                <button className="btn btnGhost" type="button" onClick={() => { setSearch(''); setOpenSuggest(false); setActiveIndex(-1); }}>
                  Clear
                </button>
              </div>
            ) : null}
          </div>

          <div className="table">
            <div className="thead">
              <div>Title</div>
              <div>Location</div>
              <div>Actions</div>
            </div>
            {filteredJobs.map((j) => (
              <div key={j.id} className="trow">
                <div>
                  <a href="#" onClick={(e) => { e.preventDefault(); navigate(`/jobs/${j.id}`); }}>{j.title}</a>
                  <div className="muted">{j.job_type || 'Role'}</div>
                </div>
                <div>{j.location || '—'}</div>
                <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                  <Link className="btn btnGhost" to={`/recruiter/jobs/${j.id}/applicants`}>
                    Applicants
                  </Link>
                  <Link className="btn btnGhost" to={`/recruiter/jobs/${j.id}/edit`}>
                    Edit
                  </Link>
                  <button className="btn btnDanger" onClick={() => onDelete(j.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {!filteredJobs.length ? (
              <div className="muted" style={{ padding: 14 }}>No job postings yet.</div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
