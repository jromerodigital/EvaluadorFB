import {
  CapturedLead,
  EvaluationMetrics,
  INCOME_SOURCE_OPTIONS,
  INVESTMENT_OPTIONS,
  QualificationTier,
  SimulationInput,
} from '../types/prequalifier';

export const FONBIENES_FACTOR = 1.2124;
export const FONBIENES_TERM_MONTHS = 132;
export const IDEAL_INCOME_MULTIPLIER = 2.0;
export const FLEXIBLE_INCOME_MULTIPLIER = 1.4;
export const MIN_CERTIFICATE_USD = 40000;
export const DEFAULT_EXCHANGE_RATE = 3.45;

/**
 * Formula: Monthly Installment (USD) = (Requested Financing Amount * 1.2124) / 132
 */
export function calculateMonthlyInstallmentUSD(requestedAmountUSD: number): number {
  if (!requestedAmountUSD || requestedAmountUSD <= 0) return 0;
  return (requestedAmountUSD * FONBIENES_FACTOR) / FONBIENES_TERM_MONTHS;
}

/**
 * Sums the active income components based on selected IncomeSourceType + optional joint income
 */
export function computeTotalIncome(input: Pick<
  SimulationInput,
  'incomeSourceType' | 'dependentIncome' | 'independentIncome' | 'isJointIncome' | 'jointSpouseIncome'
>): number {
  let base = 0;
  if (input.incomeSourceType === 'DEPENDIENTE') {
    base = Math.max(0, input.dependentIncome || 0);
  } else if (input.incomeSourceType === 'INDEPENDIENTE') {
    base = Math.max(0, input.independentIncome || 0);
  } else {
    // MIXTO: suma de ingreso dependiente + independiente
    base =
      Math.max(0, input.dependentIncome || 0) +
      Math.max(0, input.independentIncome || 0);
  }

  const joint = input.isJointIncome ? Math.max(0, input.jointSpouseIncome || 0) : 0;
  return base + joint;
}

/**
 * Reverse formula: Exact certificate amount that a given USD monthly income qualifies for directly (2.0x rule)
 */
export function calculateMaxCertificateForIncomeUSD(
  clientIncomeUSD: number,
  multiplier: number = IDEAL_INCOME_MULTIPLIER
): number {
  if (!clientIncomeUSD || clientIncomeUSD <= 0) return 0;
  const rawAmount = (clientIncomeUSD * FONBIENES_TERM_MONTHS) / (multiplier * FONBIENES_FACTOR);
  return Math.floor(rawAmount / 500) * 500;
}

