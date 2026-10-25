import { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Header, AppNavTab } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { SummaryCards } from './components/SummaryCards';
import { CandidateLeaderboard } from './components/CandidateLeaderboard';
import { VotingCharts } from './components/VotingCharts';
import { ScopeDetailView } from './components/ScopeDetailView';
import { LiveSimulationBar } from './components/LiveSimulationBar';
import { AlertSettingsModal } from './components/AlertSettingsModal';
import { NotificationToastContainer } from './components/NotificationToastContainer';
import { BrazilMapD3 } from './components/BrazilMapD3';
import { WorldMapD3 } from './components/WorldMapD3';
import { MunicipalityView } from './components/MunicipalityView';
import { RoundComparisonView } from './components/RoundComparisonView';
import { RealtimeEvolutionChart } from './components/RealtimeEvolutionChart';
import { CountdownHero } from './components/CountdownHero';
import { useNotifications } from './hooks/useNotifications';
import { tseApi } from './services/tseApi';
import { TerritoryData, ScopeLevel, ElectionId } from './types/election';
import { BR_2026_2T_BASE } from './data/electionData';
import { Shield, Sparkles, Clock, ExternalLink, Radio, Globe } from 'lucide-react';

export default function App() {
  // Navigation & View State
  const [activeTab, setActiveTab] = useState<AppNavTab>('overview');

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('theme_mode');
      if (saved) return saved === 'dark';
    } catch {
      // fallback
    }
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Apply dark mode class to document
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme_mode', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme_mode', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => !prev);
  }, []);

  // DEFAULT TO TODAY'S 2026 2º TURNO ELECTION
  const [electionId, setElectionId] = useState<ElectionId>('2026_2t');
  const [scope, setScope] = useState<ScopeLevel>('nacional');
  const [territoryCode, setTerritoryCode] = useState<string>('BR');

  // Temporal State: Real TSE 17h Rule & Demo Toggle for Verification
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [tseClockPast17h, setTseClockPast17h] = useState<boolean>(() => tseApi.isPast17h());

  // Sync with authoritative server time on mount
  useEffect(() => {
    tseApi.syncWithServer().then(() => {
      setTseClockPast17h(tseApi.isPast17h());
    });
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTseClockPast17h(tseApi.isPast17h());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const isPast17h = tseClockPast17h || isDemoMode;

  // Election Data State
  const [data, setData] = useState<TerritoryData>(BR_2026_2T_BASE);
  const [baseData, setBaseData] = useState<TerritoryData>(BR_2026_2T_BASE);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // AUTO-REFRESH ACTIVATED BY DEFAULT (10 seconds for real-time live election)
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(10);

  // Live Simulation State (Active only inside simulator tab)
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationProgress, setSimulationProgress] = useState(54.20);
  const [simulationSpeed, setSimulationSpeed] = useState(1);

  // Push Alerts & Modal
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const {
    config: alertConfig,
    setConfig: setAlertConfig,
    activeNotifications,
    requestBrowserPermission,
    dismissNotification,
    checkTerritoryForAlerts,
    resetAlertTracking,
  } = useNotifications();

  // Ref to track victory confetti
  const confettiFiredRef = useRef(false);

  // Load election data whenever election/scope/territory changes
  const loadData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const result = await tseApi.getTerritoryData({
        electionId,
        scope,
        code: territoryCode,
        demoAfter17h: isDemoMode,
      });
      setBaseData(result);

      if (activeTab === 'simulator' && isSimulating) {
        const simulated = tseApi.simulateStep(result, simulationProgress);
        setData(simulated);
        if (electionId === '2026_2t') {
          checkTerritoryForAlerts(simulated);
        }
      } else {
        setData(result);
        setSimulationProgress(result.percentSectionsCounted);
        if (electionId === '2026_2t') {
          checkTerritoryForAlerts(result);
        }
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [electionId, scope, territoryCode, isDemoMode, isPast17h, isSimulating, activeTab, simulationProgress, checkTerritoryForAlerts]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reset alerts when switching election rounds (e.g. 1º Turno vs 2º Turno)
  useEffect(() => {
    resetAlertTracking();
  }, [electionId, resetAlertTracking]);

  // Handle simulation ticker
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setSimulationProgress((prev) => {
        const increment = 0.5 * simulationSpeed;
        const next = prev + increment;
        if (next >= 100) {
          setIsSimulating(false);
          const finalData = tseApi.simulateStep(baseData, 100);
          setData(finalData);
          checkTerritoryForAlerts(finalData);

          if (!confettiFiredRef.current) {
            confettiFiredRef.current = true;
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
            });
          }
          return 100;
        }

        const simulated = tseApi.simulateStep(baseData, next);
        setData(simulated);
        checkTerritoryForAlerts(simulated);

        // Check for victory celebration
        if (simulated.isMathematicallyDefined && !confettiFiredRef.current) {
          confettiFiredRef.current = true;
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.6 },
          });
        }

        return next;
      });
    }, 400);

    return () => clearInterval(interval);
  }, [isSimulating, simulationSpeed, baseData, checkTerritoryForAlerts]);

  // Handle auto-refresh interval (polling for live election updates)
  useEffect(() => {
    if (autoRefreshInterval <= 0 || isSimulating) return;

    const interval = setInterval(() => {
      loadData();
    }, autoRefreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefreshInterval, isSimulating, loadData]);

  // Reset simulation handler
  const handleResetSimulation = useCallback(() => {
    setIsSimulating(false);
    setSimulationProgress(0);
    confettiFiredRef.current = false;
    resetAlertTracking();
    const zeroData = tseApi.simulateStep(baseData, 0);
    setData(zeroData);
  }, [baseData, resetAlertTracking]);

  // Handle territory selection from map or list
  const handleSelectTerritory = useCallback((newScope: ScopeLevel, newCode: string) => {
    setScope(newScope);
    setTerritoryCode(newCode);
  }, []);

  const handleSelectBrazil = useCallback(() => {
    setActiveTab('brazil');
    setScope('nacional');
    setTerritoryCode('BR');
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Bar Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
        openAlertModal={() => setIsAlertModalOpen(true)}
        activeAlertCount={activeNotifications.length}
      />

      {/* Filter & Territory Bar */}
      <FilterBar
        electionId={electionId}
        setElectionId={setElectionId}
        scope={scope}
        setScope={setScope}
        territoryCode={territoryCode}
        setTerritoryCode={setTerritoryCode}
        isRefreshing={isRefreshing}
        onRefresh={loadData}
        lastUpdate={data.lastUpdate}
        autoRefreshInterval={autoRefreshInterval}
        setAutoRefreshInterval={setAutoRefreshInterval}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Live Election Countdown & Official Status Hero */}
        {electionId === '2026_2t' && (
          <CountdownHero
            isPast17h={isPast17h}
            isDemoMode={isDemoMode}
            onToggleDemoMode={(demo) => setIsDemoMode(demo)}
            lastUpdate={data.lastUpdate}
          />
        )}

        {/* Live Simulation Controls Bar */}
        {(activeTab === 'simulator' || isSimulating) && (
          <LiveSimulationBar
            isSimulating={isSimulating}
            setIsSimulating={setIsSimulating}
            simulationProgress={simulationProgress}
            setSimulationProgress={(pct) => {
              setSimulationProgress(pct);
              const simulated = tseApi.simulateStep(baseData, pct);
              setData(simulated);
              checkTerritoryForAlerts(simulated);
            }}
            onReset={handleResetSimulation}
            speed={simulationSpeed}
            setSpeed={setSimulationSpeed}
          />
        )}

        {/* TAB 1: VISÃO GERAL & MAPA-MÚNDI (PÁGINA INICIAL) */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* 1. Urnas apuradas & Estatísticas de Votos */}
            <SummaryCards data={data} />

            {/* 2. Placar dos Candidatos: Lula x Flávio Bolsonaro */}
            <CandidateLeaderboard candidates={data.candidates} territory={data} />

            {/* 3. MAPA-MÚNDI NA PÁGINA INICIAL (Exigência do Usuário) */}
            <WorldMapD3
              electionId={electionId}
              liveData={data}
              isPast17h={isPast17h}
              onSelectBrazil={handleSelectBrazil}
            />

            {/* 4. GRÁFICO DE LINHA EM TEMPO REAL: EVOLUÇÃO E QUEM ESTÁ NA FRENTE */}
            <RealtimeEvolutionChart data={data} />
          </div>
        )}

        {/* TAB 2: MAPA DO BRASIL & ESTADOS */}
        {activeTab === 'brazil' && (
          <div className="space-y-6">
            <BrazilMapD3
              electionId={electionId}
              isPast17h={isPast17h}
              selectedStateCode={scope === 'estadual' ? territoryCode : undefined}
              onSelectState={(uf) => handleSelectTerritory('estadual', uf)}
              onResetToNational={() => handleSelectTerritory('nacional', 'BR')}
              onBackToWorldMap={() => setActiveTab('overview')}
              onViewMunicipalities={(uf) => {
                if (uf) {
                  setScope('estadual');
                  setTerritoryCode(uf);
                }
                setActiveTab('municipal');
              }}
            />

            <ScopeDetailView
              onSelectTerritory={handleSelectTerritory}
              currentScope={scope}
              currentCode={territoryCode}
              isPast17h={isPast17h}
            />
          </div>
        )}

        {/* TAB 3: APURAÇÃO POR MUNICÍPIO */}
        {activeTab === 'municipal' && (
          <div className="space-y-6">
            <MunicipalityView
              initialState={scope === 'estadual' ? territoryCode : undefined}
              onSelectMunicipality={(code) => {
                setScope('municipal');
                setTerritoryCode(code);
              }}
              selectedCode={scope === 'municipal' ? territoryCode : undefined}
              onBackToStates={() => setActiveTab('brazil')}
              onBackToWorldMap={() => setActiveTab('overview')}
              isPast17h={isPast17h}
            />
          </div>
        )}

        {/* TAB 4: ABA DE COMPARAÇÃO DOS NÚMEROS ENTRE 1º E 2º TURNOS */}
        {activeTab === 'comparison' && (
          <div className="space-y-6">
            <RoundComparisonView isPast17h={isPast17h} />
          </div>
        )}

        {/* TAB 5: EVOLUÇÃO EM TEMPO REAL & ESTATÍSTICAS */}
        {activeTab === 'evolution' && (
          <div className="space-y-6">
            <RealtimeEvolutionChart data={data} />
            <VotingCharts data={data} />
          </div>
        )}

        {/* TAB 6: SIMULADOR DE APURAÇÃO */}
        {activeTab === 'simulator' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm mb-1">
                <Sparkles className="w-4 h-4" />
                Simulador Dinâmico de Apuração (2026)
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Neste modo, você pode reviver ou testar a apuração das eleições de 2026 voto a voto! Clique em <strong>&quot;Iniciar Apuração&quot;</strong> para ver os gráficos se moverem, a liderança de Lula e Flávio Bolsonaro se alternar em tempo real e os bips oficiais da urna eletrônica tocarem quando marcos forem atingidos.
              </p>
            </div>

            <SummaryCards data={data} />
            <CandidateLeaderboard candidates={data.candidates} territory={data} />
            <RealtimeEvolutionChart data={data} />
            <VotingCharts data={data} />
          </div>
        )}
      </main>

      {/* Floating Push Notification Toast Stack */}
      <NotificationToastContainer
        notifications={activeNotifications}
        onDismiss={dismissNotification}
      />

      {/* Alert Settings Modal */}
      <AlertSettingsModal
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
        config={alertConfig}
        setConfig={setAlertConfig}
        onRequestBrowserPermission={requestBrowserPermission}
      />

      {/* Editorial Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-6 text-xs text-slate-500 dark:text-slate-400 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>
              Fonte: Tribunal Superior Eleitoral (TSE) · Sistema de Divulgação de Resultados das Eleições 2026
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              Eleições Gerais 2026
            </span>
            <span>·</span>
            <a
              href="https://resultados.tse.jus.br"
              target="_blank"
              rel="noreferrer"
              className="hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1 transition-colors"
            >
              Portal Oficial do TSE <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
