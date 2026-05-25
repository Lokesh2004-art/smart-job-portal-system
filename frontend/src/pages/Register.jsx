import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import FormInput from '../components/FormInput';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({
    email: '',
    password: '',
    confirm: '',
    role: 'seeker',
  });
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
    if (form.password && form.password.length < 6)
      next.password = 'Password must be at least 6 characters';
    if (form.confirm !== form.password) next.confirm = 'Passwords do not match';
    if (!['seeker', 'recruiter'].includes(form.role)) next.role = 'Invalid role';
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
      await register({ email: form.email, password: form.password, role: form.role });
      navigate('/login');
    } catch (err) {
      setApiError(err?.response?.data?.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container page">
      <div className="card authCard">
        <h1 className="h1" style={{ marginTop: 0 }}>Register</h1>
        <p className="muted">Create an account as a job seeker or recruiter.</p>

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

          <div className="field">
            <label className="label" htmlFor="role">Role</label>
            <select
              id="role"
              name="role"
              className={`input ${errors.role ? 'inputError' : ''}`}
              value={form.role}
              onChange={onChange}
            >
              <option value="seeker">Job Seeker</option>
              <option value="recruiter">Recruiter</option>
            </select>
            {errors.role ? <div className="errorText">{errors.role}</div> : null}
          </div>

          <FormInput
            label="Password"
            name="password"
            value={form.password}
            onChange={onChange}
            type="password"
            placeholder="At least 6 characters"
            error={errors.password}
            autoComplete="new-password"
          />
          <FormInput
            label="Confirm Password"
            name="confirm"
            value={form.confirm}
            onChange={onChange}
            type="password"
            placeholder="Re-enter password"
            error={errors.confirm}
            autoComplete="new-password"
          />

          <button className="btn btnPrimary" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create account'}
          </button>
        </form>

        <div className="muted" style={{ marginTop: 12 }}>
          Already have an account? <Link to="/login">Login</Link>
        </div>
      </div>
    </div>
  );
}
