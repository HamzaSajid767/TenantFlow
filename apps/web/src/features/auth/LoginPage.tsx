import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSession } from '../../shared/api/session';
import { errorMessage } from '../../shared/api/client';

export function LoginPage() {
  const { login } = useSession();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await login(email, password);
      navigate('/organizations');
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <form onSubmit={(event) => void onSubmit(event)} className="w-full max-w-md rounded-xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Sign in to SaaSForge</h1>
        <p className="mt-1 text-sm text-slate-500">Use your work email to continue.</p>
        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        <label className="mt-6 block text-sm font-medium">Email</label>
        <input
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <label className="mt-4 block text-sm font-medium">Password</label>
        <input
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button className="mt-6 w-full rounded-md bg-indigo-600 py-2.5 text-white hover:bg-indigo-500" type="submit">
          Sign in
        </button>
        <p className="mt-4 text-center text-sm text-slate-500">
          No account?{' '}
          <Link className="text-indigo-600" to="/register">
            Create one
          </Link>
        </p>
      </form>
    </div>
  );
}
