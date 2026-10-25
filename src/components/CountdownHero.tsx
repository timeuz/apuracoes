import React, { useState, useEffect } from 'react';
import { Clock, ShieldAlert, Radio, AlertCircle, Play, RotateCcw, Volume2, CheckCircle2, Globe2 } from 'lucide-react';
import { soundService } from '../utils/audio';
import { tseApi } from '../services/tseApi';

interface CountdownHeroProps {
  isPast17h: boolean;
  onToggleDemoMode?: (enabled: boolean) => void;
  isDemoMode?: boolean;
  lastUpdate?: string;
}

function computeCountdown() {
  const targetTime = new Date('2026-10-25T17:00:00-03:00').getTime();
  const startTime = new Date('2026-10-25T08:00:00-03:00').getTime();
  const now = tseApi.getNow();

  const diff = Math.max(0, targetTime - now);
  const totalSeconds = Math.floor(diff / 1000);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  // Voting window progress (08:00 to 17:00 = 9h = 32400 seconds)
  const totalVotingSeconds = 9 * 3600;
  const elapsedVotingSeconds = Math.max(0, Math.min(totalVotingSeconds, Math.floor((now - startTime) / 1000)));
  const votingProgressPercent = parseFloat(((elapsedVotingSeconds / totalVotingSeconds) * 100).toFixed(1));

  const nowBR = new Date(now).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  return {
    hours,
    minutes,
    seconds,
    totalSeconds,
    votingProgressPercent,
    brasiliaTimeStr: nowBR,
  };
}

