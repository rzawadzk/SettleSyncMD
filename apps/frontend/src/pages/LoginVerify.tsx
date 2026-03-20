import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';

export default function LoginVerify() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setError(t('auth.verifyError'));
      return;
    }

    api.get<{ token: string; arbiter: { id: number; email: string } }>(`/auth/verify?token=${encodeURIComponent(token)}`)
      .then((data) => {
        login(data.token, data.arbiter);
        navigate('/dashboard', { replace: true });
      })
      .catch(() => {
        setError(t('auth.verifyError'));
      });
  }, [searchParams, login, navigate, t]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 shadow-xl text-center max-w-md">
        {error ? (
          <>
            <h2 className="text-lg font-semibold text-red-400 mb-2">{t('common.error')}</h2>
            <p className="text-slate-400">{error}</p>
          </>
        ) : (
          <>
            <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-slate-300">{t('auth.verifying')}</p>
          </>
        )}
      </div>
    </div>
  );
}
