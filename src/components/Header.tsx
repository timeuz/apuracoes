import React from 'react';
import { Bell, Moon, Sun, ShieldCheck } from 'lucide-react';

export type AppNavTab = 'overview' | 'brazil' | 'municipal' | 'comparison' | 'evolution' | 'simulator';

interface HeaderProps {
  activeTab: AppNavTab;
  setActiveTab: (tab: AppNavTab) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  openAlertModal: () => void;
  activeAlertCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isDarkMode,
  toggleDarkMode,
  openAlertModal,
  activeAlertCount,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        {/* Brand */}
        <div
          onClick={() => setActiveTab('overview')}
          className="flex items-center gap-3 shrink-0 cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            🇧🇷
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
              Eleições Brasil 2026
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              Apuração Oficial TSE (2026)
            </span>
          </div>
        </div>

        {/* Desktop Nav Links */}
        <nav className="hidden lg:flex items-center gap-5 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <button
            onClick={() => setActiveTab('overview')}
            className={`whitespace-nowrap transition-colors py-1 cursor-pointer ${
              activeTab === 'overview'
                ? 'text-slate-950 dark:text-white font-bold border-b-2 border-emerald-600'
                : 'hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            Visão Geral & Mapa-Múndi
          </button>

          <button
            onClick={() => setActiveTab('brazil')}
            className={`whitespace-nowrap transition-colors py-1 cursor-pointer ${
              activeTab === 'brazil'
                ? 'text-slate-950 dark:text-white font-bold border-b-2 border-emerald-600'
                : 'hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            Mapa do Brasil & Estados
          </button>

          <button
            onClick={() => setActiveTab('municipal')}
            className={`whitespace-nowrap transition-colors py-1 cursor-pointer ${
              activeTab === 'municipal'
                ? 'text-slate-950 dark:text-white font-bold border-b-2 border-emerald-600'
                : 'hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            Apuração por Município
          </button>

          <button
            onClick={() => setActiveTab('comparison')}
            className={`whitespace-nowrap transition-colors py-1 cursor-pointer ${
              activeTab === 'comparison'
                ? 'text-slate-950 dark:text-white font-bold border-b-2 border-emerald-600'
                : 'hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            Comparação 1º e 2º Turnos
          </button>

          <button
            onClick={() => setActiveTab('evolution')}
            className={`whitespace-nowrap transition-colors py-1 cursor-pointer ${
              activeTab === 'evolution'
                ? 'text-slate-950 dark:text-white font-bold border-b-2 border-emerald-600'
                : 'hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            Evolução em Tempo Real
          </button>

          <button
            onClick={() => setActiveTab('simulator')}
            className={`whitespace-nowrap transition-colors py-1 cursor-pointer ${
              activeTab === 'simulator'
                ? 'text-slate-950 dark:text-white font-bold border-b-2 border-emerald-600'
                : 'hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            Simulador
          </button>
        </nav>

        {/* Right side controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={openAlertModal}
            title="Configurar Alertas Push"
            className="relative p-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-800 cursor-pointer"
            aria-label="Configurar alertas push de apuração"
          >
            <Bell className="w-4 h-4" />
            {activeAlertCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                {activeAlertCount}
              </span>
            )}
          </button>

          <button
            onClick={toggleDarkMode}
            title={isDarkMode ? 'Modo Claro' : 'Modo Noturno'}
            className="p-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-800 cursor-pointer"
            aria-label="Alternar modo noturno"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>
        </div>
      </div>

      {/* Mobile nav row */}
      <div className="lg:hidden flex items-center overflow-x-auto gap-2 border-t border-slate-200 dark:border-slate-800 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 scrollbar-none">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-2.5 py-1 rounded-lg whitespace-nowrap ${activeTab === 'overview' ? 'font-bold bg-emerald-600 text-white' : ''}`}
        >
          Visão Geral & Mundo
        </button>
        <button
          onClick={() => setActiveTab('brazil')}
          className={`px-2.5 py-1 rounded-lg whitespace-nowrap ${activeTab === 'brazil' ? 'font-bold bg-emerald-600 text-white' : ''}`}
        >
          Brasil & Estados
        </button>
        <button
          onClick={() => setActiveTab('municipal')}
          className={`px-2.5 py-1 rounded-lg whitespace-nowrap ${activeTab === 'municipal' ? 'font-bold bg-emerald-600 text-white' : ''}`}
        >
          Municípios
        </button>
        <button
          onClick={() => setActiveTab('comparison')}
          className={`px-2.5 py-1 rounded-lg whitespace-nowrap ${activeTab === 'comparison' ? 'font-bold bg-emerald-600 text-white' : ''}`}
        >
          1º vs 2º Turno
        </button>
        <button
          onClick={() => setActiveTab('evolution')}
          className={`px-2.5 py-1 rounded-lg whitespace-nowrap ${activeTab === 'evolution' ? 'font-bold bg-emerald-600 text-white' : ''}`}
        >
          Evolução
        </button>
        <button
          onClick={() => setActiveTab('simulator')}
          className={`px-2.5 py-1 rounded-lg whitespace-nowrap ${activeTab === 'simulator' ? 'font-bold bg-emerald-600 text-white' : ''}`}
        >
          Simulador
        </button>
      </div>
    </header>
  );
};
