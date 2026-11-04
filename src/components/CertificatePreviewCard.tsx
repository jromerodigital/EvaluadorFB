import React from 'react';
import {
  Building,
  Store,
  Landmark,
  ShieldCheck,
  Calendar,
  MapPin,
} from 'lucide-react';
import {
  INVESTMENT_OPTIONS,
  SimulationInput,
} from '../types/prequalifier';
import {
  calculateMonthlyInstallmentUSD,
  formatPEN,
  formatUSD,
  MIN_CERTIFICATE_USD,
} from '../utils/financialMath';

interface CertificatePreviewCardProps {
  formData: SimulationInput;
  currentStep: number;
}

export const CertificatePreviewCard: React.FC<CertificatePreviewCardProps> = ({
  formData,
  currentStep,
}) => {
  const selectedOption =
    INVESTMENT_OPTIONS.find((opt) => opt.id === formData.investmentType) ||
    INVESTMENT_OPTIONS[0];

  const monthlyInstallmentUSD = calculateMonthlyInstallmentUSD(
    formData.requestedAmountUSD
  );
  const monthlyInstallmentPEN = monthlyInstallmentUSD * formData.exchangeRate;

  const renderIcon = () => {
    switch (formData.investmentType) {
      case 'departamento':
        return <Building className="w-5 h-5 text-white/90" strokeWidth={1.5} />;
      case 'local_comercial':
        return <Store className="w-5 h-5 text-white/90" strokeWidth={1.5} />;
      case 'cancelacion_hipotecaria':
        return <Landmark className="w-5 h-5 text-white/90" strokeWidth={1.5} />;
    }
  };

  const formattedDoc = formData.documentNumber
    ? `${formData.documentType} • ${formData.documentNumber}`
    : `${formData.documentType} • Pendiente`;

  const isAmountValid = formData.requestedAmountUSD >= MIN_CERTIFICATE_USD;

  return (
    <div className="bg-[#081C59] text-white rounded-3xl p-6 sm:p-7 shadow-apple-elevated border border-white/10 transition-all duration-300 ease-apple relative overflow-hidden">
      {/* Subtle architectural geometric accent */}
      <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-white/[0.03] pointer-events-none" />
      <div className="absolute -left-10 -bottom-16 w-40 h-40 rounded-full bg-[#0C6CFB]/[0.12] pointer-events-none" />

      {/* Top Row: Certificate Header & Plazo */}
      <div className="relative z-10 flex items-center justify-between gap-2 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/10">
            {renderIcon()}
          </div>
          <div>
            <span className="text-[11px] uppercase tracking-widest text-white/60 font-semibold block">
              Certificado Inmobiliario
            </span>
            <span className="text-sm font-semibold text-white tracking-tight">
              {selectedOption.title}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs font-medium text-white/90">
          <Calendar className="w-3.5 h-3.5 text-[#0C6CFB]" strokeWidth={1.5} />
          <span>132 meses</span>
        </div>
      </div>

      {/* Center Row: Certificate Amount & Live Monthly Installment */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 border-y border-white/10">
        <div>
          <span className="text-xs text-white/65 font-medium block mb-1">
            Monto de Certificado (USD)
          </span>
          <div className="text-2xl sm:text-3xl font-bold tracking-[-0.03em] tabular-nums text-white">
            {isAmountValid ? formatUSD(formData.requestedAmountUSD, 0) : '$ 0'}
          </div>
          <span className="text-[11px] text-white/60 tabular-nums">
            Eq. ref: {isAmountValid ? formatPEN(formData.requestedAmountUSD * formData.exchangeRate, 0) : 'S/ 0'}
          </span>
        </div>

        <div className="sm:text-right flex flex-col justify-center bg-white/[0.06] sm:bg-transparent rounded-2xl p-3 sm:p-0">
          <span className="text-xs text-white/70 font-medium block mb-1">
            Cuota Mensual Estimada
          </span>
          <div className="text-xl sm:text-2xl font-bold tracking-[-0.02em] tabular-nums text-white flex items-baseline sm:justify-end gap-1.5">
            <span>{isAmountValid ? formatUSD(monthlyInstallmentUSD, 2) : '$ 0.00'}</span>
            <span className="text-xs font-normal text-white/65">/ mes</span>
          </div>
          <span className="text-[11px] text-white/65 tabular-nums">
            Aprox. {isAmountValid ? formatPEN(monthlyInstallmentPEN, 0) : 'S/ 0'} / mes
          </span>
        </div>
      </div>

      {/* Bottom Row: Applicant Holder & Step Context */}
      <div className="relative z-10 mt-5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">
            Titular Evaluado
          </span>
          <span className="font-semibold text-white/95 truncate max-w-[220px]">
            {formData.fullName.trim() ? formData.fullName : 'Cliente en Evaluación'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {formData.district && currentStep >= 3 && (
            <span className="inline-flex items-center gap-1 text-white/75">
              <MapPin className="w-3.5 h-3.5 text-white/60" strokeWidth={1.5} />
              {formData.district}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 text-white/90 font-mono text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#0C6CFB]" strokeWidth={1.5} />
            {formattedDoc}
          </span>
        </div>
      </div>
    </div>
  );
};
