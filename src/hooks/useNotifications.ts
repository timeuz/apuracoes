import { useState, useEffect, useRef, useCallback } from 'react';
import { PushAlertConfig, PushNotificationEvent, TerritoryData } from '../types/election';
import { soundService } from '../utils/audio';

const STORAGE_KEY = 'tse_election_alerts_config_v1';

export const DEFAULT_CONFIG: PushAlertConfig = {
  browserNotificationsEnabled: false,
  soundEnabled: true,
  milestoneUrnasEnabled: true,
  overtakeAlertEnabled: true,
  mathVictoryEnabled: true,
  candidateAlerts: [
    { candidateNumber: '13', candidateName: 'Lula', thresholdPercent: 50.0, fired: false },
    { candidateNumber: '22', candidateName: 'Flávio Bolsonaro', thresholdPercent: 50.0, fired: false },
  ],
};

export interface AlertEvaluationContext {
  prevDataByTerritory: Record<string, TerritoryData>;
  firedMilestones: Set<string>;
}

export function evaluateTerritoryAlerts(
  currentData: TerritoryData,
  ctx: AlertEvaluationContext,
  config: PushAlertConfig,
  dispatchAlert: (event: Omit<PushNotificationEvent, 'id' | 'timestamp'>) => void,
  onCandidateAlertFired?: (alertIndex: number) => void
): void {
  if (!currentData || !currentData.code || !currentData.candidates || !Array.isArray(currentData.candidates)) return;

  // Ignore archived historical rounds (e.g. 1º Turno from 04/10/2026)
  if (currentData.isCompleted && currentData.lastUpdate?.includes('04/10/2026')) {
    return;
  }

  const territoryKey = `${currentData.scope || 'nacional'}:${currentData.code}`;
  const prev = ctx.prevDataByTerritory[territoryKey] || ctx.prevDataByTerritory[currentData.code];

  // If no previous data for this specific territory, store initial state and do not alert
  if (!prev) {
    ctx.prevDataByTerritory[territoryKey] = currentData;
    ctx.prevDataByTerritory[currentData.code] = currentData;
    return;
  }

  // Safety check: Never compare different territories or different election rounds
  if (prev.code !== currentData.code || prev.scope !== currentData.scope || prev.name !== currentData.name) {
    ctx.prevDataByTerritory[territoryKey] = currentData;
    ctx.prevDataByTerritory[currentData.code] = currentData;
    return;
  }

  // 1. Milestone urnas apuradas: 50%, 80%, 90%, 95%, 99%, 100%
  if (config.milestoneUrnasEnabled && currentData.percentSectionsCounted > 0) {
    const milestones = [50, 80, 90, 95, 99, 100];
    const currPct = currentData.percentSectionsCounted;
    for (const m of milestones) {
      const milestoneKey = `${territoryKey}:${m}`;
      if (currPct >= m && prev.percentSectionsCounted < m && !ctx.firedMilestones.has(milestoneKey)) {
        ctx.firedMilestones.add(milestoneKey);
        dispatchAlert({
          title: `Marco de Apuração: ${m}% das Urnas!`,
          message: `O TSE totalizou ${currPct.toFixed(1)}% das seções em ${currentData.name}.`,
          type: 'milestone',
        });
      }
    }
  }

  // 2. Leader change / Overtake (Virada na apuração)
  // - Nunca disparar alerta de virada se percentSectionsCounted === 0 ou se os candidatos têm 0 votos
  // - Nunca comparar territórios diferentes
  // - Nunca disparar virada em caso de empate
  if (
    config.overtakeAlertEnabled &&
    currentData.percentSectionsCounted > 0 &&
    prev.percentSectionsCounted > 0 &&
    currentData.candidates.length >= 2 &&
    prev.candidates.length >= 2
  ) {
    const sortedPrev = prev.candidates.slice().sort((a, b) => b.votes - a.votes);
    const sortedCurr = currentData.candidates.slice().sort((a, b) => b.votes - a.votes);

    const prevLeader = sortedPrev[0];
    const prevSecond = sortedPrev[1];
    const currLeader = sortedCurr[0];
    const currSecond = sortedCurr[1];

    if (
      prevLeader &&
      currLeader &&
      prevLeader.votes > 0 &&
      currLeader.votes > 0 &&
      currLeader.percent > 0 &&
      (!currSecond || currLeader.votes > currSecond.votes) &&
      (!prevSecond || prevLeader.votes > prevSecond.votes) &&
      prevLeader.number !== currLeader.number
    ) {
      dispatchAlert({
        title: `VIRADA NA APURAÇÃO!`,
        message: `${currLeader.ballotName || currLeader.name} ultrapassou ${prevLeader.ballotName || prevLeader.name} e assumiu a liderança com ${currLeader.percent.toFixed(2)}%!`,
        type: 'overtake',
        candidateNumber: currLeader.number,
      });
    }
  }

  // 3. Mathematical Victory (Matematicamente Eleito)
  if (
    config.mathVictoryEnabled &&
    currentData.percentSectionsCounted > 0 &&
    currentData.isMathematicallyDefined &&
    !prev.isMathematicallyDefined
  ) {
    const winner = currentData.candidates.find(c => c.isElected) || currentData.candidates.slice().sort((a, b) => b.votes - a.votes)[0];
    if (winner && winner.votes > 0) {
      dispatchAlert({
        title: `MATEMATICAMENTE ELEITO!`,
        message: `${winner.name} (${winner.party}) está matematicamente eleito com ${winner.percent.toFixed(2)}% dos votos!`,
        type: 'victory',
        candidateNumber: winner.number,
      });
    }
  }

  // 4. Candidate custom thresholds
  if (config.candidateAlerts.length > 0 && currentData.percentSectionsCounted > 0) {
    config.candidateAlerts.forEach((alert, idx) => {
      if (!alert.fired) {
        const cand = currentData.candidates.find(c => c.number === alert.candidateNumber);
        const prevCand = prev.candidates.find(c => c.number === alert.candidateNumber);
        const prevPercent = prevCand ? prevCand.percent : 0;
        if (cand && cand.votes > 0 && cand.percent >= alert.thresholdPercent && prevPercent < alert.thresholdPercent) {
          alert.fired = true;
          onCandidateAlertFired?.(idx);
          dispatchAlert({
            title: `Alerta: ${cand.ballotName || cand.name} atingiu ${alert.thresholdPercent}%`,
            message: `${cand.ballotName || cand.name} (${cand.party}) alcançou a marca de ${cand.percent.toFixed(2)}% dos votos válidos!`,
            type: 'threshold',
            candidateNumber: cand.number,
          });
        }
      }
    });
  }

  ctx.prevDataByTerritory[territoryKey] = currentData;
  ctx.prevDataByTerritory[currentData.code] = currentData;
}

