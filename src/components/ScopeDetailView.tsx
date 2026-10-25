import React, { useState, useMemo } from 'react';
import { getStatesData2026_2T, getWorldCountries, formatNumberBR, formatPercentBR } from '../data/electionData';
import { ScopeLevel } from '../types/election';
import { Search, MapPin, Globe, Radio, Clock } from 'lucide-react';

interface ScopeDetailViewProps {
  onSelectTerritory: (scope: ScopeLevel, code: string) => void;
  currentScope: ScopeLevel;
  currentCode: string;
  isPast17h?: boolean;
}

export const ScopeDetailView: React.FC<ScopeDetailViewProps> = ({
  onSelectTerritory,
  currentScope,
  currentCode,
  isPast17h = false,
}) => {
  const [subTab, setSubTab] = useState<'states' | 'exterior'>('states');
  const [searchQuery, setSearchQuery] = useState('');

  const statesEntries = useMemo(() => {
    const data = getStatesData2026_2T(isPast17h);
    return Object.entries(data).filter(([uf]) => uf !== 'ZZ');
  }, [isPast17h]);

  const worldCountriesList = useMemo(() => {
    const data = getWorldCountries(isPast17h);
    return Object.values(data).filter(c => c.hasVoting && c.id !== 'br');
  }, [isPast17h]);

  // Filtered lists
  const filteredStates = statesEntries.filter(
    ([uf, st]) =>
      uf.toLowerCase().includes(searchQuery.toLowerCase()) ||
      st.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredExterior = worldCountriesList.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-6 transition-colors">
      {/* Navigation tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Apuração Territorial: 27 Estados & Voto no Exterior (2026)
            <span className="text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/60 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse border border-red-300 dark:border-red-900">
              <Radio className="w-3 h-3" /> Ao Vivo
            </span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Compare o percentual de apuração, votos válidos e liderança entre Lula (PT) e Flávio Bolsonaro (PL).
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <button
            onClick={() => setSubTab('states')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              subTab === 'states'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            27 Estados Brasileiros
          </button>
          <button
            onClick={() => setSubTab('exterior')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              subTab === 'exterior'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Voto no Exterior ({worldCountriesList.length} Países)
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
        <input
          type="text"
          placeholder={subTab === 'states' ? 'Buscar estado (ex: SP, Bahia)...' : 'Buscar país no exterior (ex: Portugal, EUA)...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* 1. All 27 States Table */}
      {subTab === 'states' && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Estado (UF)</th>
                <th className="py-2.5 px-3 font-semibold">Status Apuração</th>
                <th className="py-2.5 px-3 font-semibold">Líder na UF</th>
                <th className="py-2.5 px-3 font-semibold text-right">Lula (13)</th>
                <th className="py-2.5 px-3 font-semibold text-right">Flávio Bolsonaro (22)</th>
                <th className="py-2.5 px-3 font-semibold text-right">Votos Válidos</th>
                <th className="py-2.5 px-3 font-semibold text-right">Abstenção</th>
                <th className="py-2.5 px-3 font-semibold text-center">Filtrar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-tabular">
              {filteredStates.map(([uf, st]) => {
                const hasVotes = st.percentSectionsCounted > 0 && st.candidates.some(c => c.votes > 0);
                const sorted = [...st.candidates].sort((a, b) => b.votes - a.votes);
                const winner = sorted[0];
                const lula = st.candidates.find(c => c.number === '13');
                const flavio = st.candidates.find(c => c.number === '22');
                const isSelected = currentScope === 'estadual' && currentCode === uf;

                return (
                  <tr
                    key={uf}
                    onClick={() => onSelectTerritory('estadual', uf)}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors ${
                      isSelected ? 'bg-emerald-50 dark:bg-emerald-950/30' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span className="w-6 font-mono text-center px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {uf}
                      </span>
                      <span>{st.name}</span>
                    </td>

                    <td className="py-2.5 px-3">
                      {hasVotes ? (
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                          st.isCompleted
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                        }`}>
                          {st.isCompleted ? '100% Apurado' : `${st.percentSectionsCounted.toFixed(1)}% Apurado`}
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          Urnas em Votação
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 font-bold">
                      {hasVotes && winner ? (
                        <span style={{ color: winner.color }}>
                          {winner.ballotName} ({formatPercentBR(winner.percent || 0)})
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal italic">
                          Aguardando 17h
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-right font-bold text-red-600">
                      {hasVotes ? (
                        `${formatPercentBR(lula?.percent || 0)} (${formatNumberBR(lula?.votes || 0)})`
                      ) : (
                        <span className="text-slate-400 font-normal">0,00% (0)</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-right font-bold text-blue-600">
                      {hasVotes ? (
                        `${formatPercentBR(flavio?.percent || 0)} (${formatNumberBR(flavio?.votes || 0)})`
                      ) : (
                        <span className="text-slate-400 font-normal">0,00% (0)</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">
                      {hasVotes ? formatNumberBR(st.validVotes) : '0'}
                    </td>

                    <td className="py-2.5 px-3 text-right text-slate-500">
                      {hasVotes ? formatPercentBR(st.percentAbstentions) : '0,00%'}
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      <button className="px-2 py-1 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300">
                        Ver UF
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 2. Exterior Countries Table */}
      {subTab === 'exterior' && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-3 font-semibold">País</th>
                <th className="py-2.5 px-3 font-semibold">Status Apuração</th>
                <th className="py-2.5 px-3 font-semibold">Líder / Vencedor</th>
                <th className="py-2.5 px-3 font-semibold text-right">Lula (PT)</th>
                <th className="py-2.5 px-3 font-semibold text-right">Flávio Bolsonaro (PL)</th>
                <th className="py-2.5 px-3 font-semibold text-right">Eleitores Aptos</th>
                <th className="py-2.5 px-3 font-semibold text-right">Votos Válidos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-tabular">
              {filteredExterior.map((country) => {
                const hasVotes = country.hasStarted && country.percentSectionsCounted > 0 && country.candidates.some(c => c.votes > 0);
                const lula = country.candidates.find(c => c.number === '13');
                const flavio = country.candidates.find(c => c.number === '22');

                return (
                  <tr key={country.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="text-base">{country.flag}</span>
                      <span>{country.name}</span>
                    </td>

                    <td className="py-2.5 px-3">
                      {hasVotes ? (
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                          country.isCompleted
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                        }`}>
                          {country.buAffixed ? 'BU Afixado (100%)' : country.isCompleted ? '100% Apurado' : `${country.percentSectionsCounted.toFixed(1)}% Apurado`}
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          {country.statusDetail || 'Votação em andamento'}
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 font-bold">
                      {hasVotes && country.leaderName ? (
                        <span style={{ color: country.leaderColor }}>
                          {country.leaderName} ({formatPercentBR(country.candidates.find(c => c.number === country.leaderNumber)?.percent || 0)})
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal italic">
                          Aguardando 17h00
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-right font-bold text-red-600">
                      {hasVotes ? (
                        `${formatPercentBR(lula?.percent || 0)} (${formatNumberBR(lula?.votes || 0)})`
                      ) : (
                        <span className="text-slate-400 font-normal">0,00% (0)</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-right font-bold text-blue-600">
                      {hasVotes ? (
                        `${formatPercentBR(flavio?.percent || 0)} (${formatNumberBR(flavio?.votes || 0)})`
                      ) : (
                        <span className="text-slate-400 font-normal">0,00% (0)</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">
                      {formatNumberBR(country.totalVoters)}
                    </td>

                    <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">
                      {hasVotes ? formatNumberBR(country.validVotes) : '0'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
