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

  async function getJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  // ---------- Ações da B3 (brapi.dev) ----------
  async function fetchStocks(tickers) {
    if (!tickers.length) return { ok: true, data: [] };
    const key = `stocks:${tickers.join(",")}`;
    try {
      const result = await cachedFetch(key, CONFIG.CACHE_TTL_MS, async () => {
        const token = CONFIG.BRAPI_TOKEN ? `&token=${encodeURIComponent(CONFIG.BRAPI_TOKEN)}` : "";
        const url = `https://brapi.dev/api/v2/stocks/quote?symbols=${tickers.join(",")}${token}`;
        return getJSON(url);
      });
      return { ok: true, data: result.results || [] };
    } catch (err) {
      console.error("Erro ao buscar ações:", err);
      return { ok: false, error: err };
    }
  }

  async function fetchIbovespa() {
    if (!CONFIG.BRAPI_TOKEN) {
      return { ok: false, error: "sem-token" };
    }
    try {
      const result = await cachedFetch("ibovespa", CONFIG.CACHE_TTL_MS, async () => {
        const url = `https://brapi.dev/api/v2/stocks/quote?symbols=${CONFIG.IBOVESPA_SYMBOL}&token=${encodeURIComponent(CONFIG.BRAPI_TOKEN)}`;
        return getJSON(url);
      });
      const item = (result.results || [])[0];
      return item ? { ok: true, data: item } : { ok: false };
    } catch (err) {
      console.error("Erro ao buscar Ibovespa:", err);
      return { ok: false, error: err };
    }
  }

  // ---------- Câmbio (AwesomeAPI — gratuito, sem cadastro) ----------
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
  async function fetchCryptos() {
    const ids = CONFIG.CRYPTOS.map((c) => c.id).join(",");
    try {
      const result = await cachedFetch("crypto", CONFIG.CACHE_TTL_MS, async () => {
        const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd,brl&include_24hr_change=true&include_market_cap=true`;
        return getJSON(url);
      });
      return { ok: true, data: result };
    } catch (err) {
      console.error("Erro ao buscar criptomoedas:", err);
      return { ok: false, error: err };
    }
  }

  return { fetchStocks, fetchIbovespa, fetchExchangeRates, fetchCryptos };
})();
