import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TIME_HORIZONS, MAX_NOTE_LENGTH } from '@settlesync/shared';
import type { PartyView, ConsentOption, TimeHorizon } from '@settlesync/shared';
import { api } from '../lib/api';

export default function PartyLanding() {
  const { t, i18n } = useTranslation();
  const { token } = useParams<{ token: string }>();
  const [view, setView] = useState<PartyView | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [consent, setConsent] = useState<ConsentOption | ''>('');
  const [timeHorizon, setTimeHorizon] = useState<TimeHorizon | ''>('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [submitResult, setSubmitResult] = useState<ConsentOption | null>(null);

  useEffect(() => {
    api.get<PartyView>(`/party/${token}`)
      .then(setView)
      .catch(() => setError(t('common.error')))
      .finally(() => setLoading(false));
  }, [token, t]);

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language === 'pl' ? 'en' : 'pl');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) return;
    setError('');
    setSubmitting(true);

    try {
      await api.post(`/party/${token}/respond`, {
        consent,
        timeHorizon: consent === 'yes' ? timeHorizon : undefined,
        note: note.trim() || undefined,
      });
      setSubmitResult(consent as ConsentOption);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Potwierdzenie po wysłaniu
  if (submitted && submitResult) {
    const messageKey = submitResult === 'yes' ? 'messageYes' : submitResult === 'no' ? 'messageNo' : 'messageLater';
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 shadow-xl text-center max-w-md">
          <div className="text-4xl mb-4">{submitResult === 'yes' ? '✓' : submitResult === 'no' ? '✗' : '⏳'}</div>
          <h2 className="text-xl font-semibold text-slate-100 mb-2">{t('party.confirmation.title')}</h2>
          <p className="text-slate-400">{t(`party.confirmation.${messageKey}`)}</p>
        </div>
      </div>
    );
  }

  // Już odpowiedział lub wygasł
  if (view?.alreadyResponded) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 shadow-xl text-center max-w-md">
          <p className="text-slate-300">{t('party.alreadyResponded')}</p>
        </div>
      </div>
    );
  }

  if (view?.expired) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 shadow-xl text-center max-w-md">
          <p className="text-red-400">{t('party.expired')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-100">SettleSync</h1>
          <p className="text-slate-400 text-sm mt-1">{t('party.subtitle')}: {view?.caseArbitrationId}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 shadow-xl">
          <h2 className="text-lg font-semibold text-slate-100 mb-4">{t('party.question')}</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Consent radio buttons */}
            <div className="space-y-2">
              {([
                ['yes', t('party.consentYes'), 'border-green-500/30 bg-green-500/5'],
                ['no', t('party.consentNo'), 'border-red-500/30 bg-red-500/5'],
                ['later', t('party.consentLater'), 'border-yellow-500/30 bg-yellow-500/5'],
              ] as const).map(([value, label, colors]) => (
                <label
                  key={value}
                  className={`flex items-center p-3 rounded-md border cursor-pointer transition ${
                    consent === value ? colors : 'border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="consent"
                    value={value}
                    checked={consent === value}
                    onChange={() => setConsent(value)}
                    className="mr-3 accent-blue-500"
                  />
                  <span className="text-slate-200">{label}</span>
                </label>
              ))}
            </div>

            {/* Time horizon (tylko przy TAK) */}
            {consent === 'yes' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {t('party.timeHorizonLabel')} *
                </label>
                <div className="space-y-2">
                  {TIME_HORIZONS.map((th) => (
                    <label
                      key={th}
                      className={`flex items-center p-2.5 rounded-md border cursor-pointer transition ${
                        timeHorizon === th ? 'border-blue-500/30 bg-blue-500/5' : 'border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="timeHorizon"
                        value={th}
                        checked={timeHorizon === th}
                        onChange={() => setTimeHorizon(th)}
                        className="mr-3 accent-blue-500"
                      />
                      <span className="text-slate-200 text-sm">{t(`party.timeHorizons.${th}`)}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Note */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                {t('party.noteLabel')}
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, MAX_NOTE_LENGTH))}
                rows={3}
                placeholder={t('party.notePlaceholder')}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <p className="text-xs text-slate-500 text-right mt-1">{note.length}/{MAX_NOTE_LENGTH}</p>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={submitting || !consent || (consent === 'yes' && !timeHorizon)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-md transition"
            >
              {submitting ? t('common.loading') : t('party.submitConsent')}
            </button>
          </form>
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
