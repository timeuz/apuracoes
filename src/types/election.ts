export type ScopeLevel = 'nacional' | 'regional' | 'estadual' | 'municipal' | 'exterior' | 'mundi';

export type ElectionId = '2026_2t' | '2026_1t';

export type CargoType = 'presidente';

export interface CandidateResult {
  id: string;
  seq: number;
  number: string;
  name: string;
  ballotName: string;
  party: string;
  coalition: string;
  viceName?: string;
  color: string;
  votes: number;
  percent: number; // percentage of valid votes
  isElected: boolean;
  isInSecondRound?: boolean;
  photoUrl?: string;
}

export interface TerritoryData {
  code: string; // 'BR', 'SP', 'RJ', 'ZZ', etc.
  name: string;
  scope: ScopeLevel;
  totalSections: number;
  countedSections: number;
  percentSectionsCounted: number;
  totalVoters: number;
  attendance: number;
  percentAttendance: number;
  abstentions: number;
  percentAbstentions: number;
  validVotes: number;
  percentValidVotes: number;
  blankVotes: number;
  percentBlankVotes: number;
  nullVotes: number;
  percentNullVotes: number;
  totalVotesCast: number;
  lastUpdate: string;
  isCompleted: boolean;
  isMathematicallyDefined: boolean;
  candidates: CandidateResult[];
  timeline: {
    sectionPercent: number;
    timestamp: string;
    candidatePercents: Record<string, number>; // candidate number -> %
    leader?: string;
  }[];
}

export interface CountryElectionData {
  id: string; // ISO 2 lowercase, e.g. 'br', 'pt', 'us'
  name: string;
  flag: string;
  hasVoting: boolean;
  hasStarted: boolean;
  isCompleted: boolean;
  isVotingOpen?: boolean;
  buAffixed?: boolean;
  statusDetail?: string;
  totalVoters: number;
  countedSections: number;
  totalSections: number;
  percentSectionsCounted: number;
  attendance: number;
  abstentions: number;
  validVotes: number;
  blankVotes: number;
  nullVotes: number;
  candidates: {
    number: string;
    name: string;
    ballotName: string;
    party: string;
    color: string;
    votes: number;
    percent: number;
  }[];
  leaderNumber?: string;
  leaderName?: string;
  leaderColor?: string;
}

export interface ElectionTemporalState {
  serverTime: string;
  brasiliaTime: string;
  targetTime: string;
  targetTimestamp: number;
  votingStartTimestamp: number;
  secondsRemaining: number;
  isPast17h: boolean;
  isVotingOpen: boolean;
  votingDayProgressPercent: number;
  electionDate: string;
  round: number;
}

export interface MunicipalityElectionData {
  code: string;
  name: string;
  state: string;
  totalSections: number;
  countedSections: number;
  percentSectionsCounted: number;
  totalVoters: number;
  validVotes: number;
  blankVotes: number;
  nullVotes: number;
  abstentions: number;
  isCompleted: boolean;
  candidates: {
    number: string;
    ballotName: string;
    party: string;
    color: string;
    votes: number;
    percent: number;
  }[];
}

export interface RoundComparisonItem {
  territoryCode: string;
  territoryName: string;
  round1: {
    lulaVotes: number;
    lulaPercent: number;
    flavioVotes: number;
    flavioPercent: number;
    validVotes: number;
    attendance: number;
    abstentions: number;
    percentAbstentions: number;
    blankVotes: number;
    nullVotes: number;
  };
  round2: {
    lulaVotes: number;
    lulaPercent: number;
    flavioVotes: number;
    flavioPercent: number;
    validVotes: number;
    attendance: number;
    abstentions: number;
    percentAbstentions: number;
    blankVotes: number;
    nullVotes: number;
  };
  diff: {
    lulaVotesChange: number;
    lulaPercentChange: number;
    flavioVotesChange: number;
    flavioPercentChange: number;
    winnerRound1: '13' | '22';
    winnerRound2: '13' | '22';
    turnaround: boolean;
  };
}

export interface PushAlertConfig {
  browserNotificationsEnabled: boolean;
  soundEnabled: boolean;
  milestoneUrnasEnabled: boolean; // 50%, 80%, 90%, 95%, 99%, 100%
  overtakeAlertEnabled: boolean;  // leader change
  mathVictoryEnabled: boolean;    // mathematically defined
  candidateAlerts: {
    candidateNumber: string;
    candidateName: string;
    thresholdPercent: number;
    fired: boolean;
  }[];
}

export interface PushNotificationEvent {
  id: string;
  title: string;
  message: string;
  type: 'milestone' | 'overtake' | 'victory' | 'threshold' | 'system';
  timestamp: string;
  candidateNumber?: string;
}
