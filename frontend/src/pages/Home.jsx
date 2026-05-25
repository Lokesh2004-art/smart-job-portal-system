import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="container page">
      <div className="hero">
        <div>
          <h1 className="h1">Smart Job Portal System</h1>
          <p className="lead">
            A modern recruitment platform where job seekers and recruiters connect
            through a secure, role-based system.
          </p>
          <div className="row" style={{ gap: 12, marginTop: 18, flexWrap: 'wrap' }}>
            <Link className="btn btnPrimary" to="/jobs">
              Browse Jobs
            </Link>
            <Link className="btn btnGhost" to="/register">
              Create Account
            </Link>
          </div>
        </div>
        <div className="heroCard card">
          <div className="heroGrid">
            <div>
              <div className="metaLabel">For Job Seekers</div>
              <div className="metaValue">Search, apply, track applications</div>
            </div>
            <div>
              <div className="metaLabel">For Recruiters</div>
              <div className="metaValue">Post jobs, manage applicants</div>
            </div>
            <div>
              <div className="metaLabel">Security</div>
              <div className="metaValue">JWT auth + hashed passwords</div>
            </div>
            <div>
              <div className="metaLabel">Resumes</div>
              <div className="metaValue">Upload and share per application</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid" style={{ marginTop: 22 }}>
        <div className="card">
          <h2 className="h2">Find your next role</h2>
          <p className="muted">
            Use skill, location, and salary filters to discover relevant jobs.
          </p>
          <div style={{ marginTop: 12 }}>
            <Link className="btn btnPrimary" to="/jobs">
              Explore Listings
            </Link>
          </div>
        </div>

        <div className="card">
          <h2 className="h2">Hire with confidence</h2>
          <p className="muted">
            Create job postings, track applicants, and review resumes in one
            place.
          </p>
          <div style={{ marginTop: 12 }}>
            <Link className="btn btnPrimary" to="/register">
              Join as Recruiter
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
