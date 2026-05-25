import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

const TOKEN_KEY = 'sjps_token';
const USER_KEY = 'sjps_user';

function isNonEmpty(value) {
  return typeof value === 'string' ? Boolean(value.trim()) : value !== null && value !== undefined;
}

function getMissingProfileFields(role, profile) {
  if (!role || !profile) return ['profile'];

  const missing = [];

  if (role === 'seeker') {
    if (!isNonEmpty(profile.full_name)) missing.push('full_name');
    if (!isNonEmpty(profile.phone)) missing.push('phone');
    if (!isNonEmpty(profile.location)) missing.push('location');
    if (!isNonEmpty(profile.skills)) missing.push('skills');
  } else if (role === 'recruiter') {
    if (!isNonEmpty(profile.company_name)) missing.push('company_name');
    if (!isNonEmpty(profile.company_location)) missing.push('company_location');
  }

  return missing;
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(Boolean(token && !user));

  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadMe() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get('/api/auth/me');
        if (!active) return;
        const me = res.data;
        const saved = { id: me.id, email: me.email, role: me.role };
        setUser(saved);
        localStorage.setItem(USER_KEY, JSON.stringify(saved));
      } catch {
        if (!active) return;
        setToken(null);
        setUser(null);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadMe();
    return () => {
      active = false;
    };
  }, [token]);

  async function refreshProfile() {
    if (!token) {
      setProfile(null);
      setProfileLoaded(false);
      return null;
    }
    const res = await api.get('/api/profile');
    setProfile(res.data);
    setProfileLoaded(true);
    return res.data;
  }

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      if (!token || !user) {
        setProfile(null);
        setProfileLoading(false);
        setProfileLoaded(false);
        return;
      }
      try {
        setProfileLoading(true);
        setProfileLoaded(false);
        const res = await api.get('/api/profile');
        if (!active) return;
        setProfile(res.data);
      } catch {
        if (!active) return;
        setProfile(null);
      } finally {
        if (active) {
          setProfileLoading(false);
          setProfileLoaded(true);
        }
      }
    }

    loadProfile();
    return () => {
      active = false;
    };
  }, [token, user]);

  async function login({ email, password }) {
    const res = await api.post('/api/auth/login', { email, password });
    const { access_token, user: u } = res.data;
    setToken(access_token);
    setUser(u);
    localStorage.setItem(TOKEN_KEY, access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    return u;
  }

  async function register({ email, password, role }) {
    await api.post('/api/auth/register', { email, password, role });
  }

  function logout() {
    setToken(null);
    setUser(null);
    setProfile(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  const missingProfileFields = useMemo(
    () => getMissingProfileFields(user?.role, profile),
    [user?.role, profile]
  );
  const isProfileComplete = useMemo(
    () => Boolean(user?.role && profile && missingProfileFields.length === 0),
    [user?.role, profile, missingProfileFields]
  );

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      isAuthed: Boolean(token && user),
      profile,
      profileLoading,
      profileLoaded,
      missingProfileFields,
      isProfileComplete,
      login,
      register,
      refreshProfile,
      logout,
    }),
    [token, user, loading, profile, profileLoading, profileLoaded, missingProfileFields, isProfileComplete]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
