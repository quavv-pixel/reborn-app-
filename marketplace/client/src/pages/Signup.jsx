import { useId, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Signup() {
  const nameId = useId();
  const emailId = useId();
  const passwordId = useId();
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSupplier, setIsSupplier] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await signup({ displayName, email, password, isSupplier });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-16 px-4">
      <h1 className="text-2xl font-bold mb-6">Create your account</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor={nameId} className="block text-sm font-medium mb-1">
            Display name
          </label>
          <input
            id={nameId}
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor={emailId} className="block text-sm font-medium mb-1">
            Email
          </label>
          <input
            id={emailId}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor={passwordId} className="block text-sm font-medium mb-1">
            Password
          </label>
          <input
            id={passwordId}
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
          />
          <p className="text-xs text-slate-500 mt-1">At least 8 characters.</p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isSupplier}
            onChange={(e) => setIsSupplier(e.target.checked)}
          />
          I'm a supplier / wholesaler for other resellers
        </label>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {submitting ? 'Creating account…' : 'Sign up'}
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
        Already have an account?{' '}
        <Link to="/login" className="text-indigo-600 dark:text-indigo-400 font-medium">
          Log in
        </Link>
      </p>
    </div>
  );
}
