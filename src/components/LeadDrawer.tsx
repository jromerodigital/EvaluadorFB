import React, { useState } from 'react';
import {
  X,
  Download,
  FileSpreadsheet,
  MessageCircle,
  Trash2,
  Search,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Users,
} from 'lucide-react';
import {
  CapturedLead,
  INVESTMENT_OPTIONS,
  QualificationTier,
} from '../types/prequalifier';
import { buildWhatsAppUrl, formatPEN, formatUSD } from '../utils/financialMath';

interface LeadDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  leads: CapturedLead[];
  onSelectLead: (lead: CapturedLead) => void;
  onDeleteLead: (id: string) => void;
  onClearAllLeads: () => void;
}

export const LeadDrawer: React.FC<LeadDrawerProps> = ({
  isOpen,
  onClose,
  leads,
  onSelectLead,
  onDeleteLead,
  onClearAllLeads,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<'ALL' | QualificationTier>('ALL');
  const [confirmClear, setConfirmClear] = useState(false);

  if (!isOpen) return null;

  const filteredLeads = leads.filter((lead) => {
    const matchesTier = tierFilter === 'ALL' || lead.metrics.tier === tierFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      lead.fullName.toLowerCase().includes(q) ||
      lead.documentNumber.includes(q) ||
      lead.phoneWhatsapp.includes(q) ||
      lead.district.toLowerCase().includes(q) ||
      lead.reservationCode.toLowerCase().includes(q);
    return matchesTier && matchesSearch;
  });

  const sanitizeCsvCell = (val: string): string => {
    const clean = (val || '').replace(/"/g, '""').trim();
    if (/^[=+\-@\t\r]/.test(clean)) {
      return `"'${clean}"`;
    }
    return `"${clean}"`;
  };

  const handleExportCSV = () => {
    if (leads.length === 0) return;
    const headers = [
      'Fecha',
      'Codigo_Reserva',
      'Tipo_Doc',
      'Num_Documento',
      'Nombre_Razon_Social',
      'Celular_WhatsApp',
      'Distrito',
      'Objetivo_Inversion',
      'Certificado_USD',
      'Cuota_Mensual_PEN',
      'Cuota_Mensual_USD',
      'Tipo_Ingreso',
      'Ingreso_Dependiente',
      'Ingreso_Independiente',
      'Ingreso_Mancomunado',
      'Ingreso_Total_PEN',
      'Ratio_Cobertura',
      'Estado_Calificacion',
    ];

    const rows = leads.map((l) => [
      sanitizeCsvCell(new Date(l.createdAt).toLocaleString('es-PE')),
      sanitizeCsvCell(l.reservationCode),
      l.documentType,
      sanitizeCsvCell(l.documentNumber),
      sanitizeCsvCell(l.fullName),
      sanitizeCsvCell(l.phoneWhatsapp),
      sanitizeCsvCell(l.district),
      l.investmentType,
      l.metrics.requestedAmountUSD,
      l.metrics.monthlyInstallmentPEN.toFixed(2),
      l.metrics.monthlyInstallmentUSD.toFixed(2),
      l.incomeSourceType || 'DEPENDIENTE',
      l.dependentIncome || 0,
      l.independentIncome || 0,
      l.isJointIncome ? l.jointSpouseIncome || 0 : 0,
      l.metrics.clientIncomePEN.toFixed(2),
      l.metrics.incomeToQuotaRatio.toFixed(2),
      l.metrics.tier,
    ]);

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `leads_fonbienes_feria_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    if (leads.length === 0) return;
    const blob = new Blob([JSON.stringify(leads, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `leads_fonbienes_feria_${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderTierBadge = (tier: QualificationTier) => {
    if (tier === 'GREEN') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#F0FDF4] dark:bg-emerald-950/60 text-[#16A34A] dark:text-emerald-400 border border-[#BBF7D0] dark:border-emerald-800">
          <CheckCircle2 className="w-3 h-3" strokeWidth={1.5} />
          Aprobado
        </span>
      );
    }
    if (tier === 'YELLOW') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FFFBEB] dark:bg-amber-950/60 text-[#D97706] dark:text-amber-400 border border-[#FDE68A] dark:border-amber-800">
          <Clock className="w-3 h-3" strokeWidth={1.5} />
          Flexible
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FEF2F2] dark:bg-rose-950/60 text-[#DC2626] dark:text-rose-400 border border-[#FECACA] dark:border-rose-800">
        <AlertCircle className="w-3 h-3" strokeWidth={1.5} />
        Estructuración
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-lg bg-white dark:bg-[#0F172A] h-full shadow-2xl border-l border-black/[0.06] dark:border-white/10 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-black/[0.06] dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#004E89]/[0.08] dark:bg-sky-500/15 flex items-center justify-center text-[#004E89] dark:text-sky-400">
              <Users className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-[-0.02em] text-[#1D1D1F] dark:text-white">
                Leads Captados Hoy ({leads.length})
              </h2>
              <p className="text-xs text-[#6E6E73] dark:text-slate-400">
                Almacenamiento local seguro en este equipo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F5F5F7] dark:bg-slate-800 hover:bg-black/10 flex items-center justify-center text-[#1D1D1F] dark:text-slate-200 transition-colors"
            aria-label="Cerrar panel"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Search & Filter */}
        <div className="p-4 bg-[#F5F5F7] dark:bg-slate-900/70 border-b border-black/[0.06] dark:border-white/10 space-y-2.5">
          <div className="relative">
            <Search
              className="w-4 h-4 text-[#6E6E73] dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"
              strokeWidth={1.5}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, DNI/RUC o celular..."
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 rounded-xl border border-black/[0.08] dark:border-white/10 text-xs sm:text-sm text-[#1D1D1F] dark:text-white placeholder-[#6E6E73] dark:placeholder-slate-400 focus:outline-none focus:border-[#008744]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {(
              [
                { id: 'ALL', label: 'Todos' },
                { id: 'GREEN', label: 'Aprobados' },
                { id: 'YELLOW', label: 'Flexibles' },
                { id: 'RED', label: 'Estructuración' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTierFilter(tab.id)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  tierFilter === tab.id
                    ? 'bg-[#004E89] dark:bg-[#008744] text-white'
                    : 'bg-white dark:bg-slate-800 text-[#6E6E73] dark:text-slate-300 border border-black/[0.06] dark:border-white/10'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredLeads.length === 0 ? (
            <div className="text-center py-12 px-6">
              <p className="text-sm font-semibold text-[#1D1D1F] dark:text-slate-200">
                {leads.length === 0
                  ? 'Sin evaluaciones registradas hoy'
                  : 'Sin resultados para tu búsqueda'}
              </p>
            </div>
          ) : (
            filteredLeads.map((lead) => {
              const invTitle =
                INVESTMENT_OPTIONS.find((o) => o.id === lead.investmentType)
                  ?.shortTitle || lead.investmentType;

              return (
                <div
                  key={lead.id}
                  className="bg-white dark:bg-slate-800/80 rounded-2xl p-4 border border-black/[0.07] dark:border-white/10 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#1D1D1F] dark:text-white">
                          {lead.fullName}
                        </span>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#F5F5F7] dark:bg-slate-700 text-[#6E6E73] dark:text-slate-300">
                          {lead.reservationCode}
                        </span>
                      </div>
                      <p className="text-xs text-[#6E6E73] dark:text-slate-400 mt-0.5">
                        {lead.documentType}: {lead.documentNumber} • {lead.district}
                      </p>
                    </div>
                    {renderTierBadge(lead.metrics.tier)}
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-xl bg-[#F5F5F7] dark:bg-slate-900/70 text-xs my-2">
                    <div>
                      <span className="text-[10px] text-[#6E6E73] dark:text-slate-400 block">
                        Objetivo
                      </span>
                      <span className="font-semibold text-[#1D1D1F] dark:text-slate-200 truncate block">
                        {invTitle}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#6E6E73] dark:text-slate-400 block">
                        Certificado
                      </span>
                      <span className="font-bold text-[#004E89] dark:text-sky-400 tabular-nums">
                        {formatUSD(lead.metrics.requestedAmountUSD, 0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#6E6E73] dark:text-slate-400 block">
                        Cuota (S/)
                      </span>
                      <span className="font-semibold text-[#1D1D1F] dark:text-slate-200 tabular-nums">
                        {formatPEN(lead.metrics.monthlyInstallmentPEN, 0)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-2">
                      <a
                        href={buildWhatsAppUrl(lead)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F0FDF4] dark:bg-emerald-950/60 text-[#16A34A] dark:text-emerald-400 text-xs font-semibold"
                      >
                        <MessageCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
                        WhatsApp
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectLead(lead);
                          onClose();
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#F5F5F7] dark:bg-slate-700 text-[#1D1D1F] dark:text-slate-200 text-xs font-semibold"
                      >
                        <span>Ver</span>
                        <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => onDeleteLead(lead.id)}
                      className="p-1.5 rounded-lg text-[#6E6E73] hover:text-[#DC2626] transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-black/[0.06] dark:border-white/10 bg-white dark:bg-[#0F172A] space-y-2">
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={leads.length === 0}
              onClick={handleExportCSV}
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#004E89] dark:bg-[#008744] disabled:opacity-40 text-white text-xs font-semibold"
            >
              <FileSpreadsheet className="w-4 h-4" strokeWidth={1.5} />
              <span>Exportar CSV</span>
            </button>

            <button
              type="button"
              disabled={leads.length === 0}
              onClick={handleExportJSON}
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#F5F5F7] dark:bg-slate-800 disabled:opacity-40 text-[#1D1D1F] dark:text-slate-200 text-xs font-semibold border border-black/[0.08] dark:border-white/10"
            >
              <Download className="w-4 h-4" strokeWidth={1.5} />
              <span>JSON</span>
            </button>
          </div>

          {leads.length > 0 && (
            <div className="pt-1 flex justify-center">
              {confirmClear ? (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[#DC2626] font-medium">¿Borrar todo?</span>
                  <button
                    type="button"
                    onClick={() => {
                      onClearAllLeads();
                      setConfirmClear(false);
                    }}
                    className="px-2 py-0.5 rounded bg-[#DC2626] text-white font-semibold"
                  >
                    Sí
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClear(false)}
                    className="px-2 py-0.5 rounded bg-[#F5F5F7] dark:bg-slate-800 text-[#1D1D1F] dark:text-white"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="text-xs text-[#6E6E73] dark:text-slate-400 hover:text-[#DC2626]"
                >
                  Limpiar historial
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
