import React, { useState, useMemo, useEffect } from 'react';
import { getMunicipalities2026, formatNumberBR, formatPercentBR } from '../data/electionData';
import { MunicipalityElectionData } from '../types/election';
import { Building2, Search, Filter, Trophy, Globe, MapPin, X } from 'lucide-react';

interface MunicipalityViewProps {
  initialState?: string;
  onSelectMunicipality?: (code: string) => void;
  selectedCode?: string;
  onBackToStates?: () => void;
  onBackToWorldMap?: () => void;
  isPast17h?: boolean;
}

export const MunicipalityView: React.FC<MunicipalityViewProps> = ({
  initialState,
  onSelectMunicipality,
  selectedCode,
  onBackToStates,
  onBackToWorldMap,
  isPast17h = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedState, setSelectedState] = useState<string>(initialState || 'ALL');
  const [modalMunicipality, setModalMunicipality] = useState<MunicipalityElectionData | null>(null);

  useEffect(() => {
    if (initialState) {
      setSelectedState(initialState);
    }
  }, [initialState]);

  const municipalitiesData = useMemo(() => getMunicipalities2026(isPast17h), [isPast17h]);
  const allMunicipalities = useMemo(() => Object.values(municipalitiesData), [municipalitiesData]);

  const statesList = useMemo(() => {
    const set = new Set<string>();
    allMunicipalities.forEach((m) => set.add(m.state));
    return Array.from(set).sort();
  }, [allMunicipalities]);

  const filteredMunicipalities = useMemo(() => {
    return allMunicipalities.filter((m) => {
      const matchesSearch =
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.state.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesState = selectedState === 'ALL' || m.state === selectedState;
      return matchesSearch && matchesState;
    });
  }, [allMunicipalities, searchTerm, selectedState]);

  // Aggregate stats
  const stats = useMemo(() => {
    let lulaLeads = 0;
    let flavioLeads = 0;
    filteredMunicipalities.forEach((m) => {
      const lulaVotes = m.candidates.find((c) => c.number === '13')?.votes || 0;
      const flavioVotes = m.candidates.find((c) => c.number === '22')?.votes || 0;
      if (lulaVotes >= flavioVotes) lulaLeads++;
      else flavioLeads++;
    });
    return { lulaLeads, flavioLeads, total: filteredMunicipalities.length };
  }, [filteredMunicipalities]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-6 transition-colors">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Building2 className="w-5 h-5" />
            </span>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Apuração por Município (Eleições 2026)
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Totalização em tempo real das capitais e maiores municípios brasileiros. Colorido em <strong className="text-red-600">Vermelho (Lula)</strong> e <strong className="text-blue-600">Azul (Flávio Bolsonaro)</strong>.
          </p>
        </div>

        {/* Action and Navigation Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {onBackToStates && (
            <button
              onClick={onBackToStates}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-lg transition-colors border border-emerald-200 dark:border-emerald-800 cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>← Mapa do Brasil (Estados)</span>
            </button>
          )}

          {onBackToWorldMap && (
            <button
              onClick={onBackToWorldMap}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg transition-colors border border-slate-300 dark:border-slate-700 cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-600" />
              <span>← Mapa-Múndi</span>
            </button>
          )}

          {isPast17h ? (
            <div className="flex items-center gap-2 text-xs">
              <div className="px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-950/80 bg-red-50/50 dark:bg-red-950/20 text-red-700 dark:text-red-400 font-bold">
                🔴 Lula à frente: {stats.lulaLeads}
              </div>
              <div className="px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-950/80 bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 font-bold">
                🔵 Flávio à frente: {stats.flavioLeads}
              </div>
            </div>
          ) : (
            <div className="px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-950/80 bg-amber-50/70 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 font-semibold text-xs flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Votação em Andamento (08h às 17h) · Totalização a partir das 17h00
            </div>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por município ou estado (ex: São Paulo, Salvador, Campinas)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="ALL">Todos os Estados ({allMunicipalities.length})</option>
            {statesList.map((uf) => (
              <option key={uf} value={uf}>
                Estado: {uf}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid of Municipalities */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMunicipalities.map((mun) => {
          const lula = mun.candidates.find((c) => c.number === '13');
          const flavio = mun.candidates.find((c) => c.number === '22');
          const hasVotes = ((lula?.votes || 0) + (flavio?.votes || 0)) > 0;
          const isLulaLeader = (lula?.votes || 0) >= (flavio?.votes || 0);
          const leader = isLulaLeader ? lula : flavio;
          const runnerUp = isLulaLeader ? flavio : lula;
          const isSelected = selectedCode === mun.code;

          return (
            <div
              key={mun.code}
              onClick={() => {
                setModalMunicipality(mun);
                if (onSelectMunicipality) onSelectMunicipality(mun.code);
              }}
              className={`p-4 rounded-xl border transition-all cursor-pointer shadow-xs ${
                isSelected
                  ? 'border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/20'
                  : !hasVotes
                  ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                  : isLulaLeader
                  ? 'border-red-200 dark:border-red-950/60 bg-white dark:bg-slate-900 hover:border-red-300'
                  : 'border-blue-200 dark:border-blue-950/60 bg-white dark:bg-slate-900 hover:border-blue-300'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      {mun.name}
                    </h4>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {mun.state}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {formatNumberBR(mun.totalVoters)} eleitores aptos
                  </span>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    !hasVotes
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      : mun.isCompleted
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                      : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                  }`}
                >
                  {!hasVotes ? '0,0% Apurado' : `${mun.percentSectionsCounted.toFixed(1)}% Apurado`}
                </span>
              </div>

              {/* Candidates head-to-head */}
              {hasVotes ? (
                <div className="space-y-2 text-xs">
                  {/* Leader */}
                  <div className="flex items-center justify-between font-bold" style={{ color: leader?.color }}>
                    <span className="flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5" />
                      1º {leader?.ballotName} ({leader?.party}):
                    </span>
                    <span className="font-tabular">
                      {formatPercentBR(leader?.percent || 0)} ({formatNumberBR(leader?.votes || 0)})
                    </span>
                  </div>

                  {/* Runner up */}
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1.5 pl-5">
                      2º {runnerUp?.ballotName} ({runnerUp?.party}):
                    </span>
                    <span className="font-tabular font-medium">
                      {formatPercentBR(runnerUp?.percent || 0)} ({formatNumberBR(runnerUp?.votes || 0)})
                    </span>
                  </div>

                  {/* Comparative bar */}
                  <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 flex overflow-hidden">
                    <div
                      style={{ width: `${lula?.percent || 50}%`, backgroundColor: '#DC2626' }}
                      title={`Lula: ${formatPercentBR(lula?.percent || 0)}`}
                    />
                    <div
                      style={{ width: `${flavio?.percent || 50}%`, backgroundColor: '#2563EB' }}
                      title={`Flávio Bolsonaro: ${formatPercentBR(flavio?.percent || 0)}`}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                    <span>Válidos: {formatNumberBR(mun.validVotes)}</span>
                    <span>Abstenção: {formatNumberBR(mun.abstentions)}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-medium">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
                      Lula (PT):
                    </span>
                    <span className="font-tabular font-semibold">0,00% (0)</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-medium">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                      Flávio Bolsonaro (PL):
                    </span>
                    <span className="font-tabular font-semibold">0,00% (0)</span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800" />

                  <div className="flex items-center justify-between text-[10px] text-amber-600 dark:text-amber-400 font-medium pt-1">
                    <span>Urnas em votação</span>
                    <span>Totalização às 17h</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredMunicipalities.length === 0 && (
        <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400 space-y-1">
          <p className="font-semibold text-slate-700 dark:text-slate-300">Nenhum município encontrado</p>
          <p>Tente ajustar os termos de pesquisa ou o filtro de estado.</p>
        </div>
      )}

      {/* Municipality Detail Modal */}
      {modalMunicipality && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setModalMunicipality(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                <Building2 className="w-6 h-6" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {modalMunicipality.name} ({modalMunicipality.state})
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {formatNumberBR(modalMunicipality.totalVoters)} eleitores aptos · {formatNumberBR(modalMunicipality.totalSections)} seções eleitorais
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs">
                <span className="text-slate-500 dark:text-slate-400">Status da Apuração:</span>
                <span className={`font-bold ${
                  !isPast17h
                    ? 'text-amber-600 dark:text-amber-400'
                    : modalMunicipality.isCompleted
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}>
                  {!isPast17h
                    ? '0,00% Apurado · Votação em Andamento (08h às 17h)'
                    : modalMunicipality.isCompleted
                    ? '100% Apurado'
                    : `${modalMunicipality.percentSectionsCounted.toFixed(1)}% Apurado`}
                </span>
              </div>

              {/* Candidates Result Bars */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Resultado para Presidente:
                </div>
                {modalMunicipality.candidates.map((cand) => (
                  <div key={cand.number} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cand.color }} />
                        {cand.ballotName} ({cand.party})
                      </span>
                      <span className="font-bold font-tabular text-slate-900 dark:text-white">
                        {formatPercentBR(cand.percent)} ({formatNumberBR(cand.votes)} votos)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${cand.percent}%`, backgroundColor: cand.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Additional metrics */}
              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Votos Válidos:</span>
                  <span className="font-bold font-tabular text-slate-900 dark:text-white">
                    {formatNumberBR(modalMunicipality.validVotes)}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Abstenção:</span>
                  <span className="font-bold font-tabular text-slate-900 dark:text-white">
                    {formatNumberBR(modalMunicipality.abstentions)}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Votos Brancos:</span>
                  <span className="font-bold font-tabular text-slate-900 dark:text-white">
                    {formatNumberBR(modalMunicipality.blankVotes)}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Votos Nulos:</span>
                  <span className="font-bold font-tabular text-slate-900 dark:text-white">
                    {formatNumberBR(modalMunicipality.nullVotes)}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setModalMunicipality(null)}
              className="w-full py-2.5 rounded-xl font-semibold text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
            >
              Fechar Detalhes
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
