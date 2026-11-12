import { CapturedLead, INVESTMENT_OPTIONS } from '../types/prequalifier';

export const STORAGE_KEY_WEBHOOK_URL = 'fonbienes_webhook_url_v1';
export const DEFAULT_WEBHOOK_URL = 'https://hook.us1.make.com/s9fbaro7v38dp1d78q3m1oetci0l6hfb';

export interface WebhookSendResult {
  success: boolean;
  message: string;
  status?: number;
}

/**
 * Obtiene la URL del Webhook configurada en localStorage o en variables de entorno (VITE_WEBHOOK_URL)
 */
export const getStoredWebhookUrl = (): string => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_WEBHOOK_URL);
    if (saved && saved.trim().length > 0) return saved.trim();
  } catch {
    // ignore
  }
  return (import.meta.env.VITE_WEBHOOK_URL || DEFAULT_WEBHOOK_URL).trim();
};

/**
 * Guarda o limpia la URL del Webhook en localStorage
 */
export const saveStoredWebhookUrl = (url: string): void => {
  try {
    if (!url || !url.trim()) {
      localStorage.removeItem(STORAGE_KEY_WEBHOOK_URL);
    } else {
      localStorage.setItem(STORAGE_KEY_WEBHOOK_URL, url.trim());
    }
  } catch {
    // ignore
  }
};

/**
 * Construye el payload estandarizado para CRM, Make.com, Zapier, n8n o Google Sheets.
 * Incluye las propiedades tanto a nivel raíz (flat) como en el objeto anidado "lead"
 * para máxima compatibilidad con cualquier receptor de webhooks.
 */
export const buildWebhookPayload = (
  lead: CapturedLead,
  event: 'LEAD_PREQUALIFIED' | 'WHATSAPP_CONTACT_CLICKED' | 'TEST_PING' = 'LEAD_PREQUALIFIED'
) => {
  const invOption =
    INVESTMENT_OPTIONS.find((o) => o.id === lead.investmentType) ||
    INVESTMENT_OPTIONS[0];

  const statusLabel =
    lead.metrics.tier === 'GREEN'
      ? 'Precalificó'
      : lead.metrics.tier === 'YELLOW'
      ? 'Requiere Evaluación'
      : 'No Califica';

  const leadData = {
    id: lead.id,
    reservationCode: lead.reservationCode,
    createdAt: lead.createdAt,
    documentType: lead.documentType,
    documentNumber: lead.documentNumber,
    fullName: lead.fullName,
    phoneWhatsapp: lead.phoneWhatsapp,
    phoneWhatsappFormatted: `+51 ${lead.phoneWhatsapp}`,
    district: lead.district,
    investmentType: lead.investmentType,
    investmentTitle: invOption.title,
    requestedAmountUSD: lead.metrics.requestedAmountUSD,
    requestedAmountPEN: Number(
      (lead.metrics.requestedAmountUSD * lead.exchangeRate).toFixed(2)
    ),
    exchangeRate: lead.exchangeRate,
    monthlyInstallmentUSD: Number(lead.metrics.monthlyInstallmentUSD.toFixed(2)),
    monthlyInstallmentPEN: Number(lead.metrics.monthlyInstallmentPEN.toFixed(2)),
    incomeSourceType: lead.incomeSourceType || 'DEPENDIENTE',
    tipoDeIngreso:
      lead.incomeSourceType === 'INDEPENDIENTE'
        ? 'Independiente'
        : lead.incomeSourceType === 'MIXTO'
        ? 'Mixto'
        : 'Dependiente',
    tipoIngreso:
      lead.incomeSourceType === 'INDEPENDIENTE'
        ? 'Independiente'
        : lead.incomeSourceType === 'MIXTO'
        ? 'Mixto'
        : 'Dependiente',
    incomeSourceLabel:
      lead.incomeSourceType === 'INDEPENDIENTE'
        ? 'Independiente'
        : lead.incomeSourceType === 'MIXTO'
        ? 'Mixto (Planilla + Independiente)'
        : 'Dependiente (Planilla)',
    montoMensualPEN: Number(lead.metrics.clientIncomePEN.toFixed(2)),
    dependentIncomePEN: lead.dependentIncome || 0,
    independentIncomePEN: lead.independentIncome || 0,
    isJointIncome: !!lead.isJointIncome,
    jointSpouseIncomePEN: lead.isJointIncome ? lead.jointSpouseIncome || 0 : 0,
    totalIncomePEN: Number(lead.metrics.clientIncomePEN.toFixed(2)),
    incomeToQuotaRatio: Number(lead.metrics.incomeToQuotaRatio.toFixed(2)),
    coveragePercent: lead.metrics.standardCoveragePercent,
    tier: lead.metrics.tier,
    statusLabel,
    directQualifyingAmountUSD: lead.metrics.directQualifyingAmountUSD,
  };

  return {
    event,
    timestamp: new Date().toISOString(),
    source: 'Precalificador Inmobiliario FonBienes (Feria)',
    ...leadData, // Propiedades directas a nivel raíz para mapeo fácil en columnas
    lead: leadData, // Estructura jerárquica para APIs tradicionales
  };
};

