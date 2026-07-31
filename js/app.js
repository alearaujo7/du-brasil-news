// ============================================================
// DU BRASIL NEWS — lógica da página
// ============================================================

const state = {
  stocks: [],       // mantido vazio: só existe para favoritos antigos não quebrarem
  fx: null,         // {USDBRL:{...}, EURBRL:{...}}
  fxCards: [],      // [{pair, name, symbol, price, changePercent, sparkline}]
  cryptos: [],      // [{id, symbol, name, image, rank, priceUsd, priceBrl, change24h, marketCap, sparkline}]
  favorites: [],    // [{type:'crypto', key:'bitcoin'}]
  fearGreed: null,  // {value, value_classification} ou null
  selic: null,      // número (%) ou null
  ipca: null,       // número (%) ou null
};

const comparatorState = {
  days: 90,
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
  const [fxRes, cryptoRes, fngRes, selicRes, ipcaRes, ...fxHistories] = await Promise.all([
    API.fetchExchangeRates(),
    API.fetchCryptoMarkets(),
    API.fetchFearGreed(),
    API.fetchSelic(),
    API.fetchIpca12m(),
    ...CONFIG.FX_CARDS.map((f) => API.fetchFxHistory(f.pair, 7)),
  ]);

  state.fx = fxRes.ok ? fxRes.data : null;
  state.fxError = !fxRes.ok;

  const fxKey = { "USD-BRL": "USDBRL", "EUR-BRL": "EURBRL" };
  state.fxCards = CONFIG.FX_CARDS.map((f, i) => {
    const quote = state.fx && state.fx[fxKey[f.pair]];
    const histRes = fxHistories[i];
    return {
      pair: f.pair,
      name: f.name,
      symbol: f.symbol,
      price: quote ? parseFloat(quote.bid) : null,
      changePercent: quote ? parseFloat(quote.pctChange) : null,
      sparkline: histRes && histRes.ok ? histRes.data.map((p) => p.value) : [],
    };
  });

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

  if (state.fearGreed) {
    const value = parseInt(state.fearGreed.value, 10);
    if (!Number.isNaN(value)) {
      parts.push(`O sentimento do mercado cripto está em "${FNG_LABELS[state.fearGreed.value_classification] || state.fearGreed.value_classification}" (${value}/100).`);
    }
  }

  const gainers = [...state.cryptos].filter((c) => c.change24h !== null).sort((a, b) => b.change24h - a.change24h);
  if (gainers.length) {
    const top = gainers[0];
    parts.push(`Entre as criptomoedas monitoradas, ${top.name} lidera as altas do dia.`);
  }

  const el = document.getElementById("today-summary");
  el.textContent = parts.length
    ? parts.join(" ")
    : "Ainda não há dados suficientes para gerar o resumo do mercado. Tente novamente em instantes.";
}

// ---------- Render: Câmbio ----------
function renderFxGrid() {
  const el = document.getElementById("fx-grid");
  if (!el) return;

  if (state.fxError) {
    el.innerHTML = `<div class="loading-row">Dados temporariamente indisponíveis.</div>`;
    return;
  }
  if (!state.fxCards.length) {
    el.innerHTML = `<div class="loading-row">Carregando câmbio…</div>`;
    return;
  }

  el.innerHTML = state.fxCards
    .map((f) => `
      <div class="crypto-card">
        <div class="cc-head">
          <div class="cc-title">
            <div>
              <div class="cc-name">${f.name}</div>
              <div class="cc-symbol">${f.symbol}</div>
            </div>
          </div>
        </div>
        <div class="cc-price">${f.price !== null ? fmtBRL.format(f.price) : "—"}</div>
        <div class="cc-sparkline">${sparklineSVG(f.sparkline)}</div>
        <div class="cc-change ${changeClass(f.changePercent)}">${arrow(f.changePercent)} ${fmtPercent(f.changePercent)} (dia)</div>
      </div>`)
    .join("");
}

// ---------- Render: rankings (cripto) ----------
function renderRankings() {
  const withChange = state.cryptos.filter((c) => c.change24h !== null);
  const sorted = [...withChange].sort((a, b) => b.change24h - a.change24h);
  const gainers = sorted.filter((c) => c.change24h > 0).slice(0, 5);
  const losers = [...sorted].reverse().filter((c) => c.change24h < 0).slice(0, 5);

  const gainersEl = document.getElementById("top-gainers");
  const losersEl = document.getElementById("top-losers");

  gainersEl.innerHTML = gainers.length
    ? gainers.map((c) => rankingItemHTML(c)).join("")
    : `<li class="loading-row">Nenhuma alta no momento.</li>`;

  losersEl.innerHTML = losers.length
    ? losers.map((c) => rankingItemHTML(c)).join("")
    : `<li class="loading-row">Nenhuma queda no momento.</li>`;
}