export function useNotifications() {
  const [config, setConfig] = useState<PushAlertConfig>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Fallback
    }
    return DEFAULT_CONFIG;
  });

  const [activeNotifications, setActiveNotifications] = useState<PushNotificationEvent[]>([]);
  const prevDataByTerritoryRef = useRef<Record<string, TerritoryData>>({});
  const firedMilestonesRef = useRef<Set<string>>(new Set());

  // Save config changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {
      // ignore
    }
  }, [config]);

  // Request browser permission
  const requestBrowserPermission = useCallback(async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      setConfig(prev => ({ ...prev, browserNotificationsEnabled: granted }));
      return granted;
    }
    return false;
  }, []);

  // Dispatch a notification
  const dispatchAlert = useCallback((event: Omit<PushNotificationEvent, 'id' | 'timestamp'>) => {
    const fullEvent: PushNotificationEvent = {
      ...event,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString('pt-BR'),
    };

    setActiveNotifications(prev => [fullEvent, ...prev.slice(0, 4)]);

    // Sound alert
    if (config.soundEnabled) {
      if (event.type === 'victory') {
        soundService.playUrnaConfirmation();
      } else {
        soundService.playAlertChime();
      }
    }

    // Browser native Push Notification
    if (
      config.browserNotificationsEnabled &&
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      try {
        new Notification(`🇧🇷 ${event.title}`, {
          body: event.message,
          icon: '/favicon.ico',
        });
      } catch {
        // Notification error fallback
      }
    }
  }, [config.browserNotificationsEnabled, config.soundEnabled]);

  const dismissNotification = useCallback((id: string) => {
    setActiveNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Monitor territory updates for events
  const checkTerritoryForAlerts = useCallback((currentData: TerritoryData) => {
    evaluateTerritoryAlerts(
      currentData,
      {
        prevDataByTerritory: prevDataByTerritoryRef.current,
        firedMilestones: firedMilestonesRef.current,
      },
      config,
      dispatchAlert,
      (idx) => {
        setConfig(p => {
          const nextAlerts = [...p.candidateAlerts];
          nextAlerts[idx] = { ...nextAlerts[idx], fired: true };
          return { ...p, candidateAlerts: nextAlerts };
        });
      }
    );
  }, [config, dispatchAlert]);

  const resetAlertTracking = useCallback(() => {
    firedMilestonesRef.current.clear();
    prevDataByTerritoryRef.current = {};
    setConfig(prev => ({
      ...prev,
      candidateAlerts: prev.candidateAlerts.map(a => ({ ...a, fired: false })),
    }));
  }, []);

  return {
    config,
    setConfig,
    activeNotifications,
    requestBrowserPermission,
    dismissNotification,
    checkTerritoryForAlerts,
    resetAlertTracking,
    dispatchAlert,
  };
}
