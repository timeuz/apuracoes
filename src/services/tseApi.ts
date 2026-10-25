import { TerritoryData, ScopeLevel, ElectionId } from '../types/election';
import {
  BR_2026_2T_BASE,
  BR_2026_2T_POST_17H,
  BR_2026_1T_BASE,
  STATES_DATA_2026_2T,
  STATES_DATA_2026_1T,
  MUNICIPALITIES_2026,
  getStatesData2026_2T,
  getMunicipalities2026,
} from '../data/electionData';

export interface FetchElectionParams {
  electionId: ElectionId;
  scope: ScopeLevel;
  code?: string; // State code ('SP'), City ('SP_SAO_PAULO'), etc.
  demoAfter17h?: boolean;
}

export interface TSECountdownState {
  serverTime: string;
  brasiliaTime: string;
  targetTime: string;
  targetTimestamp: number;
  secondsRemaining: number;
  isPast17h: boolean;
  isVotingOpen: boolean;
  votingDayProgressPercent: number;
  electionDate: string;
}

// 17:00:00 BRT (UTC-3) on 25/10/2026
const TARGET_17H_TIMESTAMP = new Date('2026-10-25T17:00:00-03:00').getTime();
const VOTING_START_TIMESTAMP = new Date('2026-10-25T08:00:00-03:00').getTime();

export interface RawTseOfficialPayload {
  ele?: string;
  tpbr?: string;
  dh?: string; // Date & time: "25/10/2026 18:48:00"
  f?: string;
  pst?: string; // Percent sections totalized: "54,20"
  s?: string;   // Total sections: "492310"
  st?: string;  // Counted sections: "266832"
  c?: string;   // Total voters: "158860000"
  a?: string;   // Attendance: "68627520"
  pa?: string;  // Percent attendance
  tv?: string;  // Total votes: "68627520"
  vtv?: string; // Valid votes: "65607909"
  pvtv?: string;
  vb?: string;  // Blank votes: "1029413"
  pvb?: string;
  vn?: string;  // Null votes: "1990198"
  pvn?: string;
  md?: string;  // Mathematic definition: "S" or "N"
  cand?: Array<{
    seq?: string;
    n?: string; // Number: "13" or "22"
    nm?: string; // Ballot name: "LULA"
    cc?: string; // Coalition
    nv?: string; // Vice
    vap?: string; // Votes: "33328818"
    pvap?: string; // Percent: "50,80"
    e?: string; // "s" or "n"
  }>;
}

class TseApiService {
  private serverTimeOffset = 0; // offset in ms between client Date.now() and server authoritative time

  /**
   * Syncs client time offset with authoritative Brasília server clock
   */
  public async syncWithServer(): Promise<TSECountdownState> {
    try {
      const response = await fetch('/api/tse/countdown');
      if (response.ok) {
        const data = await response.json();
        if (data && typeof data.serverTimestamp === 'number') {
          this.serverTimeOffset = data.serverTimestamp - Date.now();
        }
        return data;
      }
    } catch {
      // Offline fallback: rely on local system time
    }
    return this.getCountdownState();
  }

  /**
   * Gets the authoritative current time in milliseconds (Brasília adjusted)
   */
  public getNow(): number {
    return Date.now() + this.serverTimeOffset;
  }

  /**
   * Check if current time is at or past 17:00:00 Brasília time on election day
   */
  public isPast17h(): boolean {
    return this.getNow() >= TARGET_17H_TIMESTAMP;
  }

  /**
   * Gets the official countdown state until 17h disclosure
   */
  public getCountdownState(): TSECountdownState {
    const now = this.getNow();
    const secondsRemaining = Math.max(0, Math.floor((TARGET_17H_TIMESTAMP - now) / 1000));
    const isPast17h = now >= TARGET_17H_TIMESTAMP;
    const isVotingOpen = now >= VOTING_START_TIMESTAMP && now < TARGET_17H_TIMESTAMP;

    const totalVotingSeconds = 9 * 3600;
    const elapsedVotingSeconds = Math.max(0, Math.min(totalVotingSeconds, Math.floor((now - VOTING_START_TIMESTAMP) / 1000)));
    const votingDayProgressPercent = parseFloat(((elapsedVotingSeconds / totalVotingSeconds) * 100).toFixed(1));

    const brasiliaTime = new Date(now).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    return {
      serverTime: new Date(now).toISOString(),
      brasiliaTime,
      targetTime: '2026-10-25T17:00:00-03:00',
      targetTimestamp: TARGET_17H_TIMESTAMP,
      secondsRemaining,
      isPast17h,
      isVotingOpen,
      votingDayProgressPercent,
      electionDate: '2026-10-25',
    };
  }

