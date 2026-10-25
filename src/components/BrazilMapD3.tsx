import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import BrazilMap from '@svg-maps/brazil';
import { getStatesData2026_2T, STATES_DATA_2026_1T, formatNumberBR, formatPercentBR } from '../data/electionData';
import { ElectionId } from '../types/election';
import { ZoomIn, ZoomOut, RotateCcw, MapPin, Radio, Globe, Building2, ChevronRight, CheckCircle2, Clock } from 'lucide-react';

interface BrazilMapD3Props {
  electionId?: ElectionId;
  selectedStateCode?: string;
  isPast17h?: boolean;
  onSelectState: (stateUf: string) => void;
  onResetToNational: () => void;
  onBackToWorldMap?: () => void;
  onViewMunicipalities?: (stateUf?: string) => void;
}

type MapColorMode = 'winner' | 'progress' | 'valid' | 'abstention';

interface TooltipData {
  uf: string;
  name: string;
  x: number;
  y: number;
  winnerName: string;
  winnerColor: string;
  winnerPercent: number;
  winnerVotes: number;
  runnerUpName: string;
  runnerUpPercent: number;
  percentCounted: number;
  isCompleted: boolean;
  validPercent: number;
  blankPercent: number;
  nullPercent: number;
  abstentionPercent: number;
}

