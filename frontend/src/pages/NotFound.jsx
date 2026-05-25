import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container page">
      <div className="card" style={{ textAlign: 'center' }}>
        <h1 className="h1" style={{ marginTop: 0 }}>Page not found</h1>
        <p className="muted">The page you’re looking for doesn’t exist.</p>
        <div style={{ marginTop: 12 }}>
          <Link className="btn btnPrimary" to="/">
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