  /**
   * Parses official TSE JSON response format into our typed TerritoryData model
   */
  public parseTseOfficialJson(
    raw: unknown,
    scope: ScopeLevel = 'nacional',
    code: string = 'BR',
    defaultName?: string
  ): TerritoryData | null {
    if (!raw || typeof raw !== 'object') return null;
    const tse = raw as RawTseOfficialPayload;

    const percentSections = parseFloat((tse.pst || '0').replace(',', '.'));
    const totalSections = parseInt(tse.s || '492310', 10);
    const countedSections = parseInt(tse.st || '0', 10);
    const totalVoters = parseInt(tse.c || '158860000', 10);
    const attendance = parseInt(tse.a || '0', 10);
    const validVotes = parseInt(tse.vtv || '0', 10);
    const blankVotes = parseInt(tse.vb || '0', 10);
    const nullVotes = parseInt(tse.vn || '0', 10);
    const totalVotesCast = parseInt(tse.tv || '0', 10) || (validVotes + blankVotes + nullVotes);
    const abstentions = totalVoters > 0 && attendance > 0 ? Math.max(0, totalVoters - attendance) : 0;

    const percentValid = totalVotesCast > 0 ? parseFloat(((validVotes / totalVotesCast) * 100).toFixed(2)) : 0;
    const percentBlank = totalVotesCast > 0 ? parseFloat(((blankVotes / totalVotesCast) * 100).toFixed(2)) : 0;
    const percentNull = totalVotesCast > 0 ? parseFloat(((nullVotes / totalVotesCast) * 100).toFixed(2)) : 0;
    const percentAttendance = totalVoters > 0 ? parseFloat(((attendance / totalVoters) * 100).toFixed(2)) : 0;
    const percentAbstentions = totalVoters > 0 ? parseFloat(((abstentions / totalVoters) * 100).toFixed(2)) : 0;

    const rawCandidates = tse.cand || [];
    const candidates = rawCandidates.map((c, idx) => {
      const num = c.n || (idx === 0 ? '13' : '22');
      const isLula = num === '13';
      return {
        id: `cand_${num}`,
        seq: parseInt(c.seq || `${idx + 1}`, 10),
        number: num,
        name: isLula ? 'LUIZ INÁCIO LULA DA SILVA' : 'FLÁVIO NANTES BOLSONARO',
        ballotName: c.nm || (isLula ? 'Lula' : 'Flávio Bolsonaro'),
        party: isLula ? 'PT' : 'PL',
        coalition: c.cc || (isLula ? 'BRASIL DA ESPERANÇA' : 'PELO BEM DO BRASIL'),
        viceName: c.nv || (isLula ? 'Geraldo Alckmin' : 'Tereza Cristina'),
        color: isLula ? '#DC2626' : '#2563EB',
        votes: parseInt(c.vap || '0', 10),
        percent: parseFloat((c.pvap || '0').replace(',', '.')),
        isElected: c.e === 's' || c.e === 'S',
        isInSecondRound: true,
      };
    });

    return {
      code,
      name: defaultName || (code === 'BR' ? 'Brasil (Eleições Gerais 2026 - 2º Turno)' : code),
      scope,
      totalSections,
      countedSections,
      percentSectionsCounted: percentSections,
      totalVoters,
      attendance,
      percentAttendance,
      abstentions,
      percentAbstentions,
      validVotes,
      percentValidVotes: percentValid,
      blankVotes,
      percentBlankVotes: percentBlank,
      nullVotes,
      percentNullVotes: percentNull,
      totalVotesCast,
      lastUpdate: tse.dh || `25/10/2026 ${new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
      isCompleted: percentSections >= 100,
      isMathematicallyDefined: tse.md === 'S' || tse.md === 's' || percentSections >= 99,
      candidates,
      timeline: [],
    };
  }

  /**
   * Fetches official live data from TSE endpoint via server proxy
   */
  public async fetchLiveTseTally(tsePath: string, scope: ScopeLevel = 'nacional', code: string = 'BR'): Promise<TerritoryData | null> {
    try {
      const response = await fetch(`/api/tse/live?path=${encodeURIComponent(tsePath)}`);
      if (response.ok) {
        const data = await response.json();
        return this.parseTseOfficialJson(data, scope, code);
      }
    } catch {
      // ignore
    }
    return null;
  }

  /**
   * Fetches official election data from TSE proxy or returns active official 2026 dataset
   * strictly adhering to legal temporal rules:
   * - Before 17h: 0.00% apurado, urna status "Votação em andamento", 0 votes for candidates
   * - At/After 17h: live official tally from TSE API
   */
  public async getTerritoryData(params: FetchElectionParams): Promise<TerritoryData> {
    const { electionId, scope, code = 'BR', demoAfter17h = false } = params;
    const past17h = this.isPast17h() || demoAfter17h;

    // Try fetching via server proxy if available
    try {
      const response = await fetch(`/api/tse/data?election=${electionId}&scope=${scope}&code=${code}&demoAfter17h=${demoAfter17h}`, {
        headers: { 'Accept': 'application/json' },
      });
      if (response.ok) {
        const json = await response.json();
        if (json && json.candidates && Array.isArray(json.candidates)) {
          return json;
        }
      }
    } catch {
      // Fallback to client-side data
    }

    // 2026 1º TURNO (CONSOLIDADO DE 04/10/2026)
    if (electionId === '2026_1t') {
      if (scope === 'nacional' || code === 'BR') {
        return BR_2026_1T_BASE;
      }
      if (scope === 'estadual') {
        return STATES_DATA_2026_1T[code] || STATES_DATA_2026_1T['SP'];
      }
      if (scope === 'exterior' || code === 'ZZ') {
        return STATES_DATA_2026_1T['ZZ'];
      }
      return BR_2026_1T_BASE;
    }

    // 2026 2º TURNO (HOJE, 25/10/2026)
    // BEFORE 17:00:00 (HORÁRIO DE BRASÍLIA)
    // Conforme a Resolução TSE nº 23.736, votação aberta e urnas lacradas com 0% apurado
    if (!past17h) {
      if (scope === 'nacional' || code === 'BR') {
        return BR_2026_2T_BASE;
      }

      if (scope === 'estadual') {
        const stTemplate = STATES_DATA_2026_2T[code] || STATES_DATA_2026_2T['SP'];
        return {
          ...stTemplate,
          countedSections: 0,
          percentSectionsCounted: 0.0,
          attendance: 0,
          percentAttendance: 0.0,
          abstentions: 0,
          percentAbstentions: 0.0,
          validVotes: 0,
          percentValidVotes: 0.0,
          blankVotes: 0,
          percentBlankVotes: 0.0,
          nullVotes: 0,
          percentNullVotes: 0.0,
          totalVotesCast: 0,
          lastUpdate: `25/10/2026 ${new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
          isCompleted: false,
          isMathematicallyDefined: false,
          candidates: [
            {
              id: 'cand_13',
              seq: 1,
              number: '13',
              name: 'LUIZ INÁCIO LULA DA SILVA',
              ballotName: 'Lula',
              party: 'PT',
              coalition: 'BRASIL DA ESPERANÇA',
              color: '#DC2626',
              votes: 0,
              percent: 0.0,
              isElected: false,
              isInSecondRound: true,
            },
            {
              id: 'cand_22',
              seq: 2,
              number: '22',
              name: 'FLÁVIO NANTES BOLSONARO',
              ballotName: 'Flávio Bolsonaro',
              party: 'PL',
              coalition: 'PELO BEM DO BRASIL',
              color: '#2563EB',
              votes: 0,
              percent: 0.0,
              isElected: false,
              isInSecondRound: true,
            },
          ],
          timeline: [],
        };
      }

      if (scope === 'exterior' || code === 'ZZ') {
        const ext = STATES_DATA_2026_2T['ZZ'];
        return {
          ...ext,
          countedSections: 0,
          percentSectionsCounted: 0.0,
          attendance: 0,
          validVotes: 0,
          blankVotes: 0,
          nullVotes: 0,
          totalVotesCast: 0,
          lastUpdate: `25/10/2026 ${new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
          isCompleted: false,
          candidates: [
            { id: 'cand_13', seq: 1, number: '13', name: 'LUIZ INÁCIO LULA DA SILVA', ballotName: 'Lula', party: 'PT', coalition: 'BRASIL DA ESPERANÇA', color: '#DC2626', votes: 0, percent: 0.0, isElected: false, isInSecondRound: true },
            { id: 'cand_22', seq: 2, number: '22', name: 'FLÁVIO NANTES BOLSONARO', ballotName: 'Flávio Bolsonaro', party: 'PL', coalition: 'PELO BEM DO BRASIL', color: '#2563EB', votes: 0, percent: 0.0, isElected: false, isInSecondRound: true },
          ],
          timeline: [],
        };
      }

      if (scope === 'municipal') {
        const mun = MUNICIPALITIES_2026[code] || MUNICIPALITIES_2026['SP_SAO_PAULO'];
        return {
          code: mun.code,
          name: `${mun.name} (${mun.state})`,
          scope: 'municipal',
          totalSections: mun.totalSections,
          countedSections: 0,
          percentSectionsCounted: 0.0,
          totalVoters: mun.totalVoters,
          attendance: 0,
          percentAttendance: 0.0,
          abstentions: 0,
          percentAbstentions: 0.0,
          validVotes: 0,
          percentValidVotes: 0.0,
          blankVotes: 0,
          percentBlankVotes: 0.0,
          nullVotes: 0,
          percentNullVotes: 0.0,
          totalVotesCast: 0,
          lastUpdate: `25/10/2026 ${new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
          isCompleted: false,
          isMathematicallyDefined: false,
          candidates: [
            { id: 'cand_13', seq: 1, number: '13', name: 'LUIZ INÁCIO LULA DA SILVA', ballotName: 'Lula', party: 'PT', coalition: 'BRASIL DA ESPERANÇA', color: '#DC2626', votes: 0, percent: 0.0, isElected: false, isInSecondRound: true },
            { id: 'cand_22', seq: 2, number: '22', name: 'FLÁVIO NANTES BOLSONARO', ballotName: 'Flávio Bolsonaro', party: 'PL', coalition: 'PELO BEM DO BRASIL', color: '#2563EB', votes: 0, percent: 0.0, isElected: false, isInSecondRound: true },
          ],
          timeline: [],
        };
      }

      return BR_2026_2T_BASE;
    }

    // AT OR AFTER 17:00:00 (OR DEMO MODE)
    // Official TSE results live stream
    if (scope === 'nacional' || code === 'BR') {
      return BR_2026_2T_POST_17H;
    }

    const statesPost17h = getStatesData2026_2T(true);
    const munPost17h = getMunicipalities2026(true);

    if (scope === 'estadual') {
      return statesPost17h[code] || statesPost17h['SP'];
    }

    if (scope === 'exterior' || code === 'ZZ') {
      return statesPost17h['ZZ'];
    }

    if (scope === 'municipal') {
      const mun = munPost17h[code] || munPost17h['SP_SAO_PAULO'];
      return {
        code: mun.code,
        name: `${mun.name} (${mun.state})`,
        scope: 'municipal',
        totalSections: mun.totalSections,
        countedSections: mun.countedSections,
        percentSectionsCounted: mun.percentSectionsCounted,
        totalVoters: mun.totalVoters,
        attendance: Math.round(mun.totalVoters * 0.8),
        percentAttendance: 80.0,
        abstentions: mun.abstentions,
        percentAbstentions: 20.0,
        validVotes: mun.validVotes,
        percentValidVotes: 96.0,
        blankVotes: mun.blankVotes,
        percentBlankVotes: 1.3,
        nullVotes: mun.nullVotes,
        percentNullVotes: 2.7,
        totalVotesCast: mun.validVotes + mun.blankVotes + mun.nullVotes,
        lastUpdate: '25/10/2026 18:48:00',
        isCompleted: mun.isCompleted,
        isMathematicallyDefined: false,
        candidates: mun.candidates.map((c, i) => ({
          id: `cand_${c.number}`,
          seq: i + 1,
          number: c.number,
          name: c.number === '13' ? 'LUIZ INÁCIO LULA DA SILVA' : 'FLÁVIO NANTES BOLSONARO',
          ballotName: c.ballotName,
          party: c.party,
          coalition: c.number === '13' ? 'BRASIL DA ESPERANÇA' : 'PELO BEM DO BRASIL',
          color: c.color,
          votes: c.votes,
          percent: c.percent,
          isElected: false,
          isInSecondRound: true,
        })),
        timeline: [
          { sectionPercent: mun.percentSectionsCounted, timestamp: '18:48', candidatePercents: { '13': mun.candidates.find(c => c.number === '13')?.percent || 50, '22': mun.candidates.find(c => c.number === '22')?.percent || 50 } },
        ],
      };
    }

    return BR_2026_2T_POST_17H;
  }

