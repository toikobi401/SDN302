import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Auth({ register = false, admin = false }) {
  const { user, ready, signIn } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function destination(account) {
    const from = state?.from;
    const adminPath = typeof from === 'string' && /^\/admin(?:[/?#]|$)/.test(from);
    if (typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') &&
        !/^\/(?:admin\/)?(?:login|register)(?:[/?#]|$)/.test(from) &&
        (!adminPath || account.role === 'ADMIN') && (!admin || adminPath)) return from;
    return { ADMIN: '/admin', SHIPPER: '/shipper' }[account.role] || '/';
  }

  if (admin && !ready) return <p className="container page" role="status">Loading your account...</p>;
  if (admin && user?.role === 'ADMIN') return <Navigate to={destination(user)} replace />;

  async function submit(event) {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true); setError('');
    try {
      if (register) await api('/auth/register', { method: 'POST', body: JSON.stringify(fields) });
      const result = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email: fields.email, password: fields.password }) });
      if (admin && result.data.user.role !== 'ADMIN') {
        setError('Administrator access only. Please use an administrator account.');
        return;
      }
      signIn(result.data.token, result.data.user);
      navigate(destination(result.data.user), { replace: true });
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return <div className="container page narrow">
    {admin && <p className="admin-login-brand">Booksaw administration</p>}
    <h1>{admin ? 'Admin sign in' : register ? 'Create account' : 'Sign in'}</h1>
    {admin && <p>Sign in with your administrator account to manage the store.</p>}
    {error && <p className="message error" role="alert">{error}</p>}
    <form className="stack" onSubmit={submit}>
      {register && <label>Name<input name="name" required autoComplete="name" /></label>}
      <label>Email<input name="email" type="email" required autoComplete="email" /></label>
      <label>Password<input name="password" type="password" required minLength={register ? 8 : 1} autoComplete={register ? 'new-password' : 'current-password'} /></label>
      <button className="action" disabled={busy} type="submit">{busy ? 'Please wait...' : register ? 'Create account' : 'Sign in'}</button>
    </form>
    <p>{admin ? <Link to="/">Back to the store</Link> : <Link to={register ? '/login' : '/register'} state={state}>{register ? 'Already have an account? Sign in' : 'New here? Create an account'}</Link>}</p>
  </div>;
}
