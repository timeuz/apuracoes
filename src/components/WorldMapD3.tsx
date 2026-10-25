import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import WorldMap from '@svg-maps/world';
import { getWorldCountries, formatNumberBR, formatPercentBR } from '../data/electionData';
import { CountryElectionData, TerritoryData, ElectionId } from '../types/election';
import { ZoomIn, ZoomOut, RotateCcw, Globe, Info, X, CheckCircle2, ChevronRight, Search, Clock } from 'lucide-react';

interface WorldMapD3Props {
  electionId?: ElectionId;
  liveData?: TerritoryData;
  isPast17h?: boolean;
  onSelectBrazil: () => void;
  onSelectCountry?: (country: CountryElectionData) => void;
}

interface TooltipData {
  id: string;
  name: string;
  flag: string;
  x: number;
  y: number;
  hasVoting: boolean;
  hasStarted: boolean;
  isCompleted: boolean;
  percentCounted: number;
  winnerName?: string;
  winnerColor?: string;
  winnerPercent?: number;
  runnerUpName?: string;
  runnerUpPercent?: number;
  totalVoters?: number;
}

export const WorldMapD3: React.FC<WorldMapD3Props> = ({
  electionId = '2026_2t',
  liveData,
  isPast17h = false,
  onSelectBrazil,
  onSelectCountry,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<CountryElectionData | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

  // Use real dataset depending on temporal state (before vs at/after 17h)
  const countriesData = useMemo(() => getWorldCountries(isPast17h), [isPast17h]);

  // Count stats
  const stats = useMemo(() => {
    let lulaCountries = 0;
    let flavioCountries = 0;
    let totalVotingCountries = 0;
    let completedCountries = 0;

    Object.values(countriesData).forEach((c) => {
      if (c.hasVoting && c.id !== 'br') {
        totalVotingCountries++;
        if (c.isCompleted && c.hasStarted) completedCountries++;
        if (c.hasStarted && c.leaderNumber === '13') lulaCountries++;
        else if (c.hasStarted && c.leaderNumber === '22') flavioCountries++;
      }
    });

    return { lulaCountries, flavioCountries, totalVotingCountries, completedCountries };
  }, [countriesData]);

  // Determine country fill color strictly adhering to official rules:
  // - White/gray for countries without voting or unstarted (including Brazil before 17h!)
  // - Red for Lula leading/won
  // - Blue for Flávio Bolsonaro leading/won
  const getCountryColor = (id: string, isHovered: boolean, isSelected: boolean) => {
    const code = id.toLowerCase();
    const data = countriesData[code];

    if (!data || !data.hasVoting || !data.hasStarted) {
      // White/gray for countries without voting or unstarted
      if (isHovered) return '#cbd5e1'; // darker gray on hover
      return '#f1f5f9'; // white / very light gray
    }

    // Special treatment for Brazil on world map (reflects live apuração)
    if (code === 'br') {
      const hasLiveVotes = liveData && liveData.percentSectionsCounted > 0 && liveData.candidates.some(c => c.votes > 0);
      if (!hasLiveVotes) {
        if (isHovered) return '#cbd5e1';
        return '#f1f5f9';
      }

      const lulaPercent = liveData?.candidates.find(c => c.number === '13')?.percent ?? 0;
      const flavioPercent = liveData?.candidates.find(c => c.number === '22')?.percent ?? 0;
      const lulaLeading = lulaPercent >= flavioPercent;

      if (isSelected || isHovered) return lulaLeading ? '#b91c1c' : '#1d4ed8';
      return lulaLeading ? '#dc2626' : '#2563eb';
    }

    if (data.leaderNumber === '13') {
      // Lula red
      if (isSelected || isHovered) return '#b91c1c';
      return '#dc2626';
    } else if (data.leaderNumber === '22') {
      // Flávio blue
      if (isSelected || isHovered) return '#1d4ed8';
      return '#2563eb';
    }

    return '#f1f5f9';
  };

  // Setup D3 zoom
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const g = svg.select<SVGGElement>('g.world-map-group');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.9, 8])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    return () => {
      svg.on('.zoom', null);
    };
  }, []);

  const handleZoom = (factor: number) => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(300).call(d3.zoom<SVGSVGElement, unknown>().scaleBy as never, factor);
  };

  const handleResetZoom = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(400).call(d3.zoom<SVGSVGElement, unknown>().transform as never, d3.zoomIdentity);
  };

  const handleCountryClick = (id: string, name: string) => {
    const code = id.toLowerCase();
    if (code === 'br') {
      onSelectBrazil();
      return;
    }

    const data = countriesData[code];
    if (data) {
      setSelectedCountry(data);
      if (onSelectCountry) onSelectCountry(data);
    } else {
      // Country without active voting
      setSelectedCountry({
        id: code,
        name: name || code.toUpperCase(),
        flag: '🌍',
        hasVoting: false,
        hasStarted: false,
        isCompleted: false,
        totalVoters: 0,
        totalSections: 0,
        countedSections: 0,
        percentSectionsCounted: 0,
        attendance: 0,
        abstentions: 0,
        validVotes: 0,
        blankVotes: 0,
        nullVotes: 0,
        candidates: [],
      });
    }
  };

  // Filtered countries for list/search
  const votingCountriesList = useMemo(() => {
    return Object.values(countriesData)
      .filter((c) => c.name.toLowerCase().includes(searchFilter.toLowerCase()))
      .sort((a, b) => b.totalVoters - a.totalVoters);
  }, [countriesData, searchFilter]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4 transition-colors">
      {/* Header and Quick Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Globe className="w-5 h-5" />
            </span>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Mapa-Múndi da Apuração Eleitoral 2026
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-800 animate-pulse">
              Ao Vivo
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Visualização global do voto de brasileiros no país e no exterior. Clique no <strong>Brasil</strong> para ver os estados ou em qualquer país para abrir o boletim de votos.
          </p>
        </div>

        {/* Action button to focus Brazil */}
        <div className="flex items-center gap-2">
          <button
            onClick={onSelectBrazil}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-sm cursor-pointer"
          >
            <span>🇧🇷</span>
            <span>Ver Apuração por Estados (Brasil)</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-950/80 bg-rose-50/50 dark:bg-rose-950/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-600 shrink-0" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">Lula (PT):</span>
          </div>
          <span className="font-tabular font-bold text-red-700 dark:text-red-400">
            {stats.lulaCountries} países à frente
          </span>
        </div>

        <div className="p-3 rounded-xl border border-blue-200 dark:border-blue-950/80 bg-blue-50/50 dark:bg-blue-950/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-600 shrink-0" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">Flávio Bolsonaro (PL):</span>
          </div>
          <span className="font-tabular font-bold text-blue-700 dark:text-blue-400">
            {stats.flavioCountries} países à frente
          </span>
        </div>

        <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400">Países com Votação:</span>
          <span className="font-tabular font-bold text-slate-900 dark:text-white">
            {stats.totalVotingCountries} países
          </span>
        </div>

        <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400">Apuração Concluída:</span>
          <span className="font-tabular font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {stats.completedCountries} de {stats.totalVotingCountries}
          </span>
        </div>
      </div>

      {/* Map Canvas with D3 Zoom */}
      <div
        ref={containerRef}
        className="relative w-full h-[440px] sm:h-[540px] bg-slate-100/70 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden flex items-center justify-center select-none"
      >
        <svg
          ref={svgRef}
          viewBox={WorldMap.viewBox}
          className="w-full h-full cursor-grab active:cursor-grabbing"
        >
          <g className="world-map-group">
            {WorldMap.locations.map((loc) => {
              const code = loc.id.toLowerCase();
              const isHovered = hoveredId === code;
              const isSelected = selectedCountry?.id === code;
              const isBrazil = code === 'br';
              const fillColor = getCountryColor(code, isHovered, isSelected);

              return (
                <path
                  key={loc.id}
                  id={`country-${code}`}
                  d={loc.path}
                  fill={fillColor}
                  stroke={isBrazil ? '#10b981' : isHovered ? '#0f172a' : '#94a3b8'}
                  strokeWidth={isBrazil ? 1.8 : isHovered ? 1.2 : 0.4}
                  className="transition-colors duration-150 cursor-pointer outline-none"
                  onClick={() => handleCountryClick(code, loc.name)}
                  onMouseEnter={(e) => {
                    setHoveredId(code);
                    const rect = containerRef.current?.getBoundingClientRect();
                    const cData = countriesData[code];

                    if (rect) {
                      if (code === 'br' && liveData) {
                        const hasLiveVotes = liveData.percentSectionsCounted > 0 && liveData.candidates.some(c => c.votes > 0);
                        if (hasLiveVotes) {
                          const sorted = [...liveData.candidates].sort((a, b) => b.votes - a.votes);
                          setTooltip({
                            id: code,
                            name: 'Brasil',
                            flag: '🇧🇷',
                            x: e.clientX - rect.left,
                            y: e.clientY - rect.top,
                            hasVoting: true,
                            hasStarted: true,
                            isCompleted: liveData.isCompleted,
                            percentCounted: liveData.percentSectionsCounted,
                            winnerName: sorted[0]?.ballotName,
                            winnerColor: sorted[0]?.color,
                            winnerPercent: sorted[0]?.percent,
                            runnerUpName: sorted[1]?.ballotName,
                            runnerUpPercent: sorted[1]?.percent,
                            totalVoters: liveData.totalVoters,
                          });
                        } else {
                          setTooltip({
                            id: code,
                            name: 'Brasil',
                            flag: '🇧🇷',
                            x: e.clientX - rect.left,
                            y: e.clientY - rect.top,
                            hasVoting: true,
                            hasStarted: false,
                            isCompleted: false,
                            percentCounted: 0,
                            totalVoters: liveData.totalVoters,
                          });
                        }
                      } else if (cData && cData.hasVoting) {
                        const sorted = [...cData.candidates].sort((a, b) => b.votes - a.votes);
                        setTooltip({
                          id: code,
                          name: cData.name,
                          flag: cData.flag,
                          x: e.clientX - rect.left,
                          y: e.clientY - rect.top,
                          hasVoting: true,
                          hasStarted: cData.hasStarted,
                          isCompleted: cData.isCompleted,
                          percentCounted: cData.percentSectionsCounted,
                          winnerName: sorted[0]?.ballotName,
                          winnerColor: sorted[0]?.color,
                          winnerPercent: sorted[0]?.percent,
                          runnerUpName: sorted[1]?.ballotName,
                          runnerUpPercent: sorted[1]?.percent,
                          totalVoters: cData.totalVoters,
                        });
                      } else {
                        setTooltip({
                          id: code,
                          name: loc.name,
                          flag: '🌐',
                          x: e.clientX - rect.left,
                          y: e.clientY - rect.top,
                          hasVoting: false,
                          hasStarted: false,
                          isCompleted: false,
                          percentCounted: 0,
                        });
                      }
                    }
                  }}
                  onMouseMove={(e) => {
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (rect && tooltip) {
                      setTooltip((prev) =>
                        prev
                          ? {
                              ...prev,
                              x: e.clientX - rect.left,
                              y: e.clientY - rect.top,
                            }
                          : null
                      );
                    }
                  }}
                  onMouseLeave={() => {
                    setHoveredId(null);
                    setTooltip(null);
                  }}
                />
              );
            })}
          </g>
        </svg>

        {/* Floating Zoom & Controls Overlay */}
        <div className="absolute top-4 right-4 flex flex-col gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm z-10">
          <button
            onClick={() => handleZoom(1.4)}
            className="p-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Aproximar Zoom"
            aria-label="Aproximar Zoom"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleZoom(0.7)}
            className="p-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Afastar Zoom"
            aria-label="Afastar Zoom"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetZoom}
            className="p-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Restaurar Visão Global"
            aria-label="Restaurar Visão Global"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Interactive Hover Tooltip */}
        {tooltip && (
          <div
            className="absolute pointer-events-none z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 p-3 rounded-xl shadow-lg text-xs min-w-[210px] transform -translate-x-1/2 -translate-y-full mb-3"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-1.5 mb-2">
              <span className="text-base">{tooltip.flag}</span>
              <span className="font-bold text-slate-900 dark:text-white text-sm">
                {tooltip.name}
              </span>
              {tooltip.id === 'br' && (
                <span className="ml-auto text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                  Clique para Estados
                </span>
              )}
            </div>

            {tooltip.hasVoting ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400">Apuração:</span>
                  <span className={`font-semibold ${tooltip.isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {tooltip.isCompleted ? '100% Finalizado' : `${tooltip.percentCounted.toFixed(1)}% Apurado`}
                  </span>
                </div>

                {tooltip.hasStarted && tooltip.winnerName ? (
                  <>
                    <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 space-y-1">
                      <div className="flex items-center justify-between font-bold" style={{ color: tooltip.winnerColor }}>
                        <span>1º {tooltip.winnerName}:</span>
                        <span>{formatPercentBR(tooltip.winnerPercent || 0)}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                        <span>2º {tooltip.runnerUpName}:</span>
                        <span>{formatPercentBR(tooltip.runnerUpPercent || 0)}</span>
                      </div>
                    </div>
                    {tooltip.totalVoters && (
                      <div className="text-[10px] text-slate-400 text-right">
                        {formatNumberBR(tooltip.totalVoters)} eleitores aptos
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-1">
                    <div className="text-amber-800 dark:text-amber-300 font-medium text-[11px] bg-amber-50 dark:bg-amber-950/60 p-2 rounded-lg border border-amber-200 dark:border-amber-900 leading-snug">
                      {tooltip.id === 'br'
                        ? 'Votação em andamento em todo o Brasil (08h às 17h). Totalização oficial inicia às 17h00 pelo TSE.'
                        : 'Votação em andamento no exterior. Aguardando totalização oficial pelo TSE às 17h00.'}
                    </div>
                    {tooltip.totalVoters && (
                      <div className="text-[10px] text-slate-400 text-right">
                        {formatNumberBR(tooltip.totalVoters)} eleitores aptos
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                Sem seções eleitorais brasileiras neste país
              </div>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-md text-xs space-y-1.5">
          <div className="font-bold text-slate-800 dark:text-slate-200 text-[11px] uppercase tracking-wider mb-1">
            Legenda do Mapa:
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-md bg-red-600 shadow-xs" />
            <span className="text-slate-700 dark:text-slate-300">Lula na frente / venceu</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-md bg-blue-600 shadow-xs" />
            <span className="text-slate-700 dark:text-slate-300">Flávio Bolsonaro na frente / venceu</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-md bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600" />
            <span className="text-slate-500 dark:text-slate-400">Sem votação / Não iniciada</span>
          </div>
        </div>
      </div>

      {/* Country Detail Modal / Overlay when clicked */}
      {selectedCountry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setSelectedCountry(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <span className="text-3xl">{selectedCountry.flag}</span>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {selectedCountry.name}
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedCountry.hasVoting ? 'Zona Eleitoral do Exterior (ZZ)' : 'País sem seção eleitoral'}
                </span>
              </div>
            </div>

            {selectedCountry.hasVoting ? (
              <div className="space-y-4">
                {/* Status chip */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Status da Apuração:</span>
                  <span className={`font-bold ${selectedCountry.isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {selectedCountry.isCompleted ? '100% Apurado' : `${selectedCountry.percentSectionsCounted.toFixed(1)}% Apurado`}
                  </span>
                </div>

                {/* Candidates Result Bars */}
                {selectedCountry.candidates && selectedCountry.candidates.length > 0 && (
                  <div className="space-y-3">
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Resultado para Presidente:
                    </div>
                    {selectedCountry.candidates.map((cand) => (
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
                )}

                {/* Additional metrics */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                    <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Eleitores Aptos:</span>
                    <span className="font-bold font-tabular text-slate-900 dark:text-white">
                      {formatNumberBR(selectedCountry.totalVoters)}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                    <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Votos Válidos:</span>
                    <span className="font-bold font-tabular text-slate-900 dark:text-white">
                      {formatNumberBR(selectedCountry.validVotes)}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                    <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Comparecimento:</span>
                    <span className="font-bold font-tabular text-slate-900 dark:text-white">
                      {formatNumberBR(selectedCountry.attendance)}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                    <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Abstenção:</span>
                    <span className="font-bold font-tabular text-slate-900 dark:text-white">
                      {formatNumberBR(selectedCountry.abstentions)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-500 dark:text-slate-400 leading-relaxed text-center">
                Não há seções eleitorais do Tribunal Superior Eleitoral (TSE) registradas neste país. Os cidadãos brasileiros residentes nesta região votam na embaixada ou consulado de jurisdição mais próxima.
              </div>
            )}

            <button
              onClick={() => setSelectedCountry(null)}
              className="w-full py-2.5 rounded-xl font-semibold text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
            >
              Fechar Detalhes
            </button>
          </div>
        </div>
      )}

      {/* Country Quick Search / Selector */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            Principais Países com Votação no Exterior:
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar país no exterior..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto py-2.5 scrollbar-thin">
          {votingCountriesList.map((country) => (
            <button
              key={country.id}
              onClick={() => {
                if (country.id === 'br') onSelectBrazil();
                else setSelectedCountry(country);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                country.leaderNumber === '13'
                  ? 'border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/20 text-red-700 dark:text-red-300 hover:bg-red-100'
                  : country.leaderNumber === '22'
                  ? 'border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <span>{country.flag}</span>
              <span>{country.name}</span>
              {country.leaderNumber && (
                <span className="font-bold text-[10px] ml-1">
                  ({country.leaderName})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
