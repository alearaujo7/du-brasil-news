// ============================================================
// DU BRASIL NEWS — lógica da página
// ============================================================

const state = {
  stocks: [],       // [{ticker, name, price, changePercent, ...raw}]
  ibovespa: null,   // {price, changePercent} ou null
  fx: null,         // {usd:{...}, eur:{...}}
  cryptos: [],      // [{id, symbol, name, image, rank, priceUsd, priceBrl, change24h, marketCap, sparkline}]
  favorites: [],    // [{type:'stock'|'crypto', key:'PETR4'}]
  fearGreed: null,  // {value, value_classification} ou null
  selic: null,      // número (%) ou null
  ipca: null,       // número (%) ou null
};

const comparatorState = {
  days: 7,
  chart: null,
  amountTimer: null,
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
  if (comparatorState.chart) updateComparator();
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

  const [stocksRes, ibovRes, fxRes, cryptoRes, fngRes, selicRes, ipcaRes] = await Promise.all([
    API.fetchStocks(allTickers),
    API.fetchIbovespa(),
    API.fetchExchangeRates(),
    API.fetchCryptoMarkets(),
    API.fetchFearGreed(),
    API.fetchSelic(),
    API.fetchIpca12m(),
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

  const usdBrlRate = state.fx && state.fx.USDBRL ? parseFloat(state.fx.USDBRL.bid) : null;

  state.cryptos = cryptoRes.ok
    ? cryptoRes.data.map((c) => ({
        id: c.id,
        symbol: (c.symbol || "").toUpperCase(),
        name: c.name,
        image: c.image || null,
        rank: c.market_cap_rank ?? null,
        priceUsd: c.current_price ?? null,
        priceBrl: c.current_price !== null && c.current_price !== undefined && usdBrlRate
          ? c.current_price * usdBrlRate
          : null,
        change24h: c.price_change_percentage_24h ?? null,
        marketCap: c.market_cap ?? null,
        sparkline: (c.sparkline_in_7d && c.sparkline_in_7d.price) || [],
      }))
    : [];
  state.cryptoError = !cryptoRes.ok;

  state.fearGreed = fngRes.ok ? fngRes.data : null;

  state.selic = selicRes.ok ? parseFloat(selicRes.data[selicRes.data.length - 1].valor) : null;
  state.ipca = ipcaRes.ok ? parseFloat(ipcaRes.data[ipcaRes.data.length - 1].valor) : null;
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

// ---------- Sparklines (mini gráfico em SVG, sem dependências) ----------
function sparklineSVG(prices, width = 110, height = 34) {
  if (!prices || prices.length < 2) return "";
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const step = width / (prices.length - 1);
  const points = prices
    .map((p, i) => `${(i * step).toFixed(1)},${(height - ((p - min) / range) * height).toFixed(1)}`)
    .join(" ");
  const trendUp = prices[prices.length - 1] >= prices[0];
  return `<svg class="sparkline ${trendUp ? "up" : "down"}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none"><polyline points="${points}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
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
            <div class="cc-title">
              ${c.image ? `<img class="cc-logo" src="${c.image}" alt="" loading="lazy">` : ""}
              <div>
                <div class="cc-name">${c.name}${c.rank ? `<span class="cc-rank">#${c.rank}</span>` : ""}</div>
                <div class="cc-symbol">${c.symbol}</div>
              </div>
            </div>
            <button class="star-btn ${fav ? "active" : ""}" data-fav-type="crypto" data-fav-key="${c.id}" data-fav-label="${c.symbol}" title="Favoritar">${fav ? "★" : "☆"}</button>
          </div>
          <div class="cc-price">${c.priceUsd !== null ? fmtUSD.format(c.priceUsd) : "—"}</div>
          <div class="cc-price-brl">${c.priceBrl !== null ? fmtBRL.format(c.priceBrl) : "—"}</div>
          <div class="cc-sparkline">${sparklineSVG(c.sparkline)}</div>
          <div class="cc-change ${changeClass(c.change24h)}">${arrow(c.change24h)} ${fmtPercent(c.change24h)} (24h)</div>
          ${c.marketCap ? `<div class="cc-cap">Market cap: ${fmtUSD.format(c.marketCap)}</div>` : ""}
        </div>`;
    })
    .join("");
}

// ---------- Render: Índice de Medo e Ganância ----------
const FNG_LABELS = {
  "Extreme Fear": "Medo extremo",
  Fear: "Medo",
  Neutral: "Neutro",
  Greed: "Ganância",
  "Extreme Greed": "Ganância extrema",
};

function renderFearGreed() {
  const valueEl = document.getElementById("fng-value");
  const labelEl = document.getElementById("fng-label");
  const needle = document.getElementById("fng-needle");
  if (!valueEl) return;

  if (!state.fearGreed) {
    valueEl.textContent = "—";
    labelEl.textContent = "Dados indisponíveis";
    needle.setAttribute("transform", "rotate(0 100 110)");
    return;
  }

  const value = parseInt(state.fearGreed.value, 10);
  valueEl.textContent = Number.isNaN(value) ? "—" : value;
  labelEl.textContent = FNG_LABELS[state.fearGreed.value_classification] || state.fearGreed.value_classification;

  const angle = -90 + (Math.max(0, Math.min(100, value)) / 100) * 180;
  needle.setAttribute("transform", `rotate(${angle} 100 110)`);
}

// ---------- Render: Economia Brasil ----------
function renderEconomia() {
  const selicEl = document.getElementById("econ-selic");
  const ipcaEl = document.getElementById("econ-ipca");
  const realEl = document.getElementById("econ-real");
  if (!selicEl) return;

  selicEl.textContent = state.selic !== null ? `${state.selic.toFixed(2).replace(".", ",")}%` : "Indisponível";
  ipcaEl.textContent = state.ipca !== null ? `${state.ipca.toFixed(2).replace(".", ",")}%` : "Indisponível";

  if (state.selic !== null && state.ipca !== null) {
    const real = state.selic - state.ipca;
    realEl.textContent = `${real > 0 ? "+" : ""}${real.toFixed(2).replace(".", ",")}%`;
    realEl.className = `sc-price ${changeClass(real)}`;
  } else {
    realEl.textContent = "Indisponível";
    realEl.className = "sc-price";
  }
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
      <p class="modal-sub">A brapi.dev libera 4 ações sem cadastro e sem custo (PETR4, VALE3, ITUB4, MGLU3) — é o que este painel usa hoje. Para ver o Ibovespa e as demais ações da lista, a brapi.dev exige atualmente um plano pago (a partir de R$ 99,99/mês, com garantia de reembolso em 7 dias). Se um dia decidir assinar, é só colar o token gerado no dashboard em <code>js/config.js</code>, no campo <code>BRAPI_TOKEN</code>.</p>`;
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

// ---------- Comparador & simulador de ativos ----------
function assetValue(type, key) {
  return `${type}:${key}`;
}

function findComparatorAsset(value) {
  const [type, key] = value.split(":");
  return CONFIG.COMPARATOR_ASSETS.find((a) => a.type === type && a.key === key) || { type, key, label: value };
}

function populateComparatorSelects() {
  const selectA = document.getElementById("asset-a");
  const selectB = document.getElementById("asset-b");
  if (!selectA || !selectB) return;

  const options = CONFIG.COMPARATOR_ASSETS.map(
    (a) => `<option value="${assetValue(a.type, a.key)}">${a.label}</option>`
  ).join("");

  selectA.innerHTML = options;
  selectB.innerHTML = `<option value="">Nenhum</option>${options}`;
  selectA.value = assetValue("crypto", "bitcoin");
  selectB.value = assetValue("fx", "USD-BRL");
}

function downsample(points, maxPoints = 300) {
  if (points.length <= maxPoints) return points;
  const step = Math.ceil(points.length / maxPoints);
  return points.filter((_, i) => i % step === 0);
}

async function fetchAssetHistory(type, key, days) {
  if (type === "crypto") return API.fetchCryptoHistory(key, days);
  if (type === "fx") return API.fetchFxHistory(key, days);
  if (type === "stock") {
    const rangeMap = { 7: "5d", 30: "1mo", 90: "3mo" };
    return API.fetchStockHistory(key, rangeMap[days] || "1mo");
  }
  return { ok: false };
}

function normalizeSeries(points) {
  if (!points.length) return [];
  const base = points[0].value;
  return points.map((p) => ({ date: p.date, pct: base ? ((p.value - base) / base) * 100 : 0 }));
}

async function updateComparator() {
  const selectA = document.getElementById("asset-a");
  const selectB = document.getElementById("asset-b");
  const statusEl = document.getElementById("comparator-status");
  const tableBody = document.getElementById("comparator-body");
  if (!selectA) return;

  const amount = parseFloat(document.getElementById("sim-amount").value) || 0;
  const selections = [selectA.value, selectB.value].filter(Boolean);
  if (!selections.length) return;

  statusEl.classList.remove("hidden");
  statusEl.textContent = "Carregando histórico…";
  tableBody.innerHTML = `<tr><td colspan="3" class="loading-row">Carregando…</td></tr>`;

  const assets = selections.map(findComparatorAsset);
  const results = await Promise.all(assets.map((a) => fetchAssetHistory(a.type, a.key, comparatorState.days)));

  const colors = ["#6d8bff", "#f5b731"];
  const datasets = [];
  const rows = [];

  results.forEach((res, i) => {
    const asset = assets[i];
    if (!res.ok || !res.data.length) {
      rows.push(`<tr><td class="ticker-cell">${asset.label}</td><td colspan="2" class="neutral">Dados indisponíveis</td></tr>`);
      return;
    }
    const points = downsample(res.data);
    const normalized = normalizeSeries(points);
    const pctChange = normalized[normalized.length - 1].pct;
    const resultAmount = amount * (1 + pctChange / 100);

    datasets.push({
      label: asset.label,
      data: normalized.map((p) => ({ x: p.date.getTime(), y: p.pct })),
      borderColor: colors[i] || "#8b93a3",
      backgroundColor: colors[i] || "#8b93a3",
      tension: 0.25,
      pointRadius: 0,
      borderWidth: 2,
    });

    rows.push(`
      <tr>
        <td class="ticker-cell">${asset.label}</td>
        <td class="${changeClass(pctChange)}">${arrow(pctChange)} ${fmtPercent(pctChange)}</td>
        <td>${fmtBRL.format(resultAmount)}</td>
      </tr>`);
  });

  tableBody.innerHTML = rows.length ? rows.join("") : `<tr><td colspan="3" class="loading-row">Dados indisponíveis.</td></tr>`;
  statusEl.classList.add("hidden");
  renderComparatorChart(datasets);
}

function renderComparatorChart(datasets) {
  const canvas = document.getElementById("comparator-chart");
  if (!canvas || typeof Chart === "undefined") return;

  if (comparatorState.chart) {
    comparatorState.chart.destroy();
    comparatorState.chart = null;
  }
  if (!datasets.length) return;

  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  const gridColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const textColor = isDark ? "#8b93a3" : "#676d7d";

  comparatorState.chart = new Chart(canvas.getContext("2d"), {
    type: "line",
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      scales: {
        x: {
          type: "linear",
          grid: { color: gridColor },
          ticks: {
            color: textColor,
            callback: (val) => new Date(val).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
          },
        },
        y: {
          grid: { color: gridColor },
          ticks: { color: textColor, callback: (v) => `${v}%` },
        },
      },
      plugins: {
        legend: { labels: { color: textColor } },
        tooltip: {
          callbacks: {
            title: (items) => new Date(items[0].parsed.x).toLocaleDateString("pt-BR"),
            label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)}%`,
          },
        },
      },
    },
  });
}

function setupComparator() {
  const selectA = document.getElementById("asset-a");
  if (!selectA) return;

  populateComparatorSelects();

  document.querySelectorAll(".period-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".period-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      comparatorState.days = parseInt(btn.dataset.days, 10);
      updateComparator();
    });
  });

  selectA.addEventListener("change", updateComparator);
  document.getElementById("asset-b").addEventListener("change", updateComparator);
  document.getElementById("sim-amount").addEventListener("input", () => {
    clearTimeout(comparatorState.amountTimer);
    comparatorState.amountTimer = setTimeout(updateComparator, 400);
  });

  updateComparator();
}

// ---------- Orquestração ----------
function renderAll() {
  renderMarketStatus();
  renderSummaryCards();
  renderTodaySummary();
  renderStocksTable();
  renderRankings();
  renderCryptoGrid();
  renderFearGreed();
  renderEconomia();
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
  setupComparator();
  setInterval(refresh, CONFIG.REFRESH_INTERVAL_MS);
  setInterval(renderMarketStatus, 30000);
}

document.addEventListener("DOMContentLoaded", init);
