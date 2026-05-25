import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import FormInput from '../components/FormInput';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function onChange(e) {
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }));
  }

  function validate() {
    const next = {};
    if (!form.email.trim()) next.email = 'Email is required';
    if (!form.password) next.password = 'Password is required';
    return next;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setApiError('');

    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    try {
      setSubmitting(true);
      const u = await login({ email: form.email, password: form.password });
      if (u.role === 'recruiter') navigate('/recruiter');
      else navigate('/dashboard');
    } catch (err) {
      setApiError(err?.response?.data?.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container page">
      <div className="card authCard">
        <h1 className="h1" style={{ marginTop: 0 }}>Login</h1>
        <p className="muted">Access your dashboard securely.</p>

        {apiError ? <div className="alert">{apiError}</div> : null}

        <form onSubmit={onSubmit} className="form">
          <FormInput
            label="Email"
            name="email"
            value={form.email}
            onChange={onChange}
            placeholder="you@example.com"
            error={errors.email}
            autoComplete="email"
          />
          <FormInput
            label="Password"
            name="password"
            value={form.password}
            onChange={onChange}
            type="password"
            placeholder="••••••••"
            error={errors.password}
            autoComplete="current-password"
          />

          <button className="btn btnPrimary" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Login'}
          </button>
        </form>

        <div className="muted" style={{ marginTop: 12 }}>
          Don’t have an account? <Link to="/register">Register</Link>
        </div>
      </div>
    </div>
  );
}
