import React from 'react';
import { ScopeLevel, ElectionId } from '../types/election';
import { RefreshCw, MapPin, Building, Flag, CheckCircle2, Radio } from 'lucide-react';
import { MUNICIPALITIES_2026 } from '../data/electionData';

interface FilterBarProps {
  electionId: ElectionId;
  setElectionId: (id: ElectionId) => void;
  scope: ScopeLevel;
  setScope: (scope: ScopeLevel) => void;
  territoryCode: string;
  setTerritoryCode: (code: string) => void;
  isRefreshing: boolean;
  onRefresh: () => void;
  lastUpdate: string;
  autoRefreshInterval: number;
  setAutoRefreshInterval: (interval: number) => void;
}

const STATES_LIST = [
  'SP', 'RJ', 'MG', 'BA', 'RS', 'PR', 'PE', 'CE', 'PA', 'SC',
  'GO', 'MA', 'PB', 'ES', 'AM', 'RN', 'AL', 'PI', 'MT', 'MS',
  'DF', 'SE', 'RO', 'TO', 'AC', 'AP', 'RR'
];

export const FilterBar: React.FC<FilterBarProps> = ({
  electionId,
  setElectionId,
  scope,
  setScope,
  territoryCode,
  setTerritoryCode,
  isRefreshing,
  onRefresh,
  lastUpdate,
  autoRefreshInterval,
  setAutoRefreshInterval,
}) => {
  const municipalitiesList = Object.values(MUNICIPALITIES_2026);

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-3 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left side: Election Selector & Scopes */}
        <div className="flex flex-wrap items-center gap-3">
          {/* 2026 Turno Selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="election-select" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap">
              Eleições 2026:
            </label>
            <div className="relative flex items-center">
              <select
                id="election-select"
                value={electionId}
                onChange={(e) => {
                  const val = e.target.value as ElectionId;
                  setElectionId(val);
                }}
                className={`text-xs font-bold rounded-lg border px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer ${
                  electionId === '2026_2t'
                    ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-300 dark:border-red-900'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700'
                }`}
              >
                <option value="2026_2t">🔴 2026 - 2º Turno (Lula x Flávio Bolsonaro - Ao Vivo)</option>
                <option value="2026_1t">2026 - 1º Turno (Consolidado de 04/10/2026)</option>
              </select>
            </div>
          </div>

          <div className="h-4 w-[1px] bg-slate-300 dark:bg-slate-700 hidden sm:block" />

          {/* Scope Buttons */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg">
            <button
              onClick={() => {
                setScope('nacional');
                setTerritoryCode('BR');
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                scope === 'nacional'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Flag className="w-3.5 h-3.5" />
              Nacional
            </button>

            <button
              onClick={() => {
                setScope('estadual');
                setTerritoryCode('SP');
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                scope === 'estadual'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              Estadual
            </button>

            <button
              onClick={() => {
                setScope('municipal');
                setTerritoryCode('SP_SAO_PAULO');
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                scope === 'municipal'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              Municipal
            </button>

            <button
              onClick={() => {
                setScope('exterior');
                setTerritoryCode('ZZ');
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                scope === 'exterior'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>🌍</span>
              Exterior (ZZ)
            </button>
          </div>

          {/* Conditional Sub-selectors based on scope */}
          {scope === 'estadual' && (
            <select
              value={territoryCode}
              onChange={(e) => setTerritoryCode(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              {STATES_LIST.map((uf) => (
                <option key={uf} value={uf}>
                  Estado: {uf}
                </option>
              ))}
            </select>
          )}

          {scope === 'municipal' && (
            <select
              value={territoryCode}
              onChange={(e) => setTerritoryCode(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              {municipalitiesList.map((m) => (
                <option key={m.code} value={m.code}>
                  {m.name} ({m.state})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Right side: Auto-refresh, Last Update & Refresh Button */}
        <div className="flex items-center gap-3 shrink-0 self-end lg:self-auto">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            {electionId === '2026_2t' ? (
              <span className="flex items-center gap-1 font-bold text-red-600 dark:text-red-400">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span>Ao Vivo:</span>
              </span>
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            )}
            <span className="font-tabular font-medium text-slate-700 dark:text-slate-300">{lastUpdate}</span>
          </div>

          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <span className="hidden xl:inline">Auto-refresh:</span>
            <select
              value={autoRefreshInterval}
              onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
              className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded border border-slate-300 dark:border-slate-700 px-2 py-1 cursor-pointer"
            >
              <option value={0}>Pausado</option>
              <option value={5}>5s (Rápido)</option>
              <option value={10}>10s (Padrão)</option>
              <option value={30}>30s</option>
              <option value={60}>60s</option>
            </select>
          </div>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
