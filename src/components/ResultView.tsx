import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  SlidersHorizontal,
  MessageCircle,
  UserPlus,
  Sparkles,
  Copy,
  Check,
  Webhook,
  Loader2,
} from 'lucide-react';
import {
  CapturedLead,
  INVESTMENT_OPTIONS,
} from '../types/prequalifier';
import {
  buildWhatsAppUrl,
  formatPEN,
  formatUSD,
  MIN_CERTIFICATE_USD,
} from '../utils/financialMath';

interface ResultViewProps {
  theme: 'light' | 'dark';
  lead: CapturedLead;
  onUpdateAmountLive: (newAmountUSD: number) => void;
  onUpdateIncomeLive: (newTotalIncomePEN: number, isJoint: boolean) => void;
  onNewClientReset: () => void;
  onResendWebhook?: (lead: CapturedLead) => Promise<boolean>;
  onOpenWebhookModal?: () => void;
  isWebhookActive?: boolean;
}

export const ResultView: React.FC<ResultViewProps> = ({
  theme,
  lead,
  onUpdateAmountLive,
  onUpdateIncomeLive,
  onNewClientReset,
  onResendWebhook,
  onOpenWebhookModal,
  isWebhookActive = false,
}) => {
  const isDark = theme === 'dark';
  const [showLiveSimulator, setShowLiveSimulator] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isRetryingWebhook, setIsRetryingWebhook] = useState(false);

  const handleRetryWebhook = async () => {
    if (!onResendWebhook) return;
    setIsRetryingWebhook(true);
    await onResendWebhook(lead);
    setIsRetryingWebhook(false);
  };

  const { metrics } = lead;
  const invOption =
    INVESTMENT_OPTIONS.find((o) => o.id === lead.investmentType) ||
    INVESTMENT_OPTIONS[0];

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(lead.reservationCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const directQualifiedAmount = metrics.directQualifyingAmountUSD;
  const canAdjustToGreenCertificate =
    directQualifiedAmount >= MIN_CERTIFICATE_USD;

  // Visual & Psychological Configuration per Traffic Light using FonBienes Colors
  const tierConfig = {
    GREEN: {
      statusLabel: 'Precalificó',
      headline: '¡Precalificación Aprobada!',
      hookText: `Excelente perfil. Calificas con aprobación preferente para adjudicar tu certificado de ${formatUSD(
        metrics.requestedAmountUSD,
        0
      )} USD en FonBienes.`,
      themeBg: isDark
        ? 'bg-gradient-to-b from-[#0B2518] to-[#07170E] border-emerald-700/50'
        : 'bg-gradient-to-b from-[#E8F6EE] via-[#F4FBF7] to-[#FFFFFF] border-[#008744]/25',
      badgeBg: isDark
        ? 'bg-emerald-950/80 border-emerald-700 text-emerald-400'
        : 'bg-[#E8F6EE] border-[#008744]/30 text-[#008744]',
      circleRing: isDark
        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 ring-emerald-500/10'
        : 'bg-[#E8F6EE] text-[#008744] border-[#008744]/30 ring-[#E8F6EE]',
      accentColor: isDark ? 'text-emerald-400' : 'text-[#008744]',
      meterColor: 'bg-[#008744]',
      primaryBtnBg: 'bg-[#008744] hover:bg-[#006E37] text-white',
    },
    YELLOW: {
      statusLabel: 'Requiere Evaluación',
      headline: 'Precalificación en Evaluación',
      hookText: `Estás muy cerca de la aprobación directa (cubres el ${metrics.standardCoveragePercent}%). Puedes adjudicar hoy sumando a un co-titular o ajustando el certificado.`,
      themeBg: isDark
        ? 'bg-gradient-to-b from-[#2B1F0C] to-[#171207] border-amber-700/50'
        : 'bg-gradient-to-b from-[#FFFBEB] via-[#FFFDF5] to-[#FFFFFF] border-amber-200/80',
      badgeBg: isDark
        ? 'bg-amber-950/80 border-amber-700 text-amber-400'
        : 'bg-amber-50 border-amber-200 text-amber-700',
      circleRing: isDark
        ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 ring-amber-500/10'
        : 'bg-amber-100 text-amber-600 border-amber-200 ring-amber-100',
      accentColor: isDark ? 'text-amber-400' : 'text-amber-600',
      meterColor: 'bg-amber-500',
      primaryBtnBg: 'bg-amber-600 hover:bg-amber-700 text-white',
    },
    RED: {
      statusLabel: 'No Califica',
      headline: canAdjustToGreenCertificate
        ? `Calificas para ${formatUSD(directQualifiedAmount, 0)} USD`
        : 'Requiere Co-Titular Familiar',
      hookText: canAdjustToGreenCertificate
        ? `Para ${formatUSD(metrics.requestedAmountUSD, 0)} se requiere co-titular, pero tienes aprobación inmediata hoy mismo para un certificado de ${formatUSD(directQualifiedAmount, 0)} USD.`
        : `Para este monto se requiere consolidar ingresos con cónyuge o familiar directo. Tu asesor puede estructurar una alternativa personalizada.`,
      themeBg: isDark
        ? 'bg-gradient-to-b from-[#2B1219] to-[#170B0E] border-rose-800/50'
        : 'bg-gradient-to-b from-[#FEF2F2] via-[#FFF5F5] to-[#FFFFFF] border-rose-200/80',
      badgeBg: isDark
        ? 'bg-rose-950/80 border-rose-800 text-rose-400'
        : 'bg-rose-50 border-rose-200 text-rose-700',
      circleRing: isDark
        ? 'bg-rose-500/20 text-rose-400 border-rose-500/30 ring-rose-500/10'
        : 'bg-rose-100 text-rose-600 border-rose-200 ring-rose-100',
      accentColor: isDark ? 'text-rose-400' : 'text-rose-600',
      meterColor: 'bg-rose-500',
      primaryBtnBg: 'bg-[#004E89] hover:bg-[#003865] text-white',
    },
  }[metrics.tier];

  const gaugePercent = Math.min(100, Math.max(10, (metrics.incomeToQuotaRatio / 2.0) * 100));

  return (
    <div className="space-y-4 animate-fadeIn max-w-xl mx-auto">
      {/* POPUP-INSPIRED HERO RESULT CARD */}
      <div
        className={`relative rounded-3xl p-6 sm:p-8 border shadow-apple-card text-center overflow-hidden transition-all duration-300 ${tierConfig.themeBg}`}
      >
        {/* Subtle Decorative Confetti for Green Approval */}
        {metrics.tier === 'GREEN' && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden select-none opacity-40">
            <span className="absolute top-4 left-8 w-2 h-2 rounded-full bg-[#008744] animate-ping" />
            <span className="absolute top-8 right-12 w-2.5 h-2.5 rounded-sm bg-[#004E89] rotate-45" />
            <span className="absolute bottom-16 left-10 w-2 h-2 rounded-full bg-sky-400" />
            <span className="absolute top-12 right-6 w-2 h-2 rounded-full bg-[#008744]" />
            <span className="absolute bottom-12 right-14 w-1.5 h-3 bg-amber-400 rotate-12" />
          </div>
        )}

        {/* Central Circular Hero Icon */}
        <div className="flex justify-center mb-4">
          <div
            className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 ring-8 flex items-center justify-center transition-transform hover:scale-105 duration-300 ${tierConfig.circleRing}`}
          >
            {metrics.tier === 'GREEN' && (
              <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12" strokeWidth={1.75} />
            )}
            {metrics.tier === 'YELLOW' && (
              <Clock className="w-10 h-10 sm:w-12 sm:h-12" strokeWidth={1.75} />
            )}
            {metrics.tier === 'RED' && (
              <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12" strokeWidth={1.75} />
            )}
          </div>
        </div>

        {/* Minimalist Status Badge */}
        <div className="flex justify-center mb-2">
          <span
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${tierConfig.badgeBg}`}
          >
            {metrics.tier === 'GREEN' && <Sparkles className="w-3.5 h-3.5 text-[#008744]" />}
            {metrics.tier === 'YELLOW' && <Clock className="w-3.5 h-3.5" />}
            {metrics.tier === 'RED' && <AlertCircle className="w-3.5 h-3.5" />}
            <span>{tierConfig.statusLabel}</span>
          </span>
        </div>

        {/* Headline */}
        <h1
          className={`text-2xl sm:text-3xl font-extrabold tracking-[-0.02em] mb-2 ${
            isDark ? 'text-white' : 'text-[#1D1D1F]'
          }`}
        >
          {tierConfig.headline}
        </h1>

        {/* Psychological Sales Hook */}
        <p
          className={`text-sm sm:text-base leading-relaxed max-w-md mx-auto mb-6 ${
            isDark ? 'text-slate-300' : 'text-[#6E6E73]'
          }`}
        >
          {tierConfig.hookText}
        </p>

        {/* UNIFIED FINANCIAL SNAPSHOT BOX */}
        <div
          className={`rounded-2xl p-4 sm:p-5 border text-left mb-6 ${
            isDark
              ? 'bg-[#131C31]/90 border-slate-700/80 text-white'
              : 'bg-white border-black/[0.08] shadow-2xs text-[#1D1D1F]'
          }`}
        >
          <div className="grid grid-cols-2 gap-4 pb-3 border-b border-black/[0.06] dark:border-white/10">
            <div>
              <span
                className={`text-[11px] font-semibold uppercase tracking-wider block mb-0.5 ${
                  isDark ? 'text-slate-400' : 'text-[#6E6E73]'
                }`}
              >
                Certificado
              </span>
              <div
                className={`text-xl sm:text-2xl font-bold tracking-tight tabular-nums ${
                  isDark ? 'text-sky-400' : 'text-[#004E89]'
                }`}
              >
                {formatUSD(metrics.requestedAmountUSD, 0)}
              </div>
              <span
                className={`text-[11px] block mt-0.5 tabular-nums ${
                  isDark ? 'text-slate-400' : 'text-[#6E6E73]'
                }`}
              >
                {invOption.shortTitle}
              </span>
            </div>

            <div>
              <span
                className={`text-[11px] font-semibold uppercase tracking-wider block mb-0.5 ${
                  isDark ? 'text-slate-400' : 'text-[#6E6E73]'
                }`}
              >
                Cuota Mensual (132m)
              </span>
              <div
                className={`text-xl sm:text-2xl font-bold tracking-tight tabular-nums ${
                  metrics.tier === 'GREEN'
                    ? 'text-[#008744]'
                    : isDark
                    ? 'text-white'
                    : 'text-[#1D1D1F]'
                }`}
              >
                {formatPEN(metrics.monthlyInstallmentPEN, 0)}
              </div>
              <span
                className={`text-[11px] block mt-0.5 tabular-nums ${
                  isDark ? 'text-slate-400' : 'text-[#6E6E73]'
                }`}
              >
                {formatUSD(metrics.monthlyInstallmentUSD, 2)} USD/mes
              </span>
            </div>
          </div>

          {/* Bottom Micro-line: Coverage Gauge + Holder info */}
          <div className="pt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span
                className={`font-medium ${
                  isDark ? 'text-slate-300' : 'text-[#6E6E73]'
                }`}
              >
                Titular:
              </span>
              <span className="font-semibold truncate max-w-[170px] sm:max-w-[220px]">
                {lead.fullName}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-bold ${tierConfig.accentColor}`}>
                {metrics.tier === 'GREEN'
                  ? 'Cobertura 100% OK'
                  : `${metrics.standardCoveragePercent}% Cobertura`}
              </span>
              <div className="w-16 h-2 rounded-full bg-black/10 dark:bg-white/15 overflow-hidden">
                <div
                  className={`h-full rounded-full ${tierConfig.meterColor}`}
                  style={{ width: `${gaugePercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* PRIMARY ACTION CTA BUTTONS */}
        <div className="space-y-2.5">
          {/* Quick Adjustment Option if Yellow or Red */}
          {metrics.tier !== 'GREEN' && canAdjustToGreenCertificate && (
            <button
              type="button"
              onClick={() => onUpdateAmountLive(directQualifiedAmount)}
              className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-[#004E89] to-[#0062AB] hover:from-[#003865] hover:to-[#004E89] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-fon-cta"
            >
              <CheckCircle2 className="w-4 h-4 text-[#008744]" strokeWidth={1.5} />
              <span>Aprobar Inmediato por {formatUSD(directQualifiedAmount, 0)} USD</span>
            </button>
          )}

          {/* Action Row: Simular Otro Monto + Nuevo Cliente */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowLiveSimulator((prev) => !prev)}
              className={`py-3 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                showLiveSimulator
                  ? 'bg-[#004E89] text-white border-transparent'
                  : isDark
                  ? 'bg-slate-900/80 hover:bg-slate-800 text-slate-200 border-slate-700'
                  : 'bg-white hover:bg-[#EBF3FA] hover:text-[#004E89] text-[#1D1D1F] border-black/[0.08]'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>{showLiveSimulator ? 'Ocultar Ajuste' : 'Simular Otro Monto'}</span>
            </button>

            <button
              type="button"
              onClick={onNewClientReset}
              className={`py-3 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                isDark
                  ? 'bg-slate-900/80 hover:bg-slate-800 text-slate-200 border-slate-700'
                  : 'bg-white hover:bg-[#EBF3FA] hover:text-[#004E89] text-[#1D1D1F] border-black/[0.08]'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Nuevo Cliente</span>
            </button>
          </div>
        </div>
      </div>

      {/* COMPACT LIVE CALIBRATOR (Only opens when clicking 'Simular Otro Monto') */}
      {showLiveSimulator && (
        <div
          className={`rounded-3xl p-5 border shadow-apple-card space-y-4 animate-fadeIn ${
            isDark
              ? 'bg-[#131C31] border-slate-700 text-white'
              : 'bg-white border-[#004E89]/25 text-[#1D1D1F]'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#004E89] dark:text-sky-400" strokeWidth={1.5} />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#004E89] dark:text-sky-400">
                Ajustar Certificado en Vivo
              </h3>
            </div>
            <span
              className={`text-sm font-bold tabular-nums ${
                isDark ? 'text-sky-400' : 'text-[#004E89]'
              }`}
            >
              {formatUSD(metrics.requestedAmountUSD, 0)}
            </span>
          </div>

          <input
            type="range"
            min={MIN_CERTIFICATE_USD}
            max={200000}
            step={2500}
            value={Math.min(
              200000,
              Math.max(MIN_CERTIFICATE_USD, metrics.requestedAmountUSD)
            )}
            onChange={(e) => onUpdateAmountLive(Number(e.target.value))}
            className="w-full accent-[#004E89] h-2 rounded-lg cursor-pointer"
          />

          <div className="flex flex-wrap gap-1.5">
            {[40000, 60000, 80000, 100000, 120000, 150000].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => onUpdateAmountLive(amt)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold tabular-nums transition-all ${
                  metrics.requestedAmountUSD === amt
                    ? 'bg-[#004E89] text-white'
                    : isDark
                    ? 'bg-slate-800 text-slate-300 border border-slate-700'
                    : 'bg-[#F5F5F7] hover:bg-[#EBF3FA] text-[#1D1D1F] border border-black/[0.06]'
                }`}
              >
                ${amt / 1000}k
              </button>
            ))}
          </div>

          {/* Quick Joint Income Boost */}
          {metrics.tier !== 'GREEN' && (
            <div className="pt-2 border-t border-black/[0.06] dark:border-white/10 flex items-center justify-between gap-2">
              <span className="text-xs text-[#6E6E73] dark:text-slate-400">
                ¿Simular con ingreso familiar?
              </span>
              <button
                type="button"
                onClick={() =>
                  onUpdateIncomeLive(
                    Math.ceil(metrics.requiredIdealIncomePEN),
                    true
                  )
                }
                className="px-3 py-1.5 rounded-lg bg-[#008744] hover:bg-[#006E37] text-white text-xs font-bold transition-all shadow-xs"
              >
                + Activar Aprobación (2x Cuota)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
