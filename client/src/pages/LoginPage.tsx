import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim()) return;
    setLoading(true);
    setError('');
    try {
      await login(username.trim());
    } catch (e) {
      setError((e as Error).message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="panel max-w-sm w-full">
        <div className="panel-header">
          <span className="font-semibold tracking-tight">baberu</span>
        </div>
        <div className="panel-body space-y-4 p-6">
          <p className="text-muted text-sm text-center">Enter a username to get started</p>
          <input
            className="w-full border border-border rounded-sm px-3 py-2 bg-white text-sm outline-none focus:border-border-strong"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            autoFocus
          />
          {error && <p className="text-danger text-xs">{error}</p>}
          <button className="btn-primary w-full" onClick={handleLogin} disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </div>
      </div>
    </div>
  );
}
