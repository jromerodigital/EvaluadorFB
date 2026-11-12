import React, { useState, useEffect } from 'react';
import {
  X,
  Webhook,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  Trash2,
  Code2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  getStoredWebhookUrl,
  saveStoredWebhookUrl,
  testWebhookConnection,
} from '../services/webhookService';

interface WebhookModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
  onSaved?: (url: string) => void;
}

export const WebhookModal: React.FC<WebhookModalProps> = ({
  isOpen,
  onClose,
  theme,
  onSaved,
}) => {
  const isDark = theme === 'dark';
  const [urlDraft, setUrlDraft] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [showJsonSample, setShowJsonSample] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setUrlDraft(getStoredWebhookUrl());
      setTestResult(null);
      setSavedSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    const cleanUrl = urlDraft.trim();
    saveStoredWebhookUrl(cleanUrl);
    setSavedSuccess(true);
    if (onSaved) onSaved(cleanUrl);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 900);
  };

  const handleClear = () => {
    setUrlDraft('');
    saveStoredWebhookUrl('');
    setTestResult(null);
    if (onSaved) onSaved('');
  };

  const handleRunTest = async () => {
    const clean = urlDraft.trim();
    if (!clean) {
      setTestResult({
        success: false,
        message: 'Ingresa una URL antes de realizar la prueba.',
      });
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    const res = await testWebhookConnection(clean);
    setIsTesting(false);
    setTestResult(res);
  };

  const sampleJson = {
    event: 'LEAD_PREQUALIFIED',
    timestamp: '2026-11-11T20:10:00.000Z',
    source: 'Precalificador Inmobiliario FonBienes (Feria)',
    lead: {
      id: 'lead_1731355800000',
      reservationCode: 'FB-3921-101',
      fullName: 'Jorge Luis Romero Anaya',
      documentType: 'DNI',
      documentNumber: '76403921',
      phoneWhatsapp: '987654321',
      district: 'Miraflores',
      investmentTitle: 'Departamento',
      requestedAmountUSD: 80000,
      monthlyInstallmentUSD: 734.79,
      monthlyInstallmentPEN: 2535.02,
      totalIncomePEN: 5500,
      tier: 'GREEN',
      statusLabel: 'Precalificó',
    },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Surface */}
      <div
        className={`relative z-10 w-full max-w-lg rounded-3xl p-6 sm:p-7 border shadow-2xl transition-all duration-300 animate-fadeIn ${
          isDark
            ? 'bg-[#131C31] border-slate-700 text-white'
            : 'bg-white border-black/[0.08] text-[#1D1D1F]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-black/[0.06] dark:border-white/10 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#004E89]/15 dark:bg-sky-500/20 text-[#004E89] dark:text-sky-400 flex items-center justify-center">
              <Webhook className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-[-0.02em]">
                Integración con Webhook / CRM
              </h2>
              <p className="text-xs text-[#6E6E73] dark:text-slate-400">
                Envía cada precalificación en tiempo real a tu CRM
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F5F5F7] dark:bg-slate-800 hover:bg-black/10 dark:hover:bg-slate-700 flex items-center justify-center text-[#1D1D1F] dark:text-slate-200 transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Input Form */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#004E89] dark:text-sky-400">
                URL del Webhook (POST)
              </label>
              {urlDraft && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1 font-medium"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Limpiar</span>
                </button>
              )}
            </div>

            <div
              className={`flex items-center rounded-2xl border overflow-hidden transition-all ${
                isDark
                  ? 'bg-[#0B1120] border-slate-700 focus-within:border-[#004E89]'
                  : 'bg-[#F5F5F7] border-black/[0.08] focus-within:bg-white focus-within:border-[#004E89]'
              }`}
            >
              <input
                type="url"
                value={urlDraft}
                onChange={(e) => {
                  setUrlDraft(e.target.value);
                  setTestResult(null);
                }}
                placeholder="https://hook.eu2.make.com/... o https://hooks.zapier.com/..."
                className={`w-full px-4 py-3 bg-transparent text-xs sm:text-sm font-mono focus:outline-none ${
                  isDark
                    ? 'text-white placeholder-slate-500'
                    : 'text-[#1D1D1F] placeholder-[#6E6E73]/60'
                }`}
              />
            </div>
            <p className="text-[11px] text-[#6E6E73] dark:text-slate-400 mt-1.5">
              Compatible con Make.com, Zapier, n8n, Google Sheets, HubSpot o tu propio backend.
            </p>
          </div>

          {/* Test Feedback Box */}
          {testResult && (
            <div
              className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 ${
                testResult.success
                  ? isDark
                    ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                    : 'bg-[#F0FDF4] border-[#BBF7D0] text-[#16A34A]'
                  : isDark
                  ? 'bg-rose-950/60 border-rose-800 text-rose-300'
                  : 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={1.75} />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={1.75} />
              )}
              <div>
                <p className="font-semibold">{testResult.message}</p>
                {testResult.success && (
                  <p className="text-[11px] opacity-80 mt-0.5">
                    El endpoint recibió la carga útil de prueba correctamente.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Collapsible JSON Sample */}
          <div
            className={`rounded-2xl border overflow-hidden ${
              isDark ? 'border-slate-800 bg-[#0B1120]' : 'border-black/[0.06] bg-[#F5F5F7]'
            }`}
          >
            <button
              type="button"
              onClick={() => setShowJsonSample((prev) => !prev)}
              className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-semibold text-left transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-[#004E89] dark:text-sky-400" />
                <span>Ver estructura del Payload JSON</span>
              </span>
              {showJsonSample ? (
                <ChevronUp className="w-3.5 h-3.5 text-[#6E6E73]" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-[#6E6E73]" />
              )}
            </button>

            {showJsonSample && (
              <div className="p-3 border-t border-black/[0.06] dark:border-white/10 text-[11px] font-mono overflow-x-auto max-h-44 bg-black/5 dark:bg-black/30">
                <pre>{JSON.stringify(sampleJson, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 pt-5 mt-5 border-t border-black/[0.06] dark:border-white/10">
          <button
            type="button"
            disabled={!urlDraft.trim() || isTesting}
            onClick={handleRunTest}
            className={`px-3.5 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                : 'bg-white hover:bg-black/[0.04] border-black/[0.08] text-[#1D1D1F]'
            } disabled:opacity-40`}
          >
            {isTesting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Probando...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5 text-[#008744]" />
                <span>Probar Envío</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold ${
                isDark
                  ? 'hover:bg-slate-800 text-slate-300'
                  : 'hover:bg-black/[0.05] text-[#6E6E73]'
              }`}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl bg-[#004E89] hover:bg-[#003865] text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
            >
              {savedSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>¡Guardado!</span>
                </>
              ) : (
                <span>Guardar Webhook</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
