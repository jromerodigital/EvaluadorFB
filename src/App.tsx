import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Building,
  Store,
  Landmark,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  UserCheck,
  Users,
  Phone,
  MapPin,
  Search,
  ShieldCheck,
  Loader2,
  Briefcase,
  Check,
} from 'lucide-react';
import {
  CapturedLead,
  DocumentType,
  INCOME_SOURCE_OPTIONS,
  IncomeSourceType,
  INVESTMENT_OPTIONS,
  InvestmentType,
  LIMA_DISTRICTS,
  PRESET_AMOUNTS_USD,
  SimulationInput,
} from './types/prequalifier';
import {
  autoCapitalizeName,
  computeTotalIncome,
  DEFAULT_EXCHANGE_RATE,
  evaluateProfile,
  formatNumberWithCommas,
  formatPEN,
  formatPhoneDisplay,
  formatUSD,
  generateReservationCode,
  MIN_CERTIFICATE_USD,
  validateDocument,
  validatePeruvianPhone,
} from './utils/financialMath';
import {
  consultarDni,
  consultarRuc,
  toTitleCase,
} from './services/dniRucService';
import { HeaderBar } from './components/HeaderBar';
import { ResultView } from './components/ResultView';
import { LeadDrawer } from './components/LeadDrawer';
import { WebhookModal } from './components/WebhookModal';
import {
  getStoredWebhookUrl,
  sendLeadWebhook,
} from './services/webhookService';

const STORAGE_KEY_LEADS = 'fonbienes_expo_leads_v2';
const STORAGE_KEY_RATE = 'fonbienes_expo_rate_v2';
const STORAGE_KEY_THEME = 'fonbienes_theme_v1';

const INITIAL_FORM_STATE: SimulationInput = {
  investmentType: 'departamento',
  requestedAmountUSD: 80000,
  documentType: 'DNI',
  documentNumber: '',
  fullName: '',
  incomeSourceType: 'DEPENDIENTE',
  dependentIncome: 5500,
  independentIncome: 0,
  jointSpouseIncome: 0,
  monthlyIncome: 5500,
  incomeCurrency: 'PEN',
  exchangeRate: DEFAULT_EXCHANGE_RATE, // 3.45
  isJointIncome: false,
  phoneWhatsapp: '',
  district: 'Miraflores',
};

