import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { CaseSummary } from '@settlesync/shared';
import { api } from '../lib/api';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  one_agreed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  both_agreed: 'bg-green-500/10 text-green-400 border-green-500/20',
  expired: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

export default function Dashboard() {
  const { t } = useTranslation();
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<CaseSummary[]>('/cases')
      .then(setCases)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-100">{t('dashboard.title')}</h1>
        <Link
          to="/cases/new"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-md transition text-sm"
        >
          + {t('dashboard.createCase')}
        </Link>
      </div>

      {loading ? (
        <div className="text-slate-400">{t('common.loading')}</div>
      ) : cases.length === 0 ? (
        <div className="text-center py-16 text-slate-500">{t('dashboard.noCases')}</div>
      ) : (
        <div className="space-y-3">
          {cases.map((c) => (
            <Link
              key={c.id}
              to={`/cases/${c.id}`}
              className="block bg-slate-900 border border-slate-800 rounded-lg p-4 hover:border-slate-700 transition"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-slate-100">{c.internalName}</h3>
                  <p className="text-sm text-slate-400 mt-0.5">{c.arbitrationId}</p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusColors[c.status]}`}>
                  {t(`dashboard.status.${c.status}`)}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {new Date(c.createdAt).toLocaleDateString('pl-PL')}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
