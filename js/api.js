// ============================================================
// CAMADA DE INTEGRAÇÃO COM APIs
// ============================================================
// Todo acesso a dados externos passa por aqui. Se um dia for
// preciso trocar de provedor de dados, o resto do código não
// precisa mudar — só as funções deste arquivo.
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

  // ---------- Histórico de criptomoeda (para o gráfico do modal de detalhes) ----------
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

  // ---------- Histórico de câmbio (para sparklines) ----------
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

  return {
    fetchExchangeRates,
    fetchCryptoMarkets,
    fetchFearGreed,
    fetchCryptoHistory,
    fetchFxHistory,
  };
})();
