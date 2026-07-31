// ============================================================
// CONFIGURAÇÃO DO DU BRASIL NEWS
// ============================================================
// Este arquivo concentra tudo que pode precisar mudar no futuro
// (chaves de API, listas de ativos, intervalos de atualização),
// para não precisar mexer no restante do código.
// ============================================================

const CONFIG = {
  // Token da brapi.dev (https://brapi.dev/dashboard) — opcional.
  // Usado apenas pelo histórico de ações do comparador (PETR4, VALE3,
  // ITUB4, MGLU3 funcionam sem token). Deixe em branco se não tiver.
  BRAPI_TOKEN: "",

  CRYPTOS: [
    { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
    { id: "ethereum", symbol: "ETH", name: "Ethereum" },
    { id: "solana", symbol: "SOL", name: "Solana" },
    { id: "binancecoin", symbol: "BNB", name: "BNB" },
    { id: "ripple", symbol: "XRP", name: "XRP" },
    { id: "cardano", symbol: "ADA", name: "Cardano" },
    { id: "dogecoin", symbol: "DOGE", name: "Dogecoin" },
  ],

  FX_CARDS: [
    { pair: "USD-BRL", name: "Dólar Americano", symbol: "USD/BRL" },
    { pair: "EUR-BRL", name: "Euro", symbol: "EUR/BRL" },
  ],

  REFRESH_INTERVAL_MS: 60000, // atualiza os dados a cada 60s
  CACHE_TTL_MS: 45000,        // evita repetir a mesma chamada em menos de 45s

  // Séries do SGS (Banco Central do Brasil) — API oficial, gratuita, sem chave.
  BCB_SERIES: {
    SELIC: 432,     // Meta Selic definida pelo Copom (% a.a.)
    IPCA_12M: 13522, // IPCA acumulado em 12 meses (%)
  },

  // Ativos disponíveis no comparador/simulador.
  // "stock" só funciona para os 4 tickers liberados sem token (ver FREE_STOCKS).
  COMPARATOR_ASSETS: [
    { type: "crypto", key: "bitcoin", label: "Bitcoin (BTC)" },
    { type: "crypto", key: "ethereum", label: "Ethereum (ETH)" },
    { type: "crypto", key: "solana", label: "Solana (SOL)" },
    { type: "crypto", key: "binancecoin", label: "BNB" },
    { type: "crypto", key: "ripple", label: "XRP" },
    { type: "crypto", key: "cardano", label: "Cardano (ADA)" },
    { type: "crypto", key: "dogecoin", label: "Dogecoin (DOGE)" },
    { type: "fx", key: "USD-BRL", label: "Dólar (USD/BRL)" },
    { type: "fx", key: "EUR-BRL", label: "Euro (EUR/BRL)" },
    { type: "stock", key: "PETR4", label: "PETR4 (Petrobras)" },
    { type: "stock", key: "VALE3", label: "VALE3 (Vale)" },
    { type: "stock", key: "ITUB4", label: "ITUB4 (Itaú)" },
    { type: "stock", key: "MGLU3", label: "MGLU3 (Magazine Luiza)" },
  ],
};
