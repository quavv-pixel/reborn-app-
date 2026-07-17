import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white/90 dark:bg-slate-950/90 backdrop-blur z-10">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
          Reborn Market
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <Link to="/" className="hover:text-indigo-600 dark:hover:text-indigo-400">
            Browse
          </Link>
          {user && (
            <>
              <Link to="/listings/new" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                Sell an item
              </Link>
              <Link to="/messages" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                Messages
              </Link>
              <Link to="/dashboard" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                Dashboard
              </Link>
            </>
          )}
          {user ? (
            <div className="flex items-center gap-3 pl-3 border-l border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">{user.displayName}</span>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Log out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 pl-3 border-l border-slate-200 dark:border-slate-800">
              <Link
                to="/login"
                className="px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className="px-3 py-1.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-500"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
