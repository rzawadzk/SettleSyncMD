import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';

export default function Layout() {
  const { t, i18n } = useTranslation();
  const { arbiter, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language === 'pl' ? 'en' : 'pl');
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <Link to="/dashboard" className="text-xl font-semibold text-slate-100 tracking-tight">
            {t('common.appName')}
          </Link>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleLang}
              className="text-sm text-slate-400 hover:text-slate-200 transition"
            >
              {i18n.language === 'pl' ? 'EN' : 'PL'}
            </button>
            {arbiter && (
              <>
                <span className="text-sm text-slate-400">{arbiter.email}</span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-slate-400 hover:text-red-400 transition"
                >
                  {t('auth.logout')}
                </button>
              </>
            )}
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
