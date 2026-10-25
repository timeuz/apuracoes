import React, { useState, useMemo } from 'react';
import { CountryElectionData } from '../types/election';
import { formatNumberBR, formatPercentBR } from '../data/electionData';
import {
  CheckCircle2,
  Clock,
  Search,
  Globe,
  Trophy,
  Filter,
  ArrowUpDown,
  ExternalLink,
  Users,
  Vote,
  X,
} from 'lucide-react';

export type StatusFilter = 'all' | 'completed' | 'in_progress' | 'waiting';
export type LeaderFilter = 'all' | '13' | '22';
export type SortOption = 'voters_desc' | 'percent_desc' | 'name_asc' | 'margin_desc';

interface VotingCountriesListProps {
  countries: Record<string, CountryElectionData>;
  isPast17h?: boolean;
  onSelectCountry: (country: CountryElectionData) => void;
  onSelectBrazil?: () => void;
}

export const VotingCountriesList: React.FC<VotingCountriesListProps> = ({
  countries,
  isPast17h = false,
  onSelectCountry,
  onSelectBrazil,
}) => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [leaderFilter, setLeaderFilter] = useState<LeaderFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('voters_desc');
  const [searchQuery, setSearchQuery] = useState('');

  // Extract all countries that have voting in Zona ZZ (exterior), excluding Brasil for foreign tally
  const allVotingCountries = useMemo(() => {
    return Object.values(countries || {}).filter((c) => c && c.hasVoting && c.id !== 'br');
  }, [countries]);

  // Aggregate statistics for finished/ongoing voting countries
  const summary = useMemo(() => {
    let completedCount = 0;
    let inProgressCount = 0;
    let waitingCount = 0;

    let completedLulaVotes = 0;
    let completedFlavioVotes = 0;
    let completedValidVotes = 0;

    let lulaWins = 0;
    let flavioWins = 0;

    let totalVoters = 0;

    allVotingCountries.forEach((c) => {
      totalVoters += c.totalVoters;

      if (c.isCompleted) {
        completedCount++;
        const lula = c.candidates.find((cand) => cand.number === '13');
        const flavio = c.candidates.find((cand) => cand.number === '22');

        const lulaVotes = lula?.votes || 0;
        const flavioVotes = flavio?.votes || 0;

        completedLulaVotes += lulaVotes;
        completedFlavioVotes += flavioVotes;
        completedValidVotes += (c.validVotes || (lulaVotes + flavioVotes));

        if (lulaVotes > flavioVotes) lulaWins++;
        else if (flavioVotes > lulaVotes) flavioWins++;
      } else if (c.hasStarted) {
        inProgressCount++;
      } else {
        waitingCount++;
      }
    });

    const lulaPercent = completedValidVotes > 0 ? (completedLulaVotes / completedValidVotes) * 100 : 0;
    const flavioPercent = completedValidVotes > 0 ? (completedFlavioVotes / completedValidVotes) * 100 : 0;

    return {
      totalCountries: allVotingCountries.length,
      completedCount,
      inProgressCount,
      waitingCount,
      totalVoters,
      completedValidVotes,
      completedLulaVotes,
      completedFlavioVotes,
      lulaPercent,
      flavioPercent,
      lulaWins,
      flavioWins,
    };
  }, [allVotingCountries]);

  // Filter and sort the country list
  const filteredCountries = useMemo(() => {
    return allVotingCountries
      .filter((country) => {
        // Status filter
        if (statusFilter === 'completed' && !country.isCompleted) return false;
        if (statusFilter === 'in_progress' && (!country.hasStarted || country.isCompleted)) return false;
        if (statusFilter === 'waiting' && country.hasStarted) return false;

        // Leader filter
        if (leaderFilter !== 'all') {
          if (!country.hasStarted && !country.isCompleted) return false;
          if (country.leaderNumber !== leaderFilter) return false;
        }

        // Search query (name or id)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = country.name.toLowerCase().includes(q);
          const matchCode = country.id.toLowerCase().includes(q);
          if (!matchName && !matchCode) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOption === 'voters_desc') {
          return b.totalVoters - a.totalVoters;
        }
        if (sortOption === 'percent_desc') {
          return b.percentSectionsCounted - a.percentSectionsCounted;
        }
        if (sortOption === 'name_asc') {
          return a.name.localeCompare(b.name, 'pt-BR');
        }
        if (sortOption === 'margin_desc') {
          const getMargin = (c: CountryElectionData) => {
            if (!c.candidates || c.candidates.length < 2) return 0;
            return Math.abs(c.candidates[0].percent - c.candidates[1].percent);
          };
          return getMargin(b) - getMargin(a);
        }
        return 0;
      });
  }, [allVotingCountries, statusFilter, leaderFilter, searchQuery, sortOption]);

  return (
    <section className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 space-y-6">
      {/* Title & Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Globe className="w-5 h-5" />
            </span>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Votação no Exterior (Zona ZZ) — Todos os Países com Seções Eleitorais
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {summary.totalCountries} Países
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Contagem em tempo real dos países onde a votação já finalizou, exibindo porcentagem e quantidade nominal de votos para Lula (PT) e Flávio Bolsonaro (PL).
          </p>
        </div>

        {onSelectBrazil && (
          <button
            onClick={onSelectBrazil}
            className="self-start md:self-auto flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
          >
            <span>🇧🇷</span>
            <span>Ver Apuração Nacional (Brasil)</span>
          </button>
        )}
      </div>

      {/* Aggregate Metrics Bar: Finished vs In Progress vs Waiting */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Países Finalizados */}
        <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-950/80 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Países Finalizados
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-200/70 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200">
              {summary.totalCountries > 0 ? ((summary.completedCount / summary.totalCountries) * 100).toFixed(0) : 0}%
            </span>
          </div>
          <div className="text-2xl font-black font-tabular text-emerald-700 dark:text-emerald-300">
            {summary.completedCount} <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400">de {summary.totalCountries}</span>
          </div>
          <div className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 truncate">
            {summary.completedCount > 0
              ? `${formatNumberBR(summary.completedValidVotes)} votos válidos apurados`
              : 'Aguardando encerramento de urnas'}
          </div>
        </div>

        {/* Card 2: Países em Andamento */}
        <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-950/80 bg-blue-50/50 dark:bg-blue-950/20 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Em Andamento
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-200/70 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200">
              {summary.inProgressCount} países
            </span>
          </div>
          <div className="text-2xl font-black font-tabular text-blue-700 dark:text-blue-300">
            {summary.inProgressCount}
          </div>
          <div className="text-[11px] text-blue-700/80 dark:text-blue-400/80 truncate">
            {summary.inProgressCount > 0 ? 'Totalização parcial em andamento' : 'Nenhum país em apuração parcial'}
          </div>
        </div>

        {/* Card 3: Países Aguardando */}
        <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-950/80 bg-amber-50/50 dark:bg-amber-950/20 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              Aguardando
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-200/70 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200">
              {summary.waitingCount} países
            </span>
          </div>
          <div className="text-2xl font-black font-tabular text-amber-700 dark:text-amber-300">
            {summary.waitingCount}
          </div>
          <div className="text-[11px] text-amber-700/80 dark:text-amber-400/80 truncate">
            {summary.waitingCount > 0 ? 'Urnas aguardando início às 17h' : 'Todas as votações iniciadas'}
          </div>
        </div>

        {/* Card 4: Total de Eleitores Aptos na Zona ZZ */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              Eleitorado no Exterior
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
              Zona ZZ
            </span>
          </div>
          <div className="text-2xl font-black font-tabular text-slate-900 dark:text-white">
            {formatNumberBR(summary.totalVoters)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            Brasileiros aptos a votar no exterior
          </div>
        </div>
      </div>

      {/* Consolidated Leaderboard for Completed Countries */}
      {summary.completedCount > 0 && (
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Placar Consolidado dos Países Finalizados ({summary.completedCount} países)
              </span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-tabular">
              Total de Votos: <span className="font-bold text-slate-900 dark:text-white">{formatNumberBR(summary.completedValidVotes)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Lula Consolidado */}
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-950/80 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-600 shrink-0" />
                  <span className="font-bold text-sm text-slate-900 dark:text-white">Lula (PT)</span>
                  {summary.lulaWins > summary.flavioWins && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300">
                      Lidera em Países
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-lg font-black font-tabular text-red-600 dark:text-red-400">
                    {formatPercentBR(summary.lulaPercent)}
                  </span>
                </div>
              </div>

              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-red-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${summary.lulaPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-0.5">
                <span>Votos Nominais: <strong className="font-tabular text-slate-900 dark:text-white">{formatNumberBR(summary.completedLulaVotes)}</strong></span>
                <span>Venceu em: <strong className="font-tabular text-slate-900 dark:text-white">{summary.lulaWins} países</strong></span>
              </div>
            </div>

            {/* Flávio Bolsonaro Consolidado */}
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-950/80 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-600 shrink-0" />
                  <span className="font-bold text-sm text-slate-900 dark:text-white">Flávio Bolsonaro (PL)</span>
                  {summary.flavioWins > summary.lulaWins && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300">
                      Lidera em Países
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-lg font-black font-tabular text-blue-600 dark:text-blue-400">
                    {formatPercentBR(summary.flavioPercent)}
                  </span>
                </div>
              </div>

              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${summary.flavioPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-0.5">
                <span>Votos Nominais: <strong className="font-tabular text-slate-900 dark:text-white">{formatNumberBR(summary.completedFlavioVotes)}</strong></span>
                <span>Venceu em: <strong className="font-tabular text-slate-900 dark:text-white">{summary.flavioWins} países</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controls Bar: Filters, Search, Sort */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
        {/* Quick Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-thin">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            Todos ({summary.totalCountries})
          </button>

          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'completed'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Apenas Finalizados ({summary.completedCount})</span>
          </button>

          <button
            onClick={() => setStatusFilter('in_progress')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'in_progress'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Em Andamento ({summary.inProgressCount})</span>
          </button>

          <button
            onClick={() => setStatusFilter('waiting')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'waiting'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60'
            }`}
          >
            <span>Aguardando ({summary.waitingCount})</span>
          </button>
        </div>

        {/* Search & Sort Controls */}
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar país ou código..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="relative shrink-0">
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="voters_desc">Mais Eleitores</option>
              <option value="percent_desc">Mais Apurado (%)</option>
              <option value="name_asc">Ordem Alfabética</option>
              <option value="margin_desc">Maior Margem</option>
            </select>
          </div>
        </div>
      </div>

      {/* Secondary Controls Bar: Candidate Leader Filter */}
      <div className="flex items-center gap-2 px-1 text-xs">
        <span className="font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 text-[11px]">
          <Filter className="w-3 h-3 text-slate-400" />
          Liderança:
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setLeaderFilter('all')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
              leaderFilter === 'all'
                ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 font-semibold shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setLeaderFilter('13')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              leaderFilter === '13'
                ? 'bg-red-600 text-white font-semibold shadow-2xs'
                : 'text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900/60'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-500" />
            Lula (13)
          </button>
          <button
            onClick={() => setLeaderFilter('22')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              leaderFilter === '22'
                ? 'bg-blue-600 text-white font-semibold shadow-2xs'
                : 'text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            Flávio Bolsonaro (22)
          </button>
        </div>
      </div>

      {/* Active Results Counter */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
        <span>
          Exibindo <strong>{filteredCountries.length}</strong> de <strong>{summary.totalCountries}</strong> países com votação no exterior
          {statusFilter !== 'all' && ` (${statusFilter === 'completed' ? 'Apenas Finalizados' : statusFilter === 'in_progress' ? 'Em Andamento' : 'Aguardando'})`}
          {leaderFilter !== 'all' && ` • Liderança ${leaderFilter === '13' ? 'Lula' : 'Flávio Bolsonaro'}`}
        </span>
        {searchQuery && (
          <span className="text-blue-600 dark:text-blue-400">
            Filtro ativo: &quot;{searchQuery}&quot;
          </span>
        )}
      </div>

      {/* Countries Cards List */}
      {filteredCountries.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400">
          <Globe className="w-8 h-8 mx-auto mb-2 text-slate-400 opacity-60" />
          <p className="font-semibold text-sm">Nenhum país encontrado para o filtro selecionado.</p>
          <p className="text-xs mt-1">Tente ajustar a busca ou os filtros de status.</p>
          <button
            onClick={() => {
              setStatusFilter('all');
              setLeaderFilter('all');
              setSearchQuery('');
            }}
            className="mt-3 px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 rounded-lg hover:underline cursor-pointer"
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredCountries.map((country) => {
            const lula = country.candidates.find((c) => c.number === '13');
            const flavio = country.candidates.find((c) => c.number === '22');

            const hasVotes = country.hasStarted && country.validVotes > 0;
            const isCompleted = country.isCompleted;

            const lulaVotes = lula?.votes || 0;
            const flavioVotes = flavio?.votes || 0;
            const lulaPercent = lula?.percent || 0;
            const flavioPercent = flavio?.percent || 0;

            const lulaLeading = lulaPercent > flavioPercent;
            const flavioLeading = flavioPercent > lulaPercent;

            return (
              <div
                key={country.id}
                onClick={() => onSelectCountry(country)}
                className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 transition-all duration-200 hover:shadow-md cursor-pointer flex flex-col justify-between space-y-3 ${
                  isCompleted
                    ? lulaLeading
                      ? 'border-red-200 dark:border-red-950/80 hover:border-red-400 dark:hover:border-red-800'
                      : flavioLeading
                      ? 'border-blue-200 dark:border-blue-950/80 hover:border-blue-400 dark:hover:border-blue-800'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600'
                    : country.hasStarted
                    ? lulaLeading
                      ? 'border-red-200/60 dark:border-red-950/50 hover:border-red-300'
                      : flavioLeading
                      ? 'border-blue-200/60 dark:border-blue-950/50 hover:border-blue-300'
                      : 'border-slate-200 dark:border-slate-800'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600'
                }`}
              >
                {/* Header: Flag, Name, Status Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl shrink-0">{country.flag}</span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                          {country.name}
                        </h4>
                        <span className="text-[10px] font-mono text-slate-400 uppercase">
                          ({country.id})
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {formatNumberBR(country.totalVoters)} eleitores aptos
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {isCompleted ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                        <CheckCircle2 className="w-3 h-3" />
                        {country.buAffixed ? 'BU Afixado' : 'Finalizado'}
                      </span>
                    ) : country.hasStarted ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800 animate-pulse">
                        <Clock className="w-3 h-3" />
                        {country.percentSectionsCounted.toFixed(0)}% Apurado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                        Aguardando (17h)
                      </span>
                    )}
                  </div>
                </div>

                {/* Candidate Breakdown */}
                {hasVotes ? (
                  <div className="space-y-2.5 pt-1">
                    {/* Lula row */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-600 shrink-0" />
                          <span className={`font-semibold ${lulaLeading ? 'text-red-700 dark:text-red-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                            Lula (PT)
                          </span>
                          {isCompleted && lulaLeading && (
                            <span className="text-[9px] font-bold px-1 rounded bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400">
                              Venceu
                            </span>
                          )}
                          {!isCompleted && country.hasStarted && lulaLeading && (
                            <span className="text-[9px] font-bold px-1 rounded bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60">
                              Lidera
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 font-tabular">
                          <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                            {formatNumberBR(lulaVotes)} votos
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {formatPercentBR(lulaPercent)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Flávio Bolsonaro row */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
                          <span className={`font-semibold ${flavioLeading ? 'text-blue-700 dark:text-blue-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                            Flávio Bolsonaro (PL)
                          </span>
                          {isCompleted && flavioLeading && (
                            <span className="text-[9px] font-bold px-1 rounded bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                              Venceu
                            </span>
                          )}
                          {!isCompleted && country.hasStarted && flavioLeading && (
                            <span className="text-[9px] font-bold px-1 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60">
                              Lidera
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 font-tabular">
                          <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                            {formatNumberBR(flavioVotes)} votos
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {formatPercentBR(flavioPercent)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Proportional dual progress bar */}
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden flex">
                      <div
                        className="bg-red-600 h-full transition-all duration-300"
                        style={{ width: `${lulaPercent}%` }}
                        title={`Lula: ${formatPercentBR(lulaPercent)}`}
                      />
                      <div
                        className="bg-blue-600 h-full transition-all duration-300"
                        style={{ width: `${flavioPercent}%` }}
                        title={`Flávio Bolsonaro: ${formatPercentBR(flavioPercent)}`}
                      />
                    </div>
                  </div>
                ) : (
                  /* Waiting state */
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-500 dark:text-slate-400 space-y-1">
                    <div className="font-medium text-slate-700 dark:text-slate-300">
                      0 votos apurados
                    </div>
                    <p className="text-[11px] leading-snug">
                      Urnas lacradas. Totalização oficial pelo TSE liberada às 17h00 (Horário de Brasília).
                    </p>
                  </div>
                )}

                {/* Footer metrics & action link */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="font-tabular">
                    Seções: <strong>{country.countedSections} / {country.totalSections}</strong> ({country.percentSectionsCounted.toFixed(0)}%)
                  </span>
                  <span className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 group-hover:underline">
                    Ver detalhes <ExternalLink className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