export function evaluateProfile(input: SimulationInput): EvaluationMetrics {
  const safeRate = input.exchangeRate > 0 ? input.exchangeRate : DEFAULT_EXCHANGE_RATE;
  const requestedAmountUSD = Math.max(0, input.requestedAmountUSD || 0);

  const monthlyInstallmentUSD = calculateMonthlyInstallmentUSD(requestedAmountUSD);
  // Cuota mensual asignada en Soles al tipo de cambio referencial (3.45)
  const monthlyInstallmentPEN = monthlyInstallmentUSD * safeRate;

  // Condición: Suma de los ingresos o ingreso total sea el doble (2.0x) de la cuota mensual asignada en Soles
  const requiredIdealIncomePEN = monthlyInstallmentPEN * IDEAL_INCOME_MULTIPLIER;
  const requiredIdealIncomeUSD = monthlyInstallmentUSD * IDEAL_INCOME_MULTIPLIER;

  const requiredFlexibleIncomePEN = monthlyInstallmentPEN * FLEXIBLE_INCOME_MULTIPLIER;
  const requiredFlexibleIncomeUSD = monthlyInstallmentUSD * FLEXIBLE_INCOME_MULTIPLIER;

  const totalStatedIncome =
    input.monthlyIncome > 0 ? input.monthlyIncome : computeTotalIncome(input);

  const clientIncomePEN =
    input.incomeCurrency === 'PEN'
      ? totalStatedIncome
      : totalStatedIncome * safeRate;

  const clientIncomeUSD =
    input.incomeCurrency === 'USD'
      ? totalStatedIncome
      : totalStatedIncome / safeRate;

  // Validación directa: Suma de ingresos en Soles vs Cuota mensual en Soles
  const incomeToQuotaRatio =
    monthlyInstallmentPEN > 0 ? clientIncomePEN / monthlyInstallmentPEN : 0;

  const rawCoveragePercent =
    requiredIdealIncomePEN > 0
      ? (clientIncomePEN / requiredIdealIncomePEN) * 100
      : 0;
  const standardCoveragePercent = Math.min(100, Math.max(0, Math.round(rawCoveragePercent)));

  let tier: QualificationTier = 'RED';
  if (incomeToQuotaRatio + 1e-6 >= IDEAL_INCOME_MULTIPLIER) {
    tier = 'GREEN';
  } else if (incomeToQuotaRatio + 1e-6 >= FLEXIBLE_INCOME_MULTIPLIER) {
    tier = 'YELLOW';
  } else {
    tier = 'RED';
  }

  const directQualifyingAmountUSD = calculateMaxCertificateForIncomeUSD(
    clientIncomeUSD,
    IDEAL_INCOME_MULTIPLIER
  );
  const flexibleQualifyingAmountUSD = calculateMaxCertificateForIncomeUSD(
    clientIncomeUSD,
    FLEXIBLE_INCOME_MULTIPLIER
  );

  const shortfallIncomePEN = Math.max(0, requiredIdealIncomePEN - clientIncomePEN);
  const shortfallIncomeUSD = shortfallIncomePEN / safeRate;

  return {
    requestedAmountUSD,
    monthlyInstallmentUSD,
    monthlyInstallmentPEN,
    requiredIdealIncomeUSD,
    requiredIdealIncomePEN,
    requiredFlexibleIncomeUSD,
    requiredFlexibleIncomePEN,
    clientIncomeUSD,
    clientIncomePEN,
    incomeToQuotaRatio,
    standardCoveragePercent,
    tier,
    directQualifyingAmountUSD,
    flexibleQualifyingAmountUSD,
    shortfallIncomeUSD,
    shortfallIncomePEN,
  };
}

export function formatUSD(amount: number, decimals: number = 0): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount || 0);
}

export function formatPEN(amount: number, decimals: number = 0): string {
  const formattedNumber = new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount || 0);
  return `S/ ${formattedNumber}`;
}

