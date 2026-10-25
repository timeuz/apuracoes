import React from 'react';
import { CandidateResult, TerritoryData } from '../types/election';
import { formatNumberBR, formatPercentBR } from '../data/electionData';
import { Trophy, CheckCircle, ArrowUpRight, Scale, Clock } from 'lucide-react';

interface CandidateLeaderboardProps {
  candidates: CandidateResult[];
  territory: TerritoryData;
}

export const CandidateLeaderboard: React.FC<CandidateLeaderboardProps> = ({
  candidates,
  territory,
}) => {
  const hasVotes = territory.percentSectionsCounted > 0 && candidates.some(c => c.votes > 0);
  const sorted = [...candidates].sort((a, b) => b.votes - a.votes);
  const leader = sorted[0];
  const runnerUp = sorted[1];

  // Difference calculation
  const voteDifference = leader && runnerUp ? leader.votes - runnerUp.votes : 0;
  const percentDifference = leader && runnerUp ? leader.percent - runnerUp.percent : 0;

  // Uncounted valid votes estimation
  const totalEstimatedValid = territory.validVotes > 0 && territory.percentSectionsCounted > 0
    ? Math.round((territory.validVotes / territory.percentSectionsCounted) * 100)
    : territory.validVotes;
  const remainingVotesEstimated = Math.max(0, totalEstimatedValid - territory.validVotes);

  return (
    <div className="space-y-4">
      {/* If voting is ongoing and 0 votes counted (pre-17h) */}
      {!hasVotes ? (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
              <Clock className="w-5 h-5 animate-spin" style={{ animationDuration: '8s' }} />
            </div>
            <div>
              <span className="font-bold text-amber-900 dark:text-amber-200 block text-sm">
                Urnas Lacradas · Votação em Andamento (08h00 às 17h00)
              </span>
              <span className="text-slate-600 dark:text-slate-400 mt-0.5 block">
                Conforme as regras do Tribunal Superior Eleitoral (TSE), a abertura dos votos e totalização oficial iniciam pontualmente às 17h00 de Brasília.
              </span>
            </div>
          </div>
          <div className="text-right sm:border-l sm:border-amber-200 dark:sm:border-amber-900 sm:pl-4 font-semibold text-amber-800 dark:text-amber-300 shrink-0">
            <div>Status:</div>
            <div className="font-bold text-sm">0,00% Apurado</div>
          </div>
        </div>
      ) : (
        /* Head to Head Lead Callout (when votes are being counted) */
        leader && runnerUp && (
          <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Vantagem do Líder ({leader.ballotName} vs {runnerUp.ballotName}):
                </span>
                <div className="text-sm font-bold font-tabular text-slate-900 dark:text-white mt-0.5">
                  +{formatNumberBR(voteDifference)} votos ({formatPercentBR(percentDifference)})
                </div>
              </div>
            </div>

            <div className="text-right sm:border-l sm:border-slate-200 dark:sm:border-slate-800 sm:pl-4 text-slate-500 dark:text-slate-400">
              <div>Votos restantes estimados nas urnas:</div>
              <div className="font-tabular font-semibold text-slate-700 dark:text-slate-300">
                {formatNumberBR(remainingVotesEstimated)}
              </div>
              {remainingVotesEstimated < voteDifference && territory.percentSectionsCounted > 80 && (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] block">
                  Vantagem matematicamente irreversível
                </span>
              )}
            </div>
          </div>
        )
      )}

      {/* Candidate Cards List */}
      <div className="space-y-3">
        {sorted.map((cand, index) => {
          const isFirst = hasVotes && index === 0;
          return (
            <div
              key={cand.id || cand.number}
              className={`bg-white dark:bg-slate-900 border rounded-xl p-4 sm:p-5 transition-all shadow-xs ${
                cand.isElected
                  ? 'border-emerald-500/60 dark:border-emerald-500/50 ring-1 ring-emerald-500/20'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Candidate Info */}
                <div className="flex items-center gap-3.5">
                  {/* Position number / Avatar */}
                  <div className="relative">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white text-lg shadow-xs"
                      style={{ backgroundColor: cand.color || '#475569' }}
                    >
                      {cand.number}
                    </div>
                    {isFirst && (
                      <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white p-0.5 rounded-full shadow-xs">
                        <Trophy className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                        {cand.ballotName}
                      </h3>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {cand.party}
                      </span>
                      {cand.isElected && (
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded flex items-center gap-1 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle className="w-3.5 h-3.5" />
                          ELEITO
                        </span>
                      )}
                      {cand.isInSecondRound && (
                        <span className="text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                          2º Turno
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                      {cand.name}
                      {cand.viceName && (
                        <>
                          <span aria-hidden="true" className="mx-1">·</span>
                          <span>Vice: {cand.viceName}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Votes & Percentage */}
                <div className="flex sm:flex-col items-baseline sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-800">
                  <div className="text-2xl sm:text-3xl font-extrabold font-tabular tracking-tight text-slate-900 dark:text-white">
                    {formatPercentBR(cand.percent)}
                  </div>
                  <div className="text-xs font-tabular text-slate-500 dark:text-slate-400 mt-0.5">
                    {hasVotes ? `${formatNumberBR(cand.votes)} votos` : '0 votos (Aguardando início às 17h)'}
                  </div>
                </div>
              </div>

              {/* Progress Bar with Candidate Official Color */}
              <div className="mt-3.5">
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.max(0, cand.percent))}%`,
                      backgroundColor: cand.color || '#0284C7',
                    }}
                  />
                </div>
              </div>

              {/* Coalition footnote */}
              {cand.coalition && (
                <div className="mt-2 text-[11px] text-slate-400 dark:text-slate-500 truncate">
                  Coligação: {cand.coalition}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
