import { useEffect, useState } from 'react';

export function App() {
  const [status, setStatus] = useState('…');

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json() as Promise<{ status: string; version: string }>)
      .then((d) => setStatus(`${d.status} (v${d.version})`))
      .catch(() => setStatus('недоступен'));
  }, []);

  return (
    <main className="container">
      <h1>Find Job</h1>
      <p>Сервер: {status}</p>
    </main>
  );
}
