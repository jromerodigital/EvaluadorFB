export type InvestmentType =
  | 'departamento'
  | 'local_comercial'
  | 'cancelacion_hipotecaria';

export type DocumentType = 'DNI' | 'RUC';

export type CurrencyCode = 'PEN' | 'USD';

export type IncomeSourceType = 'DEPENDIENTE' | 'INDEPENDIENTE' | 'MIXTO';

export type QualificationTier = 'GREEN' | 'YELLOW' | 'RED';

export interface SimulationInput {
  investmentType: InvestmentType;
  requestedAmountUSD: number;
  documentType: DocumentType;
  documentNumber: string;
  fullName: string;
  incomeSourceType: IncomeSourceType;
  dependentIncome: number; // Monto ingreso dependiente
  independentIncome: number; // Monto ingreso independiente
  jointSpouseIncome: number; // Monto ingreso mancomunado / conyugal opcional
  monthlyIncome: number; // Suma total de ingresos en la moneda seleccionada
  incomeCurrency: CurrencyCode;
  exchangeRate: number; // 3.45 referencial por defecto
  isJointIncome: boolean;
  phoneWhatsapp: string;
  district: string;
}

export interface EvaluationMetrics {
  requestedAmountUSD: number;
  monthlyInstallmentUSD: number;
  monthlyInstallmentPEN: number;
  requiredIdealIncomeUSD: number;
  requiredIdealIncomePEN: number;
  requiredFlexibleIncomeUSD: number;
  requiredFlexibleIncomePEN: number;
  clientIncomeUSD: number;
  clientIncomePEN: number;
  incomeToQuotaRatio: number; // Total Income in PEN / Monthly Installment in PEN
  standardCoveragePercent: number; // % of the 2.0x standard requirement in PEN
  tier: QualificationTier;
  directQualifyingAmountUSD: number; // Exact certificate amount they qualify for at 2.0x ratio right now
  flexibleQualifyingAmountUSD: number; // Certificate amount they reach at 1.4x flexible threshold
  shortfallIncomeUSD: number;
  shortfallIncomePEN: number;
}

export interface CapturedLead extends SimulationInput {
  id: string;
  createdAt: string;
  reservationCode: string;
  metrics: EvaluationMetrics;
}

export const INVESTMENT_OPTIONS: {
  id: InvestmentType;
  title: string;
  shortTitle: string;
  subtitle: string;
  tag: string;
}[] = [
  {
    id: 'departamento',
    title: 'Departamento',
    shortTitle: 'Departamento',
    subtitle: 'Vivienda nueva o estreno',
    tag: 'Residencial',
  },
  {
    id: 'local_comercial',
    title: 'Local Comercial',
    shortTitle: 'Local Comercial',
    subtitle: 'Oficina o espacio comercial',
    tag: 'Patrimonial',
  },
  {
    id: 'cancelacion_hipotecaria',
    title: 'Cancelación de Crédito Hipotecario',
    shortTitle: 'Cancelación Hipotecaria',
    subtitle: 'Traslado de deuda bancaria',
    tag: 'Optimización',
  },
];

export const INCOME_SOURCE_OPTIONS: {
  id: IncomeSourceType;
  label: string;
  desc: string;
}[] = [
  {
    id: 'DEPENDIENTE',
    label: 'Dependiente',
    desc: 'Planilla / Boletas de pago',
  },
  {
    id: 'INDEPENDIENTE',
    label: 'Independiente',
    desc: 'Recibos por Honorarios / RUC',
  },
  {
    id: 'MIXTO',
    label: 'Mixto',
    desc: 'Dependiente + Independiente',
  },
];

export const PRESET_AMOUNTS_USD = [40000, 60000, 80000, 120000, 150000];

export const LIMA_DISTRICTS = [
  'San Isidro',
  'Miraflores',
  'Surco',
  'San Borja',
  'La Molina',
  'Magdalena del Mar',
  'San Miguel',
  'Jesús María',
  'Lince',
  'Barranco',
  'Pueblo Libre',
  'Chorrillos',
  'Otros',
];