export function App() {
  // Theme state ('light' | 'dark')
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_THEME);
      return saved === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  const isDark = theme === 'dark';

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(STORAGE_KEY_THEME, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Reference exchange rate (Default 3.45)
  const [exchangeRate, setExchangeRate] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RATE);
      return saved
        ? parseFloat(saved) || DEFAULT_EXCHANGE_RATE
        : DEFAULT_EXCHANGE_RATE;
    } catch {
      return DEFAULT_EXCHANGE_RATE;
    }
  });

  // Form wizard state
  const [formData, setFormData] = useState<SimulationInput>({
    ...INITIAL_FORM_STATE,
    exchangeRate,
  });

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isVerifying, setIsVerifying] = useState(false);

  // Raw string inputs for smooth formatting
  const [amountRawInput, setAmountRawInput] = useState<string>(
    formatNumberWithCommas(INITIAL_FORM_STATE.requestedAmountUSD)
  );
  const [depIncomeRaw, setDepIncomeRaw] = useState<string>(
    formatNumberWithCommas(INITIAL_FORM_STATE.dependentIncome)
  );
  const [indepIncomeRaw, setIndepIncomeRaw] = useState<string>('');
  const [jointIncomeRaw, setJointIncomeRaw] = useState<string>('');

  // RENIEC / SUNAT Automatic & Manual Lookup State
  const [buscandoDoc, setBuscandoDoc] = useState(false);
  const [mensajeDoc, setMensajeDoc] = useState<{
    tipo: 'ok' | 'error';
    texto: string;
  } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Searchable Dropdown State for District in Step 3
  const [isDistrictDropdownOpen, setIsDistrictDropdownOpen] = useState(false);
  const [districtSearch, setDistrictSearch] = useState('');
  const districtDropdownRef = useRef<HTMLDivElement | null>(null);

  // Close district dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        districtDropdownRef.current &&
        !districtDropdownRef.current.contains(event.target as Node)
      ) {
        setIsDistrictDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Active evaluated lead shown on Step 4
  const [activeLead, setActiveLead] = useState<CapturedLead | null>(null);

  // Leads persisted in localStorage
  const [leads, setLeads] = useState<CapturedLead[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_LEADS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState<string>(() => getStoredWebhookUrl());
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);

  // Webhook Resend Handler for ResultView and LeadDrawer
  const handleResendWebhook = async (
    leadToResend: CapturedLead
  ): Promise<boolean> => {
    const res = await sendLeadWebhook(leadToResend);
    if (res.success) {
      const updated: CapturedLead = {
        ...leadToResend,
        webhookSent: true,
        webhookSentAt: new Date().toISOString(),
      };
      if (activeLead?.id === updated.id) {
        setActiveLead(updated);
      }
      setLeads((prev) =>
        prev.map((l) => (l.id === updated.id ? updated : l))
      );
      return true;
    }
    return false;
  };

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_LEADS, JSON.stringify(leads));
    } catch {
      // Ignore storage errors
    }
  }, [leads]);

  // Keep total monthlyIncome synchronized with the sum of income components
  const totalCalculatedIncomePEN = useMemo(
    () =>
      computeTotalIncome({
        incomeSourceType: formData.incomeSourceType,
        dependentIncome: formData.dependentIncome,
        independentIncome: formData.independentIncome,
        isJointIncome: formData.isJointIncome,
        jointSpouseIncome: formData.jointSpouseIncome,
      }),
    [
      formData.incomeSourceType,
      formData.dependentIncome,
      formData.independentIncome,
      formData.isJointIncome,
      formData.jointSpouseIncome,
    ]
  );

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      monthlyIncome: totalCalculatedIncomePEN,
      incomeCurrency: 'PEN',
    }));
  }, [totalCalculatedIncomePEN]);

  // Exchange rate update handler
  const handleExchangeRateChange = (newRate: number) => {
    setExchangeRate(newRate);
    try {
      localStorage.setItem(STORAGE_KEY_RATE, String(newRate));
    } catch {
      // Ignore
    }
    setFormData((prev) => ({ ...prev, exchangeRate: newRate }));
    if (activeLead) {
      const updatedInput = { ...activeLead, exchangeRate: newRate };
      const updatedMetrics = evaluateProfile(updatedInput);
      const updatedLead = { ...updatedInput, metrics: updatedMetrics };
      setActiveLead(updatedLead);
      setLeads((prev) =>
        prev.map((l) => (l.id === updatedLead.id ? updatedLead : l))
      );
    }
  };

  // ==================== RENIEC / SUNAT LOOKUP EXECUTION ====================
  const ejecutarConsultaDoc = async (
    docVal: string,
    docType: DocumentType = formData.documentType
  ) => {
    const clean = docVal.replace(/\D/g, '');
    const esValido =
      (docType === 'DNI' && clean.length === 8) ||
      (docType === 'RUC' && clean.length === 11);
    if (!esValido) return;

    setBuscandoDoc(true);
    setMensajeDoc(null);

    if (docType === 'DNI') {
      const res = await consultarDni(clean);
      if (res.success && res.nombreCompleto) {
        setFormData((prev) => ({
          ...prev,
          fullName: res.nombreCompleto || prev.fullName,
        }));
        setMensajeDoc({ tipo: 'ok', texto: 'Verificado vía RENIEC' });
      } else {
        setMensajeDoc({
          tipo: 'error',
          texto:
            res.message ||
            'No encontrado. Puedes ingresar el nombre manualmente.',
        });
      }
    } else {
      const res = await consultarRuc(clean);
      if (res.success && res.razonSocial) {
        const matchedDistrict = res.distrito
          ? LIMA_DISTRICTS.find(
              (d) =>
                d.toLowerCase() ===
                toTitleCase(res.distrito || '').toLowerCase()
            )
          : undefined;

        setFormData((prev) => ({
          ...prev,
          fullName: res.razonSocial || prev.fullName,
          district: matchedDistrict || prev.district,
        }));
        setMensajeDoc({
          tipo: 'ok',
          texto: `Verificado vía SUNAT${res.estado ? ` (${res.estado})` : ''}`,
        });
      } else {
        setMensajeDoc({
          tipo: 'error',
          texto:
            res.message ||
            'No encontrado. Puedes ingresar la razón social manualmente.',
        });
      }
    }
    setBuscandoDoc(false);
  };

  // Debounce 500ms automatic trigger when 8 (DNI) or 11 (RUC) digits are entered
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const clean = formData.documentNumber.replace(/\D/g, '');
    const esValido =
      (formData.documentType === 'DNI' && clean.length === 8) ||
      (formData.documentType === 'RUC' && clean.length === 11);

    if (esValido) {
      debounceRef.current = setTimeout(() => {
        ejecutarConsultaDoc(clean, formData.documentType);
      }, 500);
    } else {
      setMensajeDoc(null);
    }

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [formData.documentNumber, formData.documentType]);

  // Step Validations
  const isStep1Valid = formData.requestedAmountUSD >= MIN_CERTIFICATE_USD;

  const docValidation = useMemo(
    () => validateDocument(formData.documentType, formData.documentNumber),
    [formData.documentType, formData.documentNumber]
  );

  const isStep2Valid =
    docValidation.isValid &&
    formData.fullName.trim().length >= 3 &&
    totalCalculatedIncomePEN > 0;

  const phoneValidation = useMemo(
    () => validatePeruvianPhone(formData.phoneWhatsapp),
    [formData.phoneWhatsapp]
  );
  const isStep3Valid =
    phoneValidation.isValid && formData.district.trim().length > 0;

  // Step 1 Handlers
  const handleSelectInvestment = (type: InvestmentType) => {
    setFormData((prev) => ({ ...prev, investmentType: type }));
  };

  const handleAmountInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawDigits = e.target.value.replace(/\D/g, '');
    if (!rawDigits) {
      setAmountRawInput('');
      setFormData((prev) => ({ ...prev, requestedAmountUSD: 0 }));
      return;
    }
    const numeric = Math.min(2000000, parseInt(rawDigits, 10));
    setAmountRawInput(formatNumberWithCommas(numeric));
    setFormData((prev) => ({ ...prev, requestedAmountUSD: numeric }));
  };

  const handleSelectPresetAmount = (amount: number) => {
    setAmountRawInput(formatNumberWithCommas(amount));
    setFormData((prev) => ({ ...prev, requestedAmountUSD: amount }));
  };

  // Step 2 Handlers
  const handleDocumentTypeChange = (type: DocumentType) => {
    setFormData((prev) => ({
      ...prev,
      documentType: type,
      documentNumber: '',
      fullName: '',
    }));
    setMensajeDoc(null);
  };

  const handleDocumentNumberChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const maxLen = formData.documentType === 'DNI' ? 8 : 11;
    const digits = e.target.value.replace(/\D/g, '').slice(0, maxLen);
    setFormData((prev) => ({ ...prev, documentNumber: digits }));
  };

  const handleFullNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = autoCapitalizeName(e.target.value);
    setFormData((prev) => ({ ...prev, fullName: formatted }));
  };

  const handleIncomeSourceChange = (source: IncomeSourceType) => {
    setFormData((prev) => {
      if (
        source === 'DEPENDIENTE' &&
        prev.dependentIncome === 0 &&
        prev.independentIncome > 0
      ) {
        setDepIncomeRaw(formatNumberWithCommas(prev.independentIncome));
        return {
          ...prev,
          incomeSourceType: source,
          dependentIncome: prev.independentIncome,
        };
      }
      if (
        source === 'INDEPENDIENTE' &&
        prev.independentIncome === 0 &&
        prev.dependentIncome > 0
      ) {
        setIndepIncomeRaw(formatNumberWithCommas(prev.dependentIncome));
        return {
          ...prev,
          incomeSourceType: source,
          independentIncome: prev.dependentIncome,
        };
      }
      return { ...prev, incomeSourceType: source };
    });
  };

  const handleNumericCurrencyChange = (
    rawVal: string,
    setterRaw: React.Dispatch<React.SetStateAction<string>>,
    field: 'dependentIncome' | 'independentIncome' | 'jointSpouseIncome'
  ) => {
    const digits = rawVal.replace(/\D/g, '');
    if (!digits) {
      setterRaw('');
      setFormData((prev) => ({ ...prev, [field]: 0 }));
      return;
    }
    const numeric = Math.min(1000000, parseInt(digits, 10));
    setterRaw(formatNumberWithCommas(numeric));
    setFormData((prev) => ({ ...prev, [field]: numeric }));
  };

  // Step 3 Handlers
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
    setFormData((prev) => ({ ...prev, phoneWhatsapp: digits }));
  };

  const handleTriggerEvaluation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStep3Valid) return;

    setIsVerifying(true);
    setTimeout(() => {
      const finalInput: SimulationInput = {
        ...formData,
        monthlyIncome: totalCalculatedIncomePEN,
        incomeCurrency: 'PEN',
      };
      const metrics = evaluateProfile(finalInput);
      const newLead: CapturedLead = {
        ...finalInput,
        id: `lead_${Date.now()}`,
        createdAt: new Date().toISOString(),
        reservationCode: generateReservationCode(formData.documentNumber),
        metrics,
        webhookSent: false,
      };

      // Despachar webhook automáticamente en segundo plano si hay URL configurada
      const targetWebhookUrl = getStoredWebhookUrl();
      if (targetWebhookUrl) {
        sendLeadWebhook(newLead, targetWebhookUrl, 'LEAD_PREQUALIFIED').then((res) => {
          if (res.success) {
            newLead.webhookSent = true;
            newLead.webhookSentAt = new Date().toISOString();
            setActiveLead((prev) => (prev?.id === newLead.id ? { ...newLead } : prev));
            setLeads((prev) =>
              prev.map((l) => (l.id === newLead.id ? { ...newLead } : l))
            );
          }
        });
      }

      setActiveLead(newLead);
      setLeads((prev) => [newLead, ...prev]);
      setIsVerifying(false);
      setStep(4);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 1100);
  };

  // Live Advisor calibration on Step 4
  const handleUpdateAmountLive = (newAmountUSD: number) => {
    if (!activeLead) return;
    const updatedInput: SimulationInput = {
      ...activeLead,
      requestedAmountUSD: newAmountUSD,
    };
    const updatedMetrics = evaluateProfile(updatedInput);
    const updatedLead: CapturedLead = {
      ...activeLead,
      requestedAmountUSD: newAmountUSD,
      metrics: updatedMetrics,
    };
    setActiveLead(updatedLead);
    setFormData((prev) => ({ ...prev, requestedAmountUSD: newAmountUSD }));
    setAmountRawInput(formatNumberWithCommas(newAmountUSD));
    setLeads((prev) =>
      prev.map((l) => (l.id === updatedLead.id ? updatedLead : l))
    );
  };

  const handleUpdateIncomeLive = (
    newTotalIncomePEN: number,
    isJoint: boolean
  ) => {
    if (!activeLead) return;
    const updatedInput: SimulationInput = {
      ...activeLead,
      monthlyIncome: newTotalIncomePEN,
      incomeCurrency: 'PEN',
      isJointIncome: isJoint,
    };
    const updatedMetrics = evaluateProfile(updatedInput);
    const updatedLead: CapturedLead = {
      ...activeLead,
      monthlyIncome: newTotalIncomePEN,
      incomeCurrency: 'PEN',
      isJointIncome: isJoint,
      metrics: updatedMetrics,
    };
    setActiveLead(updatedLead);
    setLeads((prev) =>
      prev.map((l) => (l.id === updatedLead.id ? updatedLead : l))
    );
  };

  // Reset for next client
  const handleNewClientReset = () => {
    const fresh: SimulationInput = {
      ...INITIAL_FORM_STATE,
      exchangeRate,
    };
    setFormData(fresh);
    setAmountRawInput(formatNumberWithCommas(fresh.requestedAmountUSD));
    setDepIncomeRaw(formatNumberWithCommas(fresh.dependentIncome));
    setIndepIncomeRaw('');
    setJointIncomeRaw('');
    setMensajeDoc(null);
    setDistrictSearch('');
    setIsDistrictDropdownOpen(false);
    setActiveLead(null);
    setStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectLeadFromDrawer = (lead: CapturedLead) => {
    setFormData({
      ...INITIAL_FORM_STATE,
      ...lead,
    });
    setAmountRawInput(formatNumberWithCommas(lead.requestedAmountUSD));
    setDepIncomeRaw(
      lead.dependentIncome ? formatNumberWithCommas(lead.dependentIncome) : ''
    );
    setIndepIncomeRaw(
      lead.independentIncome
        ? formatNumberWithCommas(lead.independentIncome)
        : ''
    );
    setJointIncomeRaw(
      lead.jointSpouseIncome
        ? formatNumberWithCommas(lead.jointSpouseIncome)
        : ''
    );
    setActiveLead(lead);
    setStep(4);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredDistricts = LIMA_DISTRICTS.filter((d) =>
    d.toLowerCase().includes(districtSearch.toLowerCase().trim())
  );

  const selectedInvestmentTitle =
    INVESTMENT_OPTIONS.find((o) => o.id === formData.investmentType)
      ?.shortTitle || 'Departamento';

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-300 ${
        isDark
          ? 'dark bg-[#090E1A] text-slate-100'
          : 'bg-[#F5F5F7] text-[#1D1D1F]'
      }`}
    >
      {/* Top Institutional Bar */}
      <HeaderBar
        theme={theme}
        onToggleTheme={toggleTheme}
        leadsCount={leads.length}
        onOpenLeadsDrawer={() => setIsDrawerOpen(true)}
        exchangeRate={exchangeRate}
        onChangeExchangeRate={handleExchangeRateChange}
        onQuickReset={handleNewClientReset}
        isWebhookActive={!!webhookUrl}
        onOpenWebhookModal={() => setIsWebhookModalOpen(true)}
      />

      {/* Centered, Clean Single-Column Container */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* WIZARD PROGRESS HEADER & PERSISTENT SUMMARY PILL */}
        <div className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2.5">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setStep((prev) =>
                      prev > 1 ? ((prev - 1) as 1 | 2 | 3) : 1
                    )
                  }
                  className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${
                    isDark
                      ? 'bg-[#131C31] hover:bg-slate-800 border-slate-700 text-sky-400'
                      : 'bg-white hover:bg-black/[0.04] border-black/[0.08] text-[#004E89]'
                  }`}
                  aria-label="Paso anterior"
                >
                  <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
                </button>
              )}

              <div>
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider block ${
                    isDark ? 'text-sky-400' : 'text-[#004E89]'
                  }`}
                >
                  {step < 4
                    ? `Paso ${step} de 3`
                    : 'Resultado de Evaluación'}
                </span>
                <h2
                  className={`text-base sm:text-lg font-bold tracking-[-0.02em] ${
                    isDark ? 'text-white' : 'text-[#1D1D1F]'
                  }`}
                >
                  {step === 1 && 'Objetivo y Monto de Certificado'}
                  {step === 2 && 'Identificación e Ingresos'}
                  {step === 3 && 'Contacto y Ubicación'}
                  {step === 4 && 'Dictamen de Precalificación FonBienes'}
                </h2>
              </div>
            </div>

            {/* Clean Summary Pill: Only Objective + Certificate Amount */}
            {step < 4 && (
              <div
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs ${
                  isDark
                    ? 'bg-[#131C31] border-slate-700/80 text-slate-200'
                    : 'bg-white border-black/[0.07] text-[#1D1D1F]'
                }`}
              >
                <span
                  className={`font-medium ${
                    isDark ? 'text-slate-300' : 'text-[#6E6E73]'
                  }`}
                >
                  {selectedInvestmentTitle}
                </span>
                <span className="opacity-30">•</span>
                <span
                  className={`font-bold tabular-nums ${
                    isDark ? 'text-sky-400' : 'text-[#004E89]'
                  }`}
                >
                  {formatUSD(formData.requestedAmountUSD, 0)}
                </span>
              </div>
            )}
          </div>

          {/* Minimalist 3-Segment Progress Bar */}
          {step < 4 && (
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((idx) => {
                const isActive = step === idx;
                const isCompleted = step > idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={idx > step}
                    onClick={() => {
                      if (idx < step) setStep(idx as 1 | 2 | 3);
                    }}
                    className="focus:outline-none disabled:cursor-default"
                  >
                    <div
                      className={`h-1.5 w-full rounded-full overflow-hidden ${
                        isDark ? 'bg-slate-800' : 'bg-black/[0.08]'
                      }`}
                    >
                      <div
                        className={`h-full rounded-full transition-all duration-300 ease-apple ${
                          isCompleted
                            ? isDark
                              ? 'w-full bg-sky-400'
                              : 'w-full bg-[#004E89]'
                            : isActive
                            ? 'w-full bg-gradient-to-r from-[#004E89] to-[#008744]'
                            : 'w-0'
                        }`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* VERIFICATION OVERLAY MICRO-ANIMATION */}
        {isVerifying ? (
          <div
            className={`rounded-3xl p-10 sm:p-14 border shadow-apple-elevated text-center my-4 ${
              isDark
                ? 'bg-[#131C31] border-slate-800 text-white'
                : 'bg-white border-black/[0.06] text-[#1D1D1F]'
            }`}
          >
            <div className="w-14 h-14 rounded-2xl bg-[#004E89]/15 text-[#004E89] dark:bg-[#004E89]/25 dark:text-sky-400 flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-7 h-7 animate-spin" strokeWidth={1.5} />
            </div>
            <h3
              className={`text-lg font-bold tracking-[-0.02em] mb-1.5 ${
                isDark ? 'text-white' : 'text-[#004E89]'
              }`}
            >
              Analizando capacidad crediticia y parámetros FonBienes...
            </h3>
            <p
              className={`text-xs sm:text-sm max-w-sm mx-auto ${
                isDark ? 'text-slate-400' : 'text-[#6E6E73]'
              }`}
            >
              Validando suma de ingresos frente a la cuota mensual asignada en Soles.
            </p>
          </div>
        ) : step === 4 && activeLead ? (
          /* STEP 4: RESULT VIEW */
          <ResultView
            theme={theme}
            lead={activeLead}
            onUpdateAmountLive={handleUpdateAmountLive}
            onUpdateIncomeLive={handleUpdateIncomeLive}
            onNewClientReset={handleNewClientReset}
            isWebhookActive={!!webhookUrl}
            onOpenWebhookModal={() => setIsWebhookModalOpen(true)}
            onResendWebhook={handleResendWebhook}
          />
        ) : (
          /* STEPS 1 TO 3: CLEAN CENTERED CARD */
          <div
            className={`rounded-3xl p-5 sm:p-8 border shadow-apple-card animate-fadeIn transition-colors duration-300 ${
              isDark
                ? 'bg-[#131C31] border-slate-800 text-slate-100'
                : 'bg-white border-black/[0.06] text-[#1D1D1F]'
            }`}
          >
            {/* ==================== STEP 1: OBJETIVO E INVERSIÓN (HORIZONTAL) ==================== */}
            {step === 1 && (
              <div className="space-y-6">
                {/* 1. Horizontal Investment Type Cards (3-Column Grid) */}
                <div>
                  <label
                    className={`block text-xs font-bold uppercase tracking-wider mb-3 ${
                      isDark ? 'text-slate-400' : 'text-[#6E6E73]'
                    }`}
                  >
                    1. Tipo de Inversión
                  </label>

                  <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
                    {INVESTMENT_OPTIONS.map((option) => {
                      const isSelected = formData.investmentType === option.id;
                      const IconComponent =
                        option.id === 'departamento'
                          ? Building
                          : option.id === 'local_comercial'
                          ? Store
                          : Landmark;

                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => handleSelectInvestment(option.id)}
                          className={`group relative p-3.5 sm:p-4 rounded-2xl border text-left transition-all duration-200 ease-apple flex flex-col justify-between min-h-[108px] sm:min-h-[118px] ${
                            isSelected
                              ? isDark
                                ? 'bg-[#004E89]/20 border-[#004E89] ring-2 ring-[#004E89]/25'
                                : 'bg-[#EBF3FA] border-[#004E89] ring-2 ring-[#004E89]/15'
                              : isDark
                              ? 'bg-[#0B1120] hover:bg-[#192540] border-slate-800'
                              : 'bg-[#F5F5F7]/70 hover:bg-[#F5F5F7] border-black/[0.06]'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full mb-2.5">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                                isSelected
                                  ? 'bg-[#004E89] text-white'
                                  : isDark
                                  ? 'bg-[#162038] text-sky-400'
                                  : 'bg-white text-[#004E89]'
                              }`}
                            >
                              <IconComponent
                                className="w-4 h-4 sm:w-5 sm:h-5"
                                strokeWidth={1.5}
                              />
                            </div>

                            <div
                              className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                isSelected
                                  ? 'border-[#004E89] bg-[#004E89]'
                                  : isDark
                                  ? 'border-slate-600 bg-slate-900'
                                  : 'border-black/20 bg-white'
                              }`}
                            >
                              {isSelected && (
                                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                              )}
                            </div>
                          </div>

                          <div>
                            <span
                              className={`font-bold text-xs sm:text-sm leading-tight block ${
                                isDark ? 'text-white' : 'text-[#1D1D1F]'
                              }`}
                            >
                              {option.shortTitle}
                            </span>
                            <span
                              className={`text-[11px] hidden sm:block mt-0.5 line-clamp-1 ${
                                isDark ? 'text-slate-400' : 'text-[#6E6E73]'
                              }`}
                            >
                              {option.subtitle}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Certificate Amount Input */}
                <div
                  className={`p-4 sm:p-5 rounded-2xl border space-y-3.5 ${
                    isDark
                      ? 'bg-[#0B1120] border-slate-800'
                      : 'bg-[#F5F5F7] border-black/[0.06]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="certificate-amount-input"
                      className={`text-xs font-bold uppercase tracking-wider ${
                        isDark ? 'text-sky-400' : 'text-[#004E89]'
                      }`}
                    >
                      2. Monto del Certificado (USD)
                    </label>
                    <span
                      className={`text-xs font-medium ${
                        isDark ? 'text-slate-400' : 'text-[#6E6E73]'
                      }`}
                    >
                      Mínimo $40,000
                    </span>
                  </div>

                  {/* Clean Flex Input + Preset Chips */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div
                      className={`flex-1 flex items-center rounded-xl border overflow-hidden transition-all ${
                        !isStep1Valid
                          ? 'border-[#D97706]'
                          : isDark
                          ? 'bg-[#131C31] border-slate-700 focus-within:border-[#004E89]'
                          : 'bg-white border-black/[0.08] focus-within:border-[#004E89]'
                      }`}
                    >
                      <span
                        className={`pl-4 pr-2 text-xl font-bold select-none ${
                          isDark ? 'text-sky-400' : 'text-[#004E89]'
                        }`}
                      >
                        $
                      </span>
                      <input
                        id="certificate-amount-input"
                        type="text"
                        inputMode="numeric"
                        value={amountRawInput}
                        onChange={handleAmountInputChange}
                        placeholder="80,000"
                        className={`w-full py-3 pr-2 bg-transparent text-xl sm:text-2xl font-bold tracking-[-0.02em] tabular-nums focus:outline-none ${
                          isDark ? 'text-white' : 'text-[#1D1D1F]'
                        }`}
                      />
                      <span
                        className={`pr-3.5 text-[11px] font-bold uppercase select-none ${
                          isDark ? 'text-slate-400' : 'text-[#6E6E73]'
                        }`}
                      >
                        USD
                      </span>
                    </div>

                    {/* Horizontal Quick-Select Chips */}
                    <div className="grid grid-cols-5 sm:flex items-center gap-1.5">
                      {PRESET_AMOUNTS_USD.map((preset) => {
                        const isCurrent =
                          formData.requestedAmountUSD === preset;
                        const shortLabel =
                          preset === 150000
                            ? '$150k+'
                            : `$${preset / 1000}k`;
                        return (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => handleSelectPresetAmount(preset)}
                            className={`px-2.5 py-2.5 rounded-xl text-xs font-bold tabular-nums transition-all ${
                              isCurrent
                                ? 'bg-[#004E89] text-white shadow-2xs'
                                : isDark
                                ? 'bg-[#131C31] hover:bg-slate-800 text-slate-200 border border-slate-700'
                                : 'bg-white hover:bg-black/[0.04] text-[#1D1D1F] border border-black/[0.07]'
                            }`}
                          >
                            {shortLabel}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Polite Inline Minimum Warning */}
                  {!isStep1Valid && (
                    <div
                      className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs font-medium ${
                        isDark
                          ? 'bg-amber-950/60 border-amber-800 text-amber-300'
                          : 'bg-[#FFFBEB] border-[#FDE68A] text-[#D97706]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <AlertCircle
                          className="w-4 h-4 shrink-0"
                          strokeWidth={1.5}
                        />
                        <span>El certificado mínimo es de $40,000 USD.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSelectPresetAmount(40000)}
                        className="px-2.5 py-1 rounded-lg bg-[#D97706] text-white font-semibold shrink-0"
                      >
                        Usar $40,000
                      </button>
                    </div>
                  )}
                </div>

                {/* Step 1 Primary CTA */}
                <button
                  type="button"
                  disabled={!isStep1Valid}
                  onClick={() => setStep(2)}
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#004E89] to-[#003865] hover:from-[#003865] hover:to-[#002644] disabled:opacity-40 active:scale-[0.99] text-white font-semibold text-sm sm:text-base flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all duration-200 ease-apple"
                >
                  <span>Continuar</span>
                  <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
            )}

            {/* ==================== STEP 2: IDENTIFICACIÓN (RENIEC/SUNAT) + TIPO DE INGRESO ==================== */}
            {step === 2 && (
              <div className="space-y-5">
                {/* 1. DNI / RUC with Automatic & Manual ApisPeru Lookup */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label
                      className={`text-xs font-bold uppercase tracking-wider ${
                        isDark ? 'text-slate-400' : 'text-[#6E6E73]'
                      }`}
                    >
                      1. Documento de Identidad ({formData.documentType})
                    </label>

                    {/* Compact DNI / RUC Tabs */}
                    <div
                      className={`inline-flex p-0.5 rounded-xl border ${
                        isDark
                          ? 'bg-[#0B1120] border-slate-800'
                          : 'bg-[#F5F5F7] border-black/[0.06]'
                      }`}
                    >
                      {(['DNI', 'RUC'] as const).map((docType) => {
                        const active = formData.documentType === docType;
                        return (
                          <button
                            key={docType}
                            type="button"
                            onClick={() => handleDocumentTypeChange(docType)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                              active
                                ? 'bg-[#004E89] text-white shadow-2xs'
                                : isDark
                                ? 'text-slate-400 hover:text-white'
                                : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                            }`}
                          >
                            {docType}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Document Input with Integrated "Buscar" Button */}
                  <div
                    className={`flex items-center rounded-xl border overflow-hidden transition-all ${
                      isDark
                        ? 'bg-[#0B1120] border-slate-700 focus-within:border-[#004E89]'
                        : 'bg-[#F5F5F7] border-black/[0.08] focus-within:bg-white focus-within:border-[#004E89]'
                    }`}
                  >
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={formData.documentType === 'DNI' ? 8 : 11}
                      value={formData.documentNumber}
                      onChange={handleDocumentNumberChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          ejecutarConsultaDoc(formData.documentNumber);
                        }
                      }}
                      placeholder={
                        formData.documentType === 'DNI'
                          ? 'Ingresa los 8 dígitos del DNI'
                          : 'Ingresa los 11 dígitos del RUC'
                      }
                      className={`flex-1 px-4 py-3 bg-transparent text-base sm:text-lg font-bold tracking-wider tabular-nums focus:outline-none ${
                        isDark
                          ? 'text-white placeholder-slate-500'
                          : 'text-[#1D1D1F] placeholder-[#6E6E73]/60'
                      }`}
                    />
                    <button
                      type="button"
                      disabled={
                        buscandoDoc ||
                        formData.documentNumber.length !==
                          (formData.documentType === 'DNI' ? 8 : 11)
                      }
                      onClick={() =>
                        ejecutarConsultaDoc(formData.documentNumber)
                      }
                      className="mr-1.5 px-3.5 py-2 rounded-lg bg-[#008744] hover:bg-[#006E37] disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 shadow-xs"
                    >
                      {buscandoDoc ? (
                        <>
                          <Loader2
                            className="w-3.5 h-3.5 animate-spin"
                            strokeWidth={1.5}
                          />
                          <span>Buscando</span>
                        </>
                      ) : (
                        <>
                          <Search className="w-3.5 h-3.5" strokeWidth={1.5} />
                          <span>Buscar</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Status Feedback from RENIEC / SUNAT or Format Validation */}
                  {mensajeDoc ? (
                    <p
                      className={`text-xs mt-1.5 font-semibold flex items-center gap-1.5 ${
                        mensajeDoc.tipo === 'ok'
                          ? isDark
                            ? 'text-emerald-400'
                            : 'text-[#16A34A]'
                          : isDark
                          ? 'text-amber-400'
                          : 'text-[#D97706]'
                      }`}
                    >
                      {mensajeDoc.tipo === 'ok' ? (
                        <CheckCircle2
                          className="w-3.5 h-3.5"
                          strokeWidth={1.5}
                        />
                      ) : (
                        <AlertCircle
                          className="w-3.5 h-3.5"
                          strokeWidth={1.5}
                        />
                      )}
                      <span>{mensajeDoc.texto}</span>
                    </p>
                  ) : (
                    <p
                      className={`text-xs mt-1 ${
                        isDark ? 'text-slate-400' : 'text-[#6E6E73]'
                      }`}
                    >
                      {docValidation.message}
                    </p>
                  )}
                </div>

                {/* 2. Nombre Completo / Razón Social */}
                <div>
                  <label
                    htmlFor="fullname-input"
                    className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                      isDark ? 'text-slate-400' : 'text-[#6E6E73]'
                    }`}
                  >
                    2.{' '}
                    {formData.documentType === 'DNI'
                      ? 'Nombre Completo'
                      : 'Razón Social'}
                  </label>
                  <div
                    className={`flex items-center rounded-xl border overflow-hidden transition-all ${
                      isDark
                        ? 'bg-[#0B1120] border-slate-700 focus-within:border-[#004E89]'
                        : 'bg-[#F5F5F7] border-black/[0.08] focus-within:bg-white focus-within:border-[#004E89]'
                    }`}
                  >
                    <span className="pl-3.5 pr-1 text-[#6E6E73]">
                      <UserCheck className="w-4 h-4" strokeWidth={1.5} />
                    </span>
                    <input
                      id="fullname-input"
                      type="text"
                      value={formData.fullName}
                      onChange={handleFullNameChange}
                      placeholder={
                        formData.documentType === 'DNI'
                          ? 'Se completa con tu DNI o escríbelo aquí'
                          : 'Se completa con tu RUC o escríbelo aquí'
                      }
                      className={`w-full px-2.5 py-3 bg-transparent text-sm sm:text-base font-semibold focus:outline-none ${
                        isDark
                          ? 'text-white placeholder-slate-500'
                          : 'text-[#1D1D1F] placeholder-[#6E6E73]/60'
                      }`}
                    />
                  </div>
                </div>

                {/* 3. Tipo de Ingreso: Dependiente, Independiente, Mixto + Montos por cada ingreso */}
                <div
                  className={`p-4 sm:p-5 rounded-2xl border space-y-4 ${
                    isDark
                      ? 'bg-[#0B1120] border-slate-800'
                      : 'bg-[#F5F5F7] border-black/[0.06]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <label
                      className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                        isDark ? 'text-sky-400' : 'text-[#004E89]'
                      }`}
                    >
                      <Briefcase className="w-3.5 h-3.5" strokeWidth={1.5} />
                      <span>3. Tipo de Ingreso y Monto Mensual (S/)</span>
                    </label>
                  </div>

                  {/* Horizontal 3-Column Selector: Dependiente | Independiente | Mixto */}
                  <div className="grid grid-cols-3 gap-2">
                    {INCOME_SOURCE_OPTIONS.map((opt) => {
                      const isSelected = formData.incomeSourceType === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleIncomeSourceChange(opt.id)}
                          className={`py-2.5 px-3 rounded-xl border text-center transition-all ${
                            isSelected
                              ? 'bg-[#004E89] text-white border-transparent shadow-2xs'
                              : isDark
                              ? 'bg-[#131C31] text-slate-200 border-slate-700 hover:border-[#004E89]/50'
                              : 'bg-white text-[#1D1D1F] border-black/[0.08] hover:border-[#004E89]/40'
                          }`}
                        >
                          <span className="text-xs font-bold block">
                            {opt.label}
                          </span>
                          <span
                            className={`text-[10px] hidden sm:block mt-0.5 ${
                              isSelected
                                ? 'text-white/85'
                                : isDark
                                ? 'text-slate-400'
                                : 'text-[#6E6E73]'
                            }`}
                          >
                            {opt.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Dynamic Income Amount Inputs per Selected Type */}
                  <div
                    className={`grid gap-3 ${
                      formData.incomeSourceType === 'MIXTO'
                        ? 'grid-cols-1 sm:grid-cols-2'
                        : 'grid-cols-1'
                    }`}
                  >
                    {(formData.incomeSourceType === 'DEPENDIENTE' ||
                      formData.incomeSourceType === 'MIXTO') && (
                      <div>
                        <label
                          className={`block text-[11px] font-semibold mb-1 ${
                            isDark ? 'text-slate-300' : 'text-[#6E6E73]'
                          }`}
                        >
                          Ingreso Neto Dependiente (S/)
                        </label>
                        <div
                          className={`flex items-center rounded-xl border overflow-hidden ${
                            isDark
                              ? 'bg-[#131C31] border-slate-700 focus-within:border-[#004E89]'
                              : 'bg-white border-black/[0.08] focus-within:border-[#004E89]'
                          }`}
                        >
                          <span
                            className={`pl-3.5 pr-2 text-sm font-bold select-none ${
                              isDark ? 'text-sky-400' : 'text-[#004E89]'
                            }`}
                          >
                            S/
                          </span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={depIncomeRaw}
                            onChange={(e) =>
                              handleNumericCurrencyChange(
                                e.target.value,
                                setDepIncomeRaw,
                                'dependentIncome'
                              )
                            }
                            placeholder="4,500"
                            className={`w-full py-2.5 pr-2 bg-transparent text-base font-bold tabular-nums focus:outline-none ${
                              isDark ? 'text-white' : 'text-[#1D1D1F]'
                            }`}
                          />
                          <span
                            className={`pr-3 text-[11px] select-none ${
                              isDark ? 'text-slate-400' : 'text-[#6E6E73]'
                            }`}
                          >
                            /mes
                          </span>
                        </div>
                      </div>
                    )}

                    {(formData.incomeSourceType === 'INDEPENDIENTE' ||
                      formData.incomeSourceType === 'MIXTO') && (
                      <div>
                        <label
                          className={`block text-[11px] font-semibold mb-1 ${
                            isDark ? 'text-slate-300' : 'text-[#6E6E73]'
                          }`}
                        >
                          Ingreso Neto Independiente (S/)
                        </label>
                        <div
                          className={`flex items-center rounded-xl border overflow-hidden ${
                            isDark
                              ? 'bg-[#131C31] border-slate-700 focus-within:border-[#004E89]'
                              : 'bg-white border-black/[0.08] focus-within:border-[#004E89]'
                          }`}
                        >
                          <span
                            className={`pl-3.5 pr-2 text-sm font-bold select-none ${
                              isDark ? 'text-sky-400' : 'text-[#004E89]'
                            }`}
                          >
                            S/
                          </span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={indepIncomeRaw}
                            onChange={(e) =>
                              handleNumericCurrencyChange(
                                e.target.value,
                                setIndepIncomeRaw,
                                'independentIncome'
                              )
                            }
                            placeholder="3,500"
                            className={`w-full py-2.5 pr-2 bg-transparent text-base font-bold tabular-nums focus:outline-none ${
                              isDark ? 'text-white' : 'text-[#1D1D1F]'
                            }`}
                          />
                          <span
                            className={`pr-3 text-[11px] select-none ${
                              isDark ? 'text-slate-400' : 'text-[#6E6E73]'
                            }`}
                          >
                            /mes
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Optional Joint / Spousal Income Checkbox & Input */}
                  <div className="space-y-2.5 pt-1">
                    <label className="flex items-center gap-2.5 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={formData.isJointIncome}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            isJointIncome: e.target.checked,
                          }))
                        }
                        className="w-4 h-4 accent-[#004E89] rounded"
                      />
                      <span
                        className={`font-semibold flex items-center gap-1.5 ${
                          isDark ? 'text-slate-200' : 'text-[#1D1D1F]'
                        }`}
                      >
                        <Users
                          className="w-3.5 h-3.5 text-[#004E89]"
                          strokeWidth={1.5}
                        />
                        Sumar ingreso mancomunado / conyugal
                      </span>
                    </label>

                    {formData.isJointIncome && (
                      <div
                        className={`flex items-center rounded-xl border overflow-hidden ${
                          isDark
                            ? 'bg-[#131C31] border-[#004E89]/50'
                            : 'bg-white border-[#004E89]/40'
                        }`}
                      >
                        <span
                          className={`pl-3.5 pr-2 text-sm font-bold select-none ${
                            isDark ? 'text-sky-400' : 'text-[#004E89]'
                          }`}
                        >
                          S/
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={jointIncomeRaw}
                          onChange={(e) =>
                            handleNumericCurrencyChange(
                              e.target.value,
                              setJointIncomeRaw,
                              'jointSpouseIncome'
                            )
                          }
                          placeholder="Ingreso mensual del cónyuge o familiar"
                          className={`w-full py-2.5 pr-2 bg-transparent text-base font-bold tabular-nums focus:outline-none ${
                            isDark ? 'text-white' : 'text-[#1D1D1F]'
                          }`}
                        />
                        <span
                          className={`pr-3 text-[11px] select-none ${
                            isDark ? 'text-slate-400' : 'text-[#6E6E73]'
                          }`}
                        >
                          /mes
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Total Sum of Incomes Pill */}
                  <div
                    className={`pt-2.5 border-t flex items-center justify-between text-xs ${
                      isDark ? 'border-slate-800' : 'border-black/[0.06]'
                    }`}
                  >
                    <span
                      className={`font-medium ${
                        isDark ? 'text-slate-400' : 'text-[#6E6E73]'
                      }`}
                    >
                      Suma Total de Ingresos a Validar:
                    </span>
                    <span
                      className={`text-sm font-bold tabular-nums ${
                        isDark ? 'text-sky-400' : 'text-[#004E89]'
                      }`}
                    >
                      {formatPEN(totalCalculatedIncomePEN, 0)} / mes
                    </span>
                  </div>
                </div>

                {/* Step 2 Navigation Buttons */}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className={`py-3.5 px-5 rounded-2xl font-semibold text-sm transition-all ${
                      isDark
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                        : 'bg-[#F5F5F7] hover:bg-black/[0.07] text-[#1D1D1F]'
                    }`}
                  >
                    Atrás
                  </button>
                  <button
                    type="button"
                    disabled={!isStep2Valid}
                    onClick={() => setStep(3)}
                    className="flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#004E89] to-[#003865] hover:from-[#003865] hover:to-[#002644] disabled:opacity-40 active:scale-[0.99] text-white font-semibold text-sm sm:text-base flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all duration-200 ease-apple"
                  >
                    <span>Continuar</span>
                    <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            )}

            {/* ==================== STEP 3: CONTACTO Y UBICACIÓN (CLEAN INPUT + DROPDOWN) ==================== */}
            {step === 3 && (
              <form onSubmit={handleTriggerEvaluation} className="space-y-6">
                {/* 1. Celular WhatsApp (Clean Flex Prefix Box — Zero Overlap, No Predefined Clutter) */}
                <div>
                  <label
                    htmlFor="whatsapp-input"
                    className={`block text-xs font-bold uppercase tracking-wider mb-2 ${
                      isDark ? 'text-slate-400' : 'text-[#6E6E73]'
                    }`}
                  >
                    1. Celular (WhatsApp)
                  </label>

                  <div
                    className={`flex items-center rounded-2xl border overflow-hidden transition-all ${
                      isDark
                        ? 'bg-[#0B1120] border-slate-700 focus-within:border-[#004E89]'
                        : 'bg-[#F5F5F7] border-black/[0.08] focus-within:bg-white focus-within:border-[#004E89]'
                    }`}
                  >
                    {/* Non-overlapping Left Prefix Box */}
                    <div
                      className={`px-4 py-3.5 flex items-center gap-2 border-r select-none shrink-0 ${
                        isDark
                          ? 'bg-[#162038] border-slate-700 text-sky-400'
                          : 'bg-[#E8F6EE] border-[#008744]/25 text-[#008744] font-bold'
                      }`}
                    >
                      <Phone
                        className="w-4 h-4 text-[#004E89]"
                        strokeWidth={1.5}
                      />
                      <span className="text-sm font-bold">+51</span>
                    </div>

                    {/* Clean Phone Input without overlapping placeholder */}
                    <input
                      id="whatsapp-input"
                      type="tel"
                      inputMode="numeric"
                      value={formatPhoneDisplay(formData.phoneWhatsapp)}
                      onChange={handlePhoneChange}
                      placeholder=""
                      aria-label="Número de celular de 9 dígitos"
                      className={`flex-1 px-4 py-3.5 bg-transparent text-lg font-bold tracking-wider tabular-nums focus:outline-none ${
                        isDark ? 'text-white' : 'text-[#1D1D1F]'
                      }`}
                    />

                    {phoneValidation.isValid && (
                      <div className="pr-4 shrink-0">
                        <CheckCircle2
                          className={`w-5 h-5 ${
                            isDark ? 'text-emerald-400' : 'text-[#16A34A]'
                          }`}
                          strokeWidth={1.5}
                        />
                      </div>
                    )}
                  </div>

                  <p
                    className={`text-xs mt-1.5 font-medium ${
                      phoneValidation.isValid
                        ? isDark
                          ? 'text-emerald-400'
                          : 'text-[#16A34A]'
                        : isDark
                        ? 'text-slate-400'
                        : 'text-[#6E6E73]'
                    }`}
                  >
                    {phoneValidation.message}
                  </p>
                </div>

                {/* 2. Distrito de Interés (Single Clean Searchable Dropdown / Desplegable — No Grid Boxes) */}
                <div ref={districtDropdownRef} className="relative">
                  <label
                    className={`block text-xs font-bold uppercase tracking-wider mb-2 ${
                      isDark ? 'text-slate-400' : 'text-[#6E6E73]'
                    }`}
                  >
                    2. Distrito de Interés
                  </label>

                  {/* Combobox Trigger / Search Input */}
                  <div
                    onClick={() => setIsDistrictDropdownOpen(true)}
                    className={`flex items-center justify-between rounded-2xl border px-4 py-3.5 cursor-pointer transition-all ${
                      isDistrictDropdownOpen
                        ? 'border-[#004E89] ring-2 ring-[#004E89]/15'
                        : isDark
                        ? 'bg-[#0B1120] border-slate-700 hover:border-slate-600'
                        : 'bg-[#F5F5F7] border-black/[0.08] hover:border-black/20'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 flex-1">
                      <MapPin
                        className="w-4 h-4 text-[#004E89] shrink-0"
                        strokeWidth={1.5}
                      />
                      {isDistrictDropdownOpen ? (
                        <input
                          type="text"
                          value={districtSearch}
                          onChange={(e) => setDistrictSearch(e.target.value)}
                          placeholder="Escribe o selecciona un distrito..."
                          autoFocus
                          className={`w-full bg-transparent text-sm sm:text-base font-semibold focus:outline-none ${
                            isDark
                              ? 'text-white placeholder-slate-500'
                              : 'text-[#1D1D1F] placeholder-[#6E6E73]'
                          }`}
                        />
                      ) : (
                        <span
                          className={`text-sm sm:text-base font-semibold ${
                            isDark ? 'text-white' : 'text-[#1D1D1F]'
                          }`}
                        >
                          {formData.district || 'Selecciona un distrito'}
                        </span>
                      )}
                    </div>

                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-200 ${
                        isDistrictDropdownOpen ? 'rotate-180 text-[#004E89]' : ''
                      } ${isDark ? 'text-slate-400' : 'text-[#6E6E73]'}`}
                      strokeWidth={1.5}
                    />
                  </div>

                  {/* Floating Dropdown Menu (Only visible when opened) */}
                  {isDistrictDropdownOpen && (
                    <div
                      className={`absolute left-0 right-0 z-30 mt-2 max-h-56 overflow-y-auto rounded-2xl border p-1.5 shadow-xl transition-all ${
                        isDark
                          ? 'bg-[#162038] border-slate-700 text-slate-100'
                          : 'bg-white border-black/[0.08] text-[#1D1D1F]'
                      }`}
                    >
                      {filteredDistricts.length === 0 ? (
                        <div
                          className={`px-3 py-3 text-xs text-center ${
                            isDark ? 'text-slate-400' : 'text-[#6E6E73]'
                          }`}
                        >
                          No se encontró ese distrito
                        </div>
                      ) : (
                        filteredDistricts.map((dist) => {
                          const isSelected = formData.district === dist;
                          return (
                            <button
                              key={dist}
                              type="button"
                              onClick={() => {
                                setFormData((prev) => ({
                                  ...prev,
                                  district: dist,
                                }));
                                setDistrictSearch('');
                                setIsDistrictDropdownOpen(false);
                              }}
                              className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-medium text-left flex items-center justify-between transition-colors ${
                                isSelected
                                  ? 'bg-[#004E89] text-white font-semibold'
                                  : isDark
                                  ? 'hover:bg-slate-800 text-slate-200'
                                  : 'hover:bg-[#F5F5F7] text-[#1D1D1F]'
                              }`}
                            >
                              <span>{dist}</span>
                              {isSelected && (
                                <Check className="w-4 h-4" strokeWidth={1.5} />
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* Submit CTA */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className={`py-3.5 px-5 rounded-2xl font-semibold text-sm transition-all ${
                      isDark
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                        : 'bg-[#F5F5F7] hover:bg-black/[0.07] text-[#1D1D1F]'
                    }`}
                  >
                    Atrás
                  </button>
                  <button
                    type="submit"
                    disabled={!isStep3Valid}
                    className="flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#004E89] via-[#00637A] to-[#008744] hover:opacity-95 disabled:opacity-40 active:scale-[0.99] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all duration-200 ease-apple"
                  >
                    <ShieldCheck className="w-5 h-5" strokeWidth={1.5} />
                    <span>
                      Evaluar Precalificación con {formData.documentType}
                    </span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </main>

      {/* Slide-over Lead History Drawer */}
      <LeadDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        leads={leads}
        onSelectLead={handleSelectLeadFromDrawer}
        onDeleteLead={(id) =>
          setLeads((prev) => prev.filter((item) => item.id !== id))
        }
        onClearAllLeads={() => setLeads([])}
        isWebhookActive={!!webhookUrl}
        onOpenWebhookModal={() => setIsWebhookModalOpen(true)}
        onResendWebhook={handleResendWebhook}
      />

      {/* Webhook / CRM Settings Modal */}
      <WebhookModal
        isOpen={isWebhookModalOpen}
        onClose={() => setIsWebhookModalOpen(false)}
        theme={theme}
        onSaved={(newUrl) => setWebhookUrl(newUrl)}
      />
    </div>
  );
}

export default App;
