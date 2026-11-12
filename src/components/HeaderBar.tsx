import React, { useState } from 'react';
import { Users, RefreshCw, Check, Sun, Moon, Webhook } from 'lucide-react';
import { FonbienesLogo } from './FonbienesLogo';

interface HeaderBarProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  leadsCount: number;
  onOpenLeadsDrawer: () => void;
  exchangeRate: number;
  onChangeExchangeRate: (newRate: number) => void;
  onQuickReset: () => void;
  isWebhookActive?: boolean;
  onOpenWebhookModal?: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  theme,
  onToggleTheme,
  leadsCount,
  onOpenLeadsDrawer,
  exchangeRate,
  onChangeExchangeRate,
  onQuickReset,
  isWebhookActive = false,
  onOpenWebhookModal,
}) => {
  const [editingRate, setEditingRate] = useState(false);
  const [rateDraft, setRateDraft] = useState(exchangeRate.toFixed(2));
  const isDark = theme === 'dark';

  const handleSaveRate = () => {
    const parsed = parseFloat(rateDraft);
    if (!isNaN(parsed) && parsed >= 2.5 && parsed <= 6.0) {
      onChangeExchangeRate(Number(parsed.toFixed(2)));
    } else {
      setRateDraft(exchangeRate.toFixed(2));
    }
    setEditingRate(false);
  };

  return (
    <header
      className={`sticky top-0 z-30 backdrop-blur-md border-b transition-colors duration-300 ${
        isDark
          ? 'bg-[#081324]/90 border-slate-800 text-slate-100'
          : 'bg-white/95 border-black/[0.06] text-[#1D1D1F]'
      }`}
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Official FonBienes Brand Logo */}
        <div
          onClick={onQuickReset}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onQuickReset()}
          className="flex items-center gap-3 cursor-pointer focus:outline-none"
          title="Volver al inicio"
        >
          <FonbienesLogo theme={theme} className="h-9 sm:h-10 w-auto" />
        </div>

        {/* Right Controls: Exchange Rate + Theme Toggle + Leads Counter */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Reference Exchange Rate Pill */}
          <div
            className={`flex items-center rounded-full px-3 py-1.5 text-xs border transition-colors ${
              isDark
                ? 'bg-[#101D36] border-slate-700/80 text-slate-200'
                : 'bg-[#F5F5F7] border-black/[0.06] text-[#1D1D1F]'
            }`}
          >
            <span
              className={`font-medium mr-1 hidden sm:inline ${
                isDark ? 'text-slate-400' : 'text-[#6E6E73]'
              }`}
            >
              TC:
            </span>
            {editingRate ? (
              <div className="flex items-center gap-1">
                <span className="font-semibold text-[#004E89] dark:text-sky-400">S/</span>
                <input
                  type="number"
                  step="0.01"
                  min="2.5"
                  max="6.0"
                  value={rateDraft}
                  onChange={(e) => setRateDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveRate()}
                  autoFocus
                  className={`w-14 border border-[#004E89] rounded px-1.5 py-0.5 text-xs font-semibold focus:outline-none ${
                    isDark
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-[#1D1D1F]'
                  }`}
                />
                <button
                  type="button"
                  onClick={handleSaveRate}
                  className="p-0.5 rounded-full bg-[#008744] text-white hover:bg-[#006E37] transition-colors"
                  title="Guardar TC"
                >
                  <Check className="w-3 h-3" strokeWidth={1.5} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setRateDraft(exchangeRate.toFixed(2));
                  setEditingRate(true);
                }}
                className="flex items-center gap-1 font-semibold hover:text-[#004E89] dark:hover:text-sky-400 transition-colors"
                title="Tipo de cambio referencial (clic para editar)"
              >
                <span>S/ {exchangeRate.toFixed(2)}</span>
                <RefreshCw
                  className={`w-3 h-3 ${
                    isDark ? 'text-slate-400' : 'text-[#6E6E73]'
                  }`}
                  strokeWidth={1.5}
                />
              </button>
            )}
          </div>

          {/* Dark / Light Mode Toggle Button */}
          <button
            type="button"
            onClick={onToggleTheme}
            className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all ${
              isDark
                ? 'bg-[#101D36] hover:bg-slate-800 border-slate-700 text-amber-400 shadow-sm'
                : 'bg-[#F5F5F7] hover:bg-[#EBF3FA] border-black/[0.06] text-[#004E89]'
            }`}
            title={
              theme === 'light'
                ? 'Activar modo oscuro'
                : 'Activar modo claro'
            }
            aria-label="Cambiar tema claro/oscuro"
          >
            {theme === 'light' ? (
              <Moon className="w-4 h-4 text-[#004E89]" strokeWidth={1.5} />
            ) : (
              <Sun className="w-4 h-4 text-amber-400" strokeWidth={1.5} />
            )}
          </button>

          {/* Leads Captured Today Drawer Trigger */}
          <button
            type="button"
            onClick={onOpenLeadsDrawer}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
              isDark
                ? 'bg-[#101D36] hover:bg-slate-800 border-slate-700 text-slate-200'
                : 'bg-white hover:bg-[#EBF3FA] border-black/[0.08] text-[#1D1D1F] shadow-2xs'
            }`}
            title="Ver historial de leads captados hoy"
          >
            <Users
              className={`w-4 h-4 ${
                isDark ? 'text-sky-400' : 'text-[#004E89]'
              }`}
              strokeWidth={1.5}
            />
            <span
              className={`text-xs font-medium hidden md:inline ${
                isDark ? 'text-slate-300' : 'text-[#6E6E73]'
              }`}
            >
              Leads:
            </span>
            <span
              className="inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 rounded-full text-white text-[11px] font-bold tabular-nums bg-[#004E89] dark:bg-[#008744]"
            >
              {leadsCount}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
