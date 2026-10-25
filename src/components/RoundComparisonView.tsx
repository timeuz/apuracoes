import React, { useState } from 'react';
import {
  ROUND_COMPARISON_NATIONAL_2026,
  ROUND_COMPARISON_STATES_2026,
  formatNumberBR,
  formatPercentBR,
} from '../data/electionData';
import { GitCompare, TrendingUp, ArrowUpRight, ArrowDownRight, Award, Vote, Clock } from 'lucide-react';

interface RoundComparisonViewProps {
  isPast17h?: boolean;
}

export const RoundComparisonView: React.FC<RoundComparisonViewProps> = ({ isPast17h = false }) => {
  const [filterState, setFilterState] = useState('');
  const national = ROUND_COMPARISON_NATIONAL_2026;

  const filteredStates = ROUND_COMPARISON_STATES_2026.filter(
    (s) =>
      s.territoryName.toLowerCase().includes(filterState.toLowerCase()) ||
      s.territoryCode.toLowerCase().includes(filterState.toLowerCase())
  );

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-6 transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <GitCompare className="w-5 h-5" />
            </span>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Comparação 1º Turno vs 2º Turno (Eleições 2026)
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Análise comparativa oficial dos números entre o 1º Turno (04/10/2026) e o 2º Turno (25/10/2026).
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          <Vote className="w-4 h-4 text-emerald-600" />
          <span>Pleito Presidencial 2026</span>
        </div>
      </div>

      {!isPast17h && (
        <div className="p-4 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-3">
          <Clock className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <strong>Votação do 2º Turno em andamento (08h00 às 17h00).</strong> A comparação de votos válidos e percentuais entre os dois turnos será atualizada em tempo real conforme a apuração for transmitida pelo TSE a partir das 17h00.
          </div>
        </div>
      )}

      {/* Main National Candidate Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Flávio Bolsonaro Card */}
        <div className="p-5 rounded-2xl border border-blue-200 dark:border-blue-950/80 bg-blue-50/40 dark:bg-blue-950/20 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-4 h-4 rounded-full bg-blue-600" />
              <div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white">
                  Flávio Nantes Bolsonaro
                </h4>
                <span className="text-xs text-blue-700 dark:text-blue-400 font-semibold">
                  PL · Número 22
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-600 text-white shadow-xs">
              Líder do 1º Turno
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-blue-100 dark:border-blue-900/40">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">1º Turno (04/10):</span>
              <div className="text-lg font-bold font-tabular text-slate-900 dark:text-white">
                {formatPercentBR(national.round1.flavioPercent)}
              </div>
              <span className="text-xs text-slate-500 font-tabular">
                {formatNumberBR(national.round1.flavioVotes)} votos
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-blue-100 dark:border-blue-900/40">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">2º Turno (25/10):</span>
              <div className={`text-lg font-bold font-tabular ${isPast17h ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
                {isPast17h ? formatPercentBR(national.round2.flavioPercent) : '0,00%'}
              </div>
              <span className="text-xs text-slate-500 font-tabular">
                {isPast17h ? `${formatNumberBR(national.round2.flavioVotes)} votos` : 'Urnas em votação (inicia às 17h)'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-blue-100/60 dark:bg-blue-900/40 text-xs">
            <span className="font-semibold text-blue-900 dark:text-blue-200">
              Crescimento entre os turnos:
            </span>
            <div className="flex items-center gap-1 font-bold font-tabular text-blue-700 dark:text-blue-300">
              {isPast17h ? (
                <>
                  {national.diff.flavioPercentChange >= 0 ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4" />
                  )}
                  <span>{national.diff.flavioPercentChange > 0 ? '+' : ''}{national.diff.flavioPercentChange.toFixed(2)} pp</span>
                  <span>({national.diff.flavioVotesChange > 0 ? '+' : ''}{formatNumberBR(national.diff.flavioVotesChange)} votos)</span>
                </>
              ) : (
                <span>Aguardando apuração às 17h00</span>
              )}
            </div>
          </div>
        </div>

        {/* Lula Card */}
        <div className="p-5 rounded-2xl border border-red-200 dark:border-red-950/80 bg-red-50/40 dark:bg-red-950/20 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-4 h-4 rounded-full bg-red-600" />
              <div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white">
                  Luiz Inácio Lula da Silva
                </h4>
                <span className="text-xs text-red-700 dark:text-red-400 font-semibold">
                  PT · Número 13
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-red-600 text-white shadow-xs">
              2º Colocado no 1º Turno
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-red-100 dark:border-red-900/40">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">1º Turno (04/10):</span>
              <div className="text-lg font-bold font-tabular text-slate-900 dark:text-white">
                {formatPercentBR(national.round1.lulaPercent)}
              </div>
              <span className="text-xs text-slate-500 font-tabular">
                {formatNumberBR(national.round1.lulaVotes)} votos
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-red-100 dark:border-red-900/40">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">2º Turno (25/10):</span>
              <div className={`text-lg font-bold font-tabular ${isPast17h ? 'text-red-600 dark:text-red-400' : 'text-slate-400'}`}>
                {isPast17h ? formatPercentBR(national.round2.lulaPercent) : '0,00%'}
              </div>
              <span className="text-xs text-slate-500 font-tabular">
                {isPast17h ? `${formatNumberBR(national.round2.lulaVotes)} votos` : 'Urnas em votação (inicia às 17h)'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-red-100/60 dark:bg-red-900/40 text-xs">
            <span className="font-semibold text-red-900 dark:text-red-200">
              Crescimento entre os turnos:
            </span>
            <div className="flex items-center gap-1 font-bold font-tabular text-red-700 dark:text-red-300">
              {isPast17h ? (
                <>
                  {national.diff.lulaPercentChange >= 0 ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4" />
                  )}
                  <span>{national.diff.lulaPercentChange > 0 ? '+' : ''}{national.diff.lulaPercentChange.toFixed(2)} pp</span>
                  <span>({national.diff.lulaVotesChange > 0 ? '+' : ''}{formatNumberBR(national.diff.lulaVotesChange)} votos)</span>
                </>
              ) : (
                <span>Aguardando apuração às 17h00</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Migration / Third-Party Votes in Round 1 */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs space-y-2">
        <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          <span>Votos de Terceiros no 1º Turno e Absorção no 2º Turno:</span>
        </div>
        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
          {isPast17h ? (
            <>
              No 1º Turno, <strong>Flávio Bolsonaro (PL)</strong> liderou com 47,03% (56.366.631 votos) e <strong>Lula (PT)</strong> ficou em 2º com 45,16% (54.125.389 votos), com os demais candidatos somando 7,81% — incluindo <strong>Ciro Gomes (PDT)</strong> com 4.889.982 votos (4,08%) e <strong>Simone Tebet (MDB)</strong> com 3.739.398 votos (3,12%). A dispersão destes votos no 2º Turno resultou na atração de cerca de 7,35 milhões de votos adicionais para Lula (+5,64 pp) e 3,17 milhões de votos adicionais para Flávio Bolsonaro (+2,17 pp), consolidando a virada de Lula na apuração final.
            </>
          ) : (
            <>
              No 1º Turno, <strong>Flávio Bolsonaro (PL)</strong> liderou com 47,03% (56.366.631 votos) e <strong>Lula (PT)</strong> ficou em 2º com 45,16% (54.125.389 votos), com os demais candidatos somando 7,81% — incluindo <strong>Ciro Gomes (PDT)</strong> com 4.889.982 votos (4,08%) e <strong>Simone Tebet (MDB)</strong> com 3.739.398 votos (3,12%). A transferência e absorção desses votos no 2º Turno será calculada e exibida em tempo real a partir das 17h00 de Brasília, conforme a apuração oficial do TSE.
            </>
          )}
        </p>
      </div>

      {/* State-by-State Comparison Table */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            Comparativo Estado por Estado (1º vs 2º Turno):
          </h4>
          <input
            type="text"
            placeholder="Filtrar por estado..."
            value={filterState}
            onChange={(e) => setFilterState(e.target.value)}
            className="px-3 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full sm:w-48"
          />
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Estado (UF)</th>
                <th className="py-2.5 px-3 font-semibold text-center">1º Turno (Lula x Flávio)</th>
                <th className="py-2.5 px-3 font-semibold text-center">Vencedor 1ºT</th>
                <th className="py-2.5 px-3 font-semibold text-center">2º Turno (Lula x Flávio)</th>
                <th className="py-2.5 px-3 font-semibold text-center">Vencedor 2ºT</th>
                <th className="py-2.5 px-3 font-semibold text-right">Evolução Lula</th>
                <th className="py-2.5 px-3 font-semibold text-right">Evolução Flávio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-tabular">
              {filteredStates.map((st) => (
                <tr key={st.territoryCode} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span className="w-6 font-mono text-center px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {st.territoryCode}
                    </span>
                    <span>{st.territoryName}</span>
                  </td>

                  <td className="py-2.5 px-3 text-center">
                    <span className="text-red-600 font-bold">{formatPercentBR(st.round1.lulaPercent)}</span>
                    <span className="text-slate-400 mx-1">x</span>
                    <span className="text-blue-600 font-bold">{formatPercentBR(st.round1.flavioPercent)}</span>
                  </td>

                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        st.diff.winnerRound1 === '13'
                          ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400'
                      }`}
                    >
                      {st.diff.winnerRound1 === '13' ? 'Lula' : 'Flávio'}
                    </span>
                  </td>

                  <td className="py-2.5 px-3 text-center">
                    {isPast17h ? (
                      <>
                        <span className="text-red-600 font-bold">{formatPercentBR(st.round2.lulaPercent)}</span>
                        <span className="text-slate-400 mx-1">x</span>
                        <span className="text-blue-600 font-bold">{formatPercentBR(st.round2.flavioPercent)}</span>
                      </>
                    ) : (
                      <span className="text-slate-400 italic font-medium">Aguardando 17h</span>
                    )}
                  </td>

                  <td className="py-2.5 px-3 text-center">
                    {isPast17h ? (
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          st.diff.winnerRound2 === '13'
                            ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400'
                        }`}
                      >
                        {st.diff.winnerRound2 === '13' ? 'Lula' : 'Flávio'}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic font-medium">Aguardando 17h</span>
                    )}
                  </td>

                  <td className="py-2.5 px-3 text-right font-bold text-red-600">
                    {isPast17h ? (
                      <>{st.diff.lulaPercentChange > 0 ? '+' : ''}{st.diff.lulaPercentChange.toFixed(2)} pp</>
                    ) : (
                      <span className="text-slate-400 font-normal">-</span>
                    )}
                  </td>

                  <td className="py-2.5 px-3 text-right font-bold text-blue-600">
                    {isPast17h ? (
                      <>{st.diff.flavioPercentChange > 0 ? '+' : ''}{st.diff.flavioPercentChange.toFixed(2)} pp</>
                    ) : (
                      <span className="text-slate-400 font-normal">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
