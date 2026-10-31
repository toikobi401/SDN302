import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, TOKEN } from '../api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(!sessionStorage.getItem(TOKEN));

  useEffect(() => {
    if (!sessionStorage.getItem(TOKEN)) return;
    api('/auth/me').then(result => setUser(result.data))
      .catch(() => sessionStorage.removeItem(TOKEN))
      .finally(() => setReady(true));
  }, []);

  function signIn(token, account) {
    sessionStorage.setItem(TOKEN, token);
    setUser(account);
  }

  async function signOut() {
    try { await api('/auth/logout', { method: 'POST' }); }
    finally {
      sessionStorage.removeItem(TOKEN);
      setUser(null);
      navigate('/');
    }
  }

  return <AuthContext.Provider value={{ user, ready, signIn, signOut }}>{children}</AuthContext.Provider>;
}
