process.env.NODE_ENV = 'test';

import { getElectionTemporalState } from './server';
import { tseApi } from './src/services/tseApi';
import {
  BR_2026_1T_BASE,
  BR_2026_2T_BASE,
  BR_2026_2T_POST_17H,
  ROUND_COMPARISON_NATIONAL_2026,
  getStatesData2026_2T,
  getMunicipalities2026,
  getWorldCountries,
} from './src/data/electionData';
import {
  evaluateTerritoryAlerts,
  AlertEvaluationContext,
  DEFAULT_CONFIG,
} from './src/hooks/useNotifications';
import { PushNotificationEvent, TerritoryData } from './src/types/election';
import { TseMemoryCache, globalTseCache } from './src/server/tseCache';
import { IpRateLimiter, ConcurrencyLimiter, globalIpRateLimiter, globalTseConcurrencyLimiter } from './src/server/rateLimiter';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
  console.log(`✓ ${msg}`);
}

async function runTests() {
  console.log('--- TEST 1: Temporal State & Brasília Clock ---');
  const temp = getElectionTemporalState();
  assert(typeof temp.secondsRemaining === 'number', 'secondsRemaining is a number');
  assert(temp.round === 2, 'Round is 2');
  assert(temp.electionDate === '2026-10-25', 'Election date is 2026-10-25');
  assert(temp.targetTimestamp === new Date('2026-10-25T17:00:00-03:00').getTime(), 'Target timestamp is 17:00:00-03:00');
  console.log(`Current server Brasília time: ${temp.brasiliaTime}, secondsRemaining: ${temp.secondsRemaining}, isPast17h: ${temp.isPast17h}, isVotingOpen: ${temp.isVotingOpen}`);

  console.log('--- TEST 2: Pre-17h Official Rules for Brazil & States ---');
  const statesPre = getStatesData2026_2T(false);
  const statesPost = getStatesData2026_2T(true);

  assert(BR_2026_2T_BASE.percentSectionsCounted === 0, 'BR base pre-17h has 0% counted');
  assert(BR_2026_2T_BASE.countedSections === 0, 'BR base pre-17h has 0 counted sections');
  assert(BR_2026_2T_BASE.candidates[0].votes === 0, 'Lula has 0 votes pre-17h');
  assert(BR_2026_2T_BASE.candidates[1].votes === 0, 'Flávio has 0 votes pre-17h');

  // Check all 27 states pre-17h
  for (const [uf, st] of Object.entries(statesPre)) {
    assert(st.percentSectionsCounted === 0, `State ${uf} has 0% counted pre-17h`);
    assert(st.validVotes === 0, `State ${uf} has 0 valid votes pre-17h`);
    assert(st.candidates[0].votes === 0 && st.candidates[1].votes === 0, `State ${uf} candidates have 0 votes pre-17h`);
  }

  // Check post-17h has valid live tally
  assert(BR_2026_2T_POST_17H.percentSectionsCounted > 50, 'BR post-17h has valid live tally (>50%)');
  assert(statesPost['SP'].percentSectionsCounted > 0, 'SP post-17h has counted sections');

  console.log('--- TEST 3: World Map Pre-17h (Boletins de Urna no exterior) ---');
  const worldPre = getWorldCountries(false);
  const worldPost = getWorldCountries(true);

  // Brazil on world map pre-17h
  assert(worldPre['br'].hasStarted === false, 'Brazil on world map pre-17h is not started');
  assert(worldPre['br'].countedSections === 0, 'Brazil on world map pre-17h has 0 sections');

  // Early timezone countries whose BU was affixed
  const earlyCodes = ['jp', 'au', 'nz', 'kr', 'cn', 'sg'];
  for (const code of earlyCodes) {
    const c = worldPre[code];
    assert(c.hasVoting === true, `${code} has voting`);
    assert(c.hasStarted === true, `${code} has started (BU affixed)`);
    assert(c.isCompleted === true, `${code} is completed`);
    assert(c.buAffixed === true, `${code} has buAffixed`);
    assert(c.leaderNumber === '13' || c.leaderNumber === '22', `${code} has leader`);
  }

  // Later timezone countries pre-17h (e.g. US, Portugal, France)
  const regularVoting = ['pt', 'us', 'fr', 'de', 'it', 'es', 'gb'];
  for (const code of regularVoting) {
    const c = worldPre[code];
    assert(c.hasVoting === true, `${code} has voting`);
    assert(c.hasStarted === false, `${code} has NOT started before 17h`);
    assert(c.leaderNumber === undefined, `${code} has NO leader assigned pre-17h`);
  }

  console.log('--- TEST 4: Municipalities Pre-17h ---');
  const munPre = getMunicipalities2026(false);
  for (const [code, mun] of Object.entries(munPre)) {
    assert(mun.percentSectionsCounted === 0, `Municipality ${code} has 0% counted`);
    assert(mun.candidates.every(c => c.votes === 0), `Municipality ${code} candidates have 0 votes`);
  }

  console.log('--- TEST 5: Official TSE JSON Parser ---');
  const mockTseJson = {
    ele: '545',
    dh: '25/10/2026 18:48:00',
    pst: '54,20',
    s: '492310',
    st: '266832',
    c: '158860000',
    a: '68627520',
    tv: '68627520',
    vtv: '65607909',
    vb: '1029413',
    vn: '1990198',
    cand: [
      { seq: '1', n: '13', nm: 'LULA', vap: '33328818', pvap: '50,80', e: 'n' },
      { seq: '2', n: '22', nm: 'FLÁVIO BOLSONARO', vap: '32279091', pvap: '49,20', e: 'n' },
    ],
  };

  const parsed = tseApi.parseTseOfficialJson(mockTseJson);
  assert(parsed !== null, 'Parser successfully parsed TSE JSON');
  assert(parsed?.percentSectionsCounted === 54.2, 'Parser parsed percentSectionsCounted: 54.2');
  assert(parsed?.totalSections === 492310, 'Parser parsed totalSections: 492310');
  assert(parsed?.countedSections === 266832, 'Parser parsed countedSections: 266832');
  assert(parsed?.candidates[0].number === '13' && parsed?.candidates[0].votes === 33328818, 'Parser parsed candidate 13 votes');
  assert(parsed?.candidates[1].number === '22' && parsed?.candidates[1].votes === 32279091, 'Parser parsed candidate 22 votes');
  assert(parsed?.candidates[0].percent === 50.8, 'Parser parsed candidate 13 percent: 50.8%');
  assert(parsed?.candidates[1].percent === 49.2, 'Parser parsed candidate 22 percent: 49.2%');

  console.log('--- TEST 6: tseApi Territory Data Fetching ---');
  // Client pre-17h fetch
  const preResult = await tseApi.getTerritoryData({
    electionId: '2026_2t',
    scope: 'nacional',
    code: 'BR',
    demoAfter17h: false,
  });
  assert(preResult.percentSectionsCounted === 0, 'Client preResult percentSectionsCounted is 0');
  assert(preResult.candidates[0].votes === 0, 'Client preResult candidate 13 has 0 votes');

  // Client demo/post-17h fetch
  const postResult = await tseApi.getTerritoryData({
    electionId: '2026_2t',
    scope: 'nacional',
    code: 'BR',
    demoAfter17h: true,
  });
  assert(postResult.percentSectionsCounted > 50, 'Client postResult percentSectionsCounted > 50');
  assert(postResult.candidates[0].votes > 0, 'Client postResult candidate 13 has votes');

  console.log('--- TEST 7: 1º Turno 2026 Official Data & Round Comparison ---');
  // 1T Base checks
  assert(BR_2026_1T_BASE.isCompleted === true, '1T base is marked completed');
  assert(BR_2026_1T_BASE.percentSectionsCounted === 100, '1T base is 100% counted');

  const flavio1T = BR_2026_1T_BASE.candidates.find(c => c.number === '22');
  const lula1T = BR_2026_1T_BASE.candidates.find(c => c.number === '13');
  assert(flavio1T !== undefined, 'Flávio exists in 1T base');
  assert(lula1T !== undefined, 'Lula exists in 1T base');
  assert(flavio1T?.percent === 47.03, `Flávio 1T percent is 47.03% (got ${flavio1T?.percent})`);
  assert(flavio1T?.votes === 56366631, `Flávio 1T votes is 56366631 (got ${flavio1T?.votes})`);
  assert(lula1T?.percent === 45.16, `Lula 1T percent is 45.16% (got ${lula1T?.percent})`);
  assert(lula1T?.votes === 54125389, `Lula 1T votes is 54125389 (got ${lula1T?.votes})`);

  // First place candidate in 1T is Flávio
  assert(BR_2026_1T_BASE.candidates[0].number === '22', 'Flávio is candidate[0] (1st place) in 1T');
  assert(BR_2026_1T_BASE.candidates[1].number === '13', 'Lula is candidate[1] (2nd place) in 1T');

  // Sum of other candidates equals 7.81%
  const otherCandidates = BR_2026_1T_BASE.candidates.filter(c => c.number !== '13' && c.number !== '22');
  const otherPercentSum = parseFloat(otherCandidates.reduce((sum, c) => sum + c.percent, 0).toFixed(2));
  assert(otherPercentSum === 7.81, `Other candidates sum to 7.81% (got ${otherPercentSum}%)`);

  const allPercentSum = parseFloat(BR_2026_1T_BASE.candidates.reduce((sum, c) => sum + c.percent, 0).toFixed(2));
  assert(allPercentSum === 100.00, `All candidate percentages sum to 100.00% (got ${allPercentSum}%)`);

  const allVotesSum = BR_2026_1T_BASE.candidates.reduce((sum, c) => sum + c.votes, 0);
  assert(allVotesSum === BR_2026_1T_BASE.validVotes, `Candidate votes sum to validVotes: ${allVotesSum} === ${BR_2026_1T_BASE.validVotes}`);

  // ROUND_COMPARISON_NATIONAL_2026 checks
  const rc = ROUND_COMPARISON_NATIONAL_2026;
  assert(rc.round1.flavioPercent === 47.03, `RoundComparison round1.flavioPercent is 47.03% (got ${rc.round1.flavioPercent})`);
  assert(rc.round1.flavioVotes === 56366631, `RoundComparison round1.flavioVotes is 56366631 (got ${rc.round1.flavioVotes})`);
  assert(rc.round1.lulaPercent === 45.16, `RoundComparison round1.lulaPercent is 45.16% (got ${rc.round1.lulaPercent})`);
  assert(rc.round1.lulaVotes === 54125389, `RoundComparison round1.lulaVotes is 54125389 (got ${rc.round1.lulaVotes})`);

  assert(rc.diff.lulaPercentChange === 5.64, `RoundComparison diff.lulaPercentChange is 5.64 (got ${rc.diff.lulaPercentChange})`);
  assert(rc.diff.lulaVotesChange === 7354611, `RoundComparison diff.lulaVotesChange is 7354611 (got ${rc.diff.lulaVotesChange})`);
  assert(rc.diff.flavioPercentChange === 2.17, `RoundComparison diff.flavioPercentChange is 2.17 (got ${rc.diff.flavioPercentChange})`);
  assert(rc.diff.flavioVotesChange === 3173369, `RoundComparison diff.flavioVotesChange is 3173369 (got ${rc.diff.flavioVotesChange})`);

  assert(rc.diff.winnerRound1 === '22', `RoundComparison winnerRound1 is '22' (got ${rc.diff.winnerRound1})`);
  assert(rc.diff.winnerRound2 === '13', `RoundComparison winnerRound2 is '13' (got ${rc.diff.winnerRound2})`);
  assert(rc.diff.turnaround === true, 'RoundComparison turnaround is true');

  console.log('--- TEST 8: Tab Switching & False Overtake Prevention ---');
  // Test context for evaluateTerritoryAlerts
  const alertsFired: PushNotificationEvent[] = [];
  const alertCtx: AlertEvaluationContext = {
    prevDataByTerritory: {},
    firedMilestones: new Set(),
  };
  const testDispatch = (ev: Omit<PushNotificationEvent, 'id' | 'timestamp'>) => {
    alertsFired.push({ ...ev, id: 'test', timestamp: '12:00:00' });
  };

  // 8.1: Pre-17h tab switching (Nacional -> Estadual -> Municipal -> Exterior) with 0% counted and 0 votes
  // Simulating user switching tabs across scopes:
  evaluateTerritoryAlerts(BR_2026_2T_BASE, alertCtx, DEFAULT_CONFIG, testDispatch);
  assert(alertsFired.length === 0, 'No alert fired on initial Nacional load');

  // Switch to Estadual (SP pre-17h with 0% counted)
  const spPre = statesPre['SP'];
  evaluateTerritoryAlerts(spPre, alertCtx, DEFAULT_CONFIG, testDispatch);
  assert(alertsFired.length === 0, 'No alert fired when switching to Estadual (SP 0%)');

  // Switch to RJ pre-17h
  const rjPre = statesPre['RJ'];
  evaluateTerritoryAlerts(rjPre, alertCtx, DEFAULT_CONFIG, testDispatch);
  assert(alertsFired.length === 0, 'No alert fired when switching to Estadual (RJ 0%)');

  // Switch to Municipal (São Paulo pre-17h as TerritoryData)
  const spMunTerritory = await tseApi.getTerritoryData({
    electionId: '2026_2t',
    scope: 'municipal',
    code: 'SP_SAO_PAULO',
    demoAfter17h: false,
  });
  evaluateTerritoryAlerts(spMunTerritory, alertCtx, DEFAULT_CONFIG, testDispatch);
  assert(alertsFired.length === 0, 'No alert fired when switching to Municipal (SP Capital 0%)');

  // Switch to Exterior (ZZ pre-17h)
  const zzPre = statesPre['ZZ'];
  evaluateTerritoryAlerts(zzPre, alertCtx, DEFAULT_CONFIG, testDispatch);
  assert(alertsFired.length === 0, 'No alert fired when switching to Exterior (ZZ 0%)');

  // Switch BACK to Nacional (BR pre-17h)
  evaluateTerritoryAlerts(BR_2026_2T_BASE, alertCtx, DEFAULT_CONFIG, testDispatch);
  assert(alertsFired.length === 0, 'No alert fired when switching back to Nacional (BR 0%)');

  // 8.2: Even with reordered candidates having 0 votes and 0% counted, NEVER fire overtake alert
  const zeroDataCandidateFlip: TerritoryData = {
    ...BR_2026_2T_BASE,
    candidates: [
      { ...BR_2026_2T_BASE.candidates[1], votes: 0, percent: 0 },
      { ...BR_2026_2T_BASE.candidates[0], votes: 0, percent: 0 },
    ],
  };
  evaluateTerritoryAlerts(zeroDataCandidateFlip, alertCtx, DEFAULT_CONFIG, testDispatch);
  const overtakeZeroAlerts = alertsFired.filter(a => a.type === 'overtake');
  assert(overtakeZeroAlerts.length === 0, 'Zero-vote / 0% candidate flip never triggers overtake alert');

  // 8.3: Real overtake in apuração with votes > 0 DOES trigger overtake alert
  const liveApuracao1: TerritoryData = {
    code: 'TEST_LIVE',
    name: 'Território Teste',
    scope: 'estadual',
    totalSections: 1000,
    countedSections: 200,
    percentSectionsCounted: 20.0,
    totalVoters: 500000,
    attendance: 400000,
    percentAttendance: 80,
    abstentions: 100000,
    percentAbstentions: 20,
    validVotes: 380000,
    percentValidVotes: 95,
    blankVotes: 10000,
    percentBlankVotes: 2.5,
    nullVotes: 10000,
    percentNullVotes: 2.5,
    totalVotesCast: 400000,
    lastUpdate: '25/10/2026 17:30:00',
    isCompleted: false,
    isMathematicallyDefined: false,
    candidates: [
      {
        id: '22',
        seq: 1,
        number: '22',
        name: 'FLÁVIO NANTES BOLSONARO',
        ballotName: 'Flávio Bolsonaro',
        party: 'PL',
        coalition: 'PL',
        color: '#2563EB',
        votes: 195000,
        percent: 51.32,
        isElected: false,
        isInSecondRound: true,
      },
      {
        id: '13',
        seq: 2,
        number: '13',
        name: 'LUIZ INÁCIO LULA DA SILVA',
        ballotName: 'Lula',
        party: 'PT',
        coalition: 'PT',
        color: '#DC2626',
        votes: 185000,
        percent: 48.68,
        isElected: false,
        isInSecondRound: true,
      },
    ],
    timeline: [],
  };

  // First step of live apuração: Flávio leading
  evaluateTerritoryAlerts(liveApuracao1, alertCtx, DEFAULT_CONFIG, testDispatch);
  const overtakesBefore = alertsFired.filter(a => a.type === 'overtake').length;

  // Second step: Real virada! Lula overtakes Flávio with real votes > 0
  const liveApuracao2: TerritoryData = {
    ...liveApuracao1,
    countedSections: 500,
    percentSectionsCounted: 50.0,
    validVotes: 390000,
    candidates: [
      {
        ...liveApuracao1.candidates[0], // Flávio
        votes: 193000,
        percent: 49.49,
      },
      {
        ...liveApuracao1.candidates[1], // Lula
        votes: 197000,
        percent: 50.51,
      },
    ],
  };

  evaluateTerritoryAlerts(liveApuracao2, alertCtx, DEFAULT_CONFIG, testDispatch);
  const overtakesAfter = alertsFired.filter(a => a.type === 'overtake').length;
  assert(overtakesAfter === overtakesBefore + 1, 'Real overtake with votes > 0 in same territory successfully fired overtake alert');
  const lastOvertake = alertsFired.filter(a => a.type === 'overtake').pop();
  assert(lastOvertake?.candidateNumber === '13', 'Overtake alert correctly identified candidate 13 as new leader');
  assert(Boolean(lastOvertake && lastOvertake.message.includes('50.51%')), `Overtake alert message contains correct percent: ${lastOvertake?.message}`);

  console.log('--- TEST 9: Cross-Election Round Isolation (1º Turno vs 2º Turno) ---');
  // 9.1: Direct evaluation of archived 1T base should never fire alerts
  const alertsBefore1T = alertsFired.length;
  evaluateTerritoryAlerts(BR_2026_1T_BASE, alertCtx, DEFAULT_CONFIG, testDispatch);
  assert(alertsFired.length === alertsBefore1T, 'Evaluating 1T completed base never fires any push alert');

  // 9.2: Switching from active 2T (with Lula leading) to 1T base (where Flávio led) must NOT fire virada or milestones
  const alertCtxCrossRound: AlertEvaluationContext = {
    prevDataByTerritory: {
      'nacional:BR': BR_2026_2T_POST_17H,
      'BR': BR_2026_2T_POST_17H,
    },
    firedMilestones: new Set(),
  };
  const crossRoundAlerts: PushNotificationEvent[] = [];
  evaluateTerritoryAlerts(BR_2026_1T_BASE, alertCtxCrossRound, DEFAULT_CONFIG, (ev) => {
    crossRoundAlerts.push({ ...ev, id: 'cross', timestamp: '12:00:00' });
  });
  assert(crossRoundAlerts.length === 0, 'Switching from 2T to 1T never fires false overtake, milestone, or victory alerts');

  console.log('--- TEST 10: Equal Votes (Tie) Never Triggers Overtake ---');
  const tieCtx: AlertEvaluationContext = {
    prevDataByTerritory: {},
    firedMilestones: new Set(),
  };
  const tieAlerts: PushNotificationEvent[] = [];
  const tieDispatch = (ev: Omit<PushNotificationEvent, 'id' | 'timestamp'>) => {
    tieAlerts.push({ ...ev, id: 'tie', timestamp: '12:00:00' });
  };

  const stateInitial: TerritoryData = {
    ...liveApuracao1,
    code: 'TEST_TIE',
    countedSections: 100,
    percentSectionsCounted: 10.0,
    candidates: [
      { ...liveApuracao1.candidates[0], votes: 500, percent: 50.0 },
      { ...liveApuracao1.candidates[1], votes: 400, percent: 40.0 }, // Cand 22 strictly leading
    ],
  };
  evaluateTerritoryAlerts(stateInitial, tieCtx, DEFAULT_CONFIG, tieDispatch);
  assert(tieAlerts.length === 0, 'Initial state sets baseline without alert');

  // State with tie (both at 500 votes):
  const stateTie: TerritoryData = {
    ...stateInitial,
    countedSections: 150,
    percentSectionsCounted: 15.0,
    candidates: [
      { ...stateInitial.candidates[1], votes: 500, percent: 50.0 }, // Cand 13 ties
      { ...stateInitial.candidates[0], votes: 500, percent: 50.0 }, // Cand 22 tied
    ],
  };
  evaluateTerritoryAlerts(stateTie, tieCtx, DEFAULT_CONFIG, tieDispatch);
  assert(tieAlerts.filter(a => a.type === 'overtake').length === 0, 'Tie in votes never dispatches overtake alert');

  console.log('--- TEST 11: Candidate Custom Threshold Crossing ---');
  const customAlertConfig = {
    ...DEFAULT_CONFIG,
    candidateAlerts: [
      { candidateNumber: '13', candidateName: 'Lula', thresholdPercent: 50.0, fired: false },
    ],
  };
  const customCtx: AlertEvaluationContext = {
    prevDataByTerritory: {},
    firedMilestones: new Set(),
  };
  const customAlerts: PushNotificationEvent[] = [];
  const candBase: TerritoryData = {
    ...liveApuracao1,
    code: 'TEST_CAND',
    countedSections: 200,
    percentSectionsCounted: 20.0,
    candidates: [
      { ...liveApuracao1.candidates[1], votes: 1000, percent: 48.0 }, // Lula at 48%
      { ...liveApuracao1.candidates[0], votes: 1100, percent: 52.0 },
    ],
  };
  evaluateTerritoryAlerts(candBase, customCtx, customAlertConfig, (ev) => customAlerts.push({ ...ev, id: 'c1', timestamp: '12:00:00' }));
  assert(customAlerts.length === 0, 'No candidate alert before threshold');

  // Crosses threshold to 50.8%
  const candCrossed: TerritoryData = {
    ...candBase,
    countedSections: 300,
    percentSectionsCounted: 30.0,
    candidates: [
      { ...candBase.candidates[0], votes: 1600, percent: 50.8 }, // Lula at 50.8%
      { ...candBase.candidates[1], votes: 1500, percent: 49.2 },
    ],
  };
  evaluateTerritoryAlerts(candCrossed, customCtx, customAlertConfig, (ev) => customAlerts.push({ ...ev, id: 'c2', timestamp: '12:00:00' }));
  const thresholdAlerts = customAlerts.filter(a => a.type === 'threshold');
  assert(thresholdAlerts.length === 1, 'Candidate alert fired exactly once when crossing 50%');
  assert(thresholdAlerts[0].candidateNumber === '13', 'Threshold alert identified candidate 13');

  // Next step: still above 50%, must NOT fire duplicate
  evaluateTerritoryAlerts({ ...candCrossed, percentSectionsCounted: 35.0 }, customCtx, customAlertConfig, (ev) => customAlerts.push({ ...ev, id: 'c3', timestamp: '12:00:00' }));
  assert(customAlerts.filter(a => a.type === 'threshold').length === 1, 'Candidate alert does not duplicate after crossing');

  console.log('--- TEST 12: In-Memory Cache (TseMemoryCache) ---');
  const testCache = new TseMemoryCache({ defaultTtlMs: 80, defaultStaleTtlMs: 250, maxEntries: 3 });

  // 12.1 Miss
  assert(testCache.get('tse_br') === null, 'Cache miss on empty key');

  // 12.2 Set and Fresh Hit
  testCache.set('tse_br', { tally: 54.2 });
  const freshHit = testCache.get<{ tally: number }>('tse_br');
  assert(freshHit !== null && !freshHit.isStale && freshHit.data.tally === 54.2, 'Cache fresh hit with correct data');

  // 12.3 Stale Hit (past 80ms, before 250ms)
  await new Promise(r => setTimeout(r, 100));
  const staleHit = testCache.get<{ tally: number }>('tse_br');
  assert(staleHit !== null && staleHit.isStale && staleHit.data.tally === 54.2, 'Cache stale-while-revalidate hit');

  // 12.4 Expired Eviction (past 250ms)
  await new Promise(r => setTimeout(r, 180));
  assert(testCache.get('tse_br') === null, 'Cache evicts expired entries past stale TTL');

  // 12.5 LRU Eviction with maxEntries = 3
  testCache.set('k1', 'val1');
  testCache.set('k2', 'val2');
  testCache.set('k3', 'val3');
  assert(testCache.getStats().size === 3, 'Cache size is 3');
  testCache.set('k4', 'val4'); // Should evict k1
  assert(testCache.getStats().size === 3, 'Cache size remains capped at 3');
  assert(testCache.get('k1') === null, 'Oldest entry k1 evicted');
  assert(testCache.get('k4') !== null, 'Newest entry k4 exists');

  // 12.6 In-flight Promise Coalescing & Stale-While-Revalidate
  let networkCalls = 0;
  const slowFetcher = async () => {
    networkCalls++;
    await new Promise(r => setTimeout(r, 40));
    return { count: 12345 };
  };

  testCache.clear();
  const [resA, resB, resC] = await Promise.all([
    testCache.fetchWithStaleWhileRevalidate('dedup_key', slowFetcher),
    testCache.fetchWithStaleWhileRevalidate('dedup_key', slowFetcher),
    testCache.fetchWithStaleWhileRevalidate('dedup_key', slowFetcher),
  ]);

  assert(networkCalls === 1, 'In-flight promise coalescing made only 1 network fetch for 3 simultaneous calls');
  assert(resA.data.count === 12345 && resB.data.count === 12345 && resC.data.count === 12345, 'All concurrent callers received correct data');

  console.log('--- TEST 13: IP Rate Limiter (IpRateLimiter) ---');
  const limiter = new IpRateLimiter({ windowMs: 2000, maxRequests: 2 });
  const mockReq1 = { ip: '203.0.113.1', headers: {}, socket: { remoteAddress: '203.0.113.1' } } as any;
  const mockReq2 = { ip: '203.0.113.2', headers: {}, socket: { remoteAddress: '203.0.113.2' } } as any;

  function runLimiter(req: any) {
    let nextCalled = false;
    let statusCode = 200;
    const headers: Record<string, any> = {};
    let body: any = null;

    const res = {
      setHeader(k: string, v: any) { headers[k.toLowerCase()] = v; },
      status(code: number) { statusCode = code; return this; },
      json(b: any) { body = b; return this; },
    } as any;

    const middleware = limiter.getMiddleware();
    middleware(req, res, () => { nextCalled = true; });

    return { nextCalled, statusCode, headers, body };
  }

  // Request 1: allowed, remaining = 1
  const r1 = runLimiter(mockReq1);
  assert(r1.nextCalled === true && r1.statusCode === 200, 'IP Request 1 allowed');
  assert(r1.headers['x-ratelimit-remaining'] === 1, 'X-RateLimit-Remaining is 1');

  // Request 2: allowed, remaining = 0
  const r2 = runLimiter(mockReq1);
  assert(r2.nextCalled === true && r2.statusCode === 200, 'IP Request 2 allowed');
  assert(r2.headers['x-ratelimit-remaining'] === 0, 'X-RateLimit-Remaining is 0');

  // Request 3: blocked with 429
  const r3 = runLimiter(mockReq1);
  assert(r3.nextCalled === false, 'IP Request 3 blocked');
  assert(r3.statusCode === 429, 'IP Request 3 returned 429 Too Many Requests');
  assert(typeof r3.headers['retry-after'] === 'number', 'Retry-After header present');
  assert(typeof r3.body?.error === 'string', 'Error message returned in JSON');

  // Request from other IP: allowed
  const rOther = runLimiter(mockReq2);
  assert(rOther.nextCalled === true && rOther.statusCode === 200, 'Different IP is not blocked');

  limiter.destroy();

  console.log('--- TEST 14: TSE Concurrency Limiter (ConcurrencyLimiter) ---');
  const concLimiter = new ConcurrencyLimiter(2);
  let activePeak = 0;
  let currentlyActive = 0;

  const concTasks = Array.from({ length: 5 }, async (_, i) => {
    return concLimiter.execute(async () => {
      currentlyActive++;
      if (currentlyActive > activePeak) activePeak = currentlyActive;
      await new Promise(r => setTimeout(r, 30));
      currentlyActive--;
      return i;
    });
  });

  const taskResults = await Promise.all(concTasks);
  assert(activePeak <= 2, `Concurrency limiter kept active requests <= 2 (peak was ${activePeak})`);
  assert(taskResults.length === 5, 'All 5 queued concurrency tasks completed successfully');

  console.log('--- TEST 15: World Voting Countries & Zona ZZ (Exterior) Validation ---');
  const worldCountriesPre = getWorldCountries(false);
  const worldCountriesPost = getWorldCountries(true);

  const foreignVotingPre = Object.values(worldCountriesPre).filter(c => c.hasVoting && c.id !== 'br');
  const foreignVotingPost = Object.values(worldCountriesPost).filter(c => c.hasVoting && c.id !== 'br');

  assert(foreignVotingPre.length === 30, `Exactly 30 foreign voting countries in Zona ZZ pre-17h (got ${foreignVotingPre.length})`);
  assert(foreignVotingPost.length === 30, `Exactly 30 foreign voting countries in Zona ZZ post-17h (got ${foreignVotingPost.length})`);

  // Verify all countries have both candidates (Lula & Flávio) with votes and percent
  for (const c of foreignVotingPost) {
    assert(c.candidates.length >= 2, `Country ${c.name} has at least 2 candidates`);
    const lula = c.candidates.find(cand => cand.number === '13');
    const flavio = c.candidates.find(cand => cand.number === '22');
    assert(!!lula, `Country ${c.name} has Lula (13)`);
    assert(!!flavio, `Country ${c.name} has Flávio (22)`);
    assert(typeof lula?.votes === 'number' && typeof lula?.percent === 'number', `Country ${c.name} Lula has votes & percent`);
    assert(typeof flavio?.votes === 'number' && typeof flavio?.percent === 'number', `Country ${c.name} Flávio has votes & percent`);
  }

  // Pre-17h: check that completed count is exactly 6 (early countries) and 24 are waiting
  const preCompleted = foreignVotingPre.filter(c => c.isCompleted);
  const preWaiting = foreignVotingPre.filter(c => !c.hasStarted);
  assert(preCompleted.length === 6, `Pre-17h has 6 early timezone completed countries (got ${preCompleted.length})`);
  assert(preWaiting.length === 24, `Pre-17h has 24 countries waiting for 17h (got ${preWaiting.length})`);

  // Post-17h: check that completed count is 29, 1 in progress (US)
  const postCompleted = foreignVotingPost.filter(c => c.isCompleted);
  const postInProgress = foreignVotingPost.filter(c => c.hasStarted && !c.isCompleted);
  assert(postCompleted.length === 29, `Post-17h has 29 completed countries (got ${postCompleted.length})`);
  assert(postInProgress.length === 1 && postInProgress[0].id === 'us', 'Post-17h has US in progress (90%)');

  // Verify nominal votes sum
  let sumLula = 0;
  let sumFlavio = 0;
  for (const c of postCompleted) {
    const lula = c.candidates.find(cand => cand.number === '13');
    const flavio = c.candidates.find(cand => cand.number === '22');
    sumLula += (lula?.votes || 0);
    sumFlavio += (flavio?.votes || 0);
  }
  assert(sumLula > 0, `Sum of Lula votes in completed countries > 0 (got ${sumLula})`);
  assert(sumFlavio > 0, `Sum of Flávio votes in completed countries > 0 (got ${sumFlavio})`);

  console.log('--- TEST 16: Robustness & Edge Cases (Queue Saturation, Skip Exemption, IP Parsing, Candidate Filters) ---');
  // 16.1: ConcurrencyLimiter queue saturation
  const cappedLimiter = new ConcurrencyLimiter(1, 2); // max 1 active, max 2 queued
  let releaseHold: () => void = () => {};
  const holdPromise = new Promise<void>(resolve => { releaseHold = resolve; });

  // Task 1: occupies the 1 active slot
  const t1 = cappedLimiter.execute(() => holdPromise);
  // Task 2: queued slot 1
  const t2 = cappedLimiter.execute(async () => 'task2');
  // Task 3: queued slot 2 (full now)
  const t3 = cappedLimiter.execute(async () => 'task3');

  // Task 4: exceeds maxQueueSize (2), must reject immediately
  let rejected = false;
  try {
    await cappedLimiter.execute(async () => 'task4');
  } catch (err: any) {
    rejected = true;
    assert(err.message.includes('capacidade máxima'), 'Queue overflow rejected with capacity message');
  }
  assert(rejected, 'Exceeding maxQueueSize immediately rejects task');
  releaseHold();
  await Promise.all([t1, t2, t3]);
  cappedLimiter.destroy();

  // 16.2: IpRateLimiter skip option for health checks (Docker healthcheck safety)
  const healthLimiter = new IpRateLimiter({
    windowMs: 5000,
    maxRequests: 1,
    skip: (req) => req.path === '/api/health',
  });

  const normalReq = { ip: '10.0.0.5', path: '/api/tse/live', headers: {}, socket: { remoteAddress: '10.0.0.5' } } as any;
  const healthReq = { ip: '10.0.0.5', path: '/api/health', headers: {}, socket: { remoteAddress: '10.0.0.5' } } as any;

  let normalBlocked = false;
  const healthRes = () => ({ setHeader() {}, status(c: number) { if (c === 429) normalBlocked = true; return this; }, json() {} });

  const mw = healthLimiter.getMiddleware();
  // 1st normal request: allowed
  mw(normalReq, healthRes() as any, () => {});
  // 2nd normal request: blocked (429)
  mw(normalReq, healthRes() as any, () => {});
  assert(normalBlocked, 'Normal API request blocked after maxRequests reached');

  // Health check request from same IP: SKIPPED (allowed through, next() called)
  let healthNextCalled = false;
  mw(healthReq, healthRes() as any, () => { healthNextCalled = true; });
  assert(healthNextCalled, 'Health check request is exempted from rate limiting to prevent Docker unhealthy status');
  healthLimiter.destroy();

  // 16.3: In-flight background revalidation returning valid data on cache miss
  const revalCache = new TseMemoryCache({ defaultTtlMs: 20, defaultStaleTtlMs: 100 });
  revalCache.set('stale_key', { count: 100 });
  await new Promise(r => setTimeout(r, 30)); // make it stale

  // Trigger stale fetch (starts background revalidation)
  const staleRes = await revalCache.fetchWithStaleWhileRevalidate('stale_key', async () => {
    await new Promise(r => setTimeout(r, 40));
    return { count: 200 };
  });
  assert(staleRes.isStale === true && staleRes.data.count === 100, 'Stale data returned immediately');

  // While background revalidation is in-flight, simulate an eviction / miss and verify it returns valid data, not undefined
  revalCache.invalidate('stale_key');
  const coalescedRes = await revalCache.fetchWithStaleWhileRevalidate('stale_key', async () => {
    return { count: 300 };
  });
  assert(coalescedRes.data !== undefined && typeof coalescedRes.data.count === 'number', 'In-flight coalescing returns valid object (not undefined)');

  // 16.4: Reverse Proxy IP normalization (IPv6 ::ffff: and multi-IP X-Forwarded-For)
  const proxyLimiter = new IpRateLimiter({ windowMs: 10000, maxRequests: 5 });
  const ipv6Req = { headers: {}, socket: { remoteAddress: '::ffff:192.168.1.100' } } as any;
  const multiProxyReq = { headers: { 'x-forwarded-for': '192.168.1.100, 10.0.0.1, 172.16.0.1' }, socket: {} } as any;

  let ip1Remaining = -1;
  const mwProxy = proxyLimiter.getMiddleware();
  mwProxy(ipv6Req, { setHeader(k: string, v: any) { if (k.toLowerCase() === 'x-ratelimit-remaining') ip1Remaining = parseInt(v); }, status() { return this; }, json() {} } as any, () => {});
  let ip2Remaining = -1;
  mwProxy(multiProxyReq, { setHeader(k: string, v: any) { if (k.toLowerCase() === 'x-ratelimit-remaining') ip2Remaining = parseInt(v); }, status() { return this; }, json() {} } as any, () => {});

  assert(ip1Remaining === 4, 'Initial request has remaining 4');
  assert(ip2Remaining === 3, 'Multi-IP forwarded header matched same normalized client IP (remaining 3)');
  proxyLimiter.destroy();

  // 16.5: Voting countries candidate leader filtering logic (Lula vs Flávio)
  const allCountries = Object.values(worldCountriesPost).filter(c => c.hasVoting && c.id !== 'br');
  const lulaLead = allCountries.filter(c => c.hasStarted && c.leaderNumber === '13');
  const flavioLead = allCountries.filter(c => c.hasStarted && c.leaderNumber === '22');
  assert(lulaLead.length > 0, `Lula leads in at least 1 foreign country (got ${lulaLead.length})`);
  assert(flavioLead.length > 0, `Flávio leads in at least 1 foreign country (got ${flavioLead.length})`);
  assert(lulaLead.length + flavioLead.length === allCountries.filter(c => c.hasStarted).length, 'All started countries lead by either Lula or Flávio');

  console.log('\n========================================');
  console.log('ALL VERIFICATION TESTS PASSED SUCCESSFULLY!');
  console.log('========================================');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
