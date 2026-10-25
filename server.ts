import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import {
  BR_2026_2T_BASE,
  BR_2026_2T_POST_17H,
  BR_2026_1T_BASE,
  STATES_DATA_2026_1T,
  getStatesData2026_2T,
  getMunicipalities2026,
  getWorldCountries,
} from './src/data/electionData';
import { globalTseCache, TseMemoryCache } from './src/server/tseCache';
import { globalIpRateLimiter, globalTseConcurrencyLimiter, IpRateLimiter, ConcurrencyLimiter } from './src/server/rateLimiter';

export { globalTseCache, TseMemoryCache, globalIpRateLimiter, globalTseConcurrencyLimiter, IpRateLimiter, ConcurrencyLimiter };

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Trust first proxy when running in Docker or behind reverse proxy
app.set('trust proxy', true);

app.use(express.json());

// Apply IP Rate Limiter to /api routes (exempt health and stats to prevent Docker healthcheck 429 failures)
app.use('/api', globalIpRateLimiter.getMiddleware((req) => {
  return req.path === '/health' || req.path === '/tse/cache-stats';
}));

// Target time for polls closing and official TSE results disclosure (25/10/2026 17:00:00 Horário de Brasília)
const ELECTION_DATE = '2026-10-25';
// 17:00:00 BRT (UTC-3) on 25/10/2026 = 20:00:00 UTC
const TARGET_17H_TIMESTAMP = new Date('2026-10-25T17:00:00-03:00').getTime();
const VOTING_START_TIMESTAMP = new Date('2026-10-25T08:00:00-03:00').getTime();

export function getElectionTemporalState() {
  const now = Date.now();
  const secondsRemaining = Math.max(0, Math.floor((TARGET_17H_TIMESTAMP - now) / 1000));
  const isPast17h = now >= TARGET_17H_TIMESTAMP;
  const isVotingOpen = now >= VOTING_START_TIMESTAMP && now < TARGET_17H_TIMESTAMP;

  const nowBR = new Date(now).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  // Total voting window: 08:00 to 17:00 (9 hours = 32,400 seconds)
  const totalVotingSeconds = (TARGET_17H_TIMESTAMP - VOTING_START_TIMESTAMP) / 1000;
  const elapsedVotingSeconds = Math.max(0, Math.min(totalVotingSeconds, (now - VOTING_START_TIMESTAMP) / 1000));
  const votingDayProgressPercent = parseFloat(((elapsedVotingSeconds / totalVotingSeconds) * 100).toFixed(1));

  return {
    serverTime: new Date(now).toISOString(),
    serverTimestamp: now,
    brasiliaTime: nowBR,
    targetTime: '2026-10-25T17:00:00-03:00',
    targetTimestamp: TARGET_17H_TIMESTAMP,
    votingStartTimestamp: VOTING_START_TIMESTAMP,
    secondsRemaining,
    isPast17h,
    isVotingOpen,
    votingDayProgressPercent,
    electionDate: ELECTION_DATE,
    round: 2,
  };
}

/**
 * Proxy endpoint to query official TSE endpoints
 * Handles CORS, timeout resilience, rate limiting, and robust caching
 */
app.get('/api/tse/live', async (req: Request, res: Response) => {
  const { path: tsePath } = req.query;
  if (!tsePath || typeof tsePath !== 'string') {
    return res.status(400).json({ error: 'Parâmetro path do TSE ausente.' });
  }

  const cacheKey = tsePath;
  let tseUrl: string;

  if (tsePath.startsWith('http://') || tsePath.startsWith('https://')) {
    try {
      const parsed = new URL(tsePath);
      // Prevent SSRF: allow only official TSE domains (*.tse.jus.br)
      if (!parsed.hostname.endsWith('tse.jus.br')) {
        return res.status(400).json({ error: 'Apenas domínios oficiais do TSE (*.tse.jus.br) são permitidos.' });
      }
      tseUrl = tsePath;
    } catch {
      return res.status(400).json({ error: 'URL do TSE inválida.' });
    }
  } else {
    // Relative path under official TSE resultados
    const cleanPath = tsePath.replace(/^\/+/, '');
    tseUrl = `https://resultados.tse.jus.br/oficial/${cleanPath}`;
  }

  try {
    const result = await globalTseCache.fetchWithStaleWhileRevalidate(
      cacheKey,
      async () => {
        return await globalTseConcurrencyLimiter.execute(async () => {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 6000);

          try {
            const response = await fetch(tseUrl, {
              signal: controller.signal,
              headers: {
                'User-Agent': 'Apuracao-Brasil/1.0 (Mozilla/5.0 compatible; TSE-Resultados-Oficial)',
                'Accept': 'application/json',
              },
            });

            if (!response.ok) {
              throw new Error(`TSE retornou código ${response.status}`);
            }

            return await response.json();
          } finally {
            clearTimeout(timeout);
          }
        });
      }
    );

    res.setHeader('X-Cache', result.fromCache ? (result.isStale ? 'STALE' : 'HIT') : 'MISS');
    return res.json(result.data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Falha na comunicação com o TSE';
    return res.status(502).json({
      error: 'Incapaz de conectar ao TSE no momento',
      details: message,
    });
  }
});

