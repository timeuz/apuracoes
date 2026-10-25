import React, { useState } from 'react';
import { TerritoryData } from '../types/election';
import { formatNumberBR, formatPercentBR } from '../data/electionData';
import { BarChart3, PieChart, TrendingUp, Clock } from 'lucide-react';
import { RealtimeEvolutionChart } from './RealtimeEvolutionChart';

interface VotingChartsProps {
  data: TerritoryData;
}

export const VotingCharts: React.FC<VotingChartsProps> = ({ data }) => {
  const [activeChartTab, setActiveChartTab] = useState<'comparison' | 'distribution' | 'timeline'>('comparison');

  const candidates = [...data.candidates].sort((a, b) => b.votes - a.votes);
  const maxPercent = Math.max(...candidates.map(c => c.percent), 50);

  // Distribution totals
  const totalElectorate = data.totalVoters || (data.validVotes + data.blankVotes + data.nullVotes + data.abstentions);
  const validShare = totalElectorate > 0 ? (data.validVotes / totalElectorate) * 100 : 0;
  const blankShare = totalElectorate > 0 ? (data.blankVotes / totalElectorate) * 100 : 0;
  const nullShare = totalElectorate > 0 ? (data.nullVotes / totalElectorate) * 100 : 0;
  const abstentionShare = totalElectorate > 0 ? (data.abstentions / totalElectorate) * 100 : 0;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-6">
      {/* Header and Chart Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Gráficos Comparativos de Votação
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Dados consolidados para: <strong className="text-slate-700 dark:text-slate-300">{data.name}</strong>
          </p>
        </div>

        {/* Chart View Switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg self-start sm:self-auto">
          <button
            onClick={() => setActiveChartTab('comparison')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeChartTab === 'comparison'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Candidatos
          </button>
          <button
            onClick={() => setActiveChartTab('distribution')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeChartTab === 'distribution'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <PieChart className="w-3.5 h-3.5" />
            Composição dos Votos
          </button>
          <button
            onClick={() => setActiveChartTab('timeline')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeChartTab === 'timeline'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Evolução da Apuração
          </button>
        </div>
      </div>

      {/* Pre-17h notice if 0 sections counted */}
      {data.percentSectionsCounted === 0 && (
        <div className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-3">
          <Clock className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <strong>Urnas em votação (08h00 às 17h00).</strong> Os gráficos comparativos de apuração e distribuição de votos serão calculados em tempo real a partir das 17h00 de Brasília com os dados oficiais do TSE.
          </div>
        </div>
      )}

      {/* 1. Candidate Comparison Bar Chart */}
      {activeChartTab === 'comparison' && (
        <div className="space-y-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Comparação da proporção de votos válidos entre os concorrentes:
          </div>

          <div className="space-y-3">
            {candidates.map((cand) => {
              const barWidth = Math.min(100, Math.max(2, (cand.percent / maxPercent) * 100));
              return (
                <div key={cand.number} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block"
                        style={{ backgroundColor: cand.color || '#475569' }}
                      />
                      <span className="font-bold text-slate-900 dark:text-white">
                        {cand.ballotName}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        ({cand.party})
                      </span>
                    </div>

                    <div className="flex items-center gap-2 font-tabular">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">
                        {formatPercentBR(cand.percent)}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {formatNumberBR(cand.votes)} votos
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-lg h-5 p-0.5 overflow-hidden">
                    <div
                      className="h-full rounded-md transition-all duration-700 flex items-center justify-end pr-2 text-[10px] font-bold text-white font-tabular"
                      style={{
                        width: `${barWidth}%`,
                        backgroundColor: cand.color || '#2563EB',
                      }}
                    >
                      {cand.percent > 12 && formatPercentBR(cand.percent)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
            <span>Base de cálculo: apenas votos válidos (excluindo brancos e nulos conforme Art. 77 da CF/88).</span>
            <span className="font-tabular font-medium text-slate-900 dark:text-white">
              Total Válidos: {formatNumberBR(data.validVotes)}
            </span>
          </div>
        </div>
      )}

      {/* 2. Vote Composition Distribution (Válidos x Brancos x Nulos x Abstenção) */}
      {activeChartTab === 'distribution' && (
        <div className="space-y-6">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Distribuição de todos os eleitores aptos entre votos válidos, brancos, nulos e abstenções:
          </div>

          {/* Segmented Stacked Bar */}
          <div className="space-y-2">
            <div className="w-full h-8 rounded-xl overflow-hidden flex bg-slate-200 dark:bg-slate-800 p-1 gap-1">
              {validShare > 0 && (
                <div
                  title={`Votos Válidos: ${formatPercentBR(validShare)}`}
                  className="bg-emerald-600 rounded-lg transition-all duration-500 flex items-center justify-center text-white text-[11px] font-bold font-tabular"
                  style={{ width: `${validShare}%` }}
                >
                  {validShare > 15 && `Válidos ${formatPercentBR(validShare)}`}
                </div>
              )}
              {blankShare > 0 && (
                <div
                  title={`Votos Brancos: ${formatPercentBR(blankShare)}`}
                  className="bg-slate-400 rounded-lg transition-all duration-500 flex items-center justify-center text-white text-[10px] font-bold font-tabular"
                  style={{ width: `${Math.max(1.5, blankShare)}%` }}
                />
              )}
              {nullShare > 0 && (
                <div
                  title={`Votos Nulos: ${formatPercentBR(nullShare)}`}
                  className="bg-rose-500 rounded-lg transition-all duration-500 flex items-center justify-center text-white text-[10px] font-bold font-tabular"
                  style={{ width: `${Math.max(2, nullShare)}%` }}
                />
              )}
              {abstentionShare > 0 && (
                <div
                  title={`Abstenções: ${formatPercentBR(abstentionShare)}`}
                  className="bg-amber-500 rounded-lg transition-all duration-500 flex items-center justify-center text-white text-[11px] font-bold font-tabular"
                  style={{ width: `${abstentionShare}%` }}
                >
                  {abstentionShare > 12 && `Abstenção ${formatPercentBR(abstentionShare)}`}
                </div>
              )}
            </div>

            {/* Legend row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2">
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  Votos Válidos
                </div>
                <div className="font-bold text-base font-tabular text-slate-900 dark:text-white">
                  {formatPercentBR(data.percentValidVotes)}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-tabular">
                  {formatNumberBR(data.validVotes)}
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-semibold mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                  Votos Brancos
                </div>
                <div className="font-bold text-base font-tabular text-slate-900 dark:text-white">
                  {formatPercentBR(data.percentBlankVotes)}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-tabular">
                  {formatNumberBR(data.blankVotes)}
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  Votos Nulos
                </div>
                <div className="font-bold text-base font-tabular text-slate-900 dark:text-white">
                  {formatPercentBR(data.percentNullVotes)}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-tabular">
                  {formatNumberBR(data.nullVotes)}
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  Abstenções
                </div>
                <div className="font-bold text-base font-tabular text-slate-900 dark:text-white">
                  {formatPercentBR(data.percentAbstentions)}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-tabular">
                  {formatNumberBR(data.abstentions)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Timeline Evolution Line Graph */}
      {activeChartTab === 'timeline' && (
        <RealtimeEvolutionChart data={data} />
      )}
    </div>
  );
};
