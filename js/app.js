// ============================================================
// DU BRASIL NEWS — lógica da página
// ============================================================

const state = {
  stocks: [],       // [{ticker, name, price, changePercent, ...raw}]
  ibovespa: null,   // {price, changePercent} ou null
  fx: null,         // {usd:{...}, eur:{...}}
  cryptos: [],      // [{id, symbol, name, priceUsd, priceBrl, change24h, marketCap}]
  favorites: [],    // [{type:'stock'|'crypto', key:'PETR4'}]
};

const fmtBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const fmtUSD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function fmtPercent(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function changeClass(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "neutral";
  if (value > 0) return "up";
  if (value < 0) return "down";
  return "neutral";
}

function arrow(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  return value > 0 ? "▲" : value < 0 ? "▼" : "•";
}

// ---------- Favoritos (localStorage) ----------
const FAV_KEY = "dubrasil_favorites";

function loadFavorites() {
  try {
    state.favorites = JSON.parse(localStorage.getItem(FAV_KEY)) || [];
  } catch {
    state.favorites = [];
  }
}

function saveFavorites() {
  localStorage.setItem(FAV_KEY, JSON.stringify(state.favorites));
}

function isFavorite(type, key) {
  return state.favorites.some((f) => f.type === type && f.key === key);
}

function toggleFavorite(type, key, label) {
  if (isFavorite(type, key)) {
    state.favorites = state.favorites.filter((f) => !(f.type === type && f.key === key));
  } else {
    state.favorites.push({ type, key, label });
  }
  saveFavorites();
  renderAll();
}

// ---------- Tema ----------
const THEME_KEY = "dubrasil_theme";

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || "dark";
  document.documentElement.setAttribute("data-theme", saved);
  document.getElementById("theme-toggle").textContent = saved === "dark" ? "🌙" : "☀️";
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem(THEME_KEY, next);
  document.getElementById("theme-toggle").textContent = next === "dark" ? "🌙" : "☀️";
}

// ---------- Status do mercado (B3) ----------
function getMarketStatus() {
  const now = new Date();
  const spTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const day = spTime.getDay(); // 0=domingo, 6=sábado
  const hour = spTime.getHours() + spTime.getMinutes() / 60;
  const isWeekday = day >= 1 && day <= 5;
  const isTradingHours = hour >= 10 && hour < 18;
  return isWeekday && isTradingHours;
}

