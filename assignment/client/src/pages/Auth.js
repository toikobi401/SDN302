import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Auth({ register = false }) {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true); setError('');
    try {
      if (register) await api('/auth/register', { method: 'POST', body: JSON.stringify(fields) });
      const result = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email: fields.email, password: fields.password }) });
      signIn(result.data.token, result.data.user);
      navigate(state?.from || '/', { replace: true });
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return <div className="container page narrow">
    <h1>{register ? 'Create account' : 'Sign in'}</h1>
    {error && <p className="message error" role="alert">{error}</p>}
    <form className="stack" onSubmit={submit}>
      {register && <label>Name<input name="name" required autoComplete="name" /></label>}
      <label>Email<input name="email" type="email" required autoComplete="email" /></label>
      <label>Password<input name="password" type="password" required minLength={register ? 8 : 1} autoComplete={register ? 'new-password' : 'current-password'} /></label>
      <button className="action" disabled={busy} type="submit">{busy ? 'Please wait...' : register ? 'Create account' : 'Sign in'}</button>
    </form>
    <p><Link to={register ? '/login' : '/register'} state={state}>{register ? 'Already have an account? Sign in' : 'New here? Create an account'}</Link></p>
  </div>;
}
