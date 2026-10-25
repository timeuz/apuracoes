import React, { useState } from 'react';
import { TerritoryData } from '../types/election';
import { formatPercentBR } from '../data/electionData';
import { TrendingUp, Clock, Scale, AlertCircle } from 'lucide-react';

interface RealtimeEvolutionChartProps {
  data: TerritoryData;
}

export const RealtimeEvolutionChart: React.FC<RealtimeEvolutionChartProps> = ({ data }) => {
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  const timelinePoints = data.timeline && data.timeline.length > 0
    ? data.timeline
    : (data.percentSectionsCounted > 0 && data.candidates.some(c => c.votes > 0)
        ? [{
            sectionPercent: data.percentSectionsCounted,
            timestamp: data.lastUpdate.split(' ')[1] || '17:00',
            candidatePercents: {
              '13': data.candidates.find(c => c.number === '13')?.percent || 50,
              '22': data.candidates.find(c => c.number === '22')?.percent || 50,
            },
            leader: (data.candidates.find(c => c.number === '13')?.percent || 50) >= (data.candidates.find(c => c.number === '22')?.percent || 50) ? '13' : '22',
          }]
        : []);

  if (timelinePoints.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Evolução em Tempo Real da Disputa (Lula x Flávio)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Curva dinâmica de apuração e alternância de liderança conforme dados oficiais do TSE.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Aguardando Início às 17h00
            </span>
          </div>
        </div>

        <div className="h-48 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/40 flex flex-col items-center justify-center text-center p-6 space-y-2">
          <Clock className="w-8 h-8 text-amber-500" />
          <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Gráfico de Linha em Tempo Real aguardando a abertura das urnas às 17h00
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
            Conforme determinação legal do TSE, os votos só começam a ser totalizados e divulgados a partir das 17h00 de Brasília. Cada transmissão de dados gerará um novo ponto na curva.
          </p>
        </div>
      </div>
    );
  }

  // SVG dimensions
  const svgWidth = 600;
  const svgHeight = 240;
  const padLeft = 55;
  const padRight = 55;
  const padTop = 30;
  const padBottom = 40;

  // Scales: dynamic Y bounds centered comfortably
  const allPercents = timelinePoints.flatMap(pt => [
    pt.candidatePercents['13'] ?? 50,
    pt.candidatePercents['22'] ?? 50,
  ]);
  const dataMin = Math.min(...allPercents);
  const dataMax = Math.max(...allPercents);
  const minY = Math.floor(Math.min(42, dataMin - 1));
  const maxY = Math.ceil(Math.max(58, dataMax + 1));

  // Dynamic turnaround detection (where leader changes)
  const turnaroundIndex = timelinePoints.findIndex((pt, idx) => {
    if (idx === 0) return false;
    const prev = timelinePoints[idx - 1];
    return pt.leader && prev.leader && pt.leader !== prev.leader;
  });

  const getX = (index: number) => {
    if (timelinePoints.length <= 1) return padLeft + (svgWidth - padLeft - padRight) / 2;
    return padLeft + (index / (timelinePoints.length - 1)) * (svgWidth - padLeft - padRight);
  };

  const getY = (val: number) => {
    const clamped = Math.max(minY, Math.min(maxY, val));
    return padTop + (svgHeight - padTop - padBottom) * (1 - (clamped - minY) / (maxY - minY));
  };

  // Build SVG path points
  const lulaPoints = timelinePoints.map((pt, i) => `${getX(i)},${getY(pt.candidatePercents['13'] || 50)}`).join(' ');
  const flavioPoints = timelinePoints.map((pt, i) => `${getX(i)},${getY(pt.candidatePercents['22'] || 50)}`).join(' ');

  const currentHoveredPoint = hoveredPointIndex !== null ? timelinePoints[hoveredPointIndex] : timelinePoints[timelinePoints.length - 1];
  const lulaHoverVal = currentHoveredPoint?.candidatePercents['13'] || 50;
  const flavioHoverVal = currentHoveredPoint?.candidatePercents['22'] || 50;
  const isLulaAhead = lulaHoverVal >= flavioHoverVal;

  // Grid tick values (evenly spaced integers including 50)
  const gridTicks = [44, 46, 48, 50, 52, 54, 56].filter(v => v >= minY && v <= maxY);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4 transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Evolução em Tempo Real da Disputa (Lula x Flávio)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Mostra quem esteve na frente a cada momento e a dinâmica das urnas apuradas.
          </p>
        </div>

        {/* Current Leader Status Pill */}
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 border ${
            isLulaAhead
              ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300'
              : 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300'
          }`}>
            <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: isLulaAhead ? '#DC2626' : '#2563EB' }} />
            <span>
              Líder no momento selecionado: <strong>{isLulaAhead ? 'Lula' : 'Flávio Bolsonaro'}</strong> ({formatPercentBR(Math.max(lulaHoverVal, flavioHoverVal))})
            </span>
          </div>
        </div>
      </div>

      {/* Interactive SVG Chart Viewport */}
      <div className="relative w-full h-64 sm:h-72 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/60 p-2 sm:p-4 overflow-hidden">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-full overflow-visible select-none"
          preserveAspectRatio="none"
        >
          {/* Grid lines & values */}
          {gridTicks.map((gridVal) => {
            const y = getY(gridVal);
            const is50 = gridVal === 50;
            return (
              <g key={gridVal}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={svgWidth - padRight}
                  y2={y}
                  stroke={is50 ? '#EAB308' : 'currentColor'}
                  strokeWidth={is50 ? 1.5 : 0.8}
                  strokeDasharray={is50 ? '4 3' : '2 3'}
                  className={is50 ? '' : 'text-slate-200 dark:text-slate-800'}
                />
                <text
                  x={padLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  fill={is50 ? '#EAB308' : 'currentColor'}
                  fontSize="10"
                  fontWeight={is50 ? 'bold' : 'normal'}
                  className={is50 ? '' : 'text-slate-400 dark:text-slate-500'}
                >
                  {gridVal}%
                </text>
              </g>
            );
          })}

          {/* 50% Threshold Marker Text */}
          <text
            x={svgWidth - padRight + 6}
            y={getY(50) + 3}
            fill="#EAB308"
            fontSize="10"
            fontWeight="bold"
          >
            50%
          </text>

          {/* Turnaround Line Highlight (only drawn if a real turnaround occurred) */}
          {turnaroundIndex > 0 && (
            <g>
              <line
                x1={getX(turnaroundIndex)}
                y1={padTop}
                x2={getX(turnaroundIndex)}
                y2={svgHeight - padBottom}
                stroke="#10B981"
                strokeWidth="1.2"
                strokeDasharray="3 3"
              />
              <text
                x={getX(turnaroundIndex)}
                y={padTop - 6}
                textAnchor="middle"
                fill="#10B981"
                fontSize="9"
                fontWeight="bold"
              >
                Virada de Liderança
              </text>
            </g>
          )}

          {/* Candidate 2 (Flávio Bolsonaro) Line */}
          <polyline
            fill="none"
            stroke="#2563EB"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={flavioPoints}
          />

          {/* Candidate 1 (Lula) Line */}
          <polyline
            fill="none"
            stroke="#DC2626"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={lulaPoints}
          />

          {/* Individual Data Points */}
          {timelinePoints.map((pt, i) => {
            const x = getX(i);
            const yLula = getY(pt.candidatePercents['13'] || 50);
            const yFlavio = getY(pt.candidatePercents['22'] || 50);
            const isHovered = hoveredPointIndex === i;

            return (
              <g key={`pt-${i}`}>
                {/* Vertical hover guide */}
                {isHovered && (
                  <line
                    x1={x}
                    y1={padTop}
                    x2={x}
                    y2={svgHeight - padBottom}
                    stroke="#94a3b8"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                )}

                {/* Lula circle */}
                <circle
                  cx={x}
                  cy={yLula}
                  r={isHovered ? 6 : 4}
                  fill="#DC2626"
                  stroke="#ffffff"
                  strokeWidth={isHovered ? 2 : 1.5}
                  className="transition-all"
                />

                {/* Flávio circle */}
                <circle
                  cx={x}
                  cy={yFlavio}
                  r={isHovered ? 6 : 4}
                  fill="#2563EB"
                  stroke="#ffffff"
                  strokeWidth={isHovered ? 2 : 1.5}
                  className="transition-all"
                />

                {/* Invisible hover trigger column */}
                <rect
                  x={x - 20}
                  y={padTop}
                  width="40"
                  height={svgHeight - padTop - padBottom}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredPointIndex(i)}
                  onMouseLeave={() => setHoveredPointIndex(null)}
                />

                {/* Bottom X-axis label */}
                <text
                  x={x}
                  y={svgHeight - padBottom + 16}
                  textAnchor="middle"
                  fontSize="9"
                  className="fill-slate-500 font-medium font-tabular"
                >
                  {pt.sectionPercent}%
                </text>
                <text
                  x={x}
                  y={svgHeight - padBottom + 27}
                  textAnchor="middle"
                  fontSize="8"
                  className="fill-slate-400 font-tabular"
                >
                  {pt.timestamp}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip Box */}
        {currentHoveredPoint && (
          <div className="absolute top-3 left-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl shadow-md text-xs space-y-1">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px] font-semibold">
              <Clock className="w-3.5 h-3.5" />
              <span>{currentHoveredPoint.timestamp} ({currentHoveredPoint.sectionPercent}% das urnas)</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="font-bold text-red-600 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-600" />
                Lula: {formatPercentBR(currentHoveredPoint.candidatePercents['13'] || 0)}
              </span>
              <span className="font-bold text-blue-600 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                Flávio: {formatPercentBR(currentHoveredPoint.candidatePercents['22'] || 0)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Sequential Milestone Log */}
      <div className="space-y-2 pt-1">
        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Linha do Tempo da Apuração:
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-xs">
          {timelinePoints.map((pt, i) => {
            const lulaVal = pt.candidatePercents['13'] || 50;
            const flavioVal = pt.candidatePercents['22'] || 50;
            const lulaWins = lulaVal >= flavioVal;
            const isTurnaround = turnaroundIndex > 0 && i === turnaroundIndex;

            return (
              <div
                key={i}
                onMouseEnter={() => setHoveredPointIndex(i)}
                onMouseLeave={() => setHoveredPointIndex(null)}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  hoveredPointIndex === i
                    ? 'ring-2 ring-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/30'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="text-[10px] text-slate-400 font-tabular">{pt.timestamp}</div>
                <div className="font-bold text-slate-900 dark:text-white text-xs my-0.5">
                  {pt.sectionPercent}% Urnas
                </div>
                <div className={`text-[11px] font-bold ${lulaWins ? 'text-red-600' : 'text-blue-600'}`}>
                  {lulaWins ? `Lula ${lulaVal.toFixed(1)}%` : `Flávio ${flavioVal.toFixed(1)}%`}
                </div>
                {isTurnaround && (
                  <span className="mt-1 inline-block text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-1 py-0.5 rounded">
                    Virada!
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
