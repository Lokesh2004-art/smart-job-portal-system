import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ roles, requireProfile }) {
  const location = useLocation();
  const { isAuthed, user, loading, profileLoaded, profileLoading, isProfileComplete } = useAuth();

  if (loading) {
    return (
      <div className="container" style={{ padding: '40px 0' }}>
        <div className="card">Loading...</div>
      </div>
    );
  }

  if (!isAuthed) return <Navigate to="/login" replace />;

  if (roles?.length && !roles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }

  if (requireProfile) {
    if (!profileLoaded || profileLoading) {
      return (
        <div className="container" style={{ padding: '40px 0' }}>
          <div className="card">Loading profile...</div>
        </div>
      );
    }
    if (!isProfileComplete) {
      return <Navigate to="/profile" replace state={{ from: location.pathname }} />;
    }
  }

  return <Outlet />;
}