export const CountdownHero: React.FC<CountdownHeroProps> = ({
  isPast17h,
  onToggleDemoMode,
  isDemoMode = false,
  lastUpdate,
}) => {
  // Target: 25/10/2026 17:00:00 Horário de Brasília (UTC-3)
  const [timeLeft, setTimeLeft] = useState(computeCountdown);

  useEffect(() => {
    const updateCountdown = () => {
      const next = computeCountdown();
      setTimeLeft(next);
      if (next.totalSeconds === 0 && !isPast17h) {
        soundService.playUrnaConfirmation();
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [isPast17h]);

  const handleToggleDemo = () => {
    if (!onToggleDemoMode) return;
    const nextState = !isDemoMode;
    if (nextState) {
      soundService.playUrnaConfirmation();
    }
    onToggleDemoMode(nextState);
  };

  const padZero = (n: number) => n.toString().padStart(2, '0');

  // If after 17:00 or in demo mode: Show Live Apuração Banner
  if (isPast17h || isDemoMode) {
    return (
      <div className="bg-gradient-to-r from-red-950/80 via-slate-900 to-blue-950/80 text-white border border-red-500/40 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden transition-all">
        {/* Glow accent */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-xs bg-red-600 text-white animate-pulse shadow-md">
                <Radio className="w-4 h-4" /> APURAÇÃO AO VIVO (OFICIAL TSE)
              </span>
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-white/10 text-slate-200 border border-white/20">
                17h00 Ultrapassado · Urnas em Totalização
              </span>
              {isDemoMode && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500 text-slate-950 uppercase tracking-wide">
                  Modo Demonstração Pós-17h
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
              Eleições 2026 - 2º Turno: Totalização Oficial do Tribunal Superior Eleitoral
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Divulgação oficial iniciada às 17h00 (horário de Brasília). Dados atualizados automaticamente em tempo real conforme transmissão dos TREs para o TSE. Lula (#13, PT) x Flávio Bolsonaro (#22, PL).
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-2.5 shrink-0">
            <div className="text-right">
              <span className="text-[11px] text-slate-400 block">Horário de Brasília:</span>
              <span className="font-tabular font-bold text-emerald-400 text-sm">
                {lastUpdate || timeLeft.brasiliaTimeStr}
              </span>
            </div>

            {onToggleDemoMode && isDemoMode && (
              <button
                onClick={handleToggleDemo}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restaurar Contagem Real (Antes das 17h)
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Pre-17:00 State: Authoritative, Official Countdown Card
  return (
    <div className="bg-white dark:bg-slate-900 border-2 border-amber-300 dark:border-amber-500/40 rounded-2xl p-5 sm:p-7 shadow-lg space-y-6 transition-all relative overflow-hidden">
      {/* Decorative top accent */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-amber-500 to-blue-500" />

      {/* Header Info */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
              <Clock className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
              VOTAÇÃO EM ANDAMENTO (08h00 às 17h00)
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Horário Oficial de Brasília: <strong className="text-slate-900 dark:text-white font-tabular">{timeLeft.brasiliaTimeStr}</strong>
            </span>
          </div>

          <h2 className="text-lg sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Eleições Gerais 2026 · 2º Turno Presidencial
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
            Disputa: <strong>Luiz Inácio Lula da Silva</strong> (PT · #13) x <strong>Flávio Nantes Bolsonaro</strong> (PL · #22)
          </p>
        </div>

        {/* Demo Mode Button for testing/reviewing */}
        {onToggleDemoMode && (
          <div className="flex items-center gap-2 self-start lg:self-center">
            <button
              onClick={handleToggleDemo}
              title="Testar como a aplicação se comporta a partir das 17h00 com apuração ao vivo"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 transition-all cursor-pointer shadow-xs"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Testar Divulgação Pós-17h (Demonstração)</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Countdown Display */}
      <div className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1 text-center md:text-left">
          <div className="text-xs uppercase tracking-wider font-bold text-amber-700 dark:text-amber-400 flex items-center justify-center md:justify-start gap-1.5">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            Contagem Regressiva para Início da Apuração Oficial do TSE
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            A abertura dos votos e totalização centralizada das 492.310 seções inicia pontualmente às 17h00.
          </p>
        </div>

        {/* Big Digit Clocks */}
        <div className="flex items-center gap-2 sm:gap-3 text-slate-900 dark:text-white">
          {/* Hours */}
          <div className="flex flex-col items-center">
            <div className="w-16 sm:w-20 h-16 sm:h-20 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center font-extrabold text-2xl sm:text-3xl font-tabular shadow-sm">
              {padZero(timeLeft.hours)}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-1.5">
              Horas
            </span>
          </div>

          <span className="text-2xl font-bold text-slate-400 mb-6">:</span>

          {/* Minutes */}
          <div className="flex flex-col items-center">
            <div className="w-16 sm:w-20 h-16 sm:h-20 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center font-extrabold text-2xl sm:text-3xl font-tabular shadow-sm">
              {padZero(timeLeft.minutes)}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-1.5">
              Minutos
            </span>
          </div>

          <span className="text-2xl font-bold text-slate-400 mb-6">:</span>

          {/* Seconds */}
          <div className="flex flex-col items-center">
            <div className="w-16 sm:w-20 h-16 sm:h-20 rounded-2xl bg-white dark:bg-slate-900 border-2 border-red-300 dark:border-red-800 flex items-center justify-center font-extrabold text-2xl sm:text-3xl font-tabular text-red-600 dark:text-red-400 shadow-sm animate-pulse">
              {padZero(timeLeft.seconds)}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-1.5">
              Segundos
            </span>
          </div>
        </div>
      </div>

      {/* Progress of Voting Day (08h to 17h) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-600 dark:text-slate-400 font-semibold">
            Progresso do Período de Votação (08h00 às 17h00):
          </span>
          <span className="font-tabular font-bold text-emerald-600 dark:text-emerald-400">
            {timeLeft.votingProgressPercent}% decorrido
          </span>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-amber-500 rounded-full transition-all duration-1000"
            style={{ width: `${Math.min(100, Math.max(0, timeLeft.votingProgressPercent))}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>08h00 - Início da votação</span>
          <span>17h00 - Fim da votação e início da apuração</span>
        </div>
      </div>

      {/* Legal & Electoral Rules Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
            <ShieldAlert className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Resolução TSE nº 23.736 (Regra Oficial de Sigilo)</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
            Conforme determinação legal e de segurança do processo eleitoral, nenhuma seção ou urna eletrônica brasileira pode ter votos divulgados antes das 17h00 de Brasília. Todas as 492.310 urnas brasileiras permanecem lacradas com 0,00% de apuração pela manhã.
          </p>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
            <Globe2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Voto no Exterior (Boletins de Urna Afixados)</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
            Em virtude do fuso horário adiantado, países como Japão, Austrália, Nova Zelândia, Coreia do Sul, China e Cingapura já encerraram suas votações e afixaram os Boletins de Urna (BU) físicos nos consulados. Veja seus dados reais no Mapa-Múndi abaixo.
          </p>
        </div>
      </div>
    </div>
  );
};