function renderMarketStatus() {
  const el = document.getElementById("market-status");
  const open = getMarketStatus();
  el.textContent = open ? "Mercado aberto (B3)" : "Mercado fechado";
  el.className = `pill ${open ? "open" : "closed"}`;

  const now = new Date();
  document.getElementById("last-update-time").textContent = now.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------- Busca dos dados ----------
async function loadAllData() {
  const freeTickers = CONFIG.FREE_STOCKS.map((s) => s.ticker);
  const extraTickers = CONFIG.BRAPI_TOKEN ? CONFIG.EXTRA_STOCKS.map((s) => s.ticker) : [];
  const allTickers = [...freeTickers, ...extraTickers];
  const nameByTicker = Object.fromEntries(
    [...CONFIG.FREE_STOCKS, ...CONFIG.EXTRA_STOCKS].map((s) => [s.ticker, s.name])
  );

  const [stocksRes, ibovRes, fxRes, cryptoRes] = await Promise.all([
    API.fetchStocks(allTickers),
    API.fetchIbovespa(),
    API.fetchExchangeRates(),
    API.fetchCryptos(),
  ]);

  state.stocks = stocksRes.ok
    ? stocksRes.data.map((r) => {
        const d = r.data || {};
        return {
          ticker: r.symbol,
          name: nameByTicker[r.symbol] || d.shortName || r.symbol,
          price: d.regularMarketPrice ?? null,
          changePercent: d.regularMarketChangePercent ?? null,
          dayHigh: d.regularMarketDayHigh ?? null,
          dayLow: d.regularMarketDayLow ?? null,
          open: d.regularMarketOpen ?? null,
          previousClose: d.regularMarketPreviousClose ?? null,
        };
      })
    : [];
  state.stocksError = !stocksRes.ok;

  state.ibovespa =
    ibovRes.ok && ibovRes.data && ibovRes.data.data
      ? {
          price: ibovRes.data.data.regularMarketPrice ?? null,
          changePercent: ibovRes.data.data.regularMarketChangePercent ?? null,
        }
      : null;
  state.ibovespaUnavailableReason = ibovRes.ok ? null : ibovRes.error;

  state.fx = fxRes.ok ? fxRes.data : null;
  state.fxError = !fxRes.ok;

  state.cryptos = cryptoRes.ok
    ? CONFIG.CRYPTOS.map((c) => {
        const d = cryptoRes.data[c.id] || {};
        return {
          id: c.id,
          symbol: c.symbol,
          name: c.name,
          priceUsd: d.usd ?? null,
          priceBrl: d.brl ?? null,
          change24h: d.usd_24h_change ?? null,
          marketCap: d.usd_market_cap ?? null,
        };
      })
    : [];
  state.cryptoError = !cryptoRes.ok;
}

// ---------- Render: cards de resumo ----------
function renderSummaryCards() {
  const el = document.getElementById("summary-cards");
  const cards = [];

  // Ibovespa
  if (state.ibovespa) {
    cards.push(cardHTML("Ibovespa", fmtNumber(state.ibovespa.price), fmtPercent(state.ibovespa.changePercent), state.ibovespa.changePercent));
  } else {
    cards.push(unavailableCardHTML("Ibovespa", "Requer token gratuito da brapi.dev"));
  }

  // Dólar
  const usd = state.fx && state.fx.USDBRL;
  if (usd) {
    cards.push(cardHTML("Dólar (USD/BRL)", fmtBRL.format(parseFloat(usd.bid)), fmtPercent(parseFloat(usd.pctChange)), parseFloat(usd.pctChange)));
  } else {
    cards.push(unavailableCardHTML("Dólar (USD/BRL)", "Dados temporariamente indisponíveis"));
  }

  // Euro
  const eur = state.fx && state.fx.EURBRL;
  if (eur) {
    cards.push(cardHTML("Euro (EUR/BRL)", fmtBRL.format(parseFloat(eur.bid)), fmtPercent(parseFloat(eur.pctChange)), parseFloat(eur.pctChange)));
  } else {
    cards.push(unavailableCardHTML("Euro (EUR/BRL)", "Dados temporariamente indisponíveis"));
  }

  // Bitcoin
  const btc = state.cryptos.find((c) => c.id === "bitcoin");
  if (btc && btc.priceUsd) {
    cards.push(
      cardHTML(
        "Bitcoin",
        fmtUSD.format(btc.priceUsd),
        fmtPercent(btc.change24h),
        btc.change24h,
        btc.priceBrl ? fmtBRL.format(btc.priceBrl) : null
      )
    );
  } else {
    cards.push(unavailableCardHTML("Bitcoin", "Dados temporariamente indisponíveis"));
  }

  // Ethereum
  const eth = state.cryptos.find((c) => c.id === "ethereum");
  if (eth && eth.priceUsd) {
    cards.push(
      cardHTML(
        "Ethereum",
        fmtUSD.format(eth.priceUsd),
        fmtPercent(eth.change24h),
        eth.change24h,
        eth.priceBrl ? fmtBRL.format(eth.priceBrl) : null
      )
    );
  } else {
    cards.push(unavailableCardHTML("Ethereum", "Dados temporariamente indisponíveis"));
  }

  el.innerHTML = cards.join("");
}

function fmtNumber(value) {
  if (value === null || value === undefined) return "—";
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function cardHTML(label, price, changeLabel, changeValue, subLine) {
  return `
    <div class="summary-card">
      <div class="sc-label">${label}</div>
      <div class="sc-price">${price}</div>
      ${subLine ? `<div class="sc-sub">${subLine}</div>` : ""}
      <div class="sc-change ${changeClass(changeValue)}">${arrow(changeValue)} ${changeLabel}</div>
    </div>`;
}

function unavailableCardHTML(label, reason) {
  return `
    <div class="summary-card unavailable">
      <div class="sc-label">${label}</div>
      <div class="sc-price">Dados indisponíveis</div>
      <div class="sc-sub">${reason}</div>
    </div>`;
}

// ---------- Render: "Mercado hoje" ----------
function renderTodaySummary() {
  const parts = [];

  if (state.ibovespa) {
    const dir = state.ibovespa.changePercent > 0 ? "opera em alta" : state.ibovespa.changePercent < 0 ? "opera em queda" : "está estável";
    parts.push(`O Ibovespa ${dir} (${fmtPercent(state.ibovespa.changePercent)}) nesta sessão.`);
  }

  const usd = state.fx && state.fx.USDBRL;
  if (usd) {
    const pct = parseFloat(usd.pctChange);
    const dir = pct > 0 ? "sobe" : pct < 0 ? "recua" : "está estável";
    parts.push(`O dólar ${dir} frente ao real (${fmtPercent(pct)}).`);
  }

  const btc = state.cryptos.find((c) => c.id === "bitcoin");
  if (btc && btc.change24h !== null) {
    const dir = btc.change24h > 0 ? "valorização" : btc.change24h < 0 ? "desvalorização" : "estabilidade";
    parts.push(`Bitcoin apresenta ${dir} nas últimas 24 horas (${fmtPercent(btc.change24h)}).`);
  }

  const gainers = [...state.stocks].filter((s) => s.changePercent !== null).sort((a, b) => b.changePercent - a.changePercent);
  if (gainers.length) {
    const top = gainers[0];
    parts.push(`Entre as ações monitoradas, ${top.ticker} lidera as altas do dia.`);
  }

  const el = document.getElementById("today-summary");
  el.textContent = parts.length
    ? parts.join(" ")
    : "Ainda não há dados suficientes para gerar o resumo do mercado. Tente novamente em instantes.";
}

// ---------- Render: tabela de ações ----------
function renderStocksTable() {
  const tbody = document.getElementById("stocks-body");

  if (state.stocksError) {
    tbody.innerHTML = `<tr><td colspan="5" class="loading-row">Dados temporariamente indisponíveis.</td></tr>`;
    return;
  }
  if (!state.stocks.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="loading-row">Carregando cotações…</td></tr>`;
    return;
  }

  tbody.innerHTML = state.stocks
    .map((s) => {
      const fav = isFavorite("stock", s.ticker);
      return `
        <tr class="clickable-row" data-ticker="${s.ticker}">
          <td><button class="star-btn ${fav ? "active" : ""}" data-fav-type="stock" data-fav-key="${s.ticker}" data-fav-label="${s.ticker}" title="Favoritar">${fav ? "★" : "☆"}</button></td>
          <td class="ticker-cell">${s.ticker}</td>
          <td>${s.name}</td>
          <td>${s.price !== null ? fmtBRL.format(s.price) : "—"}</td>
          <td class="${changeClass(s.changePercent)}">${arrow(s.changePercent)} ${fmtPercent(s.changePercent)}</td>
        </tr>`;
    })
    .join("");
}

// ---------- Render: rankings ----------
function renderRankings() {
  const withChange = state.stocks.filter((s) => s.changePercent !== null);
  const sorted = [...withChange].sort((a, b) => b.changePercent - a.changePercent);
  const gainers = sorted.filter((s) => s.changePercent > 0).slice(0, 5);
  const losers = [...sorted].reverse().filter((s) => s.changePercent < 0).slice(0, 5);

  const gainersEl = document.getElementById("top-gainers");
  const losersEl = document.getElementById("top-losers");

  gainersEl.innerHTML = gainers.length
    ? gainers.map((s) => rankingItemHTML(s)).join("")
    : `<li class="loading-row">Nenhuma alta no momento.</li>`;

  losersEl.innerHTML = losers.length
    ? losers.map((s) => rankingItemHTML(s)).join("")
    : `<li class="loading-row">Nenhuma queda no momento.</li>`;
}

function rankingItemHTML(s) {
  return `
    <li>
      <span><span class="r-ticker">${s.ticker}</span><span class="r-price">${s.price !== null ? fmtBRL.format(s.price) : "—"}</span></span>
      <span class="${changeClass(s.changePercent)}">${arrow(s.changePercent)} ${fmtPercent(s.changePercent)}</span>
    </li>`;
}

// ---------- Render: cripto ----------
function renderCryptoGrid() {
  const el = document.getElementById("crypto-grid");

  if (state.cryptoError) {
    el.innerHTML = `<div class="loading-row">Dados temporariamente indisponíveis.</div>`;
    return;
  }
  if (!state.cryptos.length) {
    el.innerHTML = `<div class="loading-row">Carregando criptomoedas…</div>`;
    return;
  }

  el.innerHTML = state.cryptos
    .map((c) => {
      const fav = isFavorite("crypto", c.id);
      return `
        <div class="crypto-card clickable-row" data-crypto="${c.id}">
          <div class="cc-head">
            <div>
              <div class="cc-name">${c.name}</div>
              <div class="cc-symbol">${c.symbol}</div>
            </div>
            <button class="star-btn ${fav ? "active" : ""}" data-fav-type="crypto" data-fav-key="${c.id}" data-fav-label="${c.symbol}" title="Favoritar">${fav ? "★" : "☆"}</button>
          </div>
          <div class="cc-price">${c.priceUsd !== null ? fmtUSD.format(c.priceUsd) : "—"}</div>
          <div class="cc-price-brl">${c.priceBrl !== null ? fmtBRL.format(c.priceBrl) : "—"}</div>
          <div class="cc-change ${changeClass(c.change24h)}">${arrow(c.change24h)} ${fmtPercent(c.change24h)} (24h)</div>
          ${c.marketCap ? `<div class="cc-cap">Market cap: ${fmtUSD.format(c.marketCap)}</div>` : ""}
        </div>`;
    })
    .join("");
}

// ---------- Render: favoritos ----------
function renderFavorites() {
  const grid = document.getElementById("favorites-grid");
  const empty = document.getElementById("favorites-empty");

  if (!state.favorites.length) {
    grid.innerHTML = "";
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  grid.innerHTML = state.favorites
    .map((f) => {
      if (f.type === "stock") {
        const s = state.stocks.find((x) => x.ticker === f.key);
        return `
          <div class="favorite-card">
            <div>
              <div class="ticker-cell">${f.key}</div>
              <div class="sc-sub">${s && s.price !== null ? fmtBRL.format(s.price) : "—"}</div>
            </div>
            <span class="${s ? changeClass(s.changePercent) : "neutral"}">${s ? fmtPercent(s.changePercent) : "—"}</span>
          </div>`;
      }
      const c = state.cryptos.find((x) => x.id === f.key);
      return `
        <div class="favorite-card">
          <div>
            <div class="ticker-cell">${f.label}</div>
            <div class="sc-sub">${c && c.priceUsd !== null ? fmtUSD.format(c.priceUsd) : "—"}</div>
          </div>
          <span class="${c ? changeClass(c.change24h) : "neutral"}">${c ? fmtPercent(c.change24h) : "—"}</span>
        </div>`;
    })
    .join("");
}

// ---------- Busca ----------
function buildSearchIndex() {
  const stockItems = state.stocks.map((s) => ({ type: "stock", key: s.ticker, label: s.ticker, sub: s.name }));
  const cryptoItems = state.cryptos.map((c) => ({ type: "crypto", key: c.id, label: c.symbol, sub: c.name }));
  return [...stockItems, ...cryptoItems];
}

function setupSearch() {
  const input = document.getElementById("search-input");
  const box = document.getElementById("search-suggestions");

  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    if (!q) {
      box.classList.add("hidden");
      box.innerHTML = "";
      return;
    }
    const matches = buildSearchIndex()
      .filter((item) => item.label.toLowerCase().includes(q) || item.sub.toLowerCase().includes(q))
      .slice(0, 8);

    if (!matches.length) {
      box.innerHTML = `<div class="suggestion-item"><span>Nenhum resultado</span></div>`;
      box.classList.remove("hidden");
      return;
    }

    box.innerHTML = matches
      .map(
        (m) =>
          `<div class="suggestion-item" data-type="${m.type}" data-key="${m.key}">
            <span>${m.label} — ${m.sub}</span>
            <span class="s-type">${m.type === "stock" ? "Ação B3" : "Cripto"}</span>
          </div>`
      )
      .join("");
    box.classList.remove("hidden");
  });

  box.addEventListener("click", (e) => {
    const item = e.target.closest(".suggestion-item");
    if (!item || !item.dataset.type) return;
    openDetail(item.dataset.type, item.dataset.key);
    box.classList.add("hidden");
    input.value = "";
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-wrap")) box.classList.add("hidden");
  });
}

// ---------- Modal de detalhes ----------
function openDetail(type, key) {
  const overlay = document.getElementById("modal-overlay");
  const content = document.getElementById("modal-content");

  if (type === "stock") {
    const s = state.stocks.find((x) => x.ticker === key);
    if (!s) return;
    content.innerHTML = `
      <h3>${s.ticker}</h3>
      <p class="modal-sub">${s.name}</p>
      <div class="modal-grid">
        <div class="m-item"><div class="m-label">Preço atual</div><div class="m-value">${s.price !== null ? fmtBRL.format(s.price) : "—"}</div></div>
        <div class="m-item"><div class="m-label">Variação</div><div class="m-value ${changeClass(s.changePercent)}">${fmtPercent(s.changePercent)}</div></div>
        <div class="m-item"><div class="m-label">Máxima do dia</div><div class="m-value">${s.dayHigh !== null ? fmtBRL.format(s.dayHigh) : "—"}</div></div>
        <div class="m-item"><div class="m-label">Mínima do dia</div><div class="m-value">${s.dayLow !== null ? fmtBRL.format(s.dayLow) : "—"}</div></div>
        <div class="m-item"><div class="m-label">Abertura</div><div class="m-value">${s.open !== null ? fmtBRL.format(s.open) : "—"}</div></div>
        <div class="m-item"><div class="m-label">Fechamento anterior</div><div class="m-value">${s.previousClose !== null ? fmtBRL.format(s.previousClose) : "—"}</div></div>
      </div>`;
  } else {
    const c = state.cryptos.find((x) => x.id === key);
    if (!c) return;
    content.innerHTML = `
      <h3>${c.name}</h3>
      <p class="modal-sub">${c.symbol}</p>
      <div class="modal-grid">
        <div class="m-item"><div class="m-label">Preço (USD)</div><div class="m-value">${c.priceUsd !== null ? fmtUSD.format(c.priceUsd) : "—"}</div></div>
        <div class="m-item"><div class="m-label">Preço (BRL)</div><div class="m-value">${c.priceBrl !== null ? fmtBRL.format(c.priceBrl) : "—"}</div></div>
        <div class="m-item"><div class="m-label">Variação 24h</div><div class="m-value ${changeClass(c.change24h)}">${fmtPercent(c.change24h)}</div></div>
        <div class="m-item"><div class="m-label">Market cap</div><div class="m-value">${c.marketCap ? fmtUSD.format(c.marketCap) : "—"}</div></div>
      </div>`;
  }

  overlay.classList.remove("hidden");
}

function closeDetail() {
  document.getElementById("modal-overlay").classList.add("hidden");
}

// ---------- Eventos globais ----------
function setupEventListeners() {
  document.getElementById("theme-toggle").addEventListener("click", toggleTheme);
  document.getElementById("modal-close").addEventListener("click", closeDetail);
  document.getElementById("modal-overlay").addEventListener("click", (e) => {
    if (e.target.id === "modal-overlay") closeDetail();
  });

  document.getElementById("token-hint-link").addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("modal-content").innerHTML = `
      <h3>Ver mais ações da B3</h3>
      <p class="modal-sub">A brapi.dev libera 4 ações gratuitamente sem cadastro (PETR4, VALE3, ITUB4, MGLU3). Para ver o Ibovespa e as demais ações da lista, crie uma conta gratuita em <strong>brapi.dev/dashboard</strong>, copie seu token e cole em <code>js/config.js</code>, no campo <code>BRAPI_TOKEN</code>.</p>`;
    document.getElementById("modal-overlay").classList.remove("hidden");
  });

  // delegação de eventos: estrelas de favorito e cliques em linhas/cards
  document.addEventListener("click", (e) => {
    const starBtn = e.target.closest(".star-btn");
    if (starBtn) {
      e.stopPropagation();
      toggleFavorite(starBtn.dataset.favType, starBtn.dataset.favKey, starBtn.dataset.favLabel);
      return;
    }
    const stockRow = e.target.closest("tr[data-ticker]");
    if (stockRow) {
      openDetail("stock", stockRow.dataset.ticker);
      return;
    }
    const cryptoCard = e.target.closest(".crypto-card[data-crypto]");
    if (cryptoCard) {
      openDetail("crypto", cryptoCard.dataset.crypto);
    }
  });
}

// ---------- Orquestração ----------
function renderAll() {
  renderMarketStatus();
  renderSummaryCards();
  renderTodaySummary();
  renderStocksTable();
  renderRankings();
  renderCryptoGrid();
  renderFavorites();
}

async function refresh() {
  await loadAllData();
  renderAll();
}

async function init() {
  loadFavorites();
  initTheme();
  setupEventListeners();
  setupSearch();
  await refresh();
  setInterval(refresh, CONFIG.REFRESH_INTERVAL_MS);
  setInterval(renderMarketStatus, 30000);
}

document.addEventListener("DOMContentLoaded", init);