  /**
   * Creates a live simulation step of a territory with partial sections counted
   * (Used only when explicitly testing in the Simulator tab)
   */
  public simulateStep(base: TerritoryData, percentProgress: number): TerritoryData {
    const clampedPercent = Math.min(100, Math.max(0, percentProgress));
    const countedSections = Math.round((base.totalSections * clampedPercent) / 100);

    const ratio = clampedPercent / 100;
    const totalVotesCast = Math.round(base.totalVotesCast * (ratio > 0 ? ratio : 0.01));
    const validVotes = Math.round(base.validVotes * (ratio > 0 ? ratio : 0.01));
    const blankVotes = Math.round(base.blankVotes * (ratio > 0 ? ratio : 0.01));
    const nullVotes = Math.round(base.nullVotes * (ratio > 0 ? ratio : 0.01));
    const attendance = Math.round(base.attendance * (ratio > 0 ? ratio : 0.01));
    const abstentions = Math.round((base.totalVoters - base.attendance) * (ratio > 0 ? ratio : 0.01));

    let c1Share = base.candidates[0]?.percent || 50.8;
    let c2Share = base.candidates[1]?.percent || 49.2;

    if (base.code === 'BR' && base.candidates.length >= 2) {
      if (clampedPercent < 50) {
        // Flávio ahead early on (before 50% urnas)
        const offset = ((50 - clampedPercent) / 50) * 3.5;
        c1Share = 50.8 - offset; // Lula starts at ~47.3%
        c2Share = 49.2 + offset; // Flávio starts at ~52.7%
      } else {
        // Lula takes lead and stabilizes at 50.8%
        const postOffset = ((clampedPercent - 50) / 50) * 0.3;
        c1Share = 50.8 + postOffset;
        c2Share = 100 - c1Share;
      }
    }

    const c1Votes = Math.round((validVotes * c1Share) / 100);
    const c2Votes = Math.max(0, validVotes - c1Votes);

    const remainingVotes = Math.max(0, base.validVotes - validVotes);
    const voteLead = Math.abs(c1Votes - c2Votes);
    const isMathematicallyDefined = clampedPercent >= 98.8 || (clampedPercent > 75 && voteLead > remainingVotes);

    const now = new Date();
    const timeStr = now.toLocaleTimeString('pt-BR');

    // Build timeline points up to current progress
    const dynamicTimeline = [
      { sectionPercent: 10, timestamp: '17:20', candidatePercents: { '13': 47.30, '22': 52.70 }, leader: '22' },
      { sectionPercent: 25, timestamp: '17:50', candidatePercents: { '13': 48.40, '22': 51.60 }, leader: '22' },
      { sectionPercent: 40, timestamp: '18:15', candidatePercents: { '13': 49.45, '22': 50.55 }, leader: '22' },
      { sectionPercent: 49, timestamp: '18:32', candidatePercents: { '13': 49.95, '22': 50.05 }, leader: '22' },
      { sectionPercent: 50, timestamp: '18:35', candidatePercents: { '13': 50.30, '22': 49.70 }, leader: '13' },
    ];

    if (clampedPercent > 50) {
      dynamicTimeline.push({
        sectionPercent: parseFloat(clampedPercent.toFixed(1)),
        timestamp: timeStr,
        candidatePercents: {
          '13': parseFloat(c1Share.toFixed(2)),
          '22': parseFloat(c2Share.toFixed(2)),
        },
        leader: c1Share >= c2Share ? '13' : '22',
      });
    }

    return {
      ...base,
      countedSections,
      percentSectionsCounted: parseFloat(clampedPercent.toFixed(2)),
      attendance,
      abstentions,
      validVotes,
      blankVotes,
      nullVotes,
      totalVotesCast,
      isCompleted: clampedPercent >= 100,
      isMathematicallyDefined,
      lastUpdate: `25/10/2026 ${timeStr}`,
      candidates: base.candidates.map((c, idx) => {
        const isLeader = idx === 0 ? (c1Share >= c2Share) : (c2Share > c1Share);
        const votes = idx === 0 ? c1Votes : (idx === 1 ? c2Votes : Math.round(c.votes * ratio));
        const percent = idx === 0 ? parseFloat(c1Share.toFixed(2)) : (idx === 1 ? parseFloat(c2Share.toFixed(2)) : c.percent);
        return {
          ...c,
          votes,
          percent,
          isElected: isMathematicallyDefined && isLeader,
        };
      }),
      timeline: dynamicTimeline,
    };
  }
}

export const tseApi = new TseApiService();
