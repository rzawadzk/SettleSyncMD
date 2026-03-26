import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { CaseDetail as CaseDetailType } from '@settlesync/shared';
import { api } from '../lib/api';
import { useAuth } from '../hooks/useAuth';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  one_agreed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  both_agreed: 'bg-green-500/10 text-green-400 border-green-500/20',
  declined: 'bg-red-500/10 text-red-400 border-red-500/20',
  expired: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

export default function CaseDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { arbiter } = useAuth();
  const isAdmin = arbiter?.role === 'admin';
  const [caseData, setCaseData] = useState<CaseDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingLinks, setSendingLinks] = useState(false);
  const [linksSent, setLinksSent] = useState(false);
  const [resending, setResending] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const [error, setError] = useState('');

  const refreshCase = async () => {
    try {
      const updated = await api.get<CaseDetailType>(`/cases/${id}`);
      setCaseData(updated);
    } catch {
      // silent refresh failure
    }
  };

  useEffect(() => {
    api.get<CaseDetailType>(`/cases/${id}`)
      .then(setCaseData)
      .catch(() => setError(t('common.error')))
      .finally(() => setLoading(false));
  }, [id, t]);

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
      await refreshCase();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setSendingLinks(false);
    }
  };

  const handleResend = async (party: string) => {
    const email = prompt(t('caseDetail.resendPrompt'));
    if (!email) return;

    setResending(party);
    setResendSuccess(null);
    try {
      await api.post(`/cases/${id}/resend-link`, { party, email });
      setResendSuccess(party);
      setTimeout(() => setResendSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setResending(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-slate-400">
        <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
        {t('common.loading')}
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">
        {t('caseDetail.notFound')}
      </div>
    );
  }

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
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded-full border cursor-help ${statusColors[caseData.status]}`}
          title={t(`dashboard.statusTooltip.${caseData.status}`)}
        >
          {t(`dashboard.status.${caseData.status}`)}
        </span>
      </div>

      {/* Send links form */}
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
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-md transition text-sm"
              >
                {sendingLinks ? t('common.loading') : t('caseDetail.send')}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Error display */}
      {error && allLinksSent && (
        <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Party status */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium text-slate-100">{t('caseDetail.partyStatus')}</h2>
          <button
            onClick={refreshCase}
            className="text-xs text-slate-500 hover:text-slate-300 transition"
          >
            {t('caseDetail.refresh')}
          </button>
        </div>

        {isAdmin ? (
          /* Admin: full per-party details */
          <div className="space-y-3">
            {caseData.parties.map((p) => (
              <div key={p.party} className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-slate-200">{t('caseDetail.party')} {p.party}</h3>
                  <div className="flex items-center gap-2">
                    {p.emailSent && (
                      <span className="text-xs text-slate-500">{t('caseDetail.emailSent')}: ✓</span>
                    )}
                    {p.emailSent && !p.hasResponded && (
                      <button
                        onClick={() => handleResend(p.party)}
                        disabled={resending === p.party}
                        className="text-xs px-2 py-1 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800 disabled:text-slate-600 text-slate-300 rounded transition"
                      >
                        {resending === p.party
                          ? t('common.loading')
                          : resendSuccess === p.party
                            ? '✓ ' + t('caseDetail.resendSuccess')
                            : t('caseDetail.resend')}
                      </button>
                    )}
                  </div>
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
        ) : (
          /* Mediator: aggregate anonymous view */
          <div className="space-y-3">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
              <p className="text-sm text-slate-300">
                {t('caseDetail.respondedCount', { count: caseData.respondedCount ?? 0 })}
              </p>
              <p className="text-xs text-slate-500 mt-1">{t('caseDetail.anonymousInfo')}</p>

              {/* Resend buttons for each party */}
              <div className="mt-3 space-y-2">
                {caseData.parties.map((p) => (
                  <div key={p.party} className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">
                      {t('caseDetail.party')} {p.party}
                      {p.emailSent && <span className="ml-2 text-xs text-slate-500">({t('caseDetail.emailSent')} ✓)</span>}
                    </span>
                    {p.emailSent && (
                      <button
                        onClick={() => handleResend(p.party)}
                        disabled={resending === p.party}
                        className="text-xs px-2 py-1 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800 disabled:text-slate-600 text-slate-300 rounded transition"
                      >
                        {resending === p.party
                          ? t('common.loading')
                          : resendSuccess === p.party
                            ? '✓ ' + t('caseDetail.resendSuccess')
                            : t('caseDetail.resend')}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Time horizons shown when both agreed */}
            {caseData.timeHorizons && caseData.timeHorizons.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                <h3 className="font-medium text-slate-200 mb-2">{t('caseDetail.timeHorizonsTitle')}</h3>
                <ul className="space-y-1">
                  {caseData.timeHorizons.map((th, i) => (
                    <li key={i} className="text-sm text-slate-300">
                      {t(`party.timeHorizons.${th}`, th)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
