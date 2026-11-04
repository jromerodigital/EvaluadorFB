import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  SlidersHorizontal,
  MessageCircle,
  UserPlus,
  ShieldCheck,
  ArrowRight,
  Users,
  Copy,
  Check,
  Building2,
} from 'lucide-react';
import {
  CapturedLead,
  INCOME_SOURCE_OPTIONS,
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
}

export const ResultView: React.FC<ResultViewProps> = ({
  theme,
  lead,
  onUpdateAmountLive,
  onUpdateIncomeLive,
  onNewClientReset,
}) => {
  const isDark = theme === 'dark';
  const [showLiveSimulator, setShowLiveSimulator] = useState(
    lead.metrics.tier !== 'GREEN'
  );
  const [copiedCode, setCopiedCode] = useState(false);
  const [benefitLocked, setBenefitLocked] = useState(false);

  const { metrics } = lead;
  const invOption =
    INVESTMENT_OPTIONS.find((o) => o.id === lead.investmentType) ||
    INVESTMENT_OPTIONS[0];
  const incomeSourceLabel =
    INCOME_SOURCE_OPTIONS.find((s) => s.id === lead.incomeSourceType)?.label ||
    lead.incomeSourceType;

  // Position on visual gauge (0 to 2.5x ratio mapped to 0-100%)
  const gaugePositionPercent = Math.min(
    98,
    Math.max(4, (metrics.incomeToQuotaRatio / 2.5) * 100)
  );

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(lead.reservationCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const directQualifiedAmount = metrics.directQualifyingAmountUSD;
  const canAdjustToGreenCertificate =
    directQualifiedAmount >= MIN_CERTIFICATE_USD;

  const statusConfig = {
    GREEN: {
      badgeText: 'Pre-Calificación Aprobada',
      headline: `Perfil Preferente Aprobado para certificado de ${formatUSD(
        metrics.requestedAmountUSD,
        0
      )}.`,
      subcopy: `La suma de tus ingresos (${formatPEN(
        metrics.clientIncomePEN,
        0
      )}) supera el doble de la cuota mensual asignada en Soles (${formatPEN(
        metrics.requiredIdealIncomePEN,
        0
      )} requeridos a TC S/ ${lead.exchangeRate.toFixed(2)}).`,
      advisorCtaLabel: benefitLocked
        ? 'Beneficio de Feria Validado y Código Bloqueado'
        : 'Validar beneficio de feria y bloquear código de reserva',
      bgTint: isDark
        ? 'bg-[#0F291E] border-emerald-700/60'
        : 'bg-[#F0FDF4] border-[#BBF7D0]',
      textAccent: isDark ? 'text-emerald-400' : 'text-[#16A34A]',
      barColor: 'bg-[#16A34A]',
    },
    YELLOW: {
      badgeText: 'Pre-Calificación en Rango Flexible',
      headline: `Estás a un paso de la aprobación directa (${metrics.standardCoveragePercent}% del rango estándar).`,
      subcopy: `Tu ingreso total de ${formatPEN(
        metrics.clientIncomePEN,
        0
      )} equivale a ${metrics.incomeToQuotaRatio.toFixed(
        2
      )}x la cuota mensual en Soles. Para el doble exacto (2.0x) se requieren ${formatPEN(
        metrics.requiredIdealIncomePEN,
        0
      )}/mes.`,
      advisorCtaLabel:
        'Activar Evaluación Especial: Ingreso mancomunado o ajuste de certificado',
      bgTint: isDark
        ? 'bg-[#291F0C] border-amber-700/60'
        : 'bg-[#FFFBEB] border-[#FDE68A]',
      textAccent: isDark ? 'text-amber-400' : 'text-[#D97706]',
      barColor: 'bg-[#D97706]',
    },
    RED: {
      badgeText: 'Requiere Estructuración Personalizada',
      headline:
        directQualifiedAmount >= MIN_CERTIFICATE_USD
          ? `Calificas hoy mismo de forma directa para un certificado de ${formatUSD(
              directQualifiedAmount,
              0
            )} USD.`
          : `Estructura tu certificado de ${formatUSD(
              metrics.requestedAmountUSD,
              0
            )} sumando ingreso familiar.`,
      subcopy:
        directQualifiedAmount >= MIN_CERTIFICATE_USD
          ? `Con tu ingreso total de ${formatPEN(
              metrics.clientIncomePEN,
              0
            )} cubres el doble de la cuota para un certificado de ${formatUSD(
              directQualifiedAmount,
              0
            )}, o puedes sumar ${formatPEN(
              metrics.shortfallIncomePEN,
              0
            )}/mes en ingreso familiar para mantener ${formatUSD(
              metrics.requestedAmountUSD,
              0
            )}.`
          : `La cuota mensual para ${formatUSD(
              metrics.requestedAmountUSD,
              0
            )} es ${formatPEN(
              metrics.monthlyInstallmentPEN,
              0
            )}/mes. Se requiere un ingreso total o familiar de ${formatPEN(
              metrics.requiredIdealIncomePEN,
              0
            )}/mes (2.0x la cuota en Soles).`,
      advisorCtaLabel:
        'Ver monto pre-aprobado disponible o simular con ingreso familiar',
      bgTint: isDark
        ? 'bg-[#2B1219] border-rose-800/60'
        : 'bg-[#FEF2F2] border-[#FECACA]',
      textAccent: isDark ? 'text-rose-400' : 'text-[#DC2626]',
      barColor: 'bg-[#DC2626]',
    },
  }[metrics.tier];

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* MAIN TRAFFIC-LIGHT STATUS CARD */}
      <div
        className={`rounded-3xl p-6 sm:p-7 border ${statusConfig.bgTint} shadow-apple-card transition-all duration-300 ease-apple`}
      >
        {/* Top Row: Status Pill & Reservation Code */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
              isDark
                ? 'bg-[#131C31] border-slate-700'
                : 'bg-white border-black/[0.06]'
            }`}
          >
            {metrics.tier === 'GREEN' && (
              <CheckCircle2
                className={`w-4 h-4 ${statusConfig.textAccent}`}
                strokeWidth={1.5}
              />
            )}
            {metrics.tier === 'YELLOW' && (
              <Clock
                className={`w-4 h-4 ${statusConfig.textAccent}`}
                strokeWidth={1.5}
              />
            )}
            {metrics.tier === 'RED' && (
              <AlertCircle
                className={`w-4 h-4 ${statusConfig.textAccent}`}
                strokeWidth={1.5}
              />
            )}
            <span className={statusConfig.textAccent}>
              {statusConfig.badgeText}
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopyCode}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-semibold transition-all ${
              isDark
                ? 'bg-[#131C31] border-slate-700 text-sky-300'
                : 'bg-white/90 border-black/[0.08] text-[#081C59]'
            }`}
            title="Copiar código de reserva"
          >
            <span>{lead.reservationCode}</span>
            {copiedCode ? (
              <Check className="w-3.5 h-3.5 text-[#16A34A]" strokeWidth={1.5} />
            ) : (
              <Copy
                className={`w-3.5 h-3.5 ${
                  isDark ? 'text-slate-400' : 'text-[#6E6E73]'
                }`}
                strokeWidth={1.5}
              />
            )}
          </button>
        </div>

        {/* Client Identity Summary */}
        <div
          className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium mb-2.5 ${
            isDark ? 'text-slate-300' : 'text-[#6E6E73]'
          }`}
        >
          <span
            className={`font-bold text-sm ${
              isDark ? 'text-white' : 'text-[#1D1D1F]'
            }`}
          >
            {lead.fullName}
          </span>
          <span>•</span>
          <span>
            {lead.documentType} {lead.documentNumber}
          </span>
          <span>•</span>
          <span>Ingreso: {incomeSourceLabel}</span>
          <span>•</span>
          <span
            className={`inline-flex items-center gap-1 font-semibold ${
              isDark ? 'text-sky-400' : 'text-[#081C59]'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" strokeWidth={1.5} />
            {invOption.shortTitle}
          </span>
        </div>

        {/* Main Psychological Headline */}
        <h1
          className={`text-xl sm:text-2xl font-bold tracking-[-0.02em] leading-snug mb-1.5 ${
            isDark ? 'text-white' : 'text-[#1D1D1F]'
          }`}
        >
          {statusConfig.headline}
        </h1>
        <p
          className={`text-sm leading-relaxed mb-5 ${
            isDark ? 'text-slate-300' : 'text-[#6E6E73]'
          }`}
        >
          {statusConfig.subcopy}
        </p>

        {/* Visual Gauge / Qualification Meter */}
        <div
          className={`rounded-2xl p-4 border mb-4 ${
            isDark
              ? 'bg-[#131C31] border-slate-700/80'
              : 'bg-white border-black/[0.06]'
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-2">
            <span
              className={`font-semibold ${
                isDark ? 'text-slate-200' : 'text-[#1D1D1F]'
              }`}
            >
              Relación Ingreso Total vs. Cuota en Soles
            </span>
            <span
              className={`font-bold tabular-nums ${statusConfig.textAccent}`}
            >
              {metrics.incomeToQuotaRatio.toFixed(2)}x (Meta: 2.00x)
            </span>
          </div>

          <div
            className={`relative h-3 rounded-full overflow-hidden flex ${
              isDark ? 'bg-slate-800' : 'bg-[#F5F5F7]'
            }`}
          >
            <div className="w-[56%] h-full bg-[#FECACA]/40 border-r border-white/20" />
            <div className="w-[24%] h-full bg-[#FDE68A]/45 border-r border-white/20" />
            <div className="w-[20%] h-full bg-[#BBF7D0]/50" />

            <div
              className={`absolute top-0 left-0 bottom-0 ${statusConfig.barColor} transition-all duration-500 ease-apple rounded-full`}
              style={{ width: `${gaugePositionPercent}%` }}
            />
          </div>

          <div
            className={`flex justify-between text-[11px] mt-1.5 font-medium ${
              isDark ? 'text-slate-400' : 'text-[#6E6E73]'
            }`}
          >
            <span>0.0x</span>
            <span className={isDark ? 'text-amber-400' : 'text-[#D97706]'}>
              1.4x Flexible
            </span>
            <span
              className={`font-semibold ${
                isDark ? 'text-emerald-400' : 'text-[#16A34A]'
              }`}
            >
              2.0x Doble de Cuota
            </span>
          </div>
        </div>

        {/* Action Button inside Card */}
        {metrics.tier === 'GREEN' ? (
          <button
            type="button"
            onClick={() => setBenefitLocked(true)}
            className={`w-full py-3.5 px-5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 ease-apple ${
              benefitLocked
                ? 'bg-[#16A34A] text-white'
                : 'bg-[#0C6CFB] hover:bg-[#0958D3] text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4" strokeWidth={1.5} />
            <span>{statusConfig.advisorCtaLabel}</span>
          </button>
        ) : (
          <div
            className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              isDark
                ? 'bg-[#131C31] border-slate-700 text-slate-200'
                : 'bg-white/90 border-black/[0.06] text-[#1D1D1F]'
            }`}
          >
            <div className="text-xs">
              {canAdjustToGreenCertificate ? (
                <span>
                  Ajusta a{' '}
                  <strong className={statusConfig.textAccent}>
                    {formatUSD(directQualifiedAmount, 0)} USD
                  </strong>{' '}
                  para aprobación directa hoy, o suma{' '}
                  <strong>{formatPEN(metrics.shortfallIncomePEN, 0)}/mes</strong>{' '}
                  de ingreso familiar.
                </span>
              ) : (
                <span>
                  Suma{' '}
                  <strong>{formatPEN(metrics.shortfallIncomePEN, 0)}/mes</strong>{' '}
                  de ingreso familiar para alcanzar el doble de la cuota (
                  {formatPEN(metrics.requiredIdealIncomePEN, 0)}/mes).
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {canAdjustToGreenCertificate && (
                <button
                  type="button"
                  onClick={() => onUpdateAmountLive(directQualifiedAmount)}
                  className="px-3 py-2 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold flex items-center gap-1 transition-all"
                >
                  <span>Aprobar {formatUSD(directQualifiedAmount, 0)}</span>
                  <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowLiveSimulator(true)}
                className="px-3 py-2 rounded-xl bg-[#0C6CFB] hover:bg-[#0958D3] text-white text-xs font-semibold flex items-center gap-1 transition-all"
              >
                <Users className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>Simular Ajuste</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* FINANCIAL BREAKDOWN GRID (Cuota Mensual revelada aquí en Soles y USD) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Card 1: Certificado Solicitado */}
        <div
          className={`rounded-2xl p-4 sm:p-5 border shadow-apple-card ${
            isDark
              ? 'bg-[#131C31] border-slate-800'
              : 'bg-white border-black/[0.06]'
          }`}
        >
          <span
            className={`text-xs font-medium block mb-1 ${
              isDark ? 'text-slate-400' : 'text-[#6E6E73]'
            }`}
          >
            Certificado Evaluado
          </span>
          <div
            className={`text-xl sm:text-2xl font-bold tracking-[-0.02em] tabular-nums ${
              isDark ? 'text-white' : 'text-[#081C59]'
            }`}
          >
            {formatUSD(metrics.requestedAmountUSD, 0)} USD
          </div>
          <span
            className={`text-xs mt-1 block tabular-nums ${
              isDark ? 'text-slate-400' : 'text-[#6E6E73]'
            }`}
          >
            Eq. {formatPEN(metrics.requestedAmountUSD * lead.exchangeRate, 0)}{' '}
            (TC {lead.exchangeRate.toFixed(2)})
          </span>
        </div>

        {/* Card 2: Cuota Mensual Asignada (132 meses) */}
        <div
          className={`rounded-2xl p-4 sm:p-5 border shadow-apple-card ${
            isDark
              ? 'bg-[#131C31] border-[#0C6CFB]/50'
              : 'bg-white border-[#0C6CFB]/30'
          }`}
        >
          <span className="text-xs font-semibold text-[#0C6CFB] block mb-1">
            Cuota Mensual (132 meses)
          </span>
          <div
            className={`text-xl sm:text-2xl font-bold tracking-[-0.02em] tabular-nums ${
              isDark ? 'text-white' : 'text-[#1D1D1F]'
            }`}
          >
            {formatPEN(metrics.monthlyInstallmentPEN, 0)}{' '}
            <span
              className={`text-xs font-normal ${
                isDark ? 'text-slate-400' : 'text-[#6E6E73]'
              }`}
            >
              / mes
            </span>
          </div>
          <span className="text-xs text-[#0C6CFB] font-semibold mt-1 block tabular-nums">
            {formatUSD(metrics.monthlyInstallmentUSD, 2)} USD / mes
          </span>
        </div>

        {/* Card 3: Suma de Ingresos vs Requisito 2x */}
        <div
          className={`rounded-2xl p-4 sm:p-5 border shadow-apple-card ${
            isDark
              ? 'bg-[#131C31] border-slate-800'
              : 'bg-white border-black/[0.06]'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span
              className={`text-xs font-medium ${
                isDark ? 'text-slate-400' : 'text-[#6E6E73]'
              }`}
            >
              Suma de Ingresos vs. 2x Cuota
            </span>
            <span className={`text-xs font-bold ${statusConfig.textAccent}`}>
              {metrics.standardCoveragePercent}%
            </span>
          </div>
          <div
            className={`text-xl sm:text-2xl font-bold tracking-[-0.02em] tabular-nums ${
              isDark ? 'text-white' : 'text-[#1D1D1F]'
            }`}
          >
            {formatPEN(metrics.clientIncomePEN, 0)}
          </div>
          <span
            className={`text-xs mt-1 block tabular-nums ${
              isDark ? 'text-slate-400' : 'text-[#6E6E73]'
            }`}
          >
            Requerido (2x): {formatPEN(metrics.requiredIdealIncomePEN, 0)} / mes
          </span>
        </div>
      </div>

      {/* LIVE ADVISOR CALIBRATION PANEL */}
      {showLiveSimulator && (
        <div
          className={`rounded-3xl p-5 sm:p-6 border shadow-apple-card space-y-4 ${
            isDark
              ? 'bg-[#131C31] border-slate-700'
              : 'bg-white border-[#0C6CFB]/25'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#0C6CFB]/15 text-[#0C6CFB] flex items-center justify-center">
                <SlidersHorizontal className="w-4 h-4" strokeWidth={1.5} />
              </div>
              <h3
                className={`text-sm font-bold ${
                  isDark ? 'text-white' : 'text-[#1D1D1F]'
                }`}
              >
                Simulador en Vivo (Ajuste de Certificado o Ingreso)
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowLiveSimulator(false)}
              className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
                isDark
                  ? 'bg-slate-800 text-slate-300 hover:text-white'
                  : 'bg-[#F5F5F7] text-[#6E6E73] hover:text-[#1D1D1F]'
              }`}
            >
              Cerrar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Adjust Certificate Amount */}
            <div
              className={`p-4 rounded-2xl space-y-2.5 ${
                isDark ? 'bg-[#0B1120]' : 'bg-[#F5F5F7]'
              }`}
            >
              <div className="flex items-center justify-between">
                <label
                  className={`text-xs font-semibold ${
                    isDark ? 'text-slate-200' : 'text-[#1D1D1F]'
                  }`}
                >
                  Certificado (USD)
                </label>
                <span
                  className={`text-sm font-bold tabular-nums ${
                    isDark ? 'text-sky-400' : 'text-[#081C59]'
                  }`}
                >
                  {formatUSD(metrics.requestedAmountUSD, 0)}
                </span>
              </div>
              <input
                type="range"
                min={MIN_CERTIFICATE_USD}
                max={250000}
                step={2500}
                value={Math.min(
                  250000,
                  Math.max(MIN_CERTIFICATE_USD, metrics.requestedAmountUSD)
                )}
                onChange={(e) => onUpdateAmountLive(Number(e.target.value))}
                className="w-full accent-[#0C6CFB] h-2 rounded-lg cursor-pointer"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[40000, 60000, 80000, 100000, 120000, 150000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => onUpdateAmountLive(amt)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                      metrics.requestedAmountUSD === amt
                        ? 'bg-[#0C6CFB] text-white'
                        : isDark
                        ? 'bg-slate-800 text-slate-300 border border-slate-700'
                        : 'bg-white text-[#6E6E73] border border-black/[0.06]'
                    }`}
                  >
                    ${amt / 1000}k
                  </button>
                ))}
              </div>
            </div>

            {/* Adjust Total Monthly Income in PEN */}
            <div
              className={`p-4 rounded-2xl flex flex-col justify-between gap-2.5 ${
                isDark ? 'bg-[#0B1120]' : 'bg-[#F5F5F7]'
              }`}
            >
              <div>
                <span
                  className={`text-xs font-semibold block ${
                    isDark ? 'text-slate-200' : 'text-[#1D1D1F]'
                  }`}
                >
                  Suma de Ingresos Evaluada (S/)
                </span>
                <span
                  className={`text-[11px] ${
                    isDark ? 'text-slate-400' : 'text-[#6E6E73]'
                  }`}
                >
                  Doble de cuota requerido:{' '}
                  {formatPEN(metrics.requiredIdealIncomePEN, 0)}/mes
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step={250}
                  min={0}
                  value={Math.round(metrics.clientIncomePEN) || ''}
                  onChange={(e) =>
                    onUpdateIncomeLive(
                      Math.max(0, Number(e.target.value)),
                      lead.isJointIncome
                    )
                  }
                  className={`w-full px-3 py-2 rounded-xl border text-sm font-bold tabular-nums focus:outline-none focus:border-[#0C6CFB] ${
                    isDark
                      ? 'bg-slate-900 border-slate-700 text-white'
                      : 'bg-white border-black/[0.1] text-[#1D1D1F]'
                  }`}
                />
                {metrics.tier !== 'GREEN' && (
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateIncomeLive(
                        Math.ceil(metrics.requiredIdealIncomePEN),
                        true
                      )
                    }
                    className="px-3 py-2 rounded-xl bg-[#0C6CFB] text-white text-xs font-semibold shrink-0 hover:bg-[#0958D3] transition-all"
                  >
                    Igualar 2x
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADVISOR UTILITY BAR */}
      <div
        className={`rounded-3xl p-4 border shadow-apple-card ${
          isDark
            ? 'bg-[#131C31] border-slate-800'
            : 'bg-white border-black/[0.06]'
        }`}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={() => setShowLiveSimulator((prev) => !prev)}
            className={`py-3 px-4 rounded-2xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 border transition-all ${
              showLiveSimulator
                ? 'bg-[#081C59] text-white border-transparent'
                : isDark
                ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                : 'bg-[#F5F5F7] text-[#1D1D1F] border-black/[0.06] hover:bg-black/[0.05]'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" strokeWidth={1.5} />
            <span>Simular Otro Monto</span>
          </button>

          <a
            href={buildWhatsAppUrl(lead)}
            target="_blank"
            rel="noopener noreferrer"
            className="py-3 px-4 rounded-2xl bg-[#0C6CFB] hover:bg-[#0958D3] text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-apple-pill transition-all"
          >
            <MessageCircle className="w-4 h-4" strokeWidth={1.5} />
            <span>Enviar por WhatsApp</span>
          </a>

          <button
            type="button"
            onClick={onNewClientReset}
            className={`py-3 px-4 rounded-2xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 border transition-all ${
              isDark
                ? 'bg-slate-900 hover:bg-slate-800 text-sky-400 border-sky-400/30'
                : 'bg-white hover:bg-[#F5F5F7] text-[#081C59] border-[#081C59]/20'
            }`}
          >
            <UserPlus className="w-4 h-4" strokeWidth={1.5} />
            <span>Nuevo Cliente (Limpiar)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