function rankingItemHTML(c) {
  return `
    <li>
      <span><span class="r-ticker">${c.symbol}</span><span class="r-price">${c.priceUsd !== null ? fmtUSD.format(c.priceUsd) : "—"}</span></span>
      <span class="${changeClass(c.change24h)}">${arrow(c.change24h)} ${fmtPercent(c.change24h)}</span>
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
  return state.cryptos.map((c) => ({ type: "crypto", key: c.id, label: c.symbol, sub: c.name }));
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
            <span class="s-type">Cripto</span>
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

  // delegação de eventos: estrelas de favorito e cliques em cards de cripto
  document.addEventListener("click", (e) => {
    const starBtn = e.target.closest(".star-btn");
    if (starBtn) {
      e.stopPropagation();
      toggleFavorite(starBtn.dataset.favType, starBtn.dataset.favKey, starBtn.dataset.favLabel);
      return;
    }
    const cryptoCard = e.target.closest(".crypto-card[data-crypto]");
    if (cryptoCard) {
      openDetail("crypto", cryptoCard.dataset.crypto);
    }
  });
}

// ---------- Comparador de investimentos ----------
// Calcula, para o mesmo período retrospectivo (ex: últimos 90 dias), quanto
// cada tipo de investimento realmente rendeu. Renda fixa usa dados oficiais
// do Banco Central; cripto e dólar usam o histórico real de preços.
function pctChangeFromHistory(res) {
  if (!res.ok || res.data.length < 2) return null;
  const first = res.data[0].value;
  const last = res.data[res.data.length - 1].value;
  return first ? ((last - first) / first) * 100 : null;
}

// Poupança: regra oficial (Lei 8.177/1991, com a alteração de 2012) — quando
// a Selic-meta está acima de 8,5% a.a., a poupança rende 0,5% ao mês + TR;
// caso contrário, rende 70% da Selic + TR. Aqui a TR é considerada 0% (tem
// ficado próxima disso na prática), o que é uma simplificação assumida.
function estimatePoupancaPct(selicAnual, days) {
  if (selicAnual === null) return null;
  const monthlyRate = selicAnual > 8.5 ? 0.005 : (selicAnual / 100 / 12) * 0.7;
  return (Math.pow(1 + monthlyRate, days / 30) - 1) * 100;
}

async function computeInvestmentReturns(days) {
  const [selicDailyRes, btcRes, ethRes, usdRes] = await Promise.all([
    API.fetchSelicDailyRange(days),
    API.fetchCryptoHistory("bitcoin", days),
    API.fetchCryptoHistory("ethereum", days),
    API.fetchFxHistory("USD-BRL", days),
  ]);

  const results = [];

  if (selicDailyRes.ok) {
    const acumulado = selicDailyRes.data.reduce((acc, d) => acc * (1 + parseFloat(d.valor) / 100), 1) - 1;
    results.push({ key: "cdi", label: "CDI / Tesouro Selic", pct: acumulado * 100 });
  } else {
    results.push({ key: "cdi", label: "CDI / Tesouro Selic", pct: null });
  }

  results.push({ key: "poupanca", label: "Poupança", pct: estimatePoupancaPct(state.selic, days) });
  results.push({ key: "bitcoin", label: "Bitcoin", pct: pctChangeFromHistory(btcRes) });
  results.push({ key: "ethereum", label: "Ethereum", pct: pctChangeFromHistory(ethRes) });
  results.push({ key: "dolar", label: "Dólar (USD/BRL)", pct: pctChangeFromHistory(usdRes) });

  return results;
}

function investRowHTML(r, amount, maxAbsPct) {
  if (r.pct === null || Number.isNaN(r.pct)) {
    return `
      <div class="invest-row">
        <div class="invest-label">${r.label}</div>
        <div class="invest-bar-track"><div class="invest-bar unavailable"></div></div>
        <div class="invest-value neutral">Dados indisponíveis</div>
      </div>`;
  }
  const widthPct = maxAbsPct > 0 ? Math.min(100, (Math.abs(r.pct) / maxAbsPct) * 100) : 0;
  const finalAmount = amount * (1 + r.pct / 100);
  return `
    <div class="invest-row">
      <div class="invest-label">${r.label}</div>
      <div class="invest-bar-track">
        <div class="invest-bar ${changeClass(r.pct)}" style="width:${widthPct}%"></div>
      </div>
      <div class="invest-value ${changeClass(r.pct)}">${arrow(r.pct)} ${fmtPercent(r.pct)} · ${fmtBRL.format(finalAmount)}</div>
    </div>`;
}

async function updateComparator() {
  const statusEl = document.getElementById("comparator-status");
  const listEl = document.getElementById("comparator-list");
  if (!statusEl || !listEl) return;

  const amount = parseFloat(document.getElementById("sim-amount").value) || 0;

  statusEl.classList.remove("hidden");
  statusEl.textContent = "Calculando…";

  // O try/finally garante que o spinner sempre some, mesmo se alguma
  // chamada de API travar, demorar demais ou falhar de um jeito inesperado.
  try {
    const results = await computeInvestmentReturns(comparatorState.days);
    const sorted = [...results].sort((a, b) => (b.pct ?? -Infinity) - (a.pct ?? -Infinity));
    const maxAbsPct = Math.max(0, ...results.filter((r) => r.pct !== null).map((r) => Math.abs(r.pct)));

    listEl.innerHTML = sorted.map((r) => investRowHTML(r, amount, maxAbsPct)).join("");
  } catch (err) {
    console.error("Erro no comparador:", err);
    listEl.innerHTML = `<p class="loading-row">Dados temporariamente indisponíveis.</p>`;
  } finally {
    statusEl.classList.add("hidden");
  }
}

function setupComparator() {
  const listEl = document.getElementById("comparator-list");
  if (!listEl) return;

  document.querySelectorAll(".period-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".period-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      comparatorState.days = parseInt(btn.dataset.days, 10);
      updateComparator();
    });
  });

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
  renderFxGrid();
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
