import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';

export default function Login() {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language === 'pl' ? 'en' : 'pl');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/magic-link', { email });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-100 tracking-tight">SettleSync</h1>
          <p className="text-slate-400 mt-2 text-sm">Secure Mediation Consent Portal</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 shadow-xl">
          {sent ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-4">✉️</div>
              <h2 className="text-lg font-semibold text-slate-100 mb-2">{t('auth.checkInbox')}</h2>
              <p className="text-slate-400 text-sm">{t('auth.magicLinkSent')}</p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-slate-100 mb-1">{t('auth.loginTitle')}</h2>
              <p className="text-slate-400 text-sm mb-6">{t('auth.loginSubtitle')}</p>

              <form onSubmit={handleSubmit}>
                <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('auth.emailPlaceholder')}
                  required
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />

                {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-4 w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-md transition"
                >
                  {loading ? t('common.loading') : t('auth.sendMagicLink')}
                </button>
              </form>
            </>
          )}
        </div>

        <div className="text-center mt-4">
          <button onClick={toggleLang} className="text-sm text-slate-500 hover:text-slate-300 transition">
            {i18n.language === 'pl' ? 'English' : 'Polski'}
          </button>
        </div>
      </div>
    </div>
  );
}
