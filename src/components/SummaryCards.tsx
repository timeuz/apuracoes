import React from 'react';
import { TerritoryData } from '../types/election';
import { formatNumberBR, formatPercentBR } from '../data/electionData';
import { CheckCircle2, UserCheck, UserX, FileText, Vote, Radio, Clock } from 'lucide-react';

interface SummaryCardsProps {
  data: TerritoryData;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ data }) => {
  const remainingSections = Math.max(0, data.totalSections - data.countedSections);
  const isZeroProgress = data.percentSectionsCounted === 0 && data.countedSections === 0;

  return (
    <div className="space-y-4">
      {/* Primary Tally Progress Hero Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
              {isZeroProgress ? (
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold text-[11px] bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  <Clock className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '8s' }} /> VOTAÇÃO EM ANDAMENTO
                </span>
              ) : !data.isCompleted ? (
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold text-[11px] bg-red-100 dark:bg-red-950/70 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 animate-pulse">
                  <Radio className="w-3.5 h-3.5" /> AO VIVO
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold text-[11px] bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> TOTALIZADO
                </span>
              )}
              <span className="font-semibold text-slate-700 dark:text-slate-300">{data.name}</span>
              <span aria-hidden="true">·</span>
              <span>Total de Seções: {formatNumberBR(data.totalSections)}</span>
              <span aria-hidden="true">·</span>
              <span>Eleitorado Apto: {formatNumberBR(data.totalVoters)}</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-2">
              {isZeroProgress
                ? 'Votação em Andamento · Urnas Lacradas até as 17h00'
                : !data.isCompleted
                ? 'Apuração das Urnas em Tempo Real'
                : 'Apuração 100% Concluída'}
            </h2>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold tracking-tight font-tabular text-emerald-600 dark:text-emerald-400">
              {formatPercentBR(data.percentSectionsCounted)}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">das seções apuradas</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3.5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, data.percentSectionsCounted))}%` }}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 mt-2.5 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-tabular font-medium">
              {formatNumberBR(data.countedSections)} de {formatNumberBR(data.totalSections)} seções totalizadas
            </span>
            {isZeroProgress ? (
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                (Abertura oficial inicia às 17h00 pelo TSE)
              </span>
            ) : !data.isCompleted && remainingSections > 0 ? (
              <span className="text-slate-400 dark:text-slate-500 font-tabular">
                ({formatNumberBR(remainingSections)} seções restantes)
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[11px] font-tabular">
              <Clock className="w-3 h-3 text-slate-400" /> Atualizado: {data.lastUpdate}
            </span>

            {data.isMathematicallyDefined && (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Matematicamente Definido
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Grid of Key Voting Metrics: Válidos, Brancos, Nulos, Abstenções */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Votos Válidos */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <Vote className="w-4 h-4" />
              Votos Válidos
            </span>
            <span className="font-tabular font-bold text-slate-700 dark:text-slate-300">
              {formatPercentBR(data.percentValidVotes)}
            </span>
          </div>
          <div className="text-2xl font-bold font-tabular text-slate-900 dark:text-white">
            {isZeroProgress ? '0' : formatNumberBR(data.validVotes)}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {isZeroProgress ? 'Urnas lacradas até as 17h00' : 'Votos atribuídos aos candidatos apurados'}
          </p>
        </div>

        {/* Votos Brancos */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <FileText className="w-4 h-4" />
              Votos Brancos
            </span>
            <span className="font-tabular font-bold text-slate-700 dark:text-slate-300">
              {formatPercentBR(data.percentBlankVotes)}
            </span>
          </div>
          <div className="text-2xl font-bold font-tabular text-slate-900 dark:text-white">
            {isZeroProgress ? '0' : formatNumberBR(data.blankVotes)}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {isZeroProgress ? 'Urnas lacradas até as 17h00' : 'Opção voluntária de voto em branco'}
          </p>
        </div>

        {/* Votos Nulos */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <UserX className="w-4 h-4" />
              Votos Nulos
            </span>
            <span className="font-tabular font-bold text-slate-700 dark:text-slate-300">
              {formatPercentBR(data.percentNullVotes)}
            </span>
          </div>
          <div className="text-2xl font-bold font-tabular text-slate-900 dark:text-white">
            {isZeroProgress ? '0' : formatNumberBR(data.nullVotes)}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {isZeroProgress ? 'Urnas lacradas até as 17h00' : 'Dígitos inválidos ou voluntariamente nulos'}
          </p>
        </div>

        {/* Abstenções & Comparecimento */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4" />
              Abstenção
            </span>
            <span className="font-tabular font-bold text-slate-700 dark:text-slate-300">
              {formatPercentBR(data.percentAbstentions)}
            </span>
          </div>
          <div className="text-2xl font-bold font-tabular text-slate-900 dark:text-white">
            {isZeroProgress ? '0' : formatNumberBR(data.abstentions)}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {isZeroProgress ? 'Totalização inicia às 17h00' : `Comparecimento: ${formatPercentBR(data.percentAttendance)} (${formatNumberBR(data.attendance)})`}
          </p>
        </div>
      </div>
    </div>
  );
};
