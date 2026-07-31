// ============================================================
// CAMADA DE INTEGRAÇÃO COM APIs
// ============================================================
// Todo acesso a dados externos passa por aqui. Se um dia for
// preciso trocar de provedor (ex: trocar a brapi.dev por outra
// API de ações), o resto do código não precisa mudar — só as
// funções deste arquivo.
//
// Nunca inventa dados: se uma chamada falhar, a função retorna
// { ok: false } e a tela mostra "Dados temporariamente indisponíveis".
// ============================================================

const API = (() => {
  const cache = new Map(); // key -> { data, expiresAt }

  async function cachedFetch(key, ttlMs, fetcher) {
    const hit = cache.get(key);
    if (hit && hit.expiresAt > Date.now()) {
      return hit.data;
    }
    const data = await fetcher();
    cache.set(key, { data, expiresAt: Date.now() + ttlMs });
    return data;
  }

  // Timeout de segurança: se a API travar ou demorar demais, a chamada
  // falha depois de alguns segundos em vez de deixar a tela carregando
  // para sempre.
  async function getJSON(url, timeoutMs = 12000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  // ---------- Câmbio (AwesomeAPI) ----------
  async function fetchExchangeRates() {
    try {
      const result = await cachedFetch("fx", CONFIG.CACHE_TTL_MS, async () => {
        return getJSON("https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL");
      });
      return { ok: true, data: result };
    } catch (err) {
      console.error("Erro ao buscar câmbio:", err);
      return { ok: false, error: err };
    }
  }

  // ---------- Criptomoedas (CoinGecko — gratuito, sem cadastro) ----------
  // /coins/markets traz, numa única chamada: logo, ranking por market cap,
  // variação 24h e um mini-histórico de 7 dias (sparkline) para cada moeda.
  async function fetchCryptoMarkets() {
    const ids = CONFIG.CRYPTOS.map((c) => c.id).join(",");
    try {
      const result = await cachedFetch("crypto-markets", CONFIG.CACHE_TTL_MS, async () => {
        const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&sparkline=true&price_change_percentage=24h`;
        return getJSON(url);
      });
      return { ok: true, data: Array.isArray(result) ? result : [] };
    } catch (err) {
      console.error("Erro ao buscar mercado de criptomoedas:", err);
      return { ok: false, error: err };
    }
  }

  // ---------- Índice de Medo e Ganância (alternative.me — gratuito, sem cadastro) ----------
  async function fetchFearGreed() {
    try {
      const result = await cachedFetch("fng", CONFIG.CACHE_TTL_MS, async () => {
        return getJSON("https://api.alternative.me/fng/?limit=1");
      });
      const item = (result.data || [])[0];
      return item ? { ok: true, data: item } : { ok: false };
    } catch (err) {
      console.error("Erro ao buscar índice de medo e ganância:", err);
      return { ok: false, error: err };
    }
  }

  // ---------- Economia Brasil (Banco Central — SGS, API oficial, gratuita, sem chave) ----------
  async function fetchBcbSeries(code, n) {
    const key = `bcb:${code}:${n}`;
    try {
      const result = await cachedFetch(key, CONFIG.CACHE_TTL_MS, async () => {
        return getJSON(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${code}/dados/ultimos/${n}?formato=json`);
      });
      return Array.isArray(result) && result.length ? { ok: true, data: result } : { ok: false };
    } catch (err) {
      console.error(`Erro ao buscar série ${code} do Banco Central:`, err);
      return { ok: false, error: err };
    }
  }

  async function fetchSelic() {
    return fetchBcbSeries(CONFIG.BCB_SERIES.SELIC, 1);
  }

  async function fetchIpca12m() {
    return fetchBcbSeries(CONFIG.BCB_SERIES.IPCA_12M, 1);
  }

  // ---------- Históricos para o comparador/simulador ----------
  async function fetchCryptoHistory(id, days) {
    const key = `crypto-hist:${id}:${days}`;
    try {
      const result = await cachedFetch(key, CONFIG.CACHE_TTL_MS, async () => {
        return getJSON(`https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=${days}`);
      });
      const points = (result.prices || []).map(([t, v]) => ({ date: new Date(t), value: v }));
      return points.length ? { ok: true, data: points } : { ok: false };
    } catch (err) {
      console.error("Erro ao buscar histórico de criptomoeda:", err);
      return { ok: false, error: err };
    }
  }

  async function fetchFxHistory(pair, days) {
    const key = `fx-hist:${pair}:${days}`;
    try {
      const result = await cachedFetch(key, CONFIG.CACHE_TTL_MS, async () => {
        return getJSON(`https://economia.awesomeapi.com.br/json/daily/${pair}/${days}`);
      });
      const points = Array.isArray(result)
        ? [...result].reverse().map((r) => ({ date: new Date(Number(r.timestamp) * 1000), value: parseFloat(r.bid) }))
        : [];
      return points.length ? { ok: true, data: points } : { ok: false };
    } catch (err) {
      console.error("Erro ao buscar histórico de câmbio:", err);
      return { ok: false, error: err };
    }
  }

  // Histórico de ações só é confiável para os 4 tickers de teste liberados
  // pela brapi.dev sem token (PETR4, VALE3, ITUB4, MGLU3). Se a resposta não
  // vier no formato esperado, retorna indisponível em vez de arriscar mostrar
  // um dado incorreto.
  async function fetchStockHistory(ticker, range) {
    const key = `stock-hist:${ticker}:${range}`;
    try {
      const result = await cachedFetch(key, CONFIG.CACHE_TTL_MS, async () => {
        const token = CONFIG.BRAPI_TOKEN ? `&token=${encodeURIComponent(CONFIG.BRAPI_TOKEN)}` : "";
        return getJSON(`https://brapi.dev/api/v2/stocks/historical?symbols=${ticker}&range=${range}&interval=1d${token}`);
      });
      const item = (result.results || [])[0];
      const raw = (item && item.historicalDataPrice) || [];
      const points = raw
        .filter((p) => p && p.date && (p.close ?? p.adjustedClose))
        .map((p) => ({ date: new Date(p.date * 1000), value: p.close ?? p.adjustedClose }));
      return points.length ? { ok: true, data: points } : { ok: false };
    } catch (err) {
      console.error("Erro ao buscar histórico de ação:", err);
      return { ok: false, error: err };
    }
  }

  return {
    fetchExchangeRates,
    fetchCryptoMarkets,
    fetchFearGreed,
    fetchSelic,
    fetchIpca12m,
    fetchCryptoHistory,
    fetchFxHistory,
    fetchStockHistory,
  };
})();