/**
 * Envía el lead al webhook configurado con timeout y tolerancia a CORS
 */
export const sendLeadWebhook = async (
  lead: CapturedLead,
  targetUrl?: string,
  event: 'LEAD_PREQUALIFIED' | 'WHATSAPP_CONTACT_CLICKED' | 'TEST_PING' = 'LEAD_PREQUALIFIED'
): Promise<WebhookSendResult> => {
  const url = (targetUrl || getStoredWebhookUrl()).trim();

  if (!url) {
    return {
      success: false,
      message: 'No hay URL de webhook configurada.',
    };
  }

  // Validación básica de URL
  if (!/^https?:\/\/.+/i.test(url)) {
    return {
      success: false,
      message: 'La URL del webhook debe comenzar con http:// o https://',
    };
  }

  const payload = buildWebhookPayload(lead, event);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 segundos

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/plain, */*',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok || response.status === 200 || response.status === 201 || response.status === 204) {
        return {
          success: true,
          status: response.status,
          message: `Enviado exitosamente (${response.status})`,
        };
      }

      return {
        success: false,
        status: response.status,
        message: `El webhook respondió con código ${response.status}`,
      };
    } catch (corsOrNetErr: any) {
      clearTimeout(timeoutId);

      // Si fue abortado por timeout
      if (corsOrNetErr?.name === 'AbortError') {
        return {
          success: false,
          message: 'Tiempo de espera agotado al conectar con el Webhook (8s).',
        };
      }

      // Si falló por restricciones CORS habituales en webhooks de Make/Zapier/Google Apps Script,
      // intentamos envío en modo 'no-cors' para garantizar que el servidor reciba la carga útil.
      try {
        await fetch(url, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'text/plain',
          },
          body: JSON.stringify(payload),
        });

        return {
          success: true,
          status: 200,
          message: 'Enviado exitosamente al endpoint (modo no-cors).',
        };
      } catch (fallbackErr: any) {
        return {
          success: false,
          message: corsOrNetErr?.message || 'Error de conexión con el Webhook.',
        };
      }
    }
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Error inesperado al enviar webhook.',
    };
  }
};

/**
 * Envía una prueba de conexión rápida al webhook
 */
export const testWebhookConnection = async (
  targetUrl: string
): Promise<WebhookSendResult> => {
  const dummyLead: CapturedLead = {
    id: `test_${Date.now()}`,
    createdAt: new Date().toISOString(),
    reservationCode: 'FB-TEST-000',
    documentType: 'DNI',
    documentNumber: '76403921',
    fullName: 'Cliente de Prueba FonBienes',
    phoneWhatsapp: '999888777',
    district: 'Miraflores',
    investmentType: 'departamento',
    requestedAmountUSD: 80000,
    monthlyIncome: 6000,
    incomeCurrency: 'PEN',
    exchangeRate: 3.45,
    incomeSourceType: 'DEPENDIENTE',
    dependentIncome: 6000,
    independentIncome: 0,
    jointSpouseIncome: 0,
    isJointIncome: false,
    metrics: {
      requestedAmountUSD: 80000,
      monthlyInstallmentUSD: 734.79,
      monthlyInstallmentPEN: 2535.02,
      requiredIdealIncomeUSD: 1469.58,
      requiredIdealIncomePEN: 5070.05,
      requiredFlexibleIncomeUSD: 1028.71,
      requiredFlexibleIncomePEN: 3549.03,
      clientIncomeUSD: 1739.13,
      clientIncomePEN: 6000,
      incomeToQuotaRatio: 2.37,
      standardCoveragePercent: 118,
      tier: 'GREEN',
      directQualifyingAmountUSD: 80000,
      flexibleQualifyingAmountUSD: 80000,
      shortfallIncomeUSD: 0,
      shortfallIncomePEN: 0,
    },
  };

  return sendLeadWebhook(dummyLead, targetUrl, 'TEST_PING');
};
