import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { CaseDetail as CaseDetailType } from '@settlesync/shared';
import { api } from '../lib/api';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  one_agreed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  both_agreed: 'bg-green-500/10 text-green-400 border-green-500/20',
  expired: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

export default function CaseDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [caseData, setCaseData] = useState<CaseDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingLinks, setSendingLinks] = useState(false);
  const [linksSent, setLinksSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<CaseDetailType>(`/cases/${id}`)
      .then(setCaseData)
      .finally(() => setLoading(false));
  }, [id]);

  const handleSendLinks = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSendingLinks(true);

    const form = new FormData(e.currentTarget);
    try {
      await api.post(`/cases/${id}/send-links`, {
        partyAEmail: form.get('partyAEmail'),
        partyBEmail: form.get('partyBEmail'),
      });
      setLinksSent(true);
      // Odśwież dane sprawy
      const updated = await api.get<CaseDetailType>(`/cases/${id}`);
      setCaseData(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setSendingLinks(false);
    }
  };

  if (loading) return <div className="text-slate-400">{t('common.loading')}</div>;
  if (!caseData) return <div className="text-red-400">Case not found</div>;

  const allLinksSent = caseData.parties.every((p) => p.emailSent);

  return (
    <div>
      <Link to="/dashboard" className="text-sm text-slate-400 hover:text-slate-200 transition">
        &larr; {t('common.back')}
      </Link>

      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">{caseData.internalName}</h1>
          <p className="text-slate-400 mt-1">{caseData.arbitrationId}</p>
          {caseData.description && <p className="text-slate-500 text-sm mt-2">{caseData.description}</p>}
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusColors[caseData.status]}`}>
          {t(`dashboard.status.${caseData.status}`)}
        </span>
      </div>

      {/* Wysyłka linków */}
      {!allLinksSent && (
        <div className="mt-6 bg-slate-900 border border-slate-800 rounded-lg p-4">
          <h2 className="font-medium text-slate-100 mb-3">{t('caseDetail.sendLinks')}</h2>
          {linksSent ? (
            <p className="text-green-400 text-sm">{t('caseDetail.linksSent')}</p>
          ) : (
            <form onSubmit={handleSendLinks} className="space-y-3">
              <div>
                <label className="block text-sm text-slate-300 mb-1">{t('caseDetail.partyAEmail')}</label>
                <input
                  name="partyAEmail"
                  type="email"
                  required
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">{t('caseDetail.partyBEmail')}</label>
                <input
                  name="partyBEmail"
                  type="email"
                  required
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={sendingLinks}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-medium rounded-md transition text-sm"
              >
                {sendingLinks ? t('common.loading') : t('caseDetail.send')}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Status stron */}
      <div className="mt-6">
        <h2 className="font-medium text-slate-100 mb-3">{t('caseDetail.partyStatus')}</h2>
        <div className="space-y-3">
          {caseData.parties.map((p) => (
            <div key={p.party} className="bg-slate-900 border border-slate-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-slate-200">{t('caseDetail.party')} {p.party}</h3>
                {p.emailSent && (
                  <span className="text-xs text-slate-500">{t('caseDetail.emailSent')}: ✓</span>
                )}
              </div>

              {p.hasResponded ? (
                <div className="space-y-1 text-sm">
                  <div className="flex gap-2">
                    <span className="text-slate-400">{t('caseDetail.consent')}:</span>
                    <span className={p.consent === 'yes' ? 'text-green-400' : p.consent === 'no' ? 'text-red-400' : 'text-yellow-400'}>
                      {p.consent === 'yes' ? t('party.consentYes') : p.consent === 'no' ? t('party.consentNo') : t('party.consentLater')}
                    </span>
                  </div>
                  {p.timeHorizon && (
                    <div className="flex gap-2">
                      <span className="text-slate-400">{t('caseDetail.timeHorizon')}:</span>
                      <span className="text-slate-200">{t(`party.timeHorizons.${p.timeHorizon}`)}</span>
                    </div>
                  )}
                  {p.note && (
                    <div className="flex gap-2">
                      <span className="text-slate-400">{t('caseDetail.note')}:</span>
                      <span className="text-slate-300 italic">"{p.note}"</span>
                    </div>
                  )}
                  {p.respondedAt && (
                    <p className="text-xs text-slate-500 mt-1">
                      {t('caseDetail.responded')}: {new Date(p.respondedAt).toLocaleString('pl-PL')}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-500">{t('caseDetail.notResponded')}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
