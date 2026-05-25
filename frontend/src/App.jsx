import { Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import Footer from './components/Footer';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

import About from './pages/About';
import ApplicantsPage from './pages/ApplicantsPage';
import AppliedJobs from './pages/AppliedJobs';
import Home from './pages/Home';
import JobDetails from './pages/JobDetails';
import JobListings from './pages/JobListings';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import PostJob from './pages/PostJob';
import Profile from './pages/Profile';
import RecruiterDashboard from './pages/RecruiterDashboard';
import Register from './pages/Register';
import SeekerDashboard from './pages/SeekerDashboard';
import SavedJobs from './pages/SavedJobs';

export default function App() {
  return (
    <div className="appShell">
      <Navbar />
      <main className="appMain">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/jobs" element={<JobListings />} />
          <Route path="/jobs/:id" element={<JobDetails />} />

          <Route element={<ProtectedRoute roles={['seeker']} requireProfile />}>
            <Route path="/dashboard" element={<SeekerDashboard />} />
            <Route path="/applied" element={<AppliedJobs />} />
            <Route path="/saved" element={<SavedJobs />} />
          </Route>

          <Route element={<ProtectedRoute roles={['recruiter']} requireProfile />}>
            <Route path="/recruiter" element={<RecruiterDashboard />} />
            <Route path="/recruiter/post-job" element={<PostJob />} />
            <Route path="/recruiter/jobs/:id/edit" element={<PostJob />} />
            <Route path="/recruiter/jobs/:id/applicants" element={<ApplicantsPage />} />
          </Route>

          <Route element={<ProtectedRoute roles={['seeker', 'recruiter']} />}>
            <Route path="/profile" element={<Profile />} />
          </Route>

          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
