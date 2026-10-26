import { useEffect, useState } from 'react';
import { api } from './api';
import { Login } from './Login';

type Session = { state: 'loading' } | { state: 'anonymous' } | { state: 'user'; username: string };

export function App() {
  const [session, setSession] = useState<Session>({ state: 'loading' });

  useEffect(() => {
    api<{ username: string }>('/api/auth/me')
      .then((me) => setSession({ state: 'user', username: me.username }))
      .catch(() => setSession({ state: 'anonymous' }));
  }, []);

  async function logout() {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    setSession({ state: 'anonymous' });
  }

  if (session.state === 'loading') return null;
  if (session.state === 'anonymous') {
    return <Login onLoggedIn={(username) => setSession({ state: 'user', username })} />;
  }

  return (
    <>
      <header className="topbar">
        <strong>Find Job</strong>
        <span className="spacer" />
        <span className="muted">{session.username}</span>
        <button onClick={logout}>Выйти</button>
      </header>
      <main className="container">
        <p>Вы вошли. Здесь появятся поиски и вакансии.</p>
      </main>
    </>
  );
}