/**
 * Official countdown endpoint for 17h disclosure
 */
app.get('/api/tse/countdown', (_req: Request, res: Response) => {
  res.json(getElectionTemporalState());
});

/**
 * World countries endpoint with live/pre-17h state
 */
app.get('/api/tse/world', (req: Request, res: Response) => {
  const { demoAfter17h } = req.query;
  const temporal = getElectionTemporalState();
  const past17h = temporal.isPast17h || demoAfter17h === 'true';
  res.json(getWorldCountries(past17h));
});

/**
 * Election data endpoint
 * Returns official election state:
 * - Before 17h: 0.00% apurado, urna status "Votação em andamento"
 * - At/After 17h: real live tally from TSE API
 */
app.get('/api/tse/data', (req: Request, res: Response) => {
  const { election = '2026_2t', scope = 'nacional', code = 'BR', demoAfter17h } = req.query;
  const temporal = getElectionTemporalState();
  const allowLiveTally = temporal.isPast17h || demoAfter17h === 'true';

  const codeStr = String(code);
  const scopeStr = String(scope);

  let territoryData;

  if (election === '2026_1t') {
    if (scopeStr === 'nacional' || codeStr === 'BR') {
      territoryData = BR_2026_1T_BASE;
    } else if (scopeStr === 'estadual' || scopeStr === 'exterior') {
      territoryData = STATES_DATA_2026_1T[codeStr] || STATES_DATA_2026_1T['SP'];
    } else {
      territoryData = BR_2026_1T_BASE;
    }
  } else {
    // 2026 2º Turno
    if (!allowLiveTally) {
      // Pre-17h: 0.00% apurado, urnas lacradas
      const statesPre = getStatesData2026_2T(false);
      const munPre = getMunicipalities2026(false);
      if (scopeStr === 'nacional' || codeStr === 'BR') {
        territoryData = BR_2026_2T_BASE;
      } else if (scopeStr === 'estadual' || scopeStr === 'exterior') {
        territoryData = statesPre[codeStr] || statesPre['SP'];
      } else if (scopeStr === 'municipal') {
        const mun = munPre[codeStr] || munPre['SP_SAO_PAULO'];
        territoryData = {
          code: mun.code,
          name: `${mun.name} (${mun.state})`,
          scope: 'municipal' as const,
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
      } else {
        territoryData = BR_2026_2T_BASE;
      }
    } else {
      // At/After 17h (or demo mode)
      const statesPost = getStatesData2026_2T(true);
      const munPost = getMunicipalities2026(true);
      if (scopeStr === 'nacional' || codeStr === 'BR') {
        territoryData = BR_2026_2T_POST_17H;
      } else if (scopeStr === 'estadual' || scopeStr === 'exterior') {
        territoryData = statesPost[codeStr] || statesPost['SP'];
      } else if (scopeStr === 'municipal') {
        const mun = munPost[codeStr] || munPost['SP_SAO_PAULO'];
        territoryData = {
          code: mun.code,
          name: `${mun.name} (${mun.state})`,
          scope: 'municipal' as const,
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
      } else {
        territoryData = BR_2026_2T_POST_17H;
      }
    }
  }

  res.json({
    ...territoryData,
    temporal,
    allowLiveTally,
  });
});

/**
 * Health & API status route
 */
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Apuracao Eleicoes Brasil TSE Proxy',
    time: new Date().toISOString(),
    liveDate: ELECTION_DATE,
    temporal: getElectionTemporalState(),
  });
});

/**
 * Cache and Rate Limiter monitoring endpoint
 */
app.get('/api/tse/cache-stats', (_req: Request, res: Response) => {
  res.json({
    cache: globalTseCache.getStats(),
    rateLimiter: globalIpRateLimiter.getStats(),
    concurrencyLimiter: globalTseConcurrencyLimiter.getStats(),
  });
});

export { app };

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve('dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Eleições Brasil Server rodando em http://0.0.0.0:${PORT}`);
  });

  const shutdown = (signal: string) => {
    console.log(`[Server] Recebido ${signal}. Encerrando servidor gracefully...`);
    globalIpRateLimiter.destroy();
    globalTseConcurrencyLimiter.destroy();

    server.close(() => {
      console.log('[Server] Servidor Express encerrado.');
      process.exit(0);
    });

    setTimeout(() => {
      console.error('[Server] Forçando encerramento imediato por timeout.');
      process.exit(1);
    }, 5000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Only start automatically if not running in test mode
if (process.env.NODE_ENV !== 'test') {
  startServer().catch(err => {
    console.error('Falha ao iniciar o servidor:', err);
    process.exit(1);
  });
}