export const BrazilMapD3: React.FC<BrazilMapD3Props> = ({
  electionId = '2026_2t',
  selectedStateCode,
  isPast17h = false,
  onSelectState,
  onResetToNational,
  onBackToWorldMap,
  onViewMunicipalities,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [colorMode, setColorMode] = useState<MapColorMode>('winner');
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [hoveredUf, setHoveredUf] = useState<string | null>(null);

  const activeStatesData = useMemo(() => {
    if (electionId === '2026_1t') return STATES_DATA_2026_1T;
    return getStatesData2026_2T(isPast17h);
  }, [electionId, isPast17h]);

  const selectedStateData = selectedStateCode ? activeStatesData[selectedStateCode] : null;

  // Stats calculation (States won by Lula vs Flávio Bolsonaro)
  const stats = useMemo(() => {
    let lulaStates = 0;
    let flavioStates = 0;
    const entries = Object.entries(activeStatesData).filter(([uf]) => uf !== 'ZZ');

    entries.forEach(([, data]) => {
      if (data.percentSectionsCounted > 0 && data.candidates.some(c => c.votes > 0)) {
        const sorted = [...data.candidates].sort((a, b) => b.votes - a.votes);
        if (sorted[0]?.number === '13') lulaStates++;
        else if (sorted[0]?.number === '22') flavioStates++;
      }
    });

    return { lulaStates, flavioStates, total: entries.length };
  }, [activeStatesData]);

  // Color logic matching world map: Red for Lula, Blue for Flávio Bolsonaro
  const getColorForState = (uf: string) => {
    const data = activeStatesData[uf];
    if (!data) return '#94a3b8';

    // If no votes/sections counted yet (before 17h)
    if (!data.percentSectionsCounted || data.percentSectionsCounted === 0 || !data.candidates.some(c => c.votes > 0)) {
      return '#f1f5f9';
    }

    if (colorMode === 'winner') {
      const sorted = [...data.candidates].sort((a, b) => b.votes - a.votes);
      const winner = sorted[0];

      if (winner?.number === '13') {
        // Red for Lula
        return '#dc2626';
      } else {
        // Blue for Flávio Bolsonaro
        return '#2563eb';
      }
    } else if (colorMode === 'progress') {
      const interpolator = d3.interpolateRgb('#cbd5e1', '#059669');
      const normalized = (data.percentSectionsCounted || 0) / 100;
      return interpolator(Math.min(1, Math.max(0, normalized)));
    } else if (colorMode === 'valid') {
      const interpolator = d3.interpolateRgb('#a7f3d0', '#047857');
      const normalized = (data.percentValidVotes - 85) / 15;
      return interpolator(Math.min(1, Math.max(0, normalized)));
    } else {
      const interpolator = d3.interpolateRgb('#fed7aa', '#c2410c');
      const normalized = (data.percentAbstentions - 15) / 15;
      return interpolator(Math.min(1, Math.max(0, normalized)));
    }
  };

  // Setup D3 zoom
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const g = svg.select<SVGGElement>('g.map-group');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.8, 5])
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

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4 transition-colors">
      {/* Map Header & Navigation Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Mapa do Brasil por Estado (Eleições 2026)
            </h3>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-800 animate-pulse">
              <Radio className="w-3 h-3" /> Ao Vivo
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Coloração oficial: <strong className="text-red-600">Vermelho</strong> para liderança de Lula (PT) e <strong className="text-blue-600">Azul</strong> para Flávio Bolsonaro (PL).
          </p>
        </div>

        {/* View Mode & Drill actions */}
        <div className="flex flex-wrap items-center gap-2">
          {onBackToWorldMap && (
            <button
              onClick={onBackToWorldMap}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg transition-colors border border-slate-300 dark:border-slate-700 cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-600" />
              <span>← Ver Mapa-Múndi</span>
            </button>
          )}

            {onViewMunicipalities && (
              <button
                onClick={() => onViewMunicipalities(selectedStateCode)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-xs cursor-pointer"
              >
              <Building2 className="w-3.5 h-3.5" />
              <span>Ver Apuração por Município</span>
            </button>
          )}

          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
            <button
              onClick={() => setColorMode('winner')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                colorMode === 'winner'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Líder Estadual
            </button>
            <button
              onClick={() => setColorMode('progress')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                colorMode === 'progress'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Urnas (%)
            </button>
          </div>

          {selectedStateCode && (
            <button
              onClick={onResetToNational}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-lg hover:bg-emerald-200 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Total Brasil
            </button>
          )}
        </div>
      </div>

      {/* KPI Ticker Bar: States Comparison */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-2.5 rounded-xl border border-red-200 dark:border-red-950/80 bg-red-50/40 dark:bg-red-950/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-600" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">Lula (PT):</span>
          </div>
          <span className="font-tabular font-bold text-red-700 dark:text-red-400">
            {isPast17h ? `${stats.lulaStates} estados liderando` : 'Urnas em votação (08h às 17h)'}
          </span>
        </div>

        <div className="p-2.5 rounded-xl border border-blue-200 dark:border-blue-950/80 bg-blue-50/40 dark:bg-blue-950/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-600" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">Flávio Bolsonaro (PL):</span>
          </div>
          <span className="font-tabular font-bold text-blue-700 dark:text-blue-400">
            {isPast17h ? `${stats.flavioStates} estados liderando` : 'Urnas em votação (08h às 17h)'}
          </span>
        </div>

        <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400">UF Selecionada:</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400">
            {selectedStateCode ? `${activeStatesData[selectedStateCode]?.name || selectedStateCode} (${selectedStateCode})` : 'Brasil (Total Nacional)'}
          </span>
        </div>
      </div>

      {/* Interactive Map Viewport with D3 */}
      <div
        ref={containerRef}
        className="relative w-full h-[460px] sm:h-[540px] bg-slate-50/70 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden flex items-center justify-center select-none"
      >
        <svg
          ref={svgRef}
          viewBox={BrazilMap.viewBox}
          className="w-full h-full cursor-grab active:cursor-grabbing"
        >
          <g className="map-group">
            {BrazilMap.locations.map((loc) => {
              const uf = loc.id.toUpperCase();
              const isSelected = selectedStateCode === uf;
              const isHovered = hoveredUf === uf;
              const fillColor = getColorForState(uf);

              return (
                <path
                  key={loc.id}
                  id={`state-${uf}`}
                  d={loc.path}
                  fill={fillColor}
                  stroke={isSelected ? '#10b981' : isHovered ? '#ffffff' : '#1e293b'}
                  strokeWidth={isSelected ? 3.5 : isHovered ? 2.5 : 1}
                  className="transition-colors duration-150 cursor-pointer"
                  onClick={() => onSelectState(uf)}
                  onMouseEnter={(e) => {
                    setHoveredUf(uf);
                    const rect = containerRef.current?.getBoundingClientRect();
                    const stateData = activeStatesData[uf];
                    if (stateData && rect) {
                      const sorted = [...stateData.candidates].sort((a, b) => b.votes - a.votes);
                      const winner = sorted[0];
                      const runnerUp = sorted[1];
                      setTooltip({
                        uf,
                        name: loc.name,
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top,
                        winnerName: winner?.ballotName || 'Líder',
                        winnerColor: winner?.color || '#DC2626',
                        winnerPercent: winner?.percent || 0,
                        winnerVotes: winner?.votes || 0,
                        runnerUpName: runnerUp?.ballotName || 'Segundo',
                        runnerUpPercent: runnerUp?.percent || 0,
                        percentCounted: stateData.percentSectionsCounted,
                        isCompleted: stateData.isCompleted,
                        validPercent: stateData.percentValidVotes,
                        blankPercent: stateData.percentBlankVotes,
                        nullPercent: stateData.percentNullVotes,
                        abstentionPercent: stateData.percentAbstentions,
                      });
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
                    setHoveredUf(null);
                    setTooltip(null);
                  }}
                />
              );
            })}
          </g>
        </svg>

        {/* Floating Zoom Controls */}
        <div className="absolute top-4 right-4 flex flex-col gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm z-10">
          <button
            onClick={() => handleZoom(1.3)}
            className="p-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Aproximar Zoom"
            aria-label="Aproximar Zoom"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleZoom(0.75)}
            className="p-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Afastar Zoom"
            aria-label="Afastar Zoom"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetZoom}
            className="p-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Restaurar Visão"
            aria-label="Restaurar Visão"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Floating Tooltip */}
        {tooltip && (
          <div
            className="absolute pointer-events-none z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 p-3.5 rounded-xl shadow-lg text-xs min-w-[220px] transform -translate-x-1/2 -translate-y-full mb-3"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
              <span className="font-bold text-slate-900 dark:text-white text-sm">
                {tooltip.name} ({tooltip.uf})
              </span>
              <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${
                tooltip.percentCounted > 0
                  ? tooltip.isCompleted
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}>
                {tooltip.percentCounted > 0
                  ? (tooltip.isCompleted ? '100% Apurado' : `${tooltip.percentCounted.toFixed(1)}% Apurado`)
                  : 'Urnas em Votação'}
              </span>
            </div>

            {tooltip.percentCounted > 0 && tooltip.winnerVotes > 0 ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold" style={{ color: tooltip.winnerColor }}>
                    1º {tooltip.winnerName}:
                  </span>
                  <span className="font-tabular font-bold text-slate-900 dark:text-white">
                    {formatPercentBR(tooltip.winnerPercent)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>2º {tooltip.runnerUpName}:</span>
                  <span className="font-tabular font-medium">
                    {formatPercentBR(tooltip.runnerUpPercent)}
                  </span>
                </div>
                <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex justify-between">
                  <span>Válidos: {formatPercentBR(tooltip.validPercent)}</span>
                  <span>Abstenção: {formatPercentBR(tooltip.abstentionPercent)}</span>
                </div>
              </div>
            ) : (
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-[11px] leading-snug">
                Votação em andamento (08h às 17h). Totalização oficial inicia às 17h00 pelo TSE.
              </div>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-md text-xs space-y-1.5">
          <div className="font-bold text-slate-800 dark:text-slate-200 text-[11px] uppercase tracking-wider mb-1">
            Legenda:
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-md bg-red-600 shadow-xs" />
            <span className="text-slate-700 dark:text-slate-300">Lula (PT)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-md bg-blue-600 shadow-xs" />
            <span className="text-slate-700 dark:text-slate-300">Flávio Bolsonaro (PL)</span>
          </div>
        </div>
      </div>

      {/* Selected State Detail Card */}
      {selectedStateData && (
        <div className="p-4 sm:p-5 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/20 space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-100 dark:border-emerald-900/40 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                {selectedStateCode}
              </span>
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{selectedStateData.name} ({selectedStateCode})</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    selectedStateData.percentSectionsCounted > 0
                      ? selectedStateData.isCompleted
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {selectedStateData.percentSectionsCounted > 0
                      ? (selectedStateData.isCompleted ? '100% Totalizado' : `${selectedStateData.percentSectionsCounted.toFixed(1)}% Apurado`)
                      : 'Urnas em Votação (08h às 17h)'}
                  </span>
                </h4>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {formatNumberBR(selectedStateData.totalVoters)} eleitores aptos · {formatNumberBR(selectedStateData.totalSections)} seções eleitorais
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onViewMunicipalities && (
                <button
                  onClick={() => onViewMunicipalities(selectedStateCode)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Ver Municípios de {selectedStateCode}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={onResetToNational}
                className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                Limpar Seleção
              </button>
            </div>
          </div>

          {selectedStateData.percentSectionsCounted === 0 && (
            <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/70 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Votação em andamento em {selectedStateData.name} (08h às 17h). Conforme a Resolução TSE nº 23.736, as urnas permanecem lacradas e a divulgação oficial dos votos inicia pontualmente às 17h00 pelo TSE.</span>
            </div>
          )}

          {/* Candidate comparison for selected state */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {selectedStateData.candidates.map((cand) => (
              <div
                key={cand.number}
                className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 shadow-xs"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cand.color }} />
                    <span>{cand.ballotName} ({cand.party})</span>
                  </div>
                  <span className="font-bold font-tabular text-sm" style={{ color: cand.color }}>
                    {formatPercentBR(cand.percent)}
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${cand.percent}%`, backgroundColor: cand.color }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-tabular">
                  <span>{formatNumberBR(cand.votes)} votos</span>
                  <span>{cand.coalition}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Additional details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-600 dark:text-slate-400 font-tabular">
            <div className="p-2 rounded-lg bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block">Votos Válidos:</span>
              <span className="font-bold text-slate-900 dark:text-white">{formatNumberBR(selectedStateData.validVotes)} ({formatPercentBR(selectedStateData.percentValidVotes)})</span>
            </div>
            <div className="p-2 rounded-lg bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block">Abstenção:</span>
              <span className="font-bold text-slate-900 dark:text-white">{formatNumberBR(selectedStateData.abstentions)} ({formatPercentBR(selectedStateData.percentAbstentions)})</span>
            </div>
            <div className="p-2 rounded-lg bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block">Votos Brancos:</span>
              <span className="font-bold text-slate-900 dark:text-white">{formatNumberBR(selectedStateData.blankVotes)} ({formatPercentBR(selectedStateData.percentBlankVotes)})</span>
            </div>
            <div className="p-2 rounded-lg bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block">Votos Nulos:</span>
              <span className="font-bold text-slate-900 dark:text-white">{formatNumberBR(selectedStateData.nullVotes)} ({formatPercentBR(selectedStateData.percentNullVotes)})</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
