import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';

export default function AdminLogin() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language === 'pl' ? 'en' : 'pl');
  };

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post<{ otpRequired: boolean }>('/auth/admin-login', { email, password });
      if (res.otpRequired) {
        setStep('otp');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post<{ token: string; arbiter: { id: number; email: string; role: 'admin' } }>('/auth/verify-otp', { email, code: otpCode });
      login(res.token, res.arbiter);
      navigate('/dashboard', { replace: true });
    } catch {
      setError(t('auth.otpInvalid'));
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
          {step === 'credentials' ? (
            <>
              <h2 className="text-xl font-semibold text-slate-100 mb-1">{t('auth.adminLogin')}</h2>
              <p className="text-slate-400 text-sm mb-6">{t('auth.adminLoginSubtitle')}</p>

              <form onSubmit={handleCredentials} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('auth.emailPlaceholder')}
                    required
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">{t('auth.password')}</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('auth.passwordPlaceholder')}
                    required
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {error && <p className="text-sm text-red-400">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-md transition"
                >
                  {loading ? t('common.loading') : t('common.submit')}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-slate-100 mb-1">{t('auth.otpTitle')}</h2>
              <p className="text-slate-400 text-sm mb-6">{t('auth.otpSubtitle')}</p>

              <form onSubmit={handleOtp} className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder={t('auth.otpPlaceholder')}
                    required
                    maxLength={6}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest"
                  />
                </div>

                {error && <p className="text-sm text-red-400">{error}</p>}

                <button
                  type="submit"
                  disabled={loading || otpCode.length !== 6}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-md transition"
                >
                  {loading ? t('common.loading') : t('auth.otpVerify')}
                </button>
              </form>
            </>
          )}
        </div>

        <div className="text-center mt-4 space-y-2">
          <div>
            <Link to="/login" className="text-sm text-slate-500 hover:text-slate-300 transition">
              {t('auth.backToLogin')}
            </Link>
          </div>
          <div>
            <button onClick={toggleLang} className="text-sm text-slate-500 hover:text-slate-300 transition">
              {i18n.language === 'pl' ? 'English' : 'Polski'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
