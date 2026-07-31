// ============================================================
// CONFIGURAÇÃO DO DU BRASIL NEWS
// ============================================================
// Este arquivo concentra tudo que pode precisar mudar no futuro
// (chaves de API, listas de ativos, intervalos de atualização),
// para não precisar mexer no restante do código.
// ============================================================

const CONFIG = {
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
    SELIC: 432,        // Meta Selic definida pelo Copom (% a.a.)
    IPCA_12M: 13522,   // IPCA acumulado em 12 meses (%)
    SELIC_DIARIA: 11,  // Taxa Selic efetiva diária (% a.d.) — usada no comparador de investimentos
  },
};
