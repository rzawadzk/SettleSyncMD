import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TOKEN_TTL_HOURS } from '@settlesync/shared';
import { api } from '../lib/api';

export default function CreateCase() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const data = {
      internalName: form.get('internalName') as string,
      arbitrationId: form.get('arbitrationId') as string,
      description: (form.get('description') as string) || undefined,
      tokenTtlHours: parseInt(form.get('tokenTtlHours') as string, 10) || undefined,
    };

    try {
      const result = await api.post<{ id: number }>('/cases', data);
      navigate(`/cases/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-slate-100 mb-6">{t('createCase.title')}</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            {t('createCase.internalName')} *
          </label>
          <input
            name="internalName"
            required
            placeholder={t('createCase.internalNamePlaceholder')}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            {t('createCase.arbitrationId')} *
          </label>
          <input
            name="arbitrationId"
            required
            placeholder={t('createCase.arbitrationIdPlaceholder')}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            {t('createCase.description')}
          </label>
          <textarea
            name="description"
            rows={3}
            placeholder={t('createCase.descriptionPlaceholder')}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            {t('createCase.tokenTtl')}
          </label>
          <input
            name="tokenTtlHours"
            type="number"
            min={1}
            max={720}
            defaultValue={TOKEN_TTL_HOURS}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-slate-500 mt-1">{t('createCase.tokenTtlHelp')}</p>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-md transition"
        >
          {loading ? t('common.loading') : t('createCase.submit')}
        </button>
      </form>
    </div>
  );
}