export function formatNumberWithCommas(value: number): string {
  if (!value && value !== 0) return '';
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPhoneDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 9);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)}`;
}

export function autoCapitalizeName(input: string): string {
  return input.replace(/\b([a-záéíóúñü])([a-záéíóúñü]*)/gi, (word, first, rest, offset) => {
    const lower = word.toLowerCase();
    if (offset > 0 && ['de', 'del', 'la', 'las', 'los', 'y', 'e'].includes(lower)) {
      return lower;
    }
    return first.toUpperCase() + rest.toLowerCase();
  });
}

export function validateDocument(type: 'DNI' | 'RUC', value: string): {
  isValid: boolean;
  message: string;
} {
  const digits = value.replace(/\D/g, '');
  if (type === 'DNI') {
    if (digits.length === 0) {
      return { isValid: false, message: 'Ingresa los 8 dígitos del DNI' };
    }
    if (digits.length !== 8) {
      return { isValid: false, message: `Faltan ${8 - digits.length} dígitos (${digits.length}/8)` };
    }
    return { isValid: true, message: 'Formato DNI válido (8 dígitos)' };
  } else {
    if (digits.length === 0) {
      return { isValid: false, message: 'Ingresa los 11 dígitos del RUC' };
    }
    if (digits.length !== 11) {
      return { isValid: false, message: `Faltan ${11 - digits.length} dígitos (${digits.length}/11)` };
    }
    return { isValid: true, message: 'Formato RUC válido (11 dígitos)' };
  }
}

export function validatePeruvianPhone(value: string): {
  isValid: boolean;
  digits: string;
  message: string;
} {
  const digits = value.replace(/\D/g, '').slice(0, 9);
  if (digits.length === 0) {
    return { isValid: false, digits, message: 'Ingresa un número celular de 9 dígitos' };
  }
  if (!digits.startsWith('9')) {
    return { isValid: false, digits, message: 'El celular en Perú debe iniciar con 9' };
  }
  if (digits.length !== 9) {
    return { isValid: false, digits, message: `Completa los 9 dígitos (${digits.length}/9)` };
  }
  return { isValid: true, digits, message: 'WhatsApp válido para envío de evaluación' };
}

export function generateReservationCode(docNumber: string): string {
  const suffix = docNumber.slice(-4) || Math.floor(1000 + Math.random() * 9000).toString();
  const randomChars = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `FB-${suffix}-${randomChars}`;
}

export function buildWhatsAppUrl(lead: CapturedLead): string {
  const cleanPhone = lead.phoneWhatsapp.replace(/\D/g, '');
  const fullPhone = cleanPhone.length === 9 ? `51${cleanPhone}` : cleanPhone;
  const invOption =
    INVESTMENT_OPTIONS.find((o) => o.id === lead.investmentType)?.title || 'Inversión Inmobiliaria';
  const incomeSourceLabel =
    INCOME_SOURCE_OPTIONS.find((s) => s.id === lead.incomeSourceType)?.label ||
    lead.incomeSourceType;

  const statusLabel =
    lead.metrics.tier === 'GREEN'
      ? 'PRE-CALIFICACIÓN APROBADA (PERFIL PREFERENTE)'
      : lead.metrics.tier === 'YELLOW'
      ? 'PRE-CALIFICACIÓN EN RANGO FLEXIBLE (EVALUACIÓN ESPECIAL)'
      : 'ESTRUCTURACIÓN PERSONALIZADA FONBIENES';

  const lines = [
    `Hola *${lead.fullName}*, te saludamos de *FonBienes Perú (EAFC)*.`,
    ``,
    `Aquí tienes el resumen oficial de tu evaluación en Feria Inmobiliaria:`,
    `• *Código de Reserva:* ${lead.reservationCode}`,
    `• *Documento (${lead.documentType}):* ${lead.documentNumber}`,
    `• *Tipo de Ingreso:* ${incomeSourceLabel}${lead.isJointIncome ? ' + Mancomunado' : ''}`,
    `• *Ingreso Total Evaluado:* ${formatPEN(lead.metrics.clientIncomePEN, 0)}`,
    `• *Objetivo:* ${invOption}`,
    `• *Certificado Evaluado:* ${formatUSD(lead.metrics.requestedAmountUSD, 0)} USD`,
    `• *Cuota Mensual Estimada (132m):* ${formatPEN(lead.metrics.monthlyInstallmentPEN, 0)} (${formatUSD(lead.metrics.monthlyInstallmentUSD, 2)} USD - TC ${lead.exchangeRate.toFixed(2)})`,
    `• *Resultado:* ${statusLabel}`,
  ];

  if (lead.metrics.tier === 'RED' && lead.metrics.directQualifyingAmountUSD >= MIN_CERTIFICATE_USD) {
    lines.push(
      `• *Monto con Aprobación Directa Hoy:* ${formatUSD(lead.metrics.directQualifyingAmountUSD, 0)} USD`
    );
  }

  lines.push(
    ``,
    `Con este código mantenemos activo tu beneficio de feria. ¿Deseas que agendemos el bloqueo de tu certificado?`
  );

  const encodedText = encodeURIComponent(lines.join('\n'));
  return `https://wa.me/${fullPhone}?text=${encodedText}`;
}
