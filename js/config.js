// ============================================================
// CONFIGURAÇÃO DO DU BRASIL NEWS
// ============================================================
// Este arquivo concentra tudo que pode precisar mudar no futuro
// (chaves de API, listas de ativos, intervalos de atualização),
// para não precisar mexer no restante do código.
// ============================================================

const CONFIG = {
  // Token gratuito da brapi.dev (https://brapi.dev/dashboard).
  // Sem token, o painel mostra as 4 ações liberadas para teste
  // (PETR4, VALE3, ITUB4, MGLU3) e o Ibovespa fica indisponível.
  // Com um token gratuito, você libera o Ibovespa e as demais
  // ações da lista abaixo.
  BRAPI_TOKEN: "",

  // Ações que a brapi.dev libera SEM token (uso de teste).
  FREE_STOCKS: [
    { ticker: "PETR4", name: "Petrobras" },
    { ticker: "VALE3", name: "Vale" },
    { ticker: "ITUB4", name: "Itaú Unibanco" },
    { ticker: "MGLU3", name: "Magazine Luiza" },
  ],

  // Ações extras — só carregam se BRAPI_TOKEN estiver preenchido.
  EXTRA_STOCKS: [
    { ticker: "BBAS3", name: "Banco do Brasil" },
    { ticker: "WEGE3", name: "WEG" },
    { ticker: "BBDC4", name: "Bradesco" },
    { ticker: "ABEV3", name: "Ambev" },
    { ticker: "PRIO3", name: "PRIO" },
    { ticker: "RENT3", name: "Localiza" },
  ],

  IBOVESPA_SYMBOL: "^BVSP",

  CRYPTOS: [
    { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
    { id: "ethereum", symbol: "ETH", name: "Ethereum" },
    { id: "solana", symbol: "SOL", name: "Solana" },
    { id: "binancecoin", symbol: "BNB", name: "BNB" },
    { id: "ripple", symbol: "XRP", name: "XRP" },
    { id: "cardano", symbol: "ADA", name: "Cardano" },
    { id: "dogecoin", symbol: "DOGE", name: "Dogecoin" },
  ],

  REFRESH_INTERVAL_MS: 60000, // atualiza os dados a cada 60s
  CACHE_TTL_MS: 45000,        // evita repetir a mesma chamada em menos de 45s
};
