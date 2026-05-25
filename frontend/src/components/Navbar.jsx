import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const THEME_KEY = 'sjps_theme';

export default function Navbar() {
  const { isAuthed, user, logout } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'light');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }

  function onLogout() {
    logout();
    navigate('/');
  }

  return (
    <header className="nav">
      <div className="container navInner">
        <NavLink className="brand" to="/">
          <span className="brandMark" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M9 7.5V6.6C9 5.716 9.716 5 10.6 5h2.8C14.284 5 15 5.716 15 6.6v.9"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path
                d="M6.6 8.4h10.8c1.215 0 2.2.985 2.2 2.2v7.8c0 1.215-.985 2.2-2.2 2.2H6.6A2.2 2.2 0 0 1 4.4 18.4v-7.8c0-1.215.985-2.2 2.2-2.2Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <path
                d="M4.4 13.2h15.2"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                opacity="0.75"
              />
            </svg>
          </span>
          <span className="brandText">Smart Job Portal</span>
        </NavLink>

        <nav className="navLinks">
          <button
            type="button"
            className="btn btnGhost"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path
                  d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path d="M12 2.5v2.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M12 19.3v2.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M4.7 12H2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M21.5 12h-2.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M6 6l-1.6-1.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M19.6 19.6 18 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M18 6l1.6-1.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M4.4 19.6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path
                  d="M21 14.6A7.7 7.7 0 0 1 9.4 3a6.7 6.7 0 1 0 11.6 11.6Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>

          <NavLink className="navLink" to="/jobs">
            Jobs
          </NavLink>
          <NavLink className="navLink" to="/about">
            About
          </NavLink>

          {isAuthed ? (
            <>
              {user?.role === 'seeker' ? (
                <NavLink className="navLink" to="/dashboard">
                  Dashboard
                </NavLink>
              ) : (
                <NavLink className="navLink" to="/recruiter">
                  Recruiter
                </NavLink>
              )}
              {user?.role === 'seeker' ? (
                <>
                  <NavLink className="navLink" to="/saved">Saved</NavLink>
                </>
              ) : null}
              <NavLink className="navLink" to="/profile">
                Profile
              </NavLink>
              <button className="btn btnGhost" onClick={onLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink className="btn btnGhost" to="/login">
                Login
              </NavLink>
              <NavLink className="btn btnPrimary" to="/register">
                Register
              </NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
