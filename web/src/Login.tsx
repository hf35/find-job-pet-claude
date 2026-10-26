import { useState, type FormEvent } from 'react';
import { api, ApiError } from './api';

export function Login({ onLoggedIn }: { onLoggedIn: (username: string) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await api<{ username: string }>('/api/auth/login', {
        method: 'POST',
        body: { username, password },
      });
      onLoggedIn(res.username);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429)
        setError('Слишком много попыток, подождите');
      else if (err instanceof ApiError && err.status === 401) setError('Неверный логин или пароль');
      else setError('Не удалось войти');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container login">
      <h1>Find Job</h1>
      <form onSubmit={submit}>
        <label>
          Логин
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoFocus
            required
          />
        </label>
        <label>
          Пароль
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={busy}>
          Войти
        </button>
      </form>
    </main>
  );
}
