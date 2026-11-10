  const KEY_STORAGE = "alpacca_admin_key";
  let adminKey = "";

  const loginBox = document.getElementById("login-box");
  const toolbar = document.getElementById("toolbar");
  const ordersEl = document.getElementById("orders");
  const statusEl = document.getElementById("status");
  const emptyEl = document.getElementById("empty");
  const historyEl = document.getElementById("history");
  const historyTitleEl = document.getElementById("history-title");
  const historyEmptyEl = document.getElementById("history-empty");
  const filtersEl = document.getElementById("filters");
  const filterSearchEl = document.getElementById("filter-search");
  const filterCountEl = document.getElementById("filter-count");
  const statusTabsEl = document.getElementById("status-tabs");
  const timeTabsEl = document.getElementById("time-tabs");
  const bucketTabsEl = document.getElementById("bucket-tabs");

  let allOrders = [];
  let filteredOrders = [];
  let currentStatus = "";
  let currentRange = "all";
  // Lo que hay escrito en el buscador (ya en minúsculas), para resaltar en
  // amarillo el producto que coincide dentro de cada pedido -- si no, con
  // pedidos de muchos artículos es difícil ver cuál fue el que hizo match.
  let currentSearchTerm = "";
  // Tarjetas que la usuaria abrió (historial) o cerró (por confirmar), para
  // que no se reacomoden solas cada vez que se vuelve a pintar la lista.
  const openCards = new Set();
  const closedPendingCards = new Set();

  // SKU -> { marca, precio (de transferencia) }, para pedidos guardados
  // ANTES de que el sitio empezara a guardar esos datos en cada artículo
  // (ver app.js cartItemsForOrder). Se arma leyendo el mismo catálogo (y
  // la hoja de Stock) que usa la tienda -- si un SKU ya no existe en
  // ninguna de las dos, ese artículo se queda con lo que ya traía guardado
  // (o sin marca / con el precio que se cobró, en el peor caso). Nota: es
  // el precio ACTUAL del catálogo, así que en pedidos muy viejos donde ya
  // cambiaste el precio puede no coincidir exacto con el de ese día.
  const CATALOG_CSV_URL_FOR_MARCA = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQKHS0v5DGhx8RjW3XOcBxJL4RzNtVof_psSTBs6fZrScYofhRU5nTcEYYBS3u0V-EzMJXR2L5SZcyE/pub?gid=114583060&single=true&output=csv";
  const STOCK_CSV_URL_FOR_MARCA = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQKHS0v5DGhx8RjW3XOcBxJL4RzNtVof_psSTBs6fZrScYofhRU5nTcEYYBS3u0V-EzMJXR2L5SZcyE/pub?gid=2144351337&single=true&output=csv";
  let skuToInfo = new Map();

  // Mismo CSV "Config" (clave | valor) que usa app.js para calcular el
  // "Precio Tarjeta" del catálogo -- aquí se lee el mismo % para
  // autocompletar el campo "Precio tarjeta" del formulario de "Agregar
  // producto en Stock" en cuanto se escribe el precio de transferencia.
  const CONFIG_CSV_URL_FOR_CARD_PCT = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQKHS0v5DGhx8RjW3XOcBxJL4RzNtVof_psSTBs6fZrScYofhRU5nTcEYYBS3u0V-EzMJXR2L5SZcyE/pub?gid=442348645&single=true&output=csv";
  const CARD_PCT_KEY_ALIASES = ["descuentoportransferencia", "descuentotransferencia", "descuentoportransferenciaporciento"];
  let cardSurchargePct = null;
  // Tipo de cambio, comisión y arancel de Config: para estimar el costo y
  // la ganancia de cada pedido, y el precio al editar el catálogo.
  // costRate: "Dólar que pagas a ABW" (Config). Si está, la ganancia usa
  // ese dólar para el costo; exchangeRate es el que ven las clientas.
  const pricingConfig = { exchangeRate: 0, costRate: 0, comisionPct: 0, arancelPct: 0 };
  // true en cuanto la usuaria escribe algo ELLA MISMA en "Precio tarjeta"
  // -- a partir de ahí se deja de autocompletar ese campo, para no pisar
  // un precio que decidió poner a mano. Se resetea al abrir/limpiar el
  // formulario (ver toggleAddStockForm/resetStockForm más abajo).
  let tarjetaManuallyEdited = false;

  async function loadCardSurchargePct() {
    try {
      const res = await fetch(CONFIG_CSV_URL_FOR_CARD_PCT, { cache: "no-store" });
      if (!res.ok) return;
      const rows = parseCSVForMarca(await res.text());
      for (const r of rows) {
        const key = (r[0] || "").toString().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
        const num = parseFloat((r[1] || "").replace(/[^0-9.,-]/g, "").replace(",", "."));
        if (Number.isNaN(num)) continue;
        if (CARD_PCT_KEY_ALIASES.includes(key)) cardSurchargePct = num;
        if (["tipodecambio", "tipocambio", "exchangerate", "dolar", "usdmxn"].includes(key)) pricingConfig.exchangeRate = num;
        if (key.startsWith("comisionkbeauty")) pricingConfig.comisionPct = num;
        if (key.startsWith("arancel")) pricingConfig.arancelPct = num;
        if (key === "dolarquepagasaabw") pricingConfig.costRate = num;
      }
      if (currentView === "inicio") renderHome();
      // Para que las tarjetas de pedido ya muestren la ganancia.
      if (allOrders.length && currentView !== "pedidos" && currentView !== "corea") applyFilters();
    } catch (err) {
      // Sin esto, el campo "Precio tarjeta" simplemente se sigue llenando
      // a mano como antes -- no rompe nada.
    }
  }

  function autoFillPrecioTarjeta() {
    if (tarjetaManuallyEdited || cardSurchargePct == null) return;
    const precioEl = document.getElementById("stock-precio");
    const tarjetaEl = document.getElementById("stock-precio-tarjeta");
    const precio = Number(precioEl.value);
    if (!precio || precio <= 0) { tarjetaEl.value = ""; return; }
    tarjetaEl.value = Math.ceil(precio * (1 + cardSurchargePct / 100));
  }

  function resetTarjetaAutoFill() {
    tarjetaManuallyEdited = false;
  }

  // Lista para el autocompletado de "+ Agregar producto" (ver
  // editItemRowHTML / initProductAutocomplete más abajo) -- se arma con
  // los mismos dos CSV de arriba, sin pedir nada extra por separado.
  let productSearchList = [];
  // Renglones del catálogo principal (para la sección Catálogo).
  let catalogRows = [];

  /* "1,234.50" -> "1234.50" y "56,32" -> "56.32" (igual que app.js). */
  function normalizeMoneyText(raw) {
    const cleaned = String(raw || "").replace(/[^0-9.,]/g, "");
    const lastDot = cleaned.lastIndexOf(".");
    const lastComma = cleaned.lastIndexOf(",");
    if (lastDot === -1 && lastComma === -1) return cleaned;
    if (lastComma > lastDot) return cleaned.replace(/\./g, "").replace(",", ".");
    return cleaned.replace(/,/g, "");
  }

  function normalizeForSearch(s) {
    return (s || "").toString().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  function parseCSVForMarca(text) {
    const rows = [];
    let row = [], field = "", inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
        else field += c;
      } else if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (c === "\r") { /* ignorar */ }
      else field += c;
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    return rows.filter((r) => r.some((f) => f.trim() !== ""));
  }

  function addSkuInfoFromCSV(text, { isStock = false } = {}) {
    const rows = parseCSVForMarca(text);
    if (!rows.length) return;
    const headers = rows[0].map((h) => h.trim().toLowerCase());
    const iSku = headers.findIndex((h) => ["sku", "codigo", "código"].includes(h));
    const iMarca = headers.findIndex((h) => ["marca", "brand", "marca (opcional)"].includes(h));
    const iPrecio = headers.findIndex((h) => ["precio", "precio mxn", "price"].includes(h));
    const iPeso = headers.findIndex((h) => ["peso", "peso (kg)", "peso kg", "peso kg (opcional)"].includes(h));
    const iNombre = headers.findIndex((h) => ["nombre", "producto", "nombre (solo si es producto nuevo)"].includes(h));
    const iUsd = headers.indexOf("precio usd");
    const iCostoMxn = headers.indexOf("costo mxn");
    const iTarjeta = headers.indexOf("precio tarjeta");
    const iDisp = headers.indexOf("disponible");
    const iImg = headers.indexOf("imagen");
    const iImgAny = iImg >= 0 ? iImg : headers.findIndex((h) => h.startsWith("imagen (opcional"));
    const iPres = headers.indexOf("presentacion");
    if (iSku < 0) return;
    rows.slice(1).forEach((r) => {
      const sku = (r[iSku] || "").trim();
      if (!sku) return;
      const marca = iMarca >= 0 ? (r[iMarca] || "").trim() : "";
      const precioRaw = iPrecio >= 0 ? (r[iPrecio] || "").replace(/[^0-9.,]/g, "").replace(",", ".") : "";
      const precio = parseFloat(precioRaw) || 0;
      const pesoRaw = iPeso >= 0 ? (r[iPeso] || "").replace(/[^0-9.,]/g, "").replace(",", ".") : "";
      const peso = parseFloat(pesoRaw) || 0;
      const prev = skuToInfo.get(sku) || {};
      const num = (i) => (i >= 0 ? parseFloat(normalizeMoneyText(r[i])) || 0 : 0);
      skuToInfo.set(sku, {
        marca: marca || prev.marca || "",
        precio: precio || prev.precio || 0,
        peso: peso || prev.peso || 0,
        costoUSD: prev.costoUSD || num(iUsd),
        costoMXN: prev.costoMXN || num(iCostoMxn),
        imagen: prev.imagen || (iImgAny >= 0 ? (r[iImgAny] || "").trim() : ""),
      });
      if (!isStock && iNombre >= 0 && (r[iNombre] || "").trim()) {
        catalogRows.push({
          sku,
          nombre: (r[iNombre] || "").trim(),
          marca,
          precioUSD: num(iUsd),
          precio,
          precioTarjeta: num(iTarjeta),
          disponible: iDisp >= 0 ? ((r[iDisp] || "").trim().toUpperCase() || "SI") : "SI",
          imagen: iImg >= 0 ? (r[iImg] || "").trim() : "",
          presentacion: iPres >= 0 ? (r[iPres] || "").trim() : "",
        });
      }

      const nombre = iNombre >= 0 ? (r[iNombre] || "").trim() : "";
      if (nombre) {
        productSearchList.push({ nombre, sku, marca, precio, enStock: isStock });
      }
    });
  }

  async function loadSkuMarcaMap() {
    // allSettled a propósito: si una de las dos hojas falla o tarda, la
    // otra igual se aprovecha -- no queremos perder TODO por un solo
    // fetch fallido.
    const results = await Promise.allSettled([
      fetch(CATALOG_CSV_URL_FOR_MARCA, { cache: "no-store" }).then((r) => (r.ok ? r.text() : null)),
      fetch(STOCK_CSV_URL_FOR_MARCA, { cache: "no-store" }).then((r) => (r.ok ? r.text() : null)),
    ]);
    productSearchList = [];
    catalogRows = [];
    if (results[0].status === "fulfilled" && results[0].value) addSkuInfoFromCSV(results[0].value, { isStock: false });
    if (results[1].status === "fulfilled" && results[1].value) addSkuInfoFromCSV(results[1].value, { isStock: true });
    // Ya con el mapa listo, se vuelve a pintar lo que esté en pantalla
    // para que los pedidos viejos (sin marca/precio base guardados) los
    // muestren.
    if (allOrders.length) {
      applyFilters();
    }
    if (currentView === "inicio") renderHome();
    if (currentView === "catalogo") renderCatalogList();
  }

  const STATUS_TAB_COLORS = {
    "": "#e07a8f",
    paid: "#2fa968",
    pending: "#f0ad4e",
    cancelled: "#6b6370999",
    failed: "#d9534f",
  };

  const STATUS_BORDER_COLORS = {
    pending: "#f0ad4e",
    paid: "#2fa968",
    cancelled: "#bbbbbb",
    failed: "#d9534f",
    review: "#c0392b",
    refunded: "#5f5866777",
  };

  function formatPrice(n) {
    return (n || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
  }

  function formatFecha(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    const fecha = d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
    const hora = d.toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit" });
    return `${fecha}, ${hora}`;
  }

  function setStatus(msg) {
    statusEl.textContent = msg;
    statusEl.style.display = msg ? "block" : "none";
  }

  async function fetchOrders() {
    setStatus("Cargando...");
    emptyEl.style.display = "none";
    ordersEl.innerHTML = "";
    historyEmptyEl.style.display = "none";
    historyEl.innerHTML = "";
    try {
      const res = await fetch("/.netlify/functions/admin-orders", {
        headers: { "x-admin-key": adminKey },
      });
      if (res.status === 401) {
        setStatus("Clave incorrecta.");
        logout();
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error || "Error cargando pedidos.");
        return;
      }
      setStatus("");
      allOrders = data.orders || [];
      rememberOrders(allOrders);
      filtersEl.style.display = "flex";
      applyFilters();
      if (currentView === "inicio") renderHome();
      if (currentView === "clientas") renderClients();
    } catch (err) {
      setStatus("No se pudo conectar con el servidor.");
    }
  }

  function dateStr(d) {
    return d.toISOString().slice(0, 10);
  }

  function getRangeBounds(range) {
    const today = new Date();
    const todayStr = dateStr(today);
    if (range === "today") return { from: todayStr, to: todayStr };
    if (range === "week") {
      const d = new Date(today);
      d.setDate(d.getDate() - 6);
      return { from: dateStr(d), to: todayStr };
    }
    if (range === "month") {
      const d = new Date(today);
      d.setDate(d.getDate() - 29);
      return { from: dateStr(d), to: todayStr };
    }
    return null;
  }

  /* ---------- Buscador global: si lo que buscas está en otra sección
     (pedidos, Dirección americana, preventa), te avisa y te lleva. ---------- */
  const pvBuscarTexto = (a) => a.buscar || [a.folio, a.name, a.phone, a.email, ...Object.values(a.direccion || {}), ...(a.items || []).map((it) => `${it.marca || ""} ${it.nombre || ""} ${it.variante || ""}`)].filter(Boolean).join(" ");
  function globalHits(q, desde) {
    q = String(q || "").trim();
    if (q.length < 3) return [];
    const out = [];
    // Pedidos: los de stock y los de Corea viven en secciones distintas.
    [["pedidos", "🧾 Pedidos de stock", "stock"], ["corea", "🇰🇷 Pedidos de Corea", "corea"]].forEach(([go, label, tipo]) => {
      if (desde === go || desde === "todos") return;
      const ps = allOrders.filter((o) => pedidoTipo(o) === tipo && matchesSearch(o, q));
      if (ps.length) out.push({ go, label, items: ps.slice(0, 5).map((o) => `#${orderNumber(o)} · ${(o.customer && o.customer.name) || ""}`), n: ps.length });
    });
    if (swmLoaded) {
      const D = swmDataFull || swmData;
      const envLbl = (r) => `${r.folio} · envío de ${r.name || r.email || ""}${r.direccion && r.direccion.nombre && r.direccion.nombre !== r.name ? ` para ${r.direccion.nombre}` : ""}`;
      if (desde !== "swm") {
        const hits = [
          ...D.envios.filter((r) => !envioEsPs(r, D) && swmMatches(r, q)).map(envLbl),
          ...D.paquetes.filter((r) => !esPsPaquete(r) && swmMatches(r, q)).map((r) => `${r.folio} · paquete de ${r.name || r.etiqueta || "?"}`),
        ];
        if (hits.length) out.push({ go: "swm", label: "🇺🇸 Dirección americana", items: hits.slice(0, 5), n: hits.length });
      }
      if (desde !== "ps") {
        const hits = [
          ...D.compras.filter((r) => swmMatches(r, q) || buscaEnTodo(((r.cotizacion && r.cotizacion.items) || []).map((x) => x.nombre), q)).map((r) => `${r.folio} · compra de ${r.name || ""}`),
          ...D.envios.filter((r) => envioEsPs(r, D) && swmMatches(r, q)).map(envLbl),
          ...D.paquetes.filter((r) => esPsPaquete(r) && swmMatches(r, q)).map((r) => `${r.folio} · ${r.tienda || "compra"} de ${r.name || "?"}`),
        ];
        if (hits.length) out.push({ go: "ps", label: "🛍️ Personal shopper", items: hits.slice(0, 5), n: hits.length });
      }
    }
    if (desde !== "preventa" && pvApartadosLigeros) {
      const aps = pvApartadosLigeros.filter((a) => buscaEnTodo([pvBuscarTexto(a)], q));
      if (aps.length) out.push({ go: "preventa", label: "🛍️ Preventa", items: aps.slice(0, 5).map((a) => `${a.folio} · ${a.name || (a.direccion && a.direccion.nombre) || ""}`), n: aps.length, first: aps[0].id });
    }
    return out;
  }

  function globalHitsHTML(q, desde) {
    const hits = globalHits(q, desde);
    if (!hits.length) return "";
    return `<div class="global-hits" style="background:#eef6fd;border:1px solid #cfe3f6;border-radius:12px;padding:10px 12px;margin:10px 0;">
      <div style="font-weight:700;font-size:14px;">🔎 "${escapeHtml(q)}" también está en otra sección:</div>
      ${hits.map((h) => `<div style="margin-top:8px;"><b>${h.label}</b> (${h.n}): <span style="font-size:14px;">${h.items.map(escapeHtml).join(" · ")}${h.n > h.items.length ? " …" : ""}</span>
        <br><button type="button" class="btn-secondary" data-global-go="${h.go}" data-global-q="${escapeHtml(q)}"${h.first ? ` data-global-first="${escapeHtml(h.first)}"` : ""} style="margin-top:6px;padding:6px 12px;font-size:13px;">Ir a ${h.label} →</button></div>`).join("")}
    </div>`;
  }

  let globalSwmPedido = false;
  function renderGlobalHitsPedidos(search) {
    let box = document.getElementById("global-hits-pedidos");
    if (!box) {
      box = document.createElement("div");
      box.id = "global-hits-pedidos";
      filtersEl.insertAdjacentElement("afterend", box);
    }
    box.innerHTML = search ? globalHitsHTML(search, pedidosTodos ? "todos" : currentView) : "";
    // La Dirección americana se carga hasta que la abres: si buscas aquí, se carga sola.
    if (search && search.length >= 3 && !swmLoaded && !globalSwmPedido) {
      globalSwmPedido = true;
      loadSwm({ quiet: true }).then(() => { const q = filterSearchEl.value.trim(); if (q) renderGlobalHitsPedidos(q); });
    }
  }

  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-global-go]");
    if (!b) return;
    const q = b.dataset.globalQ || "";
    const go = b.dataset.globalGo;
    if (go === "pedidos" || go === "corea") {
      showView(go);
      resetTabs();
      syncFilterTabs();
      filterSearchEl.value = q;
      applyFilters();
    } else if (go === "swm" || go === "ps") {
      showView(go);
      swmSearch = q;
      renderSwmAdmin();
    } else if (go === "preventa") {
      showView("preventa");
      const id = b.dataset.globalFirst;
      const irA = () => {
        if (!pvData) return false;
        const a = pvData.apartados.find((x) => x.id === id);
        if (a) { const f = PV_FILTROS.find(([, , fn]) => fn(a)); if (f) pvFiltro = f[0]; renderPreventaAdmin(); }
        const el = document.getElementById(`pv-ap-${id}`);
        if (el) { el.scrollIntoView({ behavior: "smooth", block: "start" }); el.style.outline = "3px solid #e07a8f"; setTimeout(() => { el.style.outline = ""; }, 2500); }
        return true;
      };
      if (!irA()) { let n = 0; const t = setInterval(() => { if (irA() || ++n > 20) clearInterval(t); }, 300); }
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  function applyFilters() {
    const search = filterSearchEl.value.trim().toLowerCase();
    currentSearchTerm = search;
    const bounds = getRangeBounds(currentRange);

    const tipo = vistaTipo();
    const delTipo = tipo ? allOrders.filter((o) => pedidoTipo(o) === tipo) : allOrders;
    syncOrdersKindUi(tipo);

    filteredOrders = delTipo.filter((o) => {
      if (currentStatus && o.status !== currentStatus) return false;
      if (currentBucket && orderBucket(o) !== currentBucket) return false;
      if (bounds) {
        const fecha = o.createdAt ? o.createdAt.slice(0, 10) : "";
        if (!fecha || fecha < bounds.from || fecha > bounds.to) return false;
      }
      if (search && !matchesSearch(o, search)) return false;
      return true;
    });

    // Los pedidos "por confirmar" (arriba, con botones de confirmar/cancelar)
    // se muestran siempre para que Mae no se le pase ninguno -- pero también
    // deben respetar la búsqueda, si no parece que el buscador está roto
    // (aparece un pedido que no tiene nada que ver con lo que se buscó).
    const pendingOrders = delTipo.filter((o) => o.status === "pending");
    renderPending(
      currentBucket ? [] : (search ? pendingOrders.filter((o) => matchesSearch(o, search)) : pendingOrders),
      Boolean(search) && pendingOrders.length > 0
    );

    // Los "por confirmar" ya salen arriba con sus botones; si también se
    // pintan en "Todos tus pedidos", cada uno aparece dos veces.
    renderHistory(
      filteredOrders.filter((o) => o.status !== "pending"),
      filteredOrders.some((o) => o.status === "pending")
    );
    renderGlobalHitsPedidos(search);
    const total = delTipo.length;
    filterCountEl.textContent = filteredOrders.length === total
      ? `${total} pedido${total === 1 ? "" : "s"}`
      : `${filteredOrders.length} de ${total} pedidos`;
    if (currentView === "inicio") renderHome();
    if (currentView === "compras") renderAbw();
  }

  /* Busca en todo: cada palabra que escribas tiene que aparecer en algún
     lado (nombre de quien recibe, teléfono, correo, calle y número,
     colonia, ciudad, estado, CP, referencias, guía, productos...), sin
     importar acentos ni mayúsculas. Ej. "villa camila 327 la paz". */
  function buscaEnTodo(campos, query) {
    const hay = normalizeForSearch(campos.filter(Boolean).join(" ")).replace(/[.,#]/g, " ");
    const hayDigits = hay.replace(/\D/g, "");
    return normalizeForSearch(query).replace(/[.,#]/g, " ").split(/\s+/).filter(Boolean)
      .every((w) => hay.includes(w) || (/^\d{4,}$/.test(w.replace(/\D/g, "")) && hayDigits.includes(w.replace(/\D/g, ""))));
  }

  function matchesSearch(o, query) {
    const c = o.customer || {};
    return buscaEnTodo([
      c.name, c.phone, c.cp, c.colonia, c.municipio, c.estado, c.street, c.referencias, o.notes, c.notes,
      o.customerEmail, o.trackingNumber, o.carrier, o.id,
      orderNumber(o), "#" + orderNumber(o),
      o.supplierOrderNumber,
      o.cupon,
      ...((o.items || []).map((it) => it.nombre)),
      ...((o.items || []).map((it) => itemMarca(it))),
    ], query);
  }

  function renderPending(orders, hiddenBySearch) {
    if (!orders.length) {
      emptyEl.textContent = hiddenBySearch
        ? "No hay pedidos por confirmar que coincidan con tu búsqueda."
        : "🎉 No tienes pedidos por confirmar";
      emptyEl.style.display = "block";
      ordersEl.innerHTML = "";
      return;
    }
    emptyEl.style.display = "none";
    ordersEl.innerHTML = orders.map((o) => pendingCardHTML(o)).join("");

    ordersEl.querySelectorAll("[data-confirm]").forEach((btn) => {
      btn.addEventListener("click", () => confirmOrCancel(btn.dataset.confirm, "confirm"));
    });
    ordersEl.querySelectorAll("[data-cancel]").forEach((btn) => {
      btn.addEventListener("click", () => confirmOrCancel(btn.dataset.cancel, "cancel"));
    });
    ordersEl.querySelectorAll("[data-mp-check]").forEach((btn) => {
      btn.addEventListener("click", () => revisarMercadoPago(btn.dataset.mpCheck, btn));
    });
    wireCopyAddressButtons(ordersEl);
    wireEditButtons(ordersEl);
    wireProofLinkButtons(ordersEl);
    wireSupplierPromptButtons(ordersEl);
    wireSupplierNoteButtons(ordersEl);
  }

  /* Pedido con tarjeta que sigue "por confirmar": le pregunta a Mercado
     Pago qué pasó (admin-mp-check). Si ya hay un pago aprobado, lo aplica. */
  const MP_ESTADOS = {
    approved: "✅ Aprobado", rejected: "❌ Rechazado", pending: "⏳ Pendiente (pago en efectivo o en proceso)",
    in_process: "⏳ En revisión de Mercado Pago", cancelled: "❌ Cancelado / vencido", refunded: "↩️ Reembolsado", charged_back: "↩️ Contracargo",
  };
  async function revisarMercadoPago(orderId, btn) {
    const out = document.querySelector(`[data-mp-result="${CSS.escape(orderId)}"]`);
    btn.disabled = true; const label = btn.textContent; btn.textContent = "Revisando...";
    try {
      const res = await fetch("/.netlify/functions/admin-mp-check", {
        method: "POST", headers: { "Content-Type": "application/json", "x-admin-key": adminKey }, body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo revisar.");
      if (data.aplicado) { showToast("✅ Mercado Pago ya lo había aprobado: pedido confirmado"); fetchOrders(); return; }
      out.innerHTML = data.pagos.length
        ? data.pagos.map((p) => `${MP_ESTADOS[p.status] || escapeHtml(p.status)} · ${formatPrice(p.monto)} · ${escapeHtml(p.metodo)}${p.detalle ? ` <span style="color:#8a828f;">(${escapeHtml(p.detalle)})</span>` : ""} · ${new Date(p.fecha).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}`).join("<br>")
        : "Mercado Pago no tiene ningún intento de pago de este pedido: la clienta no llegó a pagar (cerró la página de pago). Escríbele o cancélalo.";
    } catch (err) {
      out.textContent = err.message;
    } finally {
      btn.disabled = false; btn.textContent = label;
    }
  }

  function renderHistory(orders, pendingShownAbove = false) {
    historyTitleEl.style.display = "block";
    if (!orders.length) {
      historyEmptyEl.textContent = pendingShownAbove
        ? "Los pedidos por confirmar que coinciden aparecen arriba."
        : "Todavía no tienes pedidos.";
      historyEmptyEl.style.display = "block";
      historyEl.innerHTML = "";
      return;
    }
    historyEmptyEl.style.display = "none";
    historyEl.innerHTML = orders.map((o) => historyCardHTML(o)).join("");

    historyEl.querySelectorAll("[data-delete]").forEach((btn) => {
      btn.addEventListener("click", () => deleteOrder(btn.dataset.delete));
    });
    historyEl.querySelectorAll("[data-send-tracking]").forEach((btn) => {
      btn.addEventListener("click", () => sendTracking(btn.dataset.sendTracking, btn));
    });
    historyEl.querySelectorAll("[data-guide-toggle]").forEach((btn) => {
      btn.addEventListener("click", () => toggleGuideForm(btn.dataset.guideToggle));
    });
    historyEl.querySelectorAll("[data-guide-quote]").forEach((btn) => {
      btn.addEventListener("click", () => quoteGuide(btn.dataset.guideQuote));
    });
    historyEl.querySelectorAll("[data-guide-generate]").forEach((btn) => {
      btn.addEventListener("click", () => generateGuide(btn.dataset.guideGenerate, btn));
    });
    wireCopyAddressButtons(historyEl);
    wireEditButtons(historyEl);
    wireProofLinkButtons(historyEl);
    wireSupplierPromptButtons(historyEl);
    wireSupplierNoteButtons(historyEl);
  }

  function wireCopyAddressButtons(container) {
    container.querySelectorAll("[data-copy-address]").forEach((btn) => {
      btn.addEventListener("click", () => copyAddress(btn.dataset.copyAddress, btn));
    });
  }

  function copyAddress(orderId, btn) {
    const order = allOrders.find((o) => o.id === orderId);
    if (!order) return;
    const text = shippingAddressText(order);
    const showCopied = () => {
      const original = btn.textContent;
      btn.textContent = "✅ ¡Copiado!";
      setTimeout(() => { btn.textContent = original; }, 1500);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(showCopied).catch(() => {
        setStatus("No se pudo copiar. Cópiala manualmente.");
      });
    } else {
      setStatus("No se pudo copiar. Cópiala manualmente.");
    }
  }

  async function deleteOrder(orderId) {
    const order = allOrders.find((o) => o.id === orderId);
    const warning = order && order.status === "paid"
      ? "⚠️ Este pedido está PAGADO. ¿Seguro que lo quieres mandar a la papelera? Lo puedes recuperar durante 30 días en Más → Papelera."
      : "¿Mandar este pedido cancelado a la papelera? Lo puedes recuperar durante 30 días en Más → Papelera.";
    if (!window.confirm(warning)) return;
    setStatus("Borrando...");
    try {
      const res = await fetch("/.netlify/functions/admin-delete-order", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error || "Error al borrar el pedido.");
        return;
      }
      setStatus("");
      trashLoaded = false;
      fetchOrders();
      showToast("🗑️ Pedido enviado a la papelera.", "Deshacer", () => restoreFromTrash(orderId));
    } catch (err) {
      setStatus("No se pudo conectar con el servidor.");
    }
  }

  /* Guarda el número de guía y abre WhatsApp con el mensaje de "tu pedido
     ya va en camino" listo para mandarle al cliente -- un clic, no manda
     nada solo, tú le das "Enviar" desde WhatsApp. La pestaña se abre
     ANTES de guardar (en blanco) para que el navegador no la bloquee por
     no ser ya parte del clic; se le pone la URL real después.

     Importante: NO se le pasa "noopener" a window.open() porque en
     Chrome eso hace que regrese null (no se puede redirigir después, y
     el botón se queda sin hacer nada, sin ningún error -- así se
     reportó este bug). En su lugar, se corta la referencia opener a
     mano justo después de abrir la ventana, que da la misma protección
     de seguridad (evita que wa.me pueda controlar esta pestaña) sin
     perder la ventana en Chrome. */
  async function sendTracking(orderId, btn) {
    const numberInput = document.querySelector(`[data-tracking-number="${orderId}"]`);
    const carrierInput = document.querySelector(`[data-tracking-carrier="${orderId}"]`);
    const trackingNumber = numberInput.value.trim();
    const carrier = carrierInput.value.trim();
    if (!trackingNumber) {
      setStatus("Escribe el número de guía primero.");
      return;
    }

    const order = allOrders.find((o) => o.id === orderId);
    if (!order) return;

    const waWindow = window.open("", "_blank");
    if (waWindow) waWindow.opener = null;

    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Guardando...";

    try {
      const res = await fetch("/.netlify/functions/admin-add-tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ orderId, trackingNumber, carrier }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (waWindow) waWindow.close();
        setStatus(data.error || "No se pudo guardar la guía.");
        btn.disabled = false;
        btn.textContent = originalText;
        return;
      }

      const phoneDigits = (order.customer?.phone || "").replace(/[^0-9]/g, "");
      const waNumber = phoneDigits.length === 10 ? "521" + phoneDigits : phoneDigits;

      // Si el servidor ya lo mandó desde el número de Alpacca en Meta
      // (plantilla "pedido_enviado"), no hace falta abrir tu WhatsApp.
      if (data.whatsappSent) {
        if (waWindow) waWindow.close();
        await fetchOrders();
        setStatus("✅ Guía guardada y aviso enviado por WhatsApp desde el número de Alpacca.");
        return;
      }

      if (waNumber) {
        const name = order.customer?.name || "";
        const lines = [
          `¡Hola${name ? " " + name : ""}! 📦 Tu pedido con Alpacca ya va en camino.`,
          "",
          `Número de guía: ${trackingNumber}`,
        ];
        if (carrier) lines.push(`Paquetería: ${carrier}`);
        const message = lines.join("\n");
        if (waWindow) waWindow.location.href = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
      } else if (waWindow) {
        waWindow.close();
      }

      await fetchOrders();
      setStatus(waNumber
        ? "⚠️ Guía guardada. Meta no aceptó el envío automático (revisa que la plantilla \"pedido_enviado\" esté aprobada), así que se abrió tu WhatsApp como respaldo."
        : "Guía guardada, pero el pedido no tiene teléfono para avisar por WhatsApp.");
    } catch (err) {
      if (waWindow) waWindow.close();
      setStatus("No se pudo conectar con el servidor.");
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }

  /* Estado temporal (mientras el admin cotiza y elige paquetería) de cada
     formulario de "generar guía" -- no se guarda en el pedido hasta que
     de verdad se genera la guía. */
  const guideState = {};

  function toggleGuideForm(orderId) {
    const form = document.getElementById(`guide-form-${orderId}`);
    if (form) form.classList.toggle("open");
  }

  /* ======================================================================
     Modificar productos de un pedido (agregar/quitar/cambiar cantidad) --
     ver editBlockHTML más arriba y admin-update-order-items.js.
     ====================================================================== */
  function toggleEditForm(orderId) {
    const form = document.getElementById(`edit-form-${orderId}`);
    if (form) form.classList.toggle("open");
  }

  function wireEditItemRowRemovers(scopeEl) {
    scopeEl.querySelectorAll(".edit-item-remove").forEach((btn) => {
      if (btn.dataset.wired) return;
      btn.dataset.wired = "1";
      btn.addEventListener("click", () => {
        const form = btn.closest('[id^="edit-form-"]');
        btn.closest(".edit-item-row").remove();
        if (form) updateEditComputedTotal(form.id.replace("edit-form-", ""));
      });
    });
  }

  function addEditItemRow(orderId) {
    const container = document.getElementById(`edit-items-${orderId}`);
    if (!container) return;
    const wrap = document.createElement("div");
    wrap.innerHTML = editItemRowHTML(null).trim();
    const row = wrap.firstElementChild;
    container.appendChild(row);
    wireEditItemRowRemovers(container);
    updateEditComputedTotal(orderId);
  }

  /* Suma en vivo (sin guardar nada) lo que dice el formulario ahorita --
     solo para el texto de ayuda "usar este total", no valida nada. */
  function updateEditComputedTotal(orderId) {
    const container = document.getElementById(`edit-items-${orderId}`);
    const computedEl = document.getElementById(`edit-computed-${orderId}`);
    const shippingInput = document.getElementById(`edit-shipping-${orderId}`);
    if (!container || !computedEl) return;
    let subtotal = 0;
    container.querySelectorAll(".edit-item-row").forEach((row) => {
      const qty = Number(row.querySelector(".edit-item-qty").value) || 0;
      const precio = Number(row.querySelector(".edit-item-precio").value) || 0;
      subtotal += qty * precio;
    });
    const shipping = Number(shippingInput?.value) || 0;
    computedEl.textContent = formatPrice(subtotal + shipping);
  }

  /* Pedido ya pagado: cuánto hay que reembolsarle o cuánto le falta pagar
     con el "Total cobrado" que está escrito (lo mismo que se le avisa). */
  function updateEditSaldo(orderId) {
    const el = document.getElementById(`edit-saldo-${orderId}`);
    const totalInput = document.getElementById(`edit-total-${orderId}`);
    if (!el || !totalInput) return;
    const pagado = Number(el.dataset.pagado) || 0;
    const dif = Math.round((pagado - (Number(totalInput.value) || 0)) * 100) / 100;
    el.style.color = dif > 0.5 ? "#17803d" : dif < -0.5 ? "#b33660" : "#5f5866";
    el.textContent = dif > 0.5
      ? `Pagó ${formatPrice(pagado)} → le debes reembolsar ${formatPrice(dif)}`
      : dif < -0.5
        ? `Pagó ${formatPrice(pagado)} → te debe ${formatPrice(-dif)} más`
        : `Pagó ${formatPrice(pagado)} → sin diferencia`;
  }

  function useComputedTotal(orderId) {
    const computedEl = document.getElementById(`edit-computed-${orderId}`);
    const totalInput = document.getElementById(`edit-total-${orderId}`);
    if (!computedEl || !totalInput) return;
    const num = Number(String(computedEl.textContent).replace(/[^0-9.-]/g, "")) || 0;
    totalInput.value = num;
    updateEditSaldo(orderId);
  }

  function wireEditButtons(container) {
    container.querySelectorAll("[data-edit-toggle]").forEach((btn) => {
      btn.addEventListener("click", () => toggleEditForm(btn.dataset.editToggle));
    });
    container.querySelectorAll("[data-edit-add]").forEach((btn) => {
      btn.addEventListener("click", () => addEditItemRow(btn.dataset.editAdd));
    });
    container.querySelectorAll("[data-edit-use-computed]").forEach((btn) => {
      btn.addEventListener("click", () => useComputedTotal(btn.dataset.editUseComputed));
    });
    container.querySelectorAll("[data-edit-save]").forEach((btn) => {
      btn.addEventListener("click", () => saveOrderEdit(btn.dataset.editSave, btn));
    });
    container.querySelectorAll("[data-cancel-paid]").forEach((btn) => {
      btn.addEventListener("click", () => confirmOrCancel(btn.dataset.cancelPaid, "cancel_paid"));
    });
    container.querySelectorAll('[id^="edit-form-"]').forEach((form) => {
      const orderId = form.id.replace("edit-form-", "");
      wireEditItemRowRemovers(form);
      form.addEventListener("input", (e) => {
        if (e.target.matches(".edit-item-qty, .edit-item-precio") || e.target.id === `edit-shipping-${orderId}`) {
          updateEditComputedTotal(orderId);
        }
        if (e.target.id === `edit-total-${orderId}`) updateEditSaldo(orderId);
      });
      updateEditComputedTotal(orderId);
      updateEditSaldo(orderId);
    });
  }

  async function saveOrderEdit(orderId, btn) {
    const errorEl = document.getElementById(`edit-error-${orderId}`);
    errorEl.textContent = "";

    const container = document.getElementById(`edit-items-${orderId}`);
    const items = Array.from(container.querySelectorAll(".edit-item-row")).map((row) => ({
      nombre: row.querySelector(".edit-item-nombre").value.trim(),
      marca: row.querySelector(".edit-item-marca").value.trim(),
      sku: row.querySelector(".edit-item-sku").value.trim(),
      qty: Number(row.querySelector(".edit-item-qty").value) || 0,
      precio: Number(row.querySelector(".edit-item-precio").value) || 0,
      enStock: row.querySelector(".edit-item-enstock").checked,
      preorden: row.dataset.preorden === "1",
    })).filter((it) => it.nombre && it.qty > 0);

    if (!items.length) {
      errorEl.textContent = "El pedido debe tener al menos un producto con nombre y cantidad.";
      return;
    }

    const shippingMXN = Number(document.getElementById(`edit-shipping-${orderId}`).value) || 0;
    const grandTotal = Number(document.getElementById(`edit-total-${orderId}`).value) || 0;

    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Guardando...";
    try {
      const res = await fetch("/.netlify/functions/admin-update-order-items", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ orderId, items, shippingMXN, grandTotal }),
      });
      const data = await res.json();
      if (!res.ok) {
        errorEl.textContent = data.error || "No se pudo guardar el pedido.";
        btn.disabled = false;
        btn.textContent = originalText;
        return;
      }
      setStatus("");
      fetchOrders();
    } catch (err) {
      errorEl.textContent = "No se pudo conectar con el servidor.";
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }

  /* ======================================================================
     Autocompletar "Nombre del producto" en "+ Agregar producto" (y al
     editar cualquier renglón ya existente) -- busca en productSearchList
     (el mismo catálogo + Stock que ya se carga para las marcas, ver
     loadSkuMarcaMap más arriba) y, al elegir una opción, llena marca/SKU/
     precio/en stock del renglón sola. Un solo dropdown compartido
     (#product-autocomplete) que se reposiciona bajo el input que esté
     activo -- funciona para cualquier renglón de cualquier pedido, sin
     tener que "wire-ar" cada uno por separado. */
  let autocompleteActiveInput = null;
  let autocompleteMatches = [];
  let autocompleteIndex = -1;

  function searchProductAutocomplete(query) {
    const q = normalizeForSearch(query).trim();
    if (q.length < 2) return [];
    const seen = new Set();
    const matches = [];
    for (const p of productSearchList) {
      if (normalizeForSearch(p.nombre).includes(q) || normalizeForSearch(p.marca).includes(q)) {
        const key = p.sku + "|" + p.enStock;
        if (seen.has(key)) continue;
        seen.add(key);
        matches.push(p);
        if (matches.length >= 20) break;
      }
    }
    return matches;
  }

  function positionAutocomplete(input) {
    const dropdown = document.getElementById("product-autocomplete");
    const rect = input.getBoundingClientRect();
    dropdown.style.left = `${rect.left}px`;
    dropdown.style.top = `${rect.bottom + 4}px`;
    dropdown.style.width = `${Math.max(rect.width, 240)}px`;
  }

  function renderAutocompleteList() {
    const dropdown = document.getElementById("product-autocomplete");
    if (!autocompleteMatches.length) {
      dropdown.style.display = "none";
      return;
    }
    dropdown.innerHTML = autocompleteMatches
      .map(
        (p, i) => `
        <div class="ac-item${i === autocompleteIndex ? " active" : ""}" data-ac-index="${i}">
          <div class="ac-nombre">${escapeHtml(p.nombre)}</div>
          <div class="ac-meta">${escapeHtml(p.marca || "sin marca")} · ${escapeHtml(p.sku)}${p.enStock ? " · en stock" : ""}</div>
        </div>`
      )
      .join("");
    dropdown.style.display = "block";
    // mousedown (no click) para que dispare ANTES de que el blur del
    // input esconda el dropdown.
    dropdown.querySelectorAll("[data-ac-index]").forEach((el) => {
      el.addEventListener("mousedown", (e) => {
        e.preventDefault();
        selectAutocompleteMatch(Number(el.dataset.acIndex));
      });
    });
  }

  function selectAutocompleteMatch(index) {
    const entry = autocompleteMatches[index];
    const input = autocompleteActiveInput;
    if (!entry || !input) return;
    const row = input.closest(".edit-item-row");
    if (row) {
      row.querySelector(".edit-item-nombre").value = entry.nombre;
      row.querySelector(".edit-item-marca").value = entry.marca;
      row.querySelector(".edit-item-sku").value = entry.sku;
      if (entry.precio) row.querySelector(".edit-item-precio").value = entry.precio;
      row.querySelector(".edit-item-enstock").checked = entry.enStock;
      const form = row.closest('[id^="edit-form-"]');
      if (form) updateEditComputedTotal(form.id.replace("edit-form-", ""));
    }
    hideProductAutocomplete();
  }

  function hideProductAutocomplete() {
    document.getElementById("product-autocomplete").style.display = "none";
    autocompleteActiveInput = null;
    autocompleteMatches = [];
    autocompleteIndex = -1;
  }

  function handleProductNameInput(input) {
    autocompleteActiveInput = input;
    autocompleteMatches = searchProductAutocomplete(input.value);
    autocompleteIndex = -1;
    if (!autocompleteMatches.length) {
      hideProductAutocomplete();
      return;
    }
    positionAutocomplete(input);
    renderAutocompleteList();
  }

  function handleProductNameKeydown(e) {
    const dropdown = document.getElementById("product-autocomplete");
    if (!autocompleteMatches.length || dropdown.style.display === "none") return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      autocompleteIndex = Math.min(autocompleteIndex + 1, autocompleteMatches.length - 1);
      renderAutocompleteList();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      autocompleteIndex = Math.max(autocompleteIndex - 1, 0);
      renderAutocompleteList();
    } else if (e.key === "Enter" && autocompleteIndex >= 0) {
      e.preventDefault();
      selectAutocompleteMatch(autocompleteIndex);
    } else if (e.key === "Escape") {
      hideProductAutocomplete();
    }
  }

  function initProductAutocomplete() {
    document.addEventListener("input", (e) => {
      if (e.target.matches(".edit-item-nombre")) handleProductNameInput(e.target);
    });
    document.addEventListener("keydown", (e) => {
      if (e.target.matches(".edit-item-nombre")) handleProductNameKeydown(e);
    });
    document.addEventListener(
      "focusout",
      (e) => {
        if (e.target.matches(".edit-item-nombre")) {
          // Delay chico para que el mousedown del dropdown alcance a
          // disparar antes de que este blur lo esconda.
          setTimeout(hideProductAutocomplete, 150);
        }
      },
      true
    );
    window.addEventListener(
      "scroll",
      () => {
        if (autocompleteActiveInput) positionAutocomplete(autocompleteActiveInput);
      },
      true
    );
  }

  async function quoteGuide(orderId) {
    const weight = Number(document.querySelector(`[data-guide-weight="${orderId}"]`).value);
    const errorEl = document.querySelector(`[data-guide-error="${orderId}"]`);
    const ratesEl = document.querySelector(`[data-guide-rates="${orderId}"]`);
    const generateBtn = document.querySelector(`[data-guide-generate="${orderId}"]`);
    errorEl.textContent = "";
    ratesEl.innerHTML = "";
    generateBtn.disabled = true;
    guideState[orderId] = null;

    if (!weight || weight <= 0) {
      errorEl.textContent = "Escribe un peso válido.";
      return;
    }
    const destinationZipCode = document.querySelector(`[data-guide-zip="${orderId}"]`).value.trim();
    const destinationState = document.querySelector(`[data-guide-state="${orderId}"]`).value.trim();
    const destinationCity = document.querySelector(`[data-guide-city="${orderId}"]`).value.trim();
    const destinationNeighborhood = document.querySelector(`[data-guide-neighborhood="${orderId}"]`).value.trim();
    if (!destinationZipCode) {
      errorEl.textContent = "Escribe el código postal del destinatario.";
      return;
    }

    ratesEl.innerHTML = "Cotizando en Envíos Perros y Skydropx...";
    try {
      const res = await fetch("/.netlify/functions/admin-shipping-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ orderId, weight, destinationZipCode, destinationState, destinationCity, destinationNeighborhood }),
      });
      const data = await res.json();
      const fallas = Object.entries(data.providerErrorDetail || {})
        .map(([p, msg]) => `${p === "skydropx" ? "Skydropx" : "Envíos Perros"} no respondió: ${msg}`)
        .join(" · ");
      if (!res.ok) {
        ratesEl.innerHTML = "";
        errorEl.textContent = [data.error || "No se pudo cotizar el envío.", fallas].filter(Boolean).join(" · ");
        return;
      }
      errorEl.textContent = fallas;
      const rates = data.rates || [];
      if (!rates.length) {
        ratesEl.innerHTML = "";
        errorEl.textContent = "No hay opciones de envío disponibles para esos datos.";
        return;
      }
      guideState[orderId] = { rates, selected: null };
      const providerBadge = { enviosperros: "📦 Envíos Perros", skydropx: "🛵 Skydropx" };
      ratesEl.innerHTML = zonaExtAviso(rates) + rates.map((r, i) => `
        <label class="rate-option" data-rate-option="${orderId}" data-rate-index="${i}">
          <input type="radio" name="rate-${orderId}" value="${i}" />
          ${i === 0 ? "🏆 " : ""}${escapeHtml(r.label || "")}${r.days ? " · " + escapeHtml(r.days) : ""}${zonaExtTag(r)}
          <span style="font-size: 13px;color:#6b6370;">(${providerBadge[r.provider] || r.provider})</span>
          <span class="price">${formatPrice(r.total)}</span>
        </label>`).join("");
      ratesEl.querySelectorAll(`[data-rate-option="${orderId}"]`).forEach((label) => {
        label.addEventListener("click", () => {
          const idx = Number(label.dataset.rateIndex);
          guideState[orderId].selected = idx;
          ratesEl.querySelectorAll(`[data-rate-option="${orderId}"]`).forEach((l) => l.classList.remove("selected"));
          label.classList.add("selected");
          label.querySelector('input[type="radio"]').checked = true;
          generateBtn.disabled = false;
        });
      });
    } catch (err) {
      ratesEl.innerHTML = "";
      errorEl.textContent = "No se pudo conectar con el servidor.";
    }
  }

  /* Genera la guía con la paquetería elegida, guarda el número de guía en
     el pedido y abre WhatsApp con el aviso listo para el cliente -- mismo
     truco de abrir la pestaña en blanco antes del await para que el
     navegador no la bloquee, y mismo cuidado con "noopener" que en
     sendTracking() de arriba (sin él, Chrome regresa null). */
  async function generateGuide(orderId, btn) {
    const errorEl = document.querySelector(`[data-guide-error="${orderId}"]`);
    errorEl.textContent = "";
    const state = guideState[orderId];
    if (!state || state.selected === null || state.selected === undefined) {
      errorEl.textContent = "Elige una opción de envío primero.";
      return;
    }
    const rate = state.rates[state.selected];
    const weight = Number(document.querySelector(`[data-guide-weight="${orderId}"]`).value);

    const nameVal = document.querySelector(`[data-guide-name="${orderId}"]`).value.trim().slice(0, 30);
    const phoneDigits = document.querySelector(`[data-guide-phone="${orderId}"]`).value.replace(/[^0-9]/g, "").slice(0, 10);
    const destination = {
      name: nameVal || "Cliente",
      phone: phoneDigits,
      street: document.querySelector(`[data-guide-street="${orderId}"]`).value.trim(),
      exteriorNumber: document.querySelector(`[data-guide-ext="${orderId}"]`).value.trim() || "S/N",
      neighborhood: document.querySelector(`[data-guide-neighborhood="${orderId}"]`).value.trim().slice(0, 25),
      city: document.querySelector(`[data-guide-city="${orderId}"]`).value.trim(),
      state: document.querySelector(`[data-guide-state="${orderId}"]`).value.trim(),
      zipCode: document.querySelector(`[data-guide-zip="${orderId}"]`).value.trim(),
      references: document.querySelector(`[data-guide-references="${orderId}"]`).value.trim().slice(0, 25) || "Sin referencias",
    };
    const interiorVal = document.querySelector(`[data-guide-int="${orderId}"]`).value.trim();
    if (interiorVal) destination.interiorNumber = interiorVal;

    const order = allOrders.find((o) => o.id === orderId);
    const waWindow = window.open("", "_blank");
    if (waWindow) waWindow.opener = null;

    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Generando guía...";

    try {
      const res = await fetch("/.netlify/functions/admin-generate-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({
          orderId,
          weight,
          provider: rate.provider,
          courier: rate.carrier,
          service: rate.service,
          quotationId: rate.quotationId,
          rateId: rate.rateId,
          carrierSlug: rate.carrierSlug,
          serviceCode: rate.serviceCode,
          destination,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (waWindow) waWindow.close();
        errorEl.textContent = data.error || "No se pudo generar la guía.";
        btn.disabled = false;
        btn.textContent = originalText;
        return;
      }

      const trackingNumber = data.order.trackingNumber;
      const carrier = data.order.carrier;
      const waNumber = phoneDigits.length === 10 ? "521" + phoneDigits : phoneDigits;

      if (data.whatsappSent) {
        if (waWindow) waWindow.close();
        await fetchOrders();
        setStatus("✅ Guía generada y aviso enviado por WhatsApp desde el número de Alpacca.");
        return;
      }

      if (waNumber) {
        const name = order?.customer?.name || destination.name || "";
        const lines = [
          `¡Hola${name ? " " + name : ""}! 📦 Tu pedido con Alpacca ya va en camino.`,
          "",
          `Número de guía: ${trackingNumber}`,
          `Paquetería: ${carrier}`,
        ];
        const message = lines.join("\n");
        if (waWindow) waWindow.location.href = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
      } else if (waWindow) {
        waWindow.close();
      }

      await fetchOrders();
      setStatus(waNumber
        ? "⚠️ Guía generada. Meta no aceptó el envío automático (revisa que la plantilla \"pedido_enviado\" esté aprobada), así que se abrió tu WhatsApp como respaldo."
        : "Guía generada, pero el pedido no tiene teléfono para avisar por WhatsApp.");
    } catch (err) {
      if (waWindow) waWindow.close();
      errorEl.textContent = "No se pudo conectar con el servidor.";
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }

  // "review": el pago no coincide con el total del pedido, o llegó después de
  // cancelar. No se surte hasta revisarlo a mano (ver paymentReceivedAfterStatus).
  // "refunded": Mercado Pago reembolsó o hubo contracargo; el stock ya se repuso.
  const STATUS_LABELS = {
    pending: "⏳ Pendiente",
    paid: "✅ Pagado",
    cancelled: "✕ Cancelado",
    failed: "⚠️ Falló",
    review: "🔎 Revisar",
    refunded: "↩️ Reembolsado",
  };

  function sourceLabel(o) {
    return o.source === "mercadopago" ? "💳 Tarjeta" : "🏦 Transferencia";
  }

  /* Mismo número corto que ya ve el cliente (en WhatsApp, en "Mis
     pedidos", y en el panel de éxito al pagar): los primeros 8
     caracteres del id, en mayúsculas -- para que Mae pueda ubicar el
     pedido cuando la clienta le escriba con ese número. */
  function orderNumber(o) {
    return (o.id || "").slice(0, 8).toUpperCase();
  }

  function itemMarca(it) {
    return it.marca || (skuToInfo.get(it.sku) || {}).marca || "";
  }

  /* Precio de TRANSFERENCIA del artículo -- se muestra siempre así en la
     lista y en "Subtotal productos", sin importar con qué se haya pagado
     el pedido (ver totalsBreakdownHTML: la comisión de tarjeta se ve
     aparte, no mezclada en el precio de cada renglón). Prioridad:
     precioBase guardado en el pedido (exacto, pedidos nuevos) -> precio
     actual del mismo SKU en el catálogo/Stock (aproximado, pedidos
     viejos) -> como último recurso, lo que se haya cobrado. */
  function itemPrecioTransferencia(it) {
    if (it.precioBase != null) return it.precioBase;
    const info = skuToInfo.get(it.sku);
    if (info && info.precio) return info.precio;
    return it.precio || 0;
  }

  /* Peso de un artículo -- los pedidos no guardan el peso por renglón
     (solo el peso total ya sumado, en o.weightKg), así que esto es nomás
     para aproximar el peso de pedidos viejos que no tienen o.weightKg,
     buscando el peso actual del mismo SKU en el catálogo/Stock. */
  function itemPeso(it) {
    const info = skuToInfo.get(it.sku);
    return (info && info.peso) || 0;
  }

  /* Piezas totales y peso del paquete. El peso exacto se guarda desde
     esta sesión (o.weightKg); los pedidos de antes no lo tienen, así que
     se aproxima sumando el peso actual de cada SKU. */
  function orderPiecesAndWeight(o) {
    const pieces = (o.items || []).reduce((sum, it) => sum + (it.qty || 0), 0);
    const weightKg = o.weightKg > 0
      ? o.weightKg
      : (o.items || []).reduce((sum, it) => sum + itemPeso(it) * (it.qty || 0), 0);
    return { pieces, weightKg };
  }

  function formatWeight(kg) {
    return `${(kg || 0).toLocaleString("es-MX", { maximumFractionDigits: 2 })} kg`;
  }

  function itemsListHTML(o) {
    const term = currentSearchTerm;
    return (o.items || [])
      .map((it) => {
        const marca = itemMarca(it);
        const precio = itemPrecioTransferencia(it);
        const isMatch = Boolean(term) && (
          (marca && marca.toLowerCase().includes(term)) ||
          (it.nombre && it.nombre.toLowerCase().includes(term))
        );
        const marcaHTML = marca ? `<strong>${highlightMatch(marca, term)}</strong> — ` : "";
        return `<li${isMatch ? ' class="item-hit"' : ""}>${marcaHTML}${highlightMatch(it.nombre, term)} x${it.qty}${it.enStock ? " · en stock" : ""}${it.preorden ? ` · ⏳ preorden (${escapeHtml(String(it.preordenDias || "21").replace("-", " a "))} días)` : ""} <span class="unit-price">(${formatPrice(precio)} c/u)</span> — ${formatPrice(precio * it.qty)}</li>`;
      })
      .join("");
  }

  /* Subtotal productos y Envío SIEMPRE a precio de transferencia (nunca
     el inflado con tarjeta), y la Comisión por pago con tarjeta como la
     diferencia contra lo que realmente se cobró (grandTotal) -- así
     siempre cuadra: Subtotal + Envío + Comisión = Total, tanto en
     pedidos nuevos (exacto, con precioBase/shippingMXNBase guardados)
     como en pedidos viejos (aproximado, con el precio actual del
     catálogo). Se usa tanto en la tarjeta del pedido como en el CSV. */
  function orderBreakdown(o) {
    const subtotal = (o.items || []).reduce((sum, it) => sum + itemPrecioTransferencia(it) * it.qty, 0);
    const shippingMXN = o.shippingMXNBase != null ? o.shippingMXNBase : (o.shippingMXN || 0);
    const shippingKoreaMXN = o.shippingKoreaMXN || 0;
    const shippingNacionalMXN = o.shippingNacionalMXN || 0;
    const cardFeeMXN = o.source === "mercadopago" ? Math.max(0, (o.grandTotal || 0) - subtotal - shippingMXN) : 0;
    return { subtotal, shippingMXN, shippingKoreaMXN, shippingNacionalMXN, cardFeeMXN };
  }

  function totalsBreakdownHTML(o) {
    const { subtotal, shippingMXN, shippingKoreaMXN, shippingNacionalMXN, cardFeeMXN } = orderBreakdown(o);
    const { pieces, weightKg } = orderPiecesAndWeight(o);
    const rows = [];
    if (pieces > 0) {
      rows.push(`<div class="row"><span>📦 Piezas / peso</span><span>${pieces} pieza${pieces === 1 ? "" : "s"}${weightKg > 0 ? ` · ${formatWeight(weightKg)}` : ""}</span></div>`);
    }
    rows.push(`<div class="row"><span>Subtotal productos</span><span>${formatPrice(subtotal)}</span></div>`);
    if (shippingKoreaMXN > 0 || shippingNacionalMXN > 0) {
      if (shippingKoreaMXN > 0) rows.push(`<div class="row"><span>🌏 Envío Corea</span><span>${formatPrice(shippingKoreaMXN)}</span></div>`);
      if (shippingNacionalMXN > 0) rows.push(`<div class="row"><span>🚚 Envío nacional</span><span>${formatPrice(shippingNacionalMXN)}</span></div>`);
    } else if (shippingMXN > 0) {
      rows.push(`<div class="row"><span>Envío</span><span>${formatPrice(shippingMXN)}</span></div>`);
    }
    if (cardFeeMXN > 0.5) {
      rows.push(`<div class="row fee"><span>💳 Comisión por pago con tarjeta</span><span>${formatPrice(cardFeeMXN)}</span></div>`);
    }
    if (o.descuento > 0) {
      rows.push(`<div class="row" style="color:#9b2c4f;"><span>🎟️ Cupón ${escapeHtml(o.cupon || "")}</span><span>−${formatPrice(o.descuento)}</span></div>`);
    }
    return `<div class="breakdown">${rows.join("")}</div>`;
  }

  /* Texto listo para pegar en el formulario de la paquetería al generar
     la guía de envío. */
  function shippingAddressText(o) {
    const c = o.customer || {};
    const lines = [c.name, c.phone];
    if (c.street || c.colonia) lines.push([c.street, c.colonia].filter(Boolean).join(", "));
    if (c.municipio || c.estado || c.cp) {
      lines.push([c.municipio, c.estado, c.cp ? `CP ${c.cp}` : ""].filter(Boolean).join(", "));
    }
    if (c.referencias) lines.push(`Referencias: ${c.referencias}`);
    return lines.filter(Boolean).join("\n");
  }

  function customerHTML(o) {
    const c = o.customer || {};
    const hasAddress = c.street || c.colonia || c.municipio || c.estado;
    return `
      <div class="customer">
        👤 ${escapeHtml(c.name || "(sin nombre)")}<br/>
        ${c.phone ? `📞 <a href="tel:${escapeAttr(c.phone)}">${escapeHtml(c.phone)}</a><br/>` : ""}
        ${hasAddress
          ? `📍 ${escapeHtml([c.street, c.colonia].filter(Boolean).join(", "))}<br/>
             &nbsp;&nbsp;&nbsp;${escapeHtml([c.municipio, c.estado].filter(Boolean).join(", "))}${c.cp ? ", CP " + escapeHtml(c.cp) : ""}<br/>`
          : (c.cp ? `📍 CP ${escapeHtml(c.cp)}<br/>` : "")
        }
        ${c.referencias ? `📝 Ref: ${escapeHtml(c.referencias)}<br/>` : ""}
        ${hasAddress ? `<button type="button" class="btn-secondary" data-copy-address="${o.id}" style="margin-top:8px;padding:6px 14px;font-size: 14px;">📋 Copiar dirección</button>` : ""}
      </div>`;
  }

  function proofLinkHTML(o) {
    let html = o.hasPaymentProof ? `<div style="margin-top:8px;"><button type="button" data-view-proof="${escapeHtml(o.id)}" style="font-size: 14px;font-weight:700;color:#0b6bc2;text-decoration:none;background:none;border:none;padding:0;cursor:pointer;">📎 Ver comprobante de pago${(o.proofsMore || []).length ? " 1" : ""}</button>${(o.proofsMore || []).map((m) => ` <button type="button" data-view-proof="${escapeHtml(o.id)}" data-view-proof-n="${m.n}" style="font-size: 14px;font-weight:700;color:#0b6bc2;text-decoration:none;background:none;border:none;padding:0 0 0 10px;cursor:pointer;">📎 Comprobante ${m.n + 1}</button>`).join("")}</div>` : "";
    // Transferencia por confirmar y todavía sin comprobante: se nota y se le puede recordar.
    if (o.status === "pending" && o.source !== "mercadopago" && !o.hasPaymentProof) {
      const wa = waLinkFromPhone(o.customer && o.customer.phone);
      const nombre = ((o.customer && o.customer.name) || "").trim().split(/\s+/)[0];
      const txt = `Hola${nombre ? ` ${nombre}` : ""} 💕 vi tu pedido #${orderNumber(o)} por ${formatPrice(o.grandTotal)}. Cuando hagas tu transferencia, sube tu comprobante en alpacca.mx > Mi cuenta > Mis pedidos (o mándamelo por aquí) para confirmarlo 🌸`;
      html += `<div style="margin-top:8px;background:#fff8ea;border:1px solid #f6dcbd;border-radius:12px;padding:8px 12px;font-size:14px;">⏳ <b>Todavía no sube su comprobante.</b> En cuanto lo suba, aquí te sale el botón "Ver comprobante de pago".${wa ? ` <a class="btn-secondary" style="text-decoration:none;margin-left:6px;padding:4px 10px;font-size:13px;" target="_blank" rel="noopener" href="${escapeHtml(`${wa}?text=${encodeURIComponent(txt)}`)}">💬 Recordárselo por WhatsApp</a>` : ""}</div>`;
    }
    // Diferencia de un pedido editado (le agregaste cosas ya pagado).
    const pagado = o.montoPagado != null ? Number(o.montoPagado) : null;
    const debe = o.status === "paid" && pagado != null ? Math.round(((Number(o.grandTotal) || 0) - pagado) * 100) / 100 : 0;
    const extras = o.proofsExtra || [];
    if (debe > 0.5 || extras.length) {
      const fila = (p) => `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:4px;font-size:14px;"><button type="button" data-view-proof="${escapeHtml(o.id)}" data-view-proof-extra="${p.n}" style="font-weight:700;color:#0b6bc2;background:none;border:none;padding:0;cursor:pointer;">📎 Comprobante de la diferencia${extras.length > 1 ? ` ${p.n + 1}` : ""}</button><span class="meta">${formatPrice(p.monto)} · ${new Date(p.at).toLocaleDateString("es-MX", { day: "numeric", month: "short" })} · ${{ revision: "🔎 por revisar", aprobado: "✅ aprobado", rechazado: "❌ rechazado" }[p.status] || p.status}</span></div>`;
      html += `<div style="background:${debe > 0.5 ? "#fff8ea" : "#f1faf4"};border:1px solid ${debe > 0.5 ? "#f6dcbd" : "#cfe9d9"};border-radius:12px;padding:10px 12px;margin:10px 0;">
        <div style="font-weight:700;font-size:14px;">${debe > 0.5 ? `💳 Le falta pagar ${formatPrice(debe)} de diferencia` : "✅ Diferencia pagada"}</div>
        ${debe > 0.5 ? `<div class="meta">Pagó ${formatPrice(pagado)} y el total nuevo es ${formatPrice(o.grandTotal)}. Ella puede subir su comprobante en Mis pedidos.</div>` : ""}
        ${extras.map(fila).join("")}
        ${debe > 0.5 ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
          <button type="button" class="btn-primary" data-diff-pagado="${o.id}" style="padding:6px 12px;font-size:13px;">✅ Ya me pagó la diferencia</button>
          ${extras.some((p) => p.status === "revision") ? `<button type="button" class="btn-secondary" data-diff-rechazar="${o.id}" style="padding:6px 12px;font-size:13px;">❌ Rechazar comprobante</button>` : ""}
        </div>` : ""}
      </div>`;
    }
    return html;
  }

  document.addEventListener("click", async (e) => {
    const ok = e.target.closest("[data-diff-pagado]");
    const no = e.target.closest("[data-diff-rechazar]");
    const btn = ok || no;
    if (!btn) return;
    let body;
    if (ok) { if (!confirm("¿Ya te pagó la diferencia? Le llega el aviso de que quedó todo pagado.")) return; body = { orderId: ok.dataset.diffPagado, pagado: true }; }
    else { const motivo = prompt("¿Por qué lo rechazas? (se lo mandamos a la clienta)", "No encontramos tu transferencia, revisa el comprobante."); if (motivo == null) return; body = { orderId: no.dataset.diffRechazar, rechazar: true, motivo }; }
    btn.disabled = true;
    try {
      const res = await fetch("/.netlify/functions/admin-order-diff", { method: "POST", headers: { "Content-Type": "application/json", "x-admin-key": adminKey }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo guardar.");
      (data.orders || []).forEach((u) => { const i = allOrders.findIndex((x) => x.id === u.id); if (i >= 0) allOrders[i] = u; });
      showToast(ok ? "✅ Diferencia marcada como pagada." : "Comprobante rechazado; ya le avisé.");
      applyFilters();
    } catch (err) { alert(err.message); btn.disabled = false; }
  });

  const SUPPLIER_URL = "https://www.asianbeautywholesale.com/en/home.html";

  // Solo los productos que NO están "en stock" hay que comprarlos de
  // nuevo al proveedor (los que ya están en stock ya los tiene Mae) --
  // por eso el botón no aparece o el prompt sale vacío si el pedido es
  // 100% de productos en stock.
  function supplierSourceableItems(o) {
    return (o.items || []).filter((it) => !it.enStock);
  }

  function buildSupplierPrompt(o) {
    const items = supplierSourceableItems(o);
    if (!items.length) return "";
    const itemLines = items
      .map((it) => {
        const marca = itemMarca(it);
        const label = marca ? `${marca} - ${it.nombre}` : it.nombre;
        return `- ${label} (cantidad: ${it.qty})`;
      })
      .join("\n");
    return `Necesito que armes un carrito de compra en Asian Beauty Wholesale (${SUPPLIER_URL}) con estos productos exactos, para surtir un pedido real de una clienta.

PASOS:

1. Ve a ${SUPPLIER_URL}. Si ya hay una sesión iniciada en el sitio, úsala. Si pide iniciar sesión, DETENTE y avísame -- no inicies sesión tú.

2. Busca cada uno de estos productos con el buscador del sitio y agrégalo al carrito con la cantidad indicada. Si no encuentras una coincidencia exacta, busca el más parecido por nombre/marca/presentación y avísame cuál elegiste para que yo lo confirme antes de pagar:

${itemLines}

3. NO completes la compra ni el pago bajo ninguna circunstancia -- solo deja todo listo en el carrito. Yo voy a revisar cada producto y voy a darle clic a pagar yo misma.

4. Al final dime, para cada producto: si lo encontraste exacto o fue una aproximación (y cuál fue), y confírmame que el carrito ya tiene todo lo que pedí y está listo para que yo pague.`;
  }

  function supplierPromptBlockHTML(o) {
    // No tiene caso pedirle al proveedor los productos de un pedido
    // cancelado o que no se pudo cobrar.
    if (o.status === "cancelled" || o.status === "failed") return "";
    if (!buildSupplierPrompt(o)) return "";
    return `
      <div class="edit-block">
        <button type="button" class="btn-secondary edit-toggle" data-supplier-prompt-toggle="${o.id}">🛍️ Pedir a Asian Beauty Wholesale</button>
        <div class="guide-form" id="supplier-prompt-form-${o.id}">
          <p class="edit-hint">Copia este prompt y pégalo en Claude en Chrome (con Asian Beauty Wholesale abierto) -- él arma el carrito con estos productos, tú nada más revisas y le das pagar.</p>
          <textarea readonly id="supplier-prompt-text-${o.id}" rows="12" style="width:100%;font-family:monospace;font-size: 14px;padding:8px;box-sizing:border-box;"></textarea>
          <div class="row">
            <button type="button" class="btn-secondary" data-supplier-prompt-copy="${o.id}">📋 Copiar prompt</button>
            <a href="${SUPPLIER_URL}" target="_blank" rel="noopener" class="btn-secondary" style="text-decoration:none;display:inline-flex;align-items:center;">🔗 Abrir Asian Beauty Wholesale</a>
          </div>
        </div>
      </div>`;
  }

  function toggleSupplierPromptForm(orderId) {
    const form = document.getElementById(`supplier-prompt-form-${orderId}`);
    if (!form) return;
    const opening = !form.classList.contains("open");
    form.classList.toggle("open");
    if (opening) {
      const order = allOrders.find((o) => o.id === orderId);
      const textarea = document.getElementById(`supplier-prompt-text-${orderId}`);
      if (order && textarea) textarea.value = buildSupplierPrompt(order);
    }
  }

  function copySupplierPrompt(orderId, btn) {
    const textarea = document.getElementById(`supplier-prompt-text-${orderId}`);
    if (!textarea) return;
    const showCopied = () => {
      const original = btn.textContent;
      btn.textContent = "✅ ¡Copiado!";
      setTimeout(() => { btn.textContent = original; }, 1500);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textarea.value).then(showCopied).catch(() => {
        setStatus("No se pudo copiar. Selecciona el texto del cuadro manualmente.");
      });
    } else {
      setStatus("No se pudo copiar. Selecciona el texto del cuadro manualmente.");
    }
  }

  function wireSupplierPromptButtons(container) {
    container.querySelectorAll("[data-supplier-prompt-toggle]").forEach((btn) => {
      btn.addEventListener("click", () => toggleSupplierPromptForm(btn.dataset.supplierPromptToggle));
    });
    container.querySelectorAll("[data-supplier-prompt-copy]").forEach((btn) => {
      btn.addEventListener("click", () => copySupplierPrompt(btn.dataset.supplierPromptCopy, btn));
    });
  }

  /* Nota interna (NUNCA se le muestra al cliente): el número de pedido
     que da Asian Beauty Wholesale al comprarle, para que Mae pueda
     relacionar un pedido de su tienda con su compra al proveedor. Se
     guarda con su propio botón, igual que el número de guía -- no se
     manda solo al escribir. */
  function supplierNoteBlockHTML(o) {
    return `
      <div class="supplier-note-block">
        <p class="hint">📝 Número de pedido en ABW (solo para tu organización -- nunca se le muestra al cliente)</p>
        <div class="row">
          <input type="text" placeholder="Ej. 10293-AB" data-supplier-order-number="${o.id}" value="${escapeHtml(o.supplierOrderNumber || "")}" />
          <button type="button" class="btn-secondary" data-save-supplier-order="${o.id}">💾 Guardar</button>
        </div>
      </div>`;
  }

  async function saveSupplierOrderNumber(orderId, btn) {
    const input = document.querySelector(`[data-supplier-order-number="${orderId}"]`);
    if (!input) return;
    const supplierOrderNumber = input.value.trim();
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Guardando...";
    try {
      const res = await fetch("/.netlify/functions/admin-update-supplier-order", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ orderId, supplierOrderNumber }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error || "No se pudo guardar la nota.");
        return;
      }
      const order = allOrders.find((o) => o.id === orderId);
      if (order) order.supplierOrderNumber = supplierOrderNumber;
      btn.textContent = "✅ Guardado";
      setTimeout(() => { btn.textContent = originalText; }, 1500);
    } catch (err) {
      setStatus("No se pudo conectar con el servidor.");
    } finally {
      btn.disabled = false;
    }
  }

  function wireSupplierNoteButtons(container) {
    container.querySelectorAll("[data-save-supplier-order]").forEach((btn) => {
      btn.addEventListener("click", () => saveSupplierOrderNumber(btn.dataset.saveSupplierOrder, btn));
    });
    container.querySelectorAll("[data-supplier-order-number]").forEach((input) => {
      input.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        const orderId = input.dataset.supplierOrderNumber;
        const btn = document.querySelector(`[data-save-supplier-order="${orderId}"]`);
        if (btn) saveSupplierOrderNumber(orderId, btn);
      });
    });
  }

  function wireProofLinkButtons(container) {
    container.querySelectorAll("[data-view-proof]").forEach((btn) => {
      btn.addEventListener("click", () => viewPaymentProof(btn.dataset.viewProof, btn, btn.dataset.viewProofExtra, btn.dataset.viewProofN));
    });
  }

  // La clave de admin ya NO va en la URL (quedaba guardada en el
  // historial del navegador y en los logs del servidor) -- se manda
  // como header, igual que el resto de las llamadas a /admin-*.
  //
  // El comprobante se muestra en un visor DENTRO de la misma página
  // (ver #proof-viewer-overlay en admin.html), no en una pestaña nueva
  // -- se probó abrir una pestaña con window.open() + blob:, pero eso
  // se rompe según el navegador: en Chrome, window.open("", "_blank",
  // "noopener") regresa null (no se puede redirigir después) y en
  // Safari/WebKit la pestaña nueva simplemente no logra cargar un
  // blob: creado en la ventana de origen -- en ambos casos se quedaba
  // en blanco para siempre. Un <iframe> en la MISMA página con el
  // mismo blob: sí funciona en todos los navegadores probados.
  let currentProofBlobUrl = null;

  // Las fotos van en un <img> ajustado a la ventana (en el <iframe>, el
  // iPhone las mostraba a tamaño real y había que deslizarse para verlas
  // completas). Los PDF, o si la foto no se puede mostrar, siguen en el
  // <iframe>.
  function showProofIn(kind) {
    const isImg = kind === "img";
    document.getElementById("proof-viewer-frame").style.display = isImg ? "none" : "block";
    document.getElementById("proof-viewer-img-wrap").style.display = isImg ? "block" : "none";
    document.getElementById("proof-viewer-hint").style.display = isImg ? "block" : "none";
  }

  function setProofZoom(zoomed) {
    const img = document.getElementById("proof-viewer-img");
    img.dataset.zoomed = zoomed ? "1" : "";
    img.style.width = zoomed ? "auto" : "100%";
    img.style.height = zoomed ? "auto" : "100%";
    img.style.maxWidth = zoomed ? "none" : "";
    img.style.cursor = zoomed ? "zoom-out" : "zoom-in";
  }

  function openProofViewer(blobUrl, contentType) {
    currentProofBlobUrl = blobUrl;
    const frame = document.getElementById("proof-viewer-frame");
    const img = document.getElementById("proof-viewer-img");
    if (contentType === "application/pdf") {
      showProofIn("frame");
      frame.src = blobUrl;
    } else {
      setProofZoom(false);
      showProofIn("img");
      img.onerror = () => {
        img.onerror = null;
        showProofIn("frame");
        frame.src = blobUrl;
      };
      img.src = blobUrl;
    }
    document.getElementById("proof-viewer-overlay").style.display = "flex";
  }

  function closeProofViewer() {
    document.getElementById("proof-viewer-overlay").style.display = "none";
    document.getElementById("proof-viewer-frame").src = "about:blank";
    const img = document.getElementById("proof-viewer-img");
    img.onerror = null;
    img.removeAttribute("src");
    if (currentProofBlobUrl) {
      URL.revokeObjectURL(currentProofBlobUrl);
      currentProofBlobUrl = null;
    }
  }

  async function viewPaymentProof(orderId, btn, extra, n) {
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Cargando...";
    try {
      const res = await fetch(`/.netlify/functions/admin-payment-proof?orderId=${encodeURIComponent(orderId)}${extra != null && extra !== "" ? `&extra=${encodeURIComponent(extra)}` : ""}${n != null && n !== "" ? `&n=${encodeURIComponent(n)}` : ""}`, {
        headers: { "x-admin-key": adminKey },
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const blob = await res.blob();
      openProofViewer(URL.createObjectURL(blob), blob.type);
    } catch (err) {
      setStatus("No se pudo cargar el comprobante de pago.");
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  }

  /* Solo en pedidos ya pagados: captura el número de guía y arma, con un
     clic, el mensaje de WhatsApp para avisarle al cliente que su pedido
     ya va en camino (abre WhatsApp con todo escrito, listo para mandar). */
  function trackingBlockHTML(o) {
    if (o.status !== "paid") return "";
    const shippedInfo = o.trackingNumber
      ? `<p class="shipped-info">🚚 Enviado${o.carrier ? " · " + escapeHtml(o.carrier) : ""} · Guía: ${escapeHtml(o.trackingNumber)}</p>`
      : "";
    return `
      <div class="tracking-block">
        ${shippedInfo}
        <div class="tracking-row">
          <input aria-label="Número de guía" type="text" placeholder="Número de guía" data-tracking-number="${o.id}" value="${escapeHtml(o.trackingNumber || "")}" />
          <input aria-label="Paquetería (opcional)" type="text" placeholder="Paquetería (opcional)" data-tracking-carrier="${o.id}" value="${escapeHtml(o.carrier || "")}" />
        </div>
        <button type="button" class="btn-secondary" data-send-tracking="${o.id}">💬 ${o.trackingNumber ? "Actualizar y avisar por WhatsApp" : "Guardar y avisar por WhatsApp"}</button>
      </div>`;
  }

  /* Solo en pedidos pagados: botón para generar la guía real con Envíos
     Perros (cotiza, tú eliges la paquetería y se genera + avisa por
     WhatsApp). Caja fija 2x2x2 cm, solo el peso lo escribes tú. */
  function guideBlockHTML(o) {
    if (o.status !== "paid" || isEntregaPersonal(o)) return "";
    const c = o.customer || {};
    return `
      <div class="guide-block">
        <button type="button" class="btn-secondary guide-toggle" data-guide-toggle="${o.id}">📦 Generar guía real (comparar precios)</button>
        <div class="guide-form" id="guide-form-${o.id}">
          <label class="field-label">Peso del paquete (kg) · caja 2x2x2 cm</label>
          <div class="row">
            <input aria-label="Peso en kg" type="number" step="0.1" min="0.1" placeholder="Ej. 1.5" list="weight-presets" data-guide-weight="${o.id}" />
            <button type="button" class="btn-secondary" data-guide-quote="${o.id}">💲 Cotizar y comparar</button>
          </div>
          <label class="field-label">Datos del destinatario (revísalos antes de generar)</label>
          <div class="row">
            <input aria-label="Nombre" type="text" placeholder="Nombre" value="${escapeHtml(c.name || "")}" data-guide-name="${o.id}" />
            <input aria-label="Teléfono" type="text" placeholder="Teléfono" value="${escapeHtml(c.phone || "")}" data-guide-phone="${o.id}" />
          </div>
          <div class="row">
            <input aria-label="Calle" type="text" placeholder="Calle" value="${escapeHtml(c.street || "")}" data-guide-street="${o.id}" />
            <input aria-label="No. ext." type="text" placeholder="No. ext." data-guide-ext="${o.id}" />
            <input aria-label="No. int. (opcional)" type="text" placeholder="No. int. (opcional)" data-guide-int="${o.id}" />
          </div>
          <div class="row">
            <input aria-label="Colonia" type="text" placeholder="Colonia" value="${escapeHtml(c.colonia || "")}" data-guide-neighborhood="${o.id}" />
            <input aria-label="Código postal" type="text" placeholder="Código postal" value="${escapeHtml(c.cp || "")}" data-guide-zip="${o.id}" />
          </div>
          <div class="row">
            <input aria-label="Municipio/Alcaldía" type="text" placeholder="Municipio/Alcaldía" value="${escapeHtml(c.municipio || "")}" data-guide-city="${o.id}" />
            <input aria-label="Estado" type="text" placeholder="Estado" value="${escapeHtml(c.estado || "")}" data-guide-state="${o.id}" />
          </div>
          <input aria-label="Referencias" type="text" placeholder="Referencias" value="${escapeHtml(c.referencias || "")}" data-guide-references="${o.id}" />
          <div class="rate-options" data-guide-rates="${o.id}"></div>
          <div class="guide-error" data-guide-error="${o.id}"></div>
          <button type="button" class="btn-primary" data-guide-generate="${o.id}" disabled>📦 Generar guía y avisar por WhatsApp</button>
        </div>
      </div>`;
  }

  function editItemRowHTML(it) {
    const precio = it ? itemPrecioTransferencia(it) : 0;
    return `
      <div class="edit-item-row"${it && it.preorden ? ' data-preorden="1"' : ""}>
        <input aria-label="Nombre del producto" type="text" class="edit-item-nombre" placeholder="Nombre del producto" value="${escapeHtml((it && it.nombre) || "")}" />
        <input aria-label="Marca" type="text" class="edit-item-marca" placeholder="Marca" value="${escapeHtml(it ? itemMarca(it) : "")}" />
        <input aria-label="SKU" type="text" class="edit-item-sku" placeholder="SKU" value="${escapeHtml((it && it.sku) || "")}" />
        <input aria-label="Cant." type="number" class="edit-item-qty" min="1" step="1" value="${it ? it.qty : 1}" placeholder="Cant." />
        <input aria-label="Precio (transf.) c/u" type="number" class="edit-item-precio" min="0" step="1" value="${precio}" placeholder="Precio (transf.) c/u" />
        <label class="edit-stock-label"><input type="checkbox" class="edit-item-enstock" ${it && it.enStock ? "checked" : ""} /> en stock</label>
        <button type="button" class="btn-danger edit-item-remove">Quitar</button>
      </div>`;
  }

  /* Panel para agregar/quitar productos de un pedido (pendiente o ya
     pagado) cuando el cliente cambia de opinión. En pedidos pagados,
     además de actualizar el registro, ajusta las piezas vendidas del
     stock (lib/blob-store.js adjustStockSold) para que no quede
     descuadrado -- pero NO cobra ni reembolsa nada por sí solo: si el
     pedido se pagó con Mercado Pago, ese cobro ya quedó fijo ahí, así que
     cualquier diferencia hay que cobrarla o reembolsarla aparte, tú
     misma, desde tu cuenta de Mercado Pago (ver admin-update-order-items.js). */
  function editBlockHTML(o) {
    if (o.status !== "pending" && o.status !== "paid") return "";
    const shippingValue = o.shippingMXNBase != null ? o.shippingMXNBase : (o.shippingMXN || 0);
    const rows = (o.items || []).map((it) => editItemRowHTML(it)).join("");
    const mpWarning = o.status === "paid" && o.source === "mercadopago"
      ? `<p class="edit-hint">⚠️ Este pedido ya se cobró por Mercado Pago -- si agregas o quitas productos, ese cobro NO cambia solo. Cualquier diferencia tienes que cobrarla o reembolsarla tú misma desde tu cuenta de Mercado Pago.</p>`
      : "";
    const stockHint = o.status === "paid"
      ? `<p class="edit-hint">Esto también ajusta las piezas vendidas de tu hoja de Stock para los productos marcados "en stock".</p>`
      : "";
    return `
      <div class="edit-block">
        <button type="button" class="btn-secondary edit-toggle" data-edit-toggle="${o.id}">✏️ Modificar productos del pedido</button>
        <div class="guide-form" id="edit-form-${o.id}">
          <label class="field-label">Productos</label>
          <div class="edit-items" id="edit-items-${o.id}">${rows}</div>
          <button type="button" class="btn-secondary" data-edit-add="${o.id}">+ Agregar producto</button>
          <label class="field-label">Envío (precio de transferencia)</label>
          <input type="number" min="0" step="1" id="edit-shipping-${o.id}" value="${shippingValue}" />
          <label class="field-label">Total cobrado</label>
          <input type="number" min="0" step="1" id="edit-total-${o.id}" value="${o.grandTotal || 0}" />
          <p class="edit-hint">Subtotal + envío = <span id="edit-computed-${o.id}">$0.00</span> ·
            <button type="button" data-edit-use-computed="${o.id}">usar este total</button></p>
          ${o.status === "paid" ? `<p class="edit-hint" id="edit-saldo-${o.id}" data-pagado="${o.montoPagado != null ? o.montoPagado : o.grandTotal || 0}" style="font-weight:700;"></p>` : ""}
          ${mpWarning}
          ${stockHint}
          <div class="guide-error" id="edit-error-${o.id}"></div>
          <button type="button" class="btn-primary" data-edit-save="${o.id}">💾 Guardar cambios</button>
          <p class="edit-hint">A la clienta le llega un aviso con lo que cambió y, si ya pagó, si le debes un reembolso o le falta pagar.</p>
          ${o.status === "paid" ? `<button type="button" class="btn-danger" data-cancel-paid="${o.id}" style="margin-top:8px;">✕ Cancelar todo el pedido (reembolso)</button>` : ""}
        </div>
      </div>`;
  }

  /* Resumen de una línea de cada pedido (clienta, total, etapa, fecha).
     El detalle completo (productos, dirección, guía, etc.) se abre al
     tocarlo, para que la lista no mida decenas de pantallas. */
  function cardSummaryHTML(o, chipsHTML, expanded) {
    const c = o.customer || {};
    const { pieces } = orderPiecesAndWeight(o);
    const extra = [bucketChipHTML(o)];
    if (isEntregaPersonal(o)) extra.push(`<span class="badge" style="background:#fde7ee;color:#9b2c4f;">📍 Entrega personal</span>`);
    if (o.pedidoCompartido) extra.push(`<span class="badge" style="background:#ede7fb;color:#5b3fa0;">👯 Compartido ${escapeHtml(o.cupon || "")}</span>`);
    const junto = pedidosJuntos(o);
    if (junto.length) extra.push(`<span class="badge" style="background:#e2f0fb;color:#0b5a99;">🔗 Envío junto con ${junto.map((x) => "#" + orderNumber(x)).join(", ")}</span>`);
    else if (otrosAbiertos(o).length) extra.push(`<span class="badge" style="background:#fff1d8;color:#8a5a00;">⚠️ Tiene otro pedido abierto</span>`);
    return `
      <button type="button" class="card-summary" data-card-toggle="${o.id}" aria-expanded="${expanded ? "true" : "false"}" aria-controls="card-body-${o.id}">
        <span>
          <span class="cs-name">${highlightMatch(c.name || "(sin nombre)", currentSearchTerm)}</span>
          <span class="cs-meta">#${orderNumber(o)} · ${formatFecha(o.createdAt)} · ${pieces} pieza${pieces === 1 ? "" : "s"}</span>
        </span>
        <span class="cs-right">
          <span class="cs-total">${formatPrice(o.grandTotal)}</span>
          <span class="cs-chev" aria-hidden="true">▾</span>
        </span>
        <span class="cs-chips">${chipsHTML}${extra.join("")}</span>
      </button>`;
  }

  function historyCardHTML(o) {
    const statusLabel = STATUS_LABELS[o.status] || o.status;
    const borderColor = STATUS_BORDER_COLORS[o.status] || "#ddd";
    // Borrar no se puede deshacer: va escondido en "Más opciones" (y pide
    // confirmación), no como botón rojo grande al alcance del dedo.
    const deleteBtn = (o.status === "cancelled" || o.status === "paid")
      ? `<details class="more-opts"><summary>⋯ Más opciones</summary>${stageSelectHTML(o)}<div class="actions"><button type="button" class="btn-danger" data-delete="${o.id}">🗑️ Mandar a la papelera</button></div></details>`
      : "";
    // Los pendientes ya traen su propio panel de edición en pendingCardHTML
    // -- si también se pintara aquí, habría dos elementos con el mismo id
    // en la página (uno en "Pedidos pendientes", otro en "Todos tus
    // pedidos") y solo el primero respondería a los botones.
    const editBlock = o.status === "pending" ? "" : editBlockHTML(o);
    // Igual que editBlock -- si el pedido es "pending" ya trae su propio
    // botón/prompt en pendingCardHTML, así que aquí se omite para no
    // repetir el mismo id en la página.
    const supplierBlock = o.status === "pending" ? "" : supplierPromptBlockHTML(o);
    const supplierNote = o.status === "pending" ? "" : supplierNoteBlockHTML(o);
    const chips = `<span class="badge status-${o.status}">${statusLabel}</span><span class="badge ${o.source}">${sourceLabel(o)}</span>`;
    // Con búsqueda activa se abren solos, para ver qué producto coincidió.
    const expanded = Boolean(currentSearchTerm) || openCards.has(o.id);
    return `
      <div class="order-card compact" style="border-left-color:${borderColor};">
        ${cardSummaryHTML(o, chips, expanded)}
        <div class="card-body" id="card-body-${o.id}" ${expanded ? "" : "hidden"}>
          <ul>${itemsListHTML(o)}</ul>
          ${totalsBreakdownHTML(o)}
          <div class="total">${formatPrice(o.grandTotal)}</div>
          ${profitHTML(o)}
          ${customerHTML(o)}
          ${proofLinkHTML(o)}
          ${nextStepHTML(o)}
          ${linkBlockHTML(o)}
          ${trackingBlockHTML(o)}
          ${guideBlockHTML(o)}
          ${editBlock}
          ${supplierBlock}
          ${supplierNote}
          ${deleteBtn}
        </div>
      </div>`;
  }

  function pendingCardHTML(o) {
    const borderColor = STATUS_BORDER_COLORS[o.status] || "#f0ad4e";
    const chips = `<span class="badge status-pending">⏳ Por confirmar</span><span class="badge ${o.source}">${sourceLabel(o)}</span>`;
    // Los "por confirmar" se muestran abiertos: son los que hay que atender.
    // Los botones de pago van arriba, justo después de los datos de la
    // clienta y el comprobante, no hasta el final de la tarjeta.
    return `
      <div class="order-card compact" style="border-left-color:${borderColor};">
        ${cardSummaryHTML(o, chips, !closedPendingCards.has(o.id))}
        <div class="card-body" id="card-body-${o.id}" ${closedPendingCards.has(o.id) ? "hidden" : ""}>
          <ul>${itemsListHTML(o)}</ul>
          ${totalsBreakdownHTML(o)}
          <div class="total">${formatPrice(o.grandTotal)}</div>
          ${customerHTML(o)}
          ${proofLinkHTML(o)}
          ${profitHTML(o)}
          ${linkBlockHTML(o)}
          <div class="actions primary-actions">
            <button class="btn-primary" data-confirm="${o.id}" title="Esto resta las piezas vendidas del stock automáticamente">✅ Ya me pagó</button>
            <button class="btn-danger" data-cancel="${o.id}">✕ No pagó / Cancelar</button>
          </div>
          ${o.source === "mercadopago" ? `<div class="meta" style="margin-top:6px;">💳 Eligió pagar con tarjeta: este pedido se confirma solo cuando Mercado Pago aprueba el pago. Si sigue aquí, puede que no haya terminado de pagar o que le rechazaran la tarjeta.</div>
          <div class="actions"><button class="btn-secondary" data-mp-check="${o.id}">🔎 Revisar en Mercado Pago</button></div><div class="meta" data-mp-result="${o.id}"></div>` : ""}
          ${editBlockHTML(o)}
          ${supplierPromptBlockHTML(o)}
          ${supplierNoteBlockHTML(o)}
        </div>
      </div>`;
  }

  function csvEscape(val) {
    const s = String(val ?? "");
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function ordersToCSV(orders) {
    const header = ["Fecha", "Origen", "Estado", "Cliente", "Teléfono", "Calle y número", "Colonia", "Municipio/Alcaldía", "Estado (Mx)", "CP", "Referencias", "Productos", "Subtotal productos", "Envío", "Comisión por tarjeta", "Total"];
    const rows = orders.map((o) => {
      const { subtotal, shippingMXN, cardFeeMXN } = orderBreakdown(o);
      return [
        o.createdAt ? new Date(o.createdAt).toLocaleString("es-MX") : "",
        o.source === "mercadopago" ? "Tarjeta (Mercado Pago)" : "Transferencia",
        STATUS_LABELS[o.status] || o.status,
        o.customer?.name || "",
        o.customer?.phone || "",
        o.customer?.street || "",
        o.customer?.colonia || "",
        o.customer?.municipio || "",
        o.customer?.estado || "",
        o.customer?.cp || "",
        o.customer?.referencias || "",
        (o.items || []).map((it) => { const marca = itemMarca(it); const precio = itemPrecioTransferencia(it); return `${marca ? marca + " - " : ""}${it.nombre} x${it.qty} (${formatPrice(precio)} c/u)`; }).join("; "),
        subtotal,
        shippingMXN,
        cardFeeMXN,
        o.grandTotal || 0,
      ];
    });
    return [header, ...rows].map((cols) => cols.map(csvEscape).join(",")).join("\r\n");
  }

  function exportCSV() {
    if (!filteredOrders.length) return;
    const csv = ordersToCSV(filteredOrders);
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pedidos-alpacca-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /* ======================================================================
     Agregar producto nuevo a la pestaña de Stock (ver
     admin-add-stock-product.js) -- vive DENTRO del panel de Inventario
     (arriba de la tabla), para productos que todavía no existen. Al
     agregarse, se inserta también en inventoryProducts para que aparezca
     de inmediato en la tabla de abajo sin tener que recargar.
     ====================================================================== */
  function toggleAddStockForm() {
    const form = document.getElementById("add-stock-form");
    const opening = form.style.display === "none";
    form.style.display = opening ? "flex" : "none";
    if (opening) {
      document.getElementById("stock-add-error").textContent = "";
      document.getElementById("stock-add-success").style.display = "none";
      resetTarjetaAutoFill();
    }
  }

  /* Varios tonos/colores del mismo producto: cada uno se guarda como su
     propia fila en Stock (mismo nombre base + "(#tono)" al final), que el
     catálogo agrupa solo en una tarjeta con selector -- ver groupVariants()
     en app.js. Precio/marca/categoria/peso/foto/descripción son los
     mismos para todos los tonos; solo cambian el tono, sus piezas y su
     SKU. */
  function tonoRowHTML() {
    return `
      <div class="stock-tono-row" data-tono-row>
        <input type="text" class="tono-label" placeholder="Tono/color (ej. #21 Light Beige) *" />
        <input type="number" class="tono-piezas" placeholder="Piezas *" min="1" step="1" />
        <input type="text" class="tono-sku" placeholder="SKU (opcional)" />
        <button type="button" class="btn-danger tono-remove">Quitar</button>
      </div>`;
  }

  function addTonoRow() {
    const list = document.getElementById("stock-tonos-list");
    list.insertAdjacentHTML("beforeend", tonoRowHTML());
    const row = list.lastElementChild;
    row.querySelector(".tono-remove").addEventListener("click", () => removeTonoRow(row));
  }

  function removeTonoRow(row) {
    const list = document.getElementById("stock-tonos-list");
    if (list.children.length <= 1) return; // siempre deja al menos un renglón
    row.remove();
  }

  function toggleMultiTono() {
    const checked = document.getElementById("stock-multi-tono-toggle").checked;
    document.getElementById("stock-tonos-section").style.display = checked ? "flex" : "none";
    document.getElementById("stock-single-piezas-row").style.display = checked ? "none" : "flex";
    const list = document.getElementById("stock-tonos-list");
    if (checked && !list.children.length) {
      addTonoRow();
      addTonoRow();
    }
  }

  function resetTonoRows() {
    const list = document.getElementById("stock-tonos-list");
    list.innerHTML = "";
    document.getElementById("stock-multi-tono-toggle").checked = false;
    toggleMultiTono();
  }

  async function addStockProductRequest(body) {
    const res = await fetch("/.netlify/functions/admin-add-stock-product", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return { ok: res.ok, data };
  }

  /* Inserta un producto recién agregado hasta arriba de la tabla de
     inventario, sin esperar a que se recargue desde el Sheet -- solo si
     el panel ya cargó su lista (si no, loadInventory() la traerá
     completa de todos modos la próxima vez que se abra). */
  function addToInventoryList(product) {
    if (!inventoryLoaded) return;
    inventoryProducts.unshift(product);
    renderInventoryList();
  }

  async function submitAddStockProduct() {
    const errorEl = document.getElementById("stock-add-error");
    const successEl = document.getElementById("stock-add-success");
    errorEl.textContent = "";
    successEl.style.display = "none";

    const nombre = document.getElementById("stock-nombre").value.trim();
    const precio = Number(document.getElementById("stock-precio").value);
    const sharedFields = {
      precio,
      precioTarjeta: document.getElementById("stock-precio-tarjeta").value || undefined,
      marca: document.getElementById("stock-marca").value.trim(),
      categoria: document.getElementById("stock-categoria").value.trim(),
      descripcion: document.getElementById("stock-descripcion").value.trim(),
      peso: document.getElementById("stock-peso").value || undefined,
      imagen: document.getElementById("stock-imagen").value.trim(),
    };

    if (!nombre) { errorEl.textContent = "Falta el nombre del producto."; return; }
    if (!precio || precio <= 0) { errorEl.textContent = "El precio debe ser un número mayor a 0."; return; }

    const isMultiTono = document.getElementById("stock-multi-tono-toggle").checked;
    const btn = document.getElementById("stock-add-submit");
    const originalText = btn.textContent;

    if (!isMultiTono) {
      const piezas = Number(document.getElementById("stock-piezas").value);
      if (!piezas || piezas <= 0) { errorEl.textContent = "Las piezas deben ser un número mayor a 0."; return; }

      btn.disabled = true;
      btn.textContent = "Agregando...";
      try {
        const { ok, data } = await addStockProductRequest({
          ...sharedFields,
          nombre,
          piezas,
          sku: document.getElementById("stock-sku").value.trim(),
        });
        if (!ok) { errorEl.textContent = data.error || "No se pudo agregar el producto."; return; }
        successEl.textContent = `✅ "${nombre}" se agregó a tu Stock con el SKU ${data.sku}.`;
        successEl.style.display = "block";
        addToInventoryList({
          sku: data.sku, nombre, marca: sharedFields.marca, piezas,
          precio: sharedFields.precio, precioTarjeta: Number(sharedFields.precioTarjeta) || 0,
          categoria: sharedFields.categoria, peso: Number(sharedFields.peso) || 0,
          imagen: sharedFields.imagen, descripcion: sharedFields.descripcion,
        });
        ["stock-nombre", "stock-marca", "stock-piezas", "stock-precio", "stock-precio-tarjeta",
         "stock-categoria", "stock-peso", "stock-sku", "stock-imagen", "stock-descripcion"]
          .forEach((id) => { document.getElementById(id).value = ""; });
        resetTarjetaAutoFill();
      } catch (err) {
        errorEl.textContent = "No se pudo conectar con el servidor.";
      } finally {
        btn.disabled = false;
        btn.textContent = originalText;
      }
      return;
    }

    // Modo varios tonos: una fila por cada tono, mismo nombre base.
    const rows = Array.from(document.querySelectorAll("#stock-tonos-list [data-tono-row]"));
    const tonos = [];
    for (const row of rows) {
      let label = row.querySelector(".tono-label").value.trim();
      const piezas = Number(row.querySelector(".tono-piezas").value);
      const sku = row.querySelector(".tono-sku").value.trim();
      if (!label && !piezas && !sku) continue; // renglón vacío, se ignora
      if (!label) { errorEl.textContent = "Falta el tono/color en alguno de los renglones."; return; }
      if (!label.startsWith("#")) label = `#${label}`;
      if (!piezas || piezas <= 0) { errorEl.textContent = `Faltan las piezas del tono "${label}".`; return; }
      tonos.push({ label, piezas, sku });
    }
    if (tonos.length < 2) { errorEl.textContent = "Agrega al menos 2 tonos, o desmarca la casilla de varios tonos."; return; }

    btn.disabled = true;
    btn.textContent = "Agregando...";
    const added = [];
    const failed = [];
    for (const tono of tonos) {
      try {
        const { ok, data } = await addStockProductRequest({
          ...sharedFields,
          nombre: `${nombre} (${tono.label})`,
          piezas: tono.piezas,
          sku: tono.sku,
        });
        if (ok) {
          added.push({ tono: tono.label, sku: data.sku });
          addToInventoryList({
            sku: data.sku, nombre: `${nombre} (${tono.label})`, marca: sharedFields.marca, piezas: tono.piezas,
            precio: sharedFields.precio, precioTarjeta: Number(sharedFields.precioTarjeta) || 0,
            categoria: sharedFields.categoria, peso: Number(sharedFields.peso) || 0,
            imagen: sharedFields.imagen, descripcion: sharedFields.descripcion,
          });
        } else {
          failed.push({ tono: tono.label, error: data.error || "No se pudo agregar." });
        }
      } catch (err) {
        failed.push({ tono: tono.label, error: "No se pudo conectar con el servidor." });
      }
    }
    btn.disabled = false;
    btn.textContent = originalText;

    if (added.length) {
      successEl.textContent = `✅ Se agregaron ${added.length} tono(s) de "${nombre}": ${added.map((a) => `${a.tono} (SKU ${a.sku})`).join(", ")}.`;
      successEl.style.display = "block";
    }
    if (failed.length) {
      errorEl.textContent = `No se pudieron agregar ${failed.length} tono(s): ${failed.map((f) => `${f.tono} (${f.error})`).join("; ")}`;
    }
    if (!failed.length) {
      ["stock-nombre", "stock-marca", "stock-precio", "stock-precio-tarjeta",
       "stock-categoria", "stock-peso", "stock-imagen", "stock-descripcion"]
        .forEach((id) => { document.getElementById(id).value = ""; });
      resetTonoRows();
      resetTarjetaAutoFill();
    }
  }

  /* ======================================================================
     Inventario (ver admin-list-stock.js / admin-update-stock-product.js /
     admin-delete-stock-product.js) -- tabla para ver, editar, sumar/restar
     piezas y quitar productos que YA están publicados en tu pestaña de
     Stock, sin tener que abrir el Excel. El formulario de arriba
     ("Agregar producto en Stock") es para los que todavía no existen.
     ====================================================================== */
  let inventoryLoaded = false;
  let inventoryProducts = [];
  let inventorySearchTerm = "";

  /* ----- 📥 Cambios de stock listos para aplicar -----
     Claude deja los productos nuevos en /stock-lotes/*.json (con sus fotos ya
     subidas al sitio); aquí se cargan con un solo botón al Sheet de Stock.
     Es seguro tocarlo dos veces: lo que ya existe se salta. */
  let stockLotesMsg = ""; // resultado de lo último que se aplicó (queda visible)
  async function renderStockLotes() {
    const box = document.getElementById("stock-lotes-box");
    if (!box) return;
    try {
      const idx = await (await fetch("/stock-lotes/index.json", { cache: "no-store" })).json();
      const lotes = await Promise.all(idx.map(async (f) => ({ f, ...(await (await fetch(`/stock-lotes/${f}`, { cache: "no-store" })).json()) })));
      const porSku = new Map(inventoryProducts.map((p) => [String(p.sku || "").trim(), p]));
      // Reabastecer (sumar piezas a lo que ya existe) se aplica UNA sola vez: el servidor recuerda cuáles ya.
      let aplicados = new Set();
      if (lotes.some((l) => (l.reabastecer || []).length)) {
        try {
          const ra = await fetch("/.netlify/functions/admin-stock-lotes", { headers: { "x-admin-key": adminKey }, cache: "no-store" });
          if (ra.ok) aplicados = new Set((await ra.json()).aplicados || []);
          else throw new Error("sin lista");
        } catch (err) { box.style.display = "none"; return; } // sin saber qué ya se sumó, mejor no ofrecerlo
      }
      // Mezclas: juntar piezas de un producto en otro (ej. lotes de 3 → lotes de 10).
      const calcMezcla = (m, inv) => {
        const o = inv.get(m.origen); const d = inv.get(m.destino);
        if (!o || !d) return null;
        const total = (Number(d.piezas) || 0) * m.porDestino + (Number(o.piezas) || 0) * m.porOrigen;
        const nuevos = Math.floor(total / m.porDestino);
        const sobran = total - nuevos * m.porDestino;
        const camposListos = Object.entries(m.campos || {}).every(([k, v]) => String(d[k] || "") === String(v));
        const hecho = !(Number(o.piezas) > 0) && camposListos;
        return { o, d, nuevos, sobran, hecho };
      };
      const sinPiezas = (c) => { const { piezas, ...resto } = c || {}; return resto; };
      const pendientes = lotes.map((l) => ({
        ...l,
        // Productos con datos "pendientes" (peso, foto, categoría, precio...) se muestran pero NO se cargan
        // hasta que el archivo los tenga completos.
        falta: l.productos.filter((p) => !porSku.has(p.sku) && !(p.pendientes || []).length),
        incompletos: l.productos.filter((p) => !porSku.has(p.sku) && (p.pendientes || []).length),
        mezclas: (l.mezclas || []).map((m) => ({ m, c: calcMezcla(m, porSku) })).filter((x) => x.c && !x.c.hecho),
        // Ajustes: cambiar campos (ej. la foto) de productos que ya están en el Stock.
        // Las piezas NO se comparan: después de aplicar se venden y volvería a salir el aviso (y regresaría piezas ya vendidas).
        // Para sumar piezas se usa "reabastecer", que se aplica una sola vez.
        ajustes: (l.ajustes || []).map((a) => ({ ...a, campos: sinPiezas(a.campos) })).filter((a) => porSku.has(a.sku) && Object.entries(a.campos).some(([k, v]) => String(porSku.get(a.sku)[k] || "") !== String(v))),
        reabastecer: (l.reabastecer || []).filter((r) => porSku.has(r.sku) && !aplicados.has(r.id)),
      })).filter((l) => l.falta.length || l.incompletos.length || l.mezclas.length || l.ajustes.length || l.reabastecer.length);
      if (!pendientes.length) {
        if (stockLotesMsg) { box.style.display = "block"; box.innerHTML = `<div class="swm-card" style="border:2px solid #17803d;"><div style="font-size:14px;">${stockLotesMsg}</div><button type="button" class="btn-secondary" data-stock-lote-cerrar style="margin-top:8px;">Cerrar</button></div>`; box.querySelector("[data-stock-lote-cerrar]").addEventListener("click", () => { stockLotesMsg = ""; box.style.display = "none"; box.innerHTML = ""; }); }
        else { box.style.display = "none"; box.innerHTML = ""; }
        return;
      }
      box.style.display = "block";
      box.innerHTML = pendientes.map((l) => `<div class="swm-card" style="border:2px solid #c4466e;">
        <h4><span>📥 Cambios de Stock listos para aplicar</span></h4>
        <div class="meta">${escapeHtml(l.nombre || l.f)}</div>
        ${l.falta.length ? `<div style="font-weight:700;margin-top:6px;">Productos nuevos</div><ul style="margin:4px 0 8px;padding-left:20px;font-size:14px;">${l.falta.map((p) => `<li><b>${p.piezas}</b> × ${escapeHtml(p.nombre)} · ${formatPrice(p.precio)}</li>`).join("")}</ul>` : ""}
        ${l.incompletos.length ? `<div style="font-weight:700;margin-top:6px;color:#8a5a00;">⏳ Faltan datos (todavía no se pueden cargar)</div><ul style="margin:4px 0 8px;padding-left:20px;font-size:14px;color:#8a5a00;">${l.incompletos.map((p) => `<li><b>${p.piezas}</b> × ${escapeHtml(p.nombre)}${p.precio ? ` · ${formatPrice(p.precio)}` : ""} <span class="meta">(falta: ${escapeHtml(p.pendientes.join(", "))})</span></li>`).join("")}</ul>` : ""}
        ${l.reabastecer.length ? `<div style="font-weight:700;margin-top:6px;">${l.reabastecer.every((r) => Number(r.sumar) < 0) ? "➖ Descontar piezas (se restan a lo que ya hay)" : "🔄 Volver a surtir (se suman a lo que ya hay)"}</div><ul style="margin:4px 0 8px;padding-left:20px;font-size:14px;">${l.reabastecer.map((r) => { const p = porSku.get(r.sku); const n = Number(r.sumar); return `<li><b>${n < 0 ? "−" + Math.abs(n) : "+" + n}</b> × ${escapeHtml(p.nombre || r.sku)} <span class="meta">(ahora ${Number(p.piezas) || 0} → ${Math.max(0, (Number(p.piezas) || 0) + n)})</span></li>`; }).join("")}</ul>` : ""}
        ${l.ajustes.length ? `<div style="margin-top:6px;font-size:14px;">🖼️ ${escapeHtml(l.ajustesTexto || "Ajustes")}: <b>${l.ajustes.length}</b> producto${l.ajustes.length === 1 ? "" : "s"}</div>` : ""}
        ${l.mezclas.map(({ m, c }) => `<div style="margin-top:6px;font-size:14px;">🔀 ${escapeHtml(m.texto || "Juntar piezas")}: <b>${c.o.piezas}</b> lote${c.o.piezas === 1 ? "" : "s"} de ${m.porOrigen} + <b>${c.d.piezas}</b> de ${m.porDestino} → <b>${c.nuevos} lotes de ${m.porDestino}</b>${c.sobran ? ` <span style="color:#8a5a00;">(sobran ${c.sobran} pieza${c.sobran === 1 ? "" : "s"} sueltas)</span>` : ""}</div>`).join("")}
        ${l.falta.length || l.mezclas.length || l.ajustes.length || l.reabastecer.length ? `<button type="button" class="btn-primary" data-stock-lote="${escapeHtml(l.f)}" style="margin-top:10px;">📥 Aplicar al Stock</button>` : ""}
        <div data-stock-lote-msg style="margin-top:8px;font-size:14px;"></div></div>`).join("");
      box.querySelectorAll("[data-stock-lote]").forEach((btn) => btn.addEventListener("click", async () => {
        const lote = pendientes.find((l) => l.f === btn.dataset.stockLote);
        const msg = btn.parentElement.querySelector("[data-stock-lote-msg]");
        btn.disabled = true;
        let ok = 0; const fallas = []; let sobraron = "";
        for (const p of lote.falta) {
          msg.textContent = `Cargando ${ok + fallas.length + 1} de ${lote.falta.length}…`;
          try {
            const r = await addStockProductRequest(p);
            if (r.ok || /ya existe/i.test((r.data && r.data.error) || "")) ok++; else fallas.push(`${p.nombre}: ${(r.data && r.data.error) || "error"}`);
          } catch (err) { fallas.push(`${p.nombre}: sin conexión`); }
        }
        if (lote.reabastecer.length) {
          msg.textContent = "Actualizando piezas…";
          let fresco = null;
          try {
            const res = await fetch("/.netlify/functions/admin-list-stock", { headers: { "x-admin-key": adminKey } });
            fresco = new Map(((await res.json()).products || []).map((p) => [String(p.sku || "").trim(), p]));
          } catch (err) { fallas.push("No se pudo leer tu Stock para sumar piezas"); }
          for (const r of (fresco ? lote.reabastecer : [])) {
            try {
              // Primero se anota como aplicado (si ya estaba, otro celular ya lo sumó y no se repite).
              const m = await fetch("/.netlify/functions/admin-stock-lotes", { method: "POST", headers: { "Content-Type": "application/json", "x-admin-key": adminKey }, body: JSON.stringify({ id: r.id }) });
              const md = await m.json().catch(() => ({}));
              if (!m.ok) throw new Error(md.error || "error");
              if (md.ya) { ok++; continue; }
              const actual = Number((fresco.get(r.sku) || {}).piezas) || 0;
              const u = await fetch("/.netlify/functions/admin-update-stock-product", { method: "POST", headers: { "Content-Type": "application/json", "x-admin-key": adminKey }, body: JSON.stringify({ sku: r.sku, piezas: Math.max(0, actual + Number(r.sumar)), ...(r.campos || {}) }) });
              if (u.ok) ok++; else fallas.push(`${r.sku}: ${((await u.json().catch(() => ({}))).error) || "error"} (avísale a Claude: quedó marcado como sumado)`);
            } catch (err) { fallas.push(`${r.sku}: ${err.message || "sin conexión"}`); }
          }
        }
        for (const a of lote.ajustes) {
          msg.textContent = "Cambiando fotos…";
          try {
            const r = await fetch("/.netlify/functions/admin-update-stock-product", { method: "POST", headers: { "Content-Type": "application/json", "x-admin-key": adminKey }, body: JSON.stringify({ sku: a.sku, ...a.campos }) });
            if (r.ok) ok++; else fallas.push(`${a.sku}: ${((await r.json().catch(() => ({}))).error) || "error"}`);
          } catch (err) { fallas.push(`${a.sku}: sin conexión`); }
        }
        for (const { m } of lote.mezclas) {
          msg.textContent = "Juntando los lotes…";
          try {
            // Se vuelve a leer el Stock justo ahora, por si cambió algo.
            const res = await fetch("/.netlify/functions/admin-list-stock", { headers: { "x-admin-key": adminKey } });
            const fresco = new Map(((await res.json()).products || []).map((p) => [String(p.sku || "").trim(), p]));
            const c = calcMezcla(m, fresco);
            if (!c) throw new Error("no encontré los productos");
            const upd = async (sku, campos) => {
              const r = await fetch("/.netlify/functions/admin-update-stock-product", { method: "POST", headers: { "Content-Type": "application/json", "x-admin-key": adminKey }, body: JSON.stringify({ sku, ...campos }) });
              if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "no se pudo guardar");
            };
            await upd(m.destino, { piezas: c.nuevos, ...(m.campos || {}) });   // primero suma al destino
            await upd(m.origen, { piezas: 0 });                                  // luego vacía el origen
            ok++;
            if (c.sobran) sobraron = ` Sobraron ${c.sobran} gel${c.sobran === 1 ? "" : "es"} suelto${c.sobran === 1 ? "" : "s"} (no completan un lote de ${m.porDestino}).`;
          } catch (err) { fallas.push(`Juntar lotes: ${err.message}`); }
        }
        msg.innerHTML = `✅ ${ok} cambio${ok === 1 ? "" : "s"} aplicado${ok === 1 ? "" : "s"}.${sobraron}${fallas.length ? `<br><span style="color:#b33660;">No se pudieron: ${fallas.map(escapeHtml).join("; ")}. Toca de nuevo el botón para reintentar.</span>` : ""}`;
        btn.disabled = false;
        stockLotesMsg = msg.innerHTML;
        loadInventory();
      }));
    } catch (err) { box.style.display = "none"; }
  }

  async function loadInventory() {
    const listEl = document.getElementById("inventory-list");
    const emptyEl = document.getElementById("inventory-empty");
    const loadingEl = document.getElementById("inventory-loading");
    const errorEl = document.getElementById("inventory-error");
    listEl.innerHTML = "";
    emptyEl.style.display = "none";
    errorEl.textContent = "";
    loadingEl.style.display = "block";
    try {
      const res = await fetch("/.netlify/functions/admin-list-stock", {
        headers: { "x-admin-key": adminKey },
      });
      const data = await res.json();
      loadingEl.style.display = "none";
      if (!res.ok) {
        errorEl.textContent = data.error || "No se pudo cargar tu inventario.";
        return;
      }
      inventoryLoaded = true;
      inventoryProducts = data.products || [];
      renderInventoryList();
      renderStockLotes();
    } catch (err) {
      loadingEl.style.display = "none";
      errorEl.textContent = "No se pudo conectar con el servidor.";
    }
  }

  // Placeholder gris con un ícono de cámara -- se usa de entrada si el
  // producto no tiene foto, y también si la URL que se escribe no carga
  // (onerror), para nunca mostrar el ícono roto del navegador.
  const INV_IMG_PLACEHOLDER =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44"><rect width="44" height="44" rx="8" fill="#eee"/><text x="22" y="27" font-size="18" text-anchor="middle">📷</text></svg>'
    );

  function inventoryRowHTML(p) {
    const imgSrc = p.imagen ? escapeHtml(p.imagen) : INV_IMG_PLACEHOLDER;
    return `
      <div class="inventory-row" data-inv-row="${escapeHtml(p.sku)}">
        <div class="inv-top">
          <img class="inv-thumb" src="${imgSrc}" alt="" onerror="this.src='${INV_IMG_PLACEHOLDER}'" />
          <input type="text" class="inv-nombre" aria-label="Nombre" value="${escapeHtml(p.nombre)}" placeholder="Nombre" style="flex:2 1 160px;" />
          <input type="text" class="inv-marca" aria-label="Marca" value="${escapeHtml(p.marca)}" placeholder="Marca" style="flex:1 1 110px;" />
          <span class="inv-sku">SKU: ${escapeHtml(p.sku)}</span>
        </div>
        <input type="text" class="inv-imagen" aria-label="Link de la foto" value="${escapeHtml(p.imagen)}" placeholder="https://…" style="flex:1 1 100%;" />
        ${INV_VARIANT_RE.test(p.nombre || "") ? `<input type="text" class="inv-imagen-general" aria-label="Foto general (la de todos los tonos juntos, sale en la tarjeta antes de elegir)" value="${escapeHtml(p.imagenGeneral || "")}" placeholder="https://… (opcional)" style="flex:1 1 100%;" />` : ""}
        <div class="inv-fields">
          <div class="inventory-qty" role="group" aria-label="Piezas disponibles">
            <span class="inv-qty-label">Piezas</span>
            <button type="button" class="inv-qty-dec" title="Restar 1" aria-label="Restar 1 pieza">−</button>
            <input type="number" class="inv-piezas" value="${p.piezas}" min="0" step="1" title="Piezas disponibles" />
            <button type="button" class="inv-qty-inc" title="Sumar 1" aria-label="Sumar 1 pieza">+</button>
          </div>
          <input type="number" class="inv-precio" aria-label="Precio transferencia (MXN)" value="${p.precio || ""}" min="0" step="1" placeholder="Ej. 399" />
          <input type="number" class="inv-precio-tarjeta" aria-label="Precio tarjeta (MXN)" value="${p.precioTarjeta || ""}" min="0" step="1" placeholder="Ej. 423" />
          <input type="text" class="inv-categoria" aria-label="Categoría" value="${escapeHtml(p.categoria)}" placeholder="Ej. Skincare" />
          <input type="number" class="inv-peso" aria-label="Peso (kg)" value="${p.peso || ""}" min="0" step="0.01" placeholder="Ej. 0.2" />
        </div>
        <div class="inv-actions">
          <button type="button" class="btn-primary inv-save">💾 Guardar</button>
          <button type="button" class="btn-secondary inv-variant-toggle">🎨 Agregar tono/variación</button>
          <button type="button" class="btn-danger inv-delete">🗑️ Quitar</button>
          <span class="inv-status"></span>
        </div>
        ${inventoryVariantHTML(p)}
      </div>`;
  }

  /* "Agregar tono/variación" en un producto que ya está en Stock: crea
     otra fila con la misma marca/precio/categoría/peso/descripción y el
     nombre "Base (#Variación)", para que la tienda los junte en una sola
     tarjeta con selector (groupVariants() en app.js). Si el producto
     original todavía no tiene su tono entre paréntesis, también se le
     pone, porque si no la tienda no los junta. */
  const INV_VARIANT_RE = /^(.*)\s\((#[^)]*)\)$/;

  // Los demás tonos del mismo producto (misma marca y nombre sin el tono).
  function inventoryFamily(nombre, marca) {
    const m = INV_VARIANT_RE.exec(nombre || "");
    if (!m) return [];
    return inventoryProducts.filter((p) => {
      const pm = INV_VARIANT_RE.exec(p.nombre || "");
      return pm && pm[1] === m[1] && (p.marca || "") === (marca || "");
    });
  }

  /* La foto general vive en cada fila de la familia (la tienda toma la
     primera que encuentre); al cambiarla en un tono se copia a los demás
     para que no queden distintas. */
  async function syncFamilyImagenGeneral(nombre, marca, imagenGeneral, skipSku) {
    const failed = [];
    for (const p of inventoryFamily(nombre, marca)) {
      if (p.sku === skipSku || (p.imagenGeneral || "") === imagenGeneral) continue;
      try {
        const res = await fetch("/.netlify/functions/admin-update-stock-product", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
          body: JSON.stringify({ sku: p.sku, imagenGeneral }),
        });
        if (res.ok) p.imagenGeneral = imagenGeneral;
        else failed.push(p.sku);
      } catch (err) {
        failed.push(p.sku);
      }
      const input = document.querySelector(`[data-inv-row="${CSS.escape(p.sku)}"] .inv-imagen-general`);
      if (input && p.imagenGeneral === imagenGeneral) input.value = imagenGeneral;
    }
    return failed;
  }

  function inventoryVariantHTML(p) {
    const m = INV_VARIANT_RE.exec(p.nombre || "");
    const base = m ? m[1] : p.nombre || "";
    const actual = m ? m[2].replace(/^#/, "") : "";
    return `
        <div class="inv-variant">
          <p class="inv-var-help">Se crea otro producto con la misma marca, precio, categoría y peso. En la tienda salen juntos en una sola tarjeta para elegir el tono.</p>
          <div class="inv-var-fields">
            <input type="text" class="inv-var-base" aria-label="Nombre (sin el tono)" value="${escapeHtml(base)}" placeholder="Nombre sin el tono" style="flex:2 1 220px;" />
            <input type="text" class="inv-var-actual" aria-label="Tono/variación de este producto" value="${escapeHtml(actual)}" placeholder="Tono de este (ej. Gingerbread)"${m ? " readonly" : ""} />
          </div>
          <div class="inv-var-fields">
            <input type="text" class="inv-var-label" aria-label="Nuevo tono/variación" placeholder="Nuevo tono (ej. Peppermint) *" />
            <input type="number" class="inv-var-piezas" aria-label="Piezas" placeholder="Piezas *" min="1" step="1" style="flex:0 1 100px;" />
          </div>
          <div class="inv-var-fields">
            <input type="text" class="inv-var-general" aria-label="Foto general (opcional, la de todos los tonos juntos)" value="${escapeHtml(p.imagenGeneral || "")}" placeholder="https://… sale en la tarjeta antes de elegir tono" style="flex:1 1 100%;" />
          </div>
          <div class="inv-var-fields">
            <input type="text" class="inv-var-imagen" aria-label="Link de la foto del nuevo tono" placeholder="Link de la foto del nuevo tono (si lo dejas vacío usa la misma)" style="flex:1 1 100%;" />
          </div>
          <div class="inv-actions">
            <button type="button" class="btn-primary inv-var-save">➕ Agregar este tono</button>
            <span class="inv-var-status"></span>
          </div>
        </div>`;
  }

  async function addInventoryVariant(sku, row, btn) {
    const statusEl = row.querySelector(".inv-var-status");
    statusEl.style.color = "#b03a2e";
    statusEl.textContent = "";
    const product = inventoryProducts.find((p) => p.sku === sku);
    if (!product) return;
    const base = row.querySelector(".inv-var-base").value.trim();
    let actual = row.querySelector(".inv-var-actual").value.trim().replace(/^#/, "");
    let label = row.querySelector(".inv-var-label").value.trim().replace(/^#/, "");
    const piezas = Number(row.querySelector(".inv-var-piezas").value);
    const imagen = row.querySelector(".inv-var-imagen").value.trim();
    const imagenGeneral = row.querySelector(".inv-var-general").value.trim();
    if (!base) { statusEl.textContent = "Falta el nombre sin el tono."; return; }
    if (!actual) { statusEl.textContent = "Escribe el tono de este producto para que la tienda los junte."; return; }
    if (!label) { statusEl.textContent = "Falta el nuevo tono/variación."; return; }
    if (!piezas || piezas <= 0) { statusEl.textContent = "Las piezas deben ser un número mayor a 0."; return; }
    if (label.toLowerCase() === actual.toLowerCase()) { statusEl.textContent = "El nuevo tono es igual al de este producto."; return; }

    // Se usan los valores que estén escritos en la fila (aunque no se
    // hayan guardado todavía), igual que haría "Guardar".
    const shared = {
      marca: row.querySelector(".inv-marca").value.trim(),
      precio: Number(row.querySelector(".inv-precio").value) || 0,
      precioTarjeta: Number(row.querySelector(".inv-precio-tarjeta").value) || 0,
      categoria: row.querySelector(".inv-categoria").value.trim(),
      peso: Number(row.querySelector(".inv-peso").value) || 0,
      descripcion: product.descripcion || "",
    };
    if (!shared.precio) { statusEl.textContent = "Este producto no tiene precio; ponle precio y guarda primero."; return; }

    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Agregando...";
    try {
      const nombreActual = `${base} (#${actual})`;
      const cambios = {};
      if (nombreActual !== product.nombre) cambios.nombre = nombreActual;
      if (imagenGeneral && imagenGeneral !== (product.imagenGeneral || "")) cambios.imagenGeneral = imagenGeneral;
      if (Object.keys(cambios).length) {
        const res = await fetch("/.netlify/functions/admin-update-stock-product", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
          body: JSON.stringify({ sku, ...cambios }),
        });
        const data = await res.json();
        if (!res.ok) { statusEl.textContent = data.error || "No se pudo actualizar este producto."; return; }
        Object.assign(product, cambios);
      }
      if (imagenGeneral) await syncFamilyImagenGeneral(nombreActual, shared.marca, imagenGeneral, sku);
      const nuevo = {
        ...shared,
        nombre: `${base} (#${label})`,
        piezas,
        imagen: imagen || row.querySelector(".inv-imagen").value.trim(),
        imagenGeneral: imagenGeneral || product.imagenGeneral || "",
      };
      const { ok, data } = await addStockProductRequest({ ...nuevo, precioTarjeta: nuevo.precioTarjeta || undefined, peso: nuevo.peso || undefined });
      if (!ok) { statusEl.textContent = data.error || "No se pudo agregar el tono."; return; }
      inventoryProducts.unshift({ sku: data.sku, ...nuevo });
      renderInventoryList();
      const newRow = document.querySelector(`[data-inv-row="${CSS.escape(data.sku)}"]`);
      if (newRow) {
        newRow.scrollIntoView({ block: "center" });
        const st = newRow.querySelector(".inv-status");
        st.style.color = "#17803d";
        st.textContent = `✅ Tono agregado (SKU ${data.sku})`;
      }
    } catch (err) {
      statusEl.textContent = "No se pudo conectar con el servidor.";
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }

  function matchesInventorySearch(p, query) {
    if (!query) return true;
    const haystack = normalizeForSearch(`${p.nombre} ${p.marca} ${p.sku}`);
    return haystack.includes(normalizeForSearch(query));
  }

  /* Siempre por marca (alfabético, sin distinguir mayúsculas/acentos) y,
     dentro de la misma marca, por nombre -- las marcas sin capturar
     (vacías) se van hasta el final en vez de mezclarse al principio. */
  function compareByMarcaThenNombre(a, b) {
    const marcaA = a.marca || "";
    const marcaB = b.marca || "";
    if (!marcaA && marcaB) return 1;
    if (marcaA && !marcaB) return -1;
    const marcaCompare = marcaA.localeCompare(marcaB, "es", { sensitivity: "base" });
    if (marcaCompare !== 0) return marcaCompare;
    return (a.nombre || "").localeCompare(b.nombre || "", "es", { sensitivity: "base" });
  }

  function renderInventoryList() {
    const listEl = document.getElementById("inventory-list");
    const emptyEl = document.getElementById("inventory-empty");
    const filtered = inventoryProducts
      .filter((p) => matchesInventorySearch(p, inventorySearchTerm))
      .sort(compareByMarcaThenNombre);

    if (!inventoryProducts.length) {
      listEl.innerHTML = "";
      emptyEl.style.display = "block";
      emptyEl.textContent = "No hay ningún producto en tu Stock todavía.";
      return;
    }
    if (!filtered.length) {
      listEl.innerHTML = "";
      emptyEl.style.display = "block";
      emptyEl.textContent = "Ningún producto coincide con tu búsqueda.";
      return;
    }
    emptyEl.style.display = "none";
    listEl.innerHTML = filtered.map(inventoryRowHTML).join("");
    wireInventoryRow(listEl);
  }

  function wireInventoryRow(container) {
    container.querySelectorAll("[data-inv-row]").forEach((row) => {
      const sku = row.dataset.invRow;
      const piezasInput = row.querySelector(".inv-piezas");

      row.querySelector(".inv-qty-dec").addEventListener("click", () => {
        piezasInput.value = Math.max(0, Number(piezasInput.value || 0) - 1);
      });
      row.querySelector(".inv-qty-inc").addEventListener("click", () => {
        piezasInput.value = Number(piezasInput.value || 0) + 1;
      });
      row.querySelector(".inv-imagen").addEventListener("input", (e) => {
        const thumb = row.querySelector(".inv-thumb");
        thumb.src = e.target.value.trim() || INV_IMG_PLACEHOLDER;
      });
      // Al corregir el precio de transferencia, recalcula también el de
      // tarjeta con la misma fórmula del catálogo -- igual que en
      // "Agregar producto en Stock". Si la usuaria edita el precio de
      // tarjeta a mano, se deja de tocar (row.dataset.tarjetaManual) hasta
      // que la lista se vuelva a pintar (ej. al guardar o buscar).
      row.querySelector(".inv-precio").addEventListener("input", (e) => {
        if (row.dataset.tarjetaManual || cardSurchargePct == null) return;
        const precio = Number(e.target.value);
        const tarjetaEl = row.querySelector(".inv-precio-tarjeta");
        tarjetaEl.value = precio > 0 ? Math.ceil(precio * (1 + cardSurchargePct / 100)) : "";
      });
      row.querySelector(".inv-precio-tarjeta").addEventListener("input", () => {
        row.dataset.tarjetaManual = "1";
      });
      row.querySelector(".inv-save").addEventListener("click", (e) => saveInventoryRow(sku, row, e.currentTarget));
      row.querySelector(".inv-delete").addEventListener("click", (e) => deleteInventoryRow(sku, row, e.currentTarget));
      row.querySelector(".inv-variant-toggle").addEventListener("click", () => {
        const panel = row.querySelector(".inv-variant");
        panel.classList.toggle("open");
        if (panel.classList.contains("open")) {
          const first = panel.querySelector(".inv-var-actual:not([readonly])") || panel.querySelector(".inv-var-label");
          first.focus();
        }
      });
      row.querySelector(".inv-var-save").addEventListener("click", (e) => addInventoryVariant(sku, row, e.currentTarget));
    });
  }

  async function saveInventoryRow(sku, row, btn) {
    const statusEl = row.querySelector(".inv-status");
    statusEl.textContent = "";
    statusEl.style.color = "";

    const body = {
      sku,
      nombre: row.querySelector(".inv-nombre").value.trim(),
      marca: row.querySelector(".inv-marca").value.trim(),
      piezas: Number(row.querySelector(".inv-piezas").value) || 0,
      precio: Number(row.querySelector(".inv-precio").value) || 0,
      precioTarjeta: Number(row.querySelector(".inv-precio-tarjeta").value) || 0,
      categoria: row.querySelector(".inv-categoria").value.trim(),
      peso: Number(row.querySelector(".inv-peso").value) || 0,
      imagen: row.querySelector(".inv-imagen").value.trim(),
    };
    const generalInput = row.querySelector(".inv-imagen-general");
    if (generalInput) body.imagenGeneral = generalInput.value.trim();

    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Guardando...";
    try {
      const res = await fetch("/.netlify/functions/admin-update-stock-product", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        statusEl.style.color = "#b03a2e";
        statusEl.textContent = data.error || "No se pudo guardar.";
        return;
      }
      const product = inventoryProducts.find((p) => p.sku === sku);
      const anteriorGeneral = product ? product.imagenGeneral || "" : "";
      if (product) Object.assign(product, body);
      let fallaronTonos = [];
      if (generalInput && body.imagenGeneral !== anteriorGeneral) {
        fallaronTonos = await syncFamilyImagenGeneral(body.nombre, body.marca, body.imagenGeneral, sku);
      }
      if (fallaronTonos.length) {
        statusEl.style.color = "#b03a2e";
        statusEl.textContent = `Guardado, pero no se pudo copiar la foto general a: ${fallaronTonos.join(", ")}`;
        return;
      }
      statusEl.style.color = "#17803d";
      statusEl.textContent = "✅ Guardado";
      setTimeout(() => { statusEl.textContent = ""; }, 2000);
    } catch (err) {
      statusEl.style.color = "#b03a2e";
      statusEl.textContent = "No se pudo conectar con el servidor.";
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }

  async function deleteInventoryRow(sku, row, btn) {
    const nombre = row.querySelector(".inv-nombre").value.trim() || sku;
    if (!confirm(`¿Quitar "${nombre}" de tu Stock? Ya no se mostrará en el sitio.`)) return;

    const statusEl = row.querySelector(".inv-status");
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Quitando...";
    try {
      const res = await fetch("/.netlify/functions/admin-delete-stock-product", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ sku }),
      });
      const data = await res.json();
      if (!res.ok) {
        statusEl.style.color = "#b03a2e";
        statusEl.textContent = data.error || "No se pudo quitar.";
        btn.disabled = false;
        btn.textContent = originalText;
        return;
      }
      inventoryProducts = inventoryProducts.filter((p) => p.sku !== sku);
      renderInventoryList();
    } catch (err) {
      statusEl.style.color = "#b03a2e";
      statusEl.textContent = "No se pudo conectar con el servidor.";
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }

  /* ======================================================================
     Avisos de restock (ver restock-notify-request.js /
     admin-restock-requests.js) -- solicitudes de "Avísame cuando vuelva"
     que dejan las clientas en productos agotados. No hay aviso
     automático: aquí solo se ven para que Mae le escriba a mano por
     WhatsApp y luego las quite de la lista.
     ====================================================================== */
  let restockRequestsLoaded = false;

  async function loadRestockRequests() {
    const listEl = document.getElementById("restock-requests-list");
    const emptyEl = document.getElementById("restock-requests-empty");
    const loadingEl = document.getElementById("restock-requests-loading");
    listEl.innerHTML = "";
    emptyEl.style.display = "none";
    loadingEl.style.display = "block";
    try {
      const res = await fetch("/.netlify/functions/admin-restock-requests", {
        headers: { "x-admin-key": adminKey },
      });
      const data = await res.json();
      loadingEl.style.display = "none";
      if (!res.ok) {
        setStatus(data.error || "No se pudieron cargar los avisos de restock.");
        return;
      }
      restockRequestsLoaded = true;
      renderRestockRequests(data.requests || []);
    } catch (err) {
      loadingEl.style.display = "none";
      setStatus("No se pudo conectar con el servidor.");
    }
  }

  function renderRestockRequests(requests) {
    const listEl = document.getElementById("restock-requests-list");
    const emptyEl = document.getElementById("restock-requests-empty");
    const badgeEl = document.getElementById("restock-requests-badge");

    restockCount = requests.length;
    if (currentView === "inicio") renderHome();
    badgeEl.textContent = requests.length ? String(requests.length) : "";
    badgeEl.style.display = requests.length ? "inline-flex" : "none";
    updateMoreBadge();

    if (!requests.length) {
      listEl.innerHTML = "";
      emptyEl.style.display = "block";
      return;
    }
    emptyEl.style.display = "none";

    listEl.innerHTML = requests.map((r) => {
      const phoneDigits = (r.phone || "").replace(/[^0-9]/g, "");
      const waNumber = phoneDigits.length === 10 ? "521" + phoneDigits : phoneDigits;
      const message = `¡Hola${r.name ? " " + r.name : ""}! 🔔 Ya volvió a haber stock de ${r.productName} -- ¿te interesa?`;
      const waLink = waNumber ? `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}` : "";
      const fecha = r.createdAt ? new Date(r.createdAt).toLocaleDateString("es-MX", { day: "numeric", month: "short" }) : "";
      return `
        <div class="order-card" style="border-left-color:#f0ad4e;">
          <div class="top">
            <span><strong>${escapeHtml(r.productName || "")}</strong></span>
            <span class="fecha">${fecha}</span>
          </div>
          <p style="font-size:14px;color:#444;margin:8px 0 0;">
            ${escapeHtml(r.name || "(sin nombre)")} · ${escapeHtml(r.phone || "")}
          </p>
          <div class="actions">
            ${waLink ? `<a class="btn-primary" style="text-decoration:none;display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:11px 18px;font-weight:700;" href="${escapeHtml(waLink)}" target="_blank" rel="noopener">💬 WhatsApp</a>` : ""}
            <button class="btn-secondary" data-restock-done="${escapeHtml(r.id)}">✓ Ya avisé</button>
          </div>
        </div>`;
    }).join("");

    listEl.querySelectorAll("[data-restock-done]").forEach((btn) => {
      btn.addEventListener("click", () => markRestockDone(btn.dataset.restockDone));
    });
  }

  async function markRestockDone(id) {
    try {
      const res = await fetch("/.netlify/functions/admin-restock-requests", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error || "No se pudo quitar el aviso.");
        return;
      }
      loadRestockRequests();
    } catch (err) {
      setStatus("No se pudo conectar con el servidor.");
    }
  }

  /* ======================================================================
     Reseñas de producto (ver product-reviews.js / admin-reviews.js /
     customer-submit-review.js) -- solo para moderar (borrar) las que sean
     inapropiadas o falsas; no hay cola de aprobación previa.
     ====================================================================== */
  let reviewsLoaded = false;

  async function loadReviews() {
    const listEl = document.getElementById("reviews-list");
    const emptyEl = document.getElementById("reviews-empty");
    const loadingEl = document.getElementById("reviews-loading");
    listEl.innerHTML = "";
    emptyEl.style.display = "none";
    loadingEl.style.display = "block";
    try {
      const res = await fetch("/.netlify/functions/admin-reviews", {
        headers: { "x-admin-key": adminKey },
      });
      const data = await res.json();
      loadingEl.style.display = "none";
      if (!res.ok) {
        setStatus(data.error || "No se pudieron cargar las reseñas.");
        return;
      }
      reviewsLoaded = true;
      renderReviews(data.reviews || []);
    } catch (err) {
      loadingEl.style.display = "none";
      setStatus("No se pudo conectar con el servidor.");
    }
  }

  function renderReviews(reviews) {
    const listEl = document.getElementById("reviews-list");
    const emptyEl = document.getElementById("reviews-empty");

    if (!reviews.length) {
      listEl.innerHTML = "";
      emptyEl.style.display = "block";
      return;
    }
    emptyEl.style.display = "none";

    listEl.innerHTML = reviews.map((r) => {
      const stars = "★".repeat(r.rating) + "☆".repeat(5 - r.rating);
      const fecha = r.createdAt ? new Date(r.createdAt).toLocaleDateString("es-MX", { day: "numeric", month: "short" }) : "";
      return `
        <div class="order-card" style="border-left-color:#f0ad4e;">
          <div class="top">
            <span><strong>${escapeHtml(r.sku || "")}</strong> · <span style="color:#e0a300;">${stars}</span></span>
            <span class="fecha">${fecha}</span>
          </div>
          <p style="font-size:14px;color:#444;margin:8px 0 0;">${escapeHtml(r.customerName || "")} · ${escapeHtml(r.customerEmail || "")}</p>
          ${r.comment ? `<p style="font-size:14px;color:#444;margin:6px 0 0;">${escapeHtml(r.comment)}</p>` : ""}
          <div class="actions">
            <button class="btn-danger" data-review-delete="${escapeHtml(r.id)}">🗑️ Borrar reseña</button>
          </div>
        </div>`;
    }).join("");

    listEl.querySelectorAll("[data-review-delete]").forEach((btn) => {
      btn.addEventListener("click", () => deleteReview(btn.dataset.reviewDelete));
    });
  }

  async function deleteReview(id) {
    try {
      const res = await fetch("/.netlify/functions/admin-reviews", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error || "No se pudo borrar la reseña.");
        return;
      }
      loadReviews();
    } catch (err) {
      setStatus("No se pudo conectar con el servidor.");
    }
  }

  /* ======================================================================
     Encargos USA (ver admin-usa-clients.js / admin-usa-pedidos.js /
     lib/usa-clients-store.js) -- control privado de lo que las clientas le
     piden a Mae comprarles en tiendas de Estados Unidos (personal
     shopper). Un perfil por clienta (nombre, teléfono, notas) con la
     lista de pedidos que le ha ido haciendo -- Mae entra al perfil y ahí
     agrega, edita, cambia el estatus o borra cada pedido, sin tener que
     volver a escribir los datos de la clienta cada vez.
     ====================================================================== */
  let usaClientsLoaded = false;
  let usaClients = [];
  let usaOpenClientId = null;
  let usaClientSearchTerm = "";
  let usaPedidoStatusFilter = "";
  let editingUsaPedidoId = null;

  const USA_STATUS_LABELS = {
    por_comprar: "🛒 Por comprar",
    comprado: "✅ Comprado",
    en_camino: "📦 En camino a México",
    entregado: "🎁 Entregado",
  };
  const USA_STATUS_COLORS = {
    por_comprar: "#f0ad4e",
    comprado: "#4a90d9",
    en_camino: "#9b59b6",
    entregado: "#2fa968",
  };

  function waLinkFromPhone(phone) {
    const phoneDigits = (phone || "").replace(/[^0-9]/g, "");
    const waNumber = phoneDigits.length === 10 ? "521" + phoneDigits : phoneDigits;
    return waNumber ? `https://wa.me/${waNumber}` : "";
  }

  async function loadUsaClients() {
    const listEl = document.getElementById("usa-clients-list");
    const emptyEl = document.getElementById("usa-clients-empty");
    const loadingEl = document.getElementById("usa-clients-loading");
    listEl.innerHTML = "";
    emptyEl.style.display = "none";
    loadingEl.style.display = "block";
    try {
      const res = await fetch("/.netlify/functions/admin-usa-clients", {
        headers: { "x-admin-key": adminKey },
      });
      const data = await res.json();
      loadingEl.style.display = "none";
      if (!res.ok) {
        setStatus(data.error || "No se pudieron cargar las clientas.");
        return;
      }
      usaClientsLoaded = true;
      usaClients = data.clients || [];
      renderUsaClientsList();
      if (usaOpenClientId) renderUsaClientDetail();
    } catch (err) {
      loadingEl.style.display = "none";
      setStatus("No se pudo conectar con el servidor.");
    }
  }

  function usaClientPedidoSummary(client) {
    const counts = { por_comprar: 0, comprado: 0, en_camino: 0, entregado: 0 };
    (client.pedidos || []).forEach((p) => { counts[p.estatus] = (counts[p.estatus] || 0) + 1; });
    const parts = [];
    if (counts.por_comprar) parts.push(`🛒 ${counts.por_comprar}`);
    if (counts.comprado) parts.push(`✅ ${counts.comprado}`);
    if (counts.en_camino) parts.push(`📦 ${counts.en_camino}`);
    if (counts.entregado) parts.push(`🎁 ${counts.entregado}`);
    return parts.join(" · ") || "Sin pedidos todavía";
  }

  function renderUsaClientsList() {
    const listEl = document.getElementById("usa-clients-list");
    const emptyEl = document.getElementById("usa-clients-empty");
    const badgeEl = document.getElementById("usa-orders-badge");

    const pendientesTotal = usaClients.reduce(
      (sum, c) => sum + (c.pedidos || []).filter((p) => p.estatus !== "entregado").length, 0
    );
    badgeEl.textContent = pendientesTotal ? String(pendientesTotal) : "";
    badgeEl.style.display = pendientesTotal ? "inline-flex" : "none";
    usaPendingCount = pendientesTotal;
    updateMoreBadge();

    const term = usaClientSearchTerm.trim().toLowerCase();
    let visible = term
      ? usaClients.filter((c) => (c.nombre || "").toLowerCase().includes(term) || (c.telefono || "").includes(term))
      : usaClients;
    visible = visible.slice().sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));

    if (!visible.length) {
      listEl.innerHTML = "";
      emptyEl.style.display = "block";
      return;
    }
    emptyEl.style.display = "none";

    listEl.innerHTML = visible.map((c) => {
      const pendientes = (c.pedidos || []).filter((p) => p.estatus !== "entregado").length;
      return `
        <div class="order-card usa-client-card" data-usa-client-open="${escapeHtml(c.id)}">
          <div class="top">
            <span><strong>${escapeHtml(c.nombre || "")}</strong>${c.telefono ? ` · ${escapeHtml(c.telefono)}` : ""}</span>
            ${pendientes ? `<span class="badge status-pending">${pendientes} pendiente${pendientes === 1 ? "" : "s"}</span>` : ""}
          </div>
          <p style="font-size:13px;color:#6b6370;margin:8px 0 0;">${escapeHtml(usaClientPedidoSummary(c))}</p>
        </div>`;
    }).join("");

    listEl.querySelectorAll("[data-usa-client-open]").forEach((card) => {
      card.addEventListener("click", () => openUsaClientDetail(card.dataset.usaClientOpen));
    });
  }

  function openUsaClientForm() {
    document.getElementById("usa-client-error").textContent = "";
    ["usa-client-nombre", "usa-client-telefono", "usa-client-notas"].forEach((id) => {
      document.getElementById(id).value = "";
    });
    document.getElementById("usa-client-form").style.display = "flex";
    document.getElementById("usa-client-nombre").focus();
  }

  function closeUsaClientForm() {
    document.getElementById("usa-client-form").style.display = "none";
    document.getElementById("usa-client-error").textContent = "";
  }

  async function submitUsaClientForm() {
    const errorEl = document.getElementById("usa-client-error");
    errorEl.textContent = "";
    const nombre = document.getElementById("usa-client-nombre").value.trim();
    if (!nombre) { errorEl.textContent = "Falta el nombre de la clienta."; return; }

    const payload = {
      nombre,
      telefono: document.getElementById("usa-client-telefono").value.trim(),
      notas: document.getElementById("usa-client-notas").value.trim(),
    };
    const submitBtn = document.getElementById("usa-client-submit");
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Guardando...";
    try {
      const res = await fetch("/.netlify/functions/admin-usa-clients", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        errorEl.textContent = data.error || "No se pudo guardar la clienta.";
        return;
      }
      usaClients.unshift(data.client);
      closeUsaClientForm();
      renderUsaClientsList();
    } catch (err) {
      errorEl.textContent = "No se pudo conectar con el servidor.";
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  }

  function currentUsaClient() {
    return usaClients.find((c) => c.id === usaOpenClientId);
  }

  function openUsaClientDetail(id) {
    usaOpenClientId = id;
    usaPedidoStatusFilter = "";
    closeUsaClientForm();
    closeUsaClientMetaForm();
    closeUsaPedidoForm();
    document.getElementById("usa-clients-view").style.display = "none";
    document.getElementById("usa-client-detail").style.display = "flex";
    document.getElementById("usa-pedidos-status-tabs").querySelectorAll(".tab").forEach((b) => {
      b.classList.toggle("active", b.dataset.usaStatus === "");
    });
    syncTabPressed(document.getElementById("usa-pedidos-status-tabs"));
    renderUsaClientDetail();
  }

  function closeUsaClientDetailView() {
    usaOpenClientId = null;
    closeUsaClientMetaForm();
    closeUsaPedidoForm();
    document.getElementById("usa-client-detail").style.display = "none";
    document.getElementById("usa-clients-view").style.display = "block";
    renderUsaClientsList();
  }

  function renderUsaClientDetail() {
    const c = currentUsaClient();
    if (!c) { closeUsaClientDetailView(); return; }
    const headerEl = document.getElementById("usa-client-detail-header");
    const waLink = waLinkFromPhone(c.telefono);
    headerEl.innerHTML = `
      <div class="top">
        <span><strong style="font-size:18px;">${escapeHtml(c.nombre || "")}</strong></span>
      </div>
      <p style="font-size:14px;color:#444;margin:6px 0 0;">${c.telefono ? escapeHtml(c.telefono) : "Sin teléfono"}</p>
      ${c.notas ? `<p style="font-size:13px;color:#5f5866;margin:6px 0 0;">📝 ${escapeHtml(c.notas)}</p>` : ""}
      <div class="actions">
        ${waLink ? `<a class="btn-secondary" style="text-decoration:none;display:inline-flex;align-items:center;" href="${escapeHtml(waLink)}" target="_blank" rel="noopener">💬 WhatsApp</a>` : ""}
        <button class="btn-secondary" id="usa-client-meta-edit-btn">✏️ Editar clienta</button>
        <button class="btn-danger" id="usa-client-delete-btn">🗑️ Borrar clienta</button>
      </div>`;
    document.getElementById("usa-client-meta-edit-btn").addEventListener("click", () => openUsaClientMetaForm(c));
    document.getElementById("usa-client-delete-btn").addEventListener("click", () => deleteUsaClientProfile(c.id));

    renderUsaPedidosList();
  }

  function openUsaClientMetaForm(c) {
    document.getElementById("usa-client-edit-error").textContent = "";
    document.getElementById("usa-client-edit-nombre").value = c.nombre || "";
    document.getElementById("usa-client-edit-telefono").value = c.telefono || "";
    document.getElementById("usa-client-edit-notas").value = c.notas || "";
    document.getElementById("usa-client-meta-form").style.display = "flex";
  }

  function closeUsaClientMetaForm() {
    document.getElementById("usa-client-meta-form").style.display = "none";
    document.getElementById("usa-client-edit-error").textContent = "";
  }

  async function submitUsaClientMetaForm() {
    const errorEl = document.getElementById("usa-client-edit-error");
    errorEl.textContent = "";
    const nombre = document.getElementById("usa-client-edit-nombre").value.trim();
    if (!nombre) { errorEl.textContent = "Falta el nombre de la clienta."; return; }

    const payload = {
      id: usaOpenClientId,
      nombre,
      telefono: document.getElementById("usa-client-edit-telefono").value.trim(),
      notas: document.getElementById("usa-client-edit-notas").value.trim(),
    };
    const submitBtn = document.getElementById("usa-client-edit-submit");
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Guardando...";
    try {
      const res = await fetch("/.netlify/functions/admin-usa-clients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        errorEl.textContent = data.error || "No se pudo guardar la clienta.";
        return;
      }
      const idx = usaClients.findIndex((x) => x.id === usaOpenClientId);
      if (idx >= 0) usaClients[idx] = data.client;
      closeUsaClientMetaForm();
      renderUsaClientDetail();
    } catch (err) {
      errorEl.textContent = "No se pudo conectar con el servidor.";
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  }

  async function deleteUsaClientProfile(id) {
    if (!window.confirm("¿Borrar a esta clienta y todo su historial de encargos? No se puede deshacer.")) return;
    try {
      const res = await fetch("/.netlify/functions/admin-usa-clients", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error || "No se pudo borrar a la clienta.");
        return;
      }
      usaClients = usaClients.filter((c) => c.id !== id);
      closeUsaClientDetailView();
    } catch (err) {
      setStatus("No se pudo conectar con el servidor.");
    }
  }

  function renderUsaPedidosList() {
    const c = currentUsaClient();
    const listEl = document.getElementById("usa-pedidos-list");
    const emptyEl = document.getElementById("usa-pedidos-empty");
    if (!c) return;

    const visible = usaPedidoStatusFilter
      ? (c.pedidos || []).filter((p) => p.estatus === usaPedidoStatusFilter)
      : (c.pedidos || []);
    const sorted = visible.slice().sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

    if (!sorted.length) {
      listEl.innerHTML = "";
      emptyEl.style.display = "block";
      return;
    }
    emptyEl.style.display = "none";

    listEl.innerHTML = sorted.map((p) => {
      const fecha = p.createdAt ? new Date(p.createdAt).toLocaleDateString("es-MX", { day: "numeric", month: "short" }) : "";
      const detalles = [];
      if (p.tienda) detalles.push(escapeHtml(p.tienda));
      if (p.cantidad && p.cantidad !== 1) detalles.push(`x${p.cantidad}`);
      if (p.precioEstimadoUSD != null) detalles.push(`~$${p.precioEstimadoUSD.toLocaleString("en-US")} USD`);
      const statusOptions = Object.keys(USA_STATUS_LABELS).map((key) =>
        `<option value="${key}" ${key === p.estatus ? "selected" : ""}>${USA_STATUS_LABELS[key]}</option>`
      ).join("");
      return `
        <div class="order-card usa-pedido-card" style="border-left-color:${USA_STATUS_COLORS[p.estatus] || "#ddd"};">
          <div class="top">
            <span style="white-space:pre-wrap;">${escapeHtml(p.producto || "")}</span>
            <span class="fecha">${fecha}</span>
          </div>
          ${detalles.length ? `<p style="font-size:13px;color:#6b6370;margin:4px 0 0;">${detalles.join(" · ")}</p>` : ""}
          ${p.link ? `<p style="font-size:13px;margin:4px 0 0;"><a href="${escapeHtml(p.link)}" target="_blank" rel="noopener" style="color:#0b6bc2;">🔗 Ver producto</a></p>` : ""}
          ${p.notas ? `<p style="font-size:13px;color:#5f5866;margin:6px 0 0;">📝 ${escapeHtml(p.notas)}</p>` : ""}
          <div class="actions">
            <select class="usa-status-select" data-usa-pedido-status="${escapeHtml(p.id)}">${statusOptions}</select>
            <button class="btn-secondary" data-usa-pedido-edit="${escapeHtml(p.id)}">✏️ Editar</button>
            <button class="btn-danger" data-usa-pedido-delete="${escapeHtml(p.id)}">🗑️ Borrar</button>
          </div>
        </div>`;
    }).join("");

    listEl.querySelectorAll("[data-usa-pedido-status]").forEach((sel) => {
      sel.style.borderColor = USA_STATUS_COLORS[sel.value] || "#ddd";
      sel.addEventListener("change", () => updateUsaPedidoStatus(sel.dataset.usaPedidoStatus, sel.value));
    });
    listEl.querySelectorAll("[data-usa-pedido-edit]").forEach((btn) => {
      btn.addEventListener("click", () => openUsaPedidoForm(btn.dataset.usaPedidoEdit));
    });
    listEl.querySelectorAll("[data-usa-pedido-delete]").forEach((btn) => {
      btn.addEventListener("click", () => deleteUsaPedidoEntry(btn.dataset.usaPedidoDelete));
    });
  }

  async function updateUsaPedidoStatus(pedidoId, estatus) {
    try {
      const res = await fetch("/.netlify/functions/admin-usa-pedidos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ clientId: usaOpenClientId, pedidoId, estatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error || "No se pudo actualizar el estatus.");
        return;
      }
      const idx = usaClients.findIndex((c) => c.id === usaOpenClientId);
      if (idx >= 0) usaClients[idx] = data.client;
      renderUsaPedidosList();
    } catch (err) {
      setStatus("No se pudo conectar con el servidor.");
    }
  }

  async function deleteUsaPedidoEntry(pedidoId) {
    if (!window.confirm("¿Borrar este pedido? No se puede deshacer.")) return;
    try {
      const res = await fetch("/.netlify/functions/admin-usa-pedidos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ clientId: usaOpenClientId, pedidoId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error || "No se pudo borrar el pedido.");
        return;
      }
      const idx = usaClients.findIndex((c) => c.id === usaOpenClientId);
      if (idx >= 0) usaClients[idx] = data.client;
      renderUsaPedidosList();
    } catch (err) {
      setStatus("No se pudo conectar con el servidor.");
    }
  }

  function openUsaPedidoForm(editId) {
    editingUsaPedidoId = editId || null;
    const form = document.getElementById("usa-pedido-form");
    const submitBtn = document.getElementById("usa-pedido-submit");
    document.getElementById("usa-pedido-error").textContent = "";

    if (editingUsaPedidoId) {
      const c = currentUsaClient();
      const p = c && (c.pedidos || []).find((x) => x.id === editingUsaPedidoId);
      if (!p) return;
      document.getElementById("usa-pedido-producto").value = p.producto || "";
      document.getElementById("usa-pedido-tienda").value = p.tienda || "";
      document.getElementById("usa-pedido-cantidad").value = p.cantidad || "";
      document.getElementById("usa-pedido-precio").value = p.precioEstimadoUSD != null ? p.precioEstimadoUSD : "";
      document.getElementById("usa-pedido-link").value = p.link || "";
      document.getElementById("usa-pedido-notas").value = p.notas || "";
      submitBtn.textContent = "Guardar cambios";
    } else {
      ["usa-pedido-producto", "usa-pedido-tienda", "usa-pedido-cantidad", "usa-pedido-precio",
        "usa-pedido-link", "usa-pedido-notas"].forEach((id) => { document.getElementById(id).value = ""; });
      submitBtn.textContent = "Agregar pedido";
    }
    form.style.display = "flex";
    document.getElementById("usa-pedido-producto").focus();
  }

  function closeUsaPedidoForm() {
    editingUsaPedidoId = null;
    document.getElementById("usa-pedido-form").style.display = "none";
    document.getElementById("usa-pedido-error").textContent = "";
  }

  async function submitUsaPedidoForm() {
    const errorEl = document.getElementById("usa-pedido-error");
    errorEl.textContent = "";
    const producto = document.getElementById("usa-pedido-producto").value.trim();
    if (!producto) { errorEl.textContent = "Falta qué le vas a comprar."; return; }

    const payload = {
      clientId: usaOpenClientId,
      producto,
      tienda: document.getElementById("usa-pedido-tienda").value.trim(),
      link: document.getElementById("usa-pedido-link").value.trim(),
      cantidad: document.getElementById("usa-pedido-cantidad").value ? Number(document.getElementById("usa-pedido-cantidad").value) : 1,
      precioEstimadoUSD: document.getElementById("usa-pedido-precio").value ? Number(document.getElementById("usa-pedido-precio").value) : null,
      notas: document.getElementById("usa-pedido-notas").value.trim(),
    };
    if (editingUsaPedidoId) payload.pedidoId = editingUsaPedidoId;

    const submitBtn = document.getElementById("usa-pedido-submit");
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Guardando...";
    try {
      const isEditing = !!editingUsaPedidoId;
      const res = await fetch("/.netlify/functions/admin-usa-pedidos", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        errorEl.textContent = data.error || "No se pudo guardar el pedido.";
        return;
      }
      const idx = usaClients.findIndex((c) => c.id === usaOpenClientId);
      if (idx >= 0) usaClients[idx] = data.client;
      closeUsaPedidoForm();
      renderUsaPedidosList();
    } catch (err) {
      errorEl.textContent = "No se pudo conectar con el servidor.";
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  }


  // Los filtros son botones con clase "active"; esto refleja ese estado en
  // aria-pressed para que lectores de pantalla digan cuál está activo.
  function syncTabPressed(container) {
    container.querySelectorAll(".tab").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.classList.contains("active")));
    });
  }

  function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  /* Igual que escapeHtml, pero envuelve en <mark> la primera coincidencia
     de "query" (si hay) para resaltarla en amarillo -- se busca sobre el
     texto original (sin escapar) y luego se escapa cada pedazo por
     separado, para no romper el escape de HTML. */
  function highlightMatch(str, query) {
    const text = String(str ?? "");
    if (!query) return escapeHtml(text);
    const idx = text.toLowerCase().indexOf(query);
    if (idx === -1) return escapeHtml(text);
    const before = text.slice(0, idx);
    const match = text.slice(idx, idx + query.length);
    const after = text.slice(idx + query.length);
    return `${escapeHtml(before)}<mark class="search-hit">${escapeHtml(match)}</mark>${escapeHtml(after)}`;
  }

  /* Solo para tel: -- deja dígitos y "+". Para cualquier otro atributo
     usa escapeHtml. */
  function escapeAttr(str) {
    return String(str ?? "").replace(/[^0-9+]/g, "");
  }

  /* Zona extendida: la paquetería cobra de más por ese código postal. */
  const zonaExtTag = (r) => r.zonaExtendida ? ` <span style="display:inline-block;background:#fff3cd;color:#8a5a00;border-radius:999px;padding:1px 8px;font-size:12px;font-weight:700;">⚠️ Zona extendida${r.zonaExtendidaCargo ? ` +${formatPrice(r.zonaExtendidaCargo)}` : ""}</span>` : "";
  function zonaExtAviso(rates) {
    const ext = (rates || []).filter((r) => r.zonaExtendida);
    if (!ext.length) return "";
    const normales = (rates || []).filter((r) => !r.zonaExtendida);
    const quien = [...new Set(ext.map((r) => r.carrier || r.label))].join(", ");
    return `<div style="background:#fff3cd;border:1px solid #f0c36d;color:#6b4a00;border-radius:10px;padding:8px 10px;margin:6px 0;font-size:14px;">⚠️ <b>Zona extendida:</b> este código postal le cuesta más a ${escapeHtml(quien)}${ext.some((r) => r.zonaExtendidaCargo) ? " (el cargo extra sale junto a cada opción)" : ""}. ${normales.length ? `Sin cargo extra: ${escapeHtml([...new Set(normales.map((r) => r.carrier || r.label))].join(", "))}.` : "Todas las paqueterías lo marcan como zona extendida."} El envío también puede tardar más.</div>`;
  }

  async function confirmOrCancel(orderId, action, forzar = false) {
    if (action === "cancel") {
      const o = allOrders.find((x) => x.id === orderId);
      const who = o && o.customer && o.customer.name ? ` de ${o.customer.name}` : "";
      if (!window.confirm(`¿Cancelar el pedido${who}? Se marcará como NO pagado.`)) return;
    }
    if (action === "cancel_paid") {
      const o = allOrders.find((x) => x.id === orderId);
      const who = o && o.customer && o.customer.name ? ` de ${o.customer.name}` : "";
      const pagado = o ? (o.montoPagado != null ? o.montoPagado : o.grandTotal) : 0;
      if (!window.confirm(`¿Cancelar TODO el pedido${who}? Ya pagó ${formatPrice(pagado)}: le avisamos por correo y WhatsApp que te escriba para su reembolso, y las piezas en stock regresan a tu inventario. El reembolso lo haces tú.`)) return;
    }
    setStatus(action === "confirm" ? "Confirmando..." : "Cancelando...");
    try {
      const res = await fetch("/.netlify/functions/admin-confirm-order", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ orderId, action, ...(forzar ? { forzar: true } : {}) }),
      });
      const data = await res.json();
      // Ya no alcanzan las piezas (otra clienta se las llevó): Mae decide.
      if (res.status === 409 && Array.isArray(data.sinStock) && data.sinStock.length) {
        setStatus("");
        const lista = data.sinStock.map((f) => `• ${f.nombre}: pide ${f.qty}, ${f.quedan ? `solo queda${f.quedan === 1 ? "" : "n"} ${f.quedan}` : "ya no queda ninguna"}`).join("\n");
        if (window.confirm(`⚠️ Ya no alcanza el stock para este pedido:\n\n${lista}\n\nSi lo confirmas vas a vender de más. Mejor cancélalo o cámbiale el producto.\n\n¿Confirmarlo de todos modos?`)) {
          return confirmOrCancel(orderId, action, true);
        }
        return;
      }
      if (!res.ok) {
        setStatus(data.error || "Error al actualizar el pedido.");
        return;
      }
      fetchOrders();
    } catch (err) {
      setStatus("No se pudo conectar con el servidor.");
    }
  }

  // Antes esto mostraba el panel (toolbar) de inmediato y solo lo
  // ocultaba de nuevo si la clave resultaba incorrecta (fetchOrders()
  // hace logout() en un 401) -- eso dejaba un momento confuso donde el
  // panel se veía "abierto" con una clave todavía sin confirmar.  Ahora
  // primero se verifica la clave con una llamada real, y el panel solo
  // se muestra si esa llamada regresa 200.


  /* ======================================================================
     Fase 2: etapas de surtido, Inicio y Compras ABW
     ====================================================================== */
  // pagado -> pedido_abw -> llego -> enviado -> entregado. Si un pedido no
  // tiene etapa guardada se deduce: con número de ABW ya se pidió, con
  // guía ya se envió.
  const STAGE_ORDER = ["pagado", "pedido_abw", "llego", "enviado", "entregado"];
  const STAGE_SELECT_LABELS = {
    pagado: "Pagado (falta surtir)",
    pedido_abw: "Pedido a ABW",
    llego: "Llegó a México",
    enviado: "Enviado",
    entregado: "Entregado",
  };
  const BUCKETS = {
    por_abw: "🛍️ Por pedir a ABW",
    esperando_abw: "⏳ Esperando ABW",
    por_enviar: "📦 Por enviar",
    guardado: "🧺 No mandar todavía",
    enviado: "🚚 Enviado",
    entregado: "🎁 Entregado",
  };
  let currentBucket = "";
  // Pedidos de Stock = solo piezas que ya tienes en México. Pedidos de Corea = traen
  // algo que se pide a ABW (aunque también lleve piezas de stock).
  const pedidoTipo = (o) => (supplierSourceableItems(o).length ? "corea" : "stock");
  let pedidosTodos = false; // llegó desde Inicio a una etapa que mezcla Stock y Corea
  let pedidosTodosNext = false;
  const vistaTipo = () => (pedidosTodos ? null : currentView === "corea" ? "corea" : currentView === "pedidos" ? "stock" : null);
  let restockCount = null;
  const abwExcluded = new Set();
  // "compartido": solo los pedidos del pedido compartido de Corea (los que
  // usaron un cupón sin mínimo), para pedirlos juntos en un solo carrito.
  let abwFiltro = "todos";

  /* ---------- Pedidos ligados: varios pedidos de la misma clienta en un
     solo envío (campo envioJunto; ver admin-link-orders.js). ---------- */
  const telDigits = (o) => String((o.customer && o.customer.phone) || "").replace(/\D/g, "").slice(-10);
  const mismaClienta = (a, b) => (telDigits(a) && telDigits(a) === telDigits(b)) || (a.customerEmail && b.customerEmail && a.customerEmail.toLowerCase() === b.customerEmail.toLowerCase());
  // Abierto = todavía no sale: pendiente de pago, o pagado sin guía y sin entregar.
  const pedidoAbierto = (x) => x.status === "pending" || (x.status === "paid" && !x.trackingNumber && !["enviado", "entregado"].includes(orderStage(x)));
  function pedidosJuntos(o) {
    return o.envioJunto ? allOrders.filter((x) => x.id !== o.id && x.envioJunto === o.envioJunto && x.status !== "cancelled") : [];
  }
  function otrosAbiertos(o) {
    if (!pedidoAbierto(o)) return [];
    return allOrders.filter((x) => x.id !== o.id && pedidoAbierto(x) && mismaClienta(o, x) && !(o.envioJunto && x.envioJunto === o.envioJunto));
  }
  const estadoCorto = (x) => (x.status === "pending" ? "💳 Por confirmar pago" : BUCKETS[orderBucket(x)] || (x.trackingNumber ? "🚚 Enviado" : ""));

  function linkBlockHTML(o) {
    if (o.status === "cancelled") return "";
    if (o.cajaEnvioId && o.status === "paid" && !o.trackingNumber) {
      const env = typeof swmData !== "undefined" && swmData.envios ? swmData.envios.find((x) => x.id === o.cajaEnvioId) : null;
      return `<div style="background:#eef6fd;border:1px solid #cfe3f6;border-radius:12px;padding:10px 12px;margin:10px 0;">
        <div style="font-weight:700;font-size:14px;">📦 Va en la caja del envío ${env ? escapeHtml(env.folio) : "de su casillero"}</div>
        <div class="meta">Se marca enviado solo cuando ese envío salga con su guía. No le hagas otra guía a este pedido.</div>
        <button type="button" class="btn-link" data-caja-quitar="${o.id}" style="margin-top:6px;font-size:13px;background:none;border:none;color:#8a828f;text-decoration:underline;cursor:pointer;">Sacar este pedido de esa caja</button>
      </div>`;
    }
    const junto = pedidosJuntos(o);
    const otros = otrosAbiertos(o);
    const fila = (x) => `<li><b>#${orderNumber(x)}</b> · ${escapeHtml(estadoCorto(x))} · ${formatPrice(x.grandTotal)}</li>`;
    let html = "";
    if (junto.length) {
      const noListos = junto.filter((x) => x.status === "pending" || ["por_abw", "esperando_abw"].includes(orderBucket(x)));
      const sinGuia = junto.filter((x) => x.status === "paid" && !x.trackingNumber);
      html += `<div class="link-box" style="background:#eef6fd;border:1px solid #cfe3f6;border-radius:12px;padding:10px 12px;margin:10px 0;">
        <div style="font-weight:700;font-size:14px;">🔗 Va en el mismo envío que:</div>
        <ul style="margin:6px 0 0;padding-left:18px;font-size:14px;">${junto.map(fila).join("")}</ul>
        ${noListos.length && orderBucket(o) === "por_enviar" ? `<div class="meta" style="color:#8a5a00;margin-top:6px;">⏳ Espera antes de mandarlo: ${noListos.map((x) => `#${orderNumber(x)} (${escapeHtml(estadoCorto(x))})`).join(", ")} todavía no está listo.</div>` : ""}
        ${enviadoJuntoBtn(o, junto)}
        ${o.trackingNumber && sinGuia.length ? `<button type="button" class="btn-secondary" data-link-guia="${o.id}" style="margin-top:8px;">📋 Poner esta misma guía a ${sinGuia.map((x) => "#" + orderNumber(x)).join(", ")}</button>` : ""}
        <button type="button" class="btn-link" data-link-quitar="${o.id}" style="margin-top:6px;font-size:13px;background:none;border:none;color:#8a828f;text-decoration:underline;cursor:pointer;">Sacar este pedido del envío junto</button>
      </div>`;
    }
    if (otros.length) {
      html += `<div style="background:#fff8ea;border:1px solid #f6dcbd;border-radius:12px;padding:10px 12px;margin:10px 0;">
        <div style="font-weight:700;font-size:14px;">⚠️ Esta clienta tiene otro${otros.length > 1 ? "s" : ""} pedido${otros.length > 1 ? "s" : ""} abierto${otros.length > 1 ? "s" : ""}:</div>
        ${otros.map((x) => `<div style="display:flex;gap:8px;align-items:center;justify-content:space-between;margin-top:6px;font-size:14px;"><span><b>#${orderNumber(x)}</b> · ${escapeHtml(estadoCorto(x))} · ${formatPrice(x.grandTotal)}</span><button type="button" class="btn-secondary" data-link-con="${o.id}:${x.id}" style="padding:6px 12px;font-size:13px;">🔗 Mandar junto</button></div>`).join("")}
      </div>`;
    }
    html += guardadoBlockHTML(o);
    html += `<details style="margin:6px 0;"><summary style="cursor:pointer;font-size:13px;color:#6b6370;">🔗 Ligar con otro pedido (por número)</summary>
      <div style="display:flex;gap:8px;margin-top:6px;"><input type="text" data-link-input="${o.id}" placeholder="Ej. #94FB5B85" style="flex:1;padding:8px 10px;border:1px solid #ddd;border-radius:8px;"><button type="button" class="btn-secondary" data-link-add="${o.id}">Ligar</button></div>
      <div class="meta">Así no se te olvida nada: los pedidos ligados se marcan en todas sus tarjetas y te avisa si alguno todavía no está listo para mandar.</div></details>`;
    return html;
  }

  // Otro pedido del grupo ya salió y este no: se fue en la misma caja.
  function enviadoJuntoBtn(o, junto) {
    if (o.status !== "paid" || o.trackingNumber || ["enviado", "entregado"].includes(orderStage(o))) return "";
    const madre = junto.find((x) => x.status === "paid" && (x.trackingNumber || ["enviado", "entregado"].includes(orderStage(x))));
    if (!madre) return "";
    return `<div class="meta" style="margin-top:6px;">🚚 #${orderNumber(madre)} ya se mandó${madre.trackingNumber ? ` (guía ${escapeHtml(madre.trackingNumber)})` : ""}.</div>
      <button type="button" class="btn-primary" data-link-enviado="${o.id}" style="margin-top:6px;">🚚 Se fue en la misma caja: marcar enviado</button>`;
  }

  // 🧺 Guardado: la clienta pidió que no se lo mande todavía.
  function guardadoBlockHTML(o) {
    if (o.status !== "paid" || o.trackingNumber || ["enviado", "entregado"].includes(orderStage(o))) return "";
    if (o.enEspera) {
      const desde = o.enEspera.desde ? new Date(o.enEspera.desde) : null;
      const dias = desde ? Math.floor((Date.now() - desde) / 86400000) : null;
      return `<div style="background:#f3eefc;border:1px solid #ddd0f5;border-radius:12px;padding:10px 12px;margin:10px 0;">
        <div style="font-weight:700;font-size:14px;">🧺 No mandar todavía: la clienta va a pedir más y quiere un solo envío</div>
        <div class="meta">${desde ? `Desde el ${desde.toLocaleDateString("es-MX", { day: "numeric", month: "short" })} (${dias === 0 ? "hoy" : dias === 1 ? "hace 1 día" : `hace ${dias} días`}).` : ""}</div>
        ${o.enEspera.nota ? `<div style="font-size:14px;margin-top:4px;">📝 ${escapeHtml(o.enEspera.nota)}</div>` : ""}
        <button type="button" class="btn-secondary" data-espera="${o.id}" data-espera-to="0" style="margin-top:8px;">▶️ Ya me dijo que se lo mande</button>
      </div>`;
    }
    return `<button type="button" class="btn-secondary" data-espera="${o.id}" data-espera-to="1" style="margin:6px 0;font-size:13px;">🧺 No mandar todavía (la clienta va a pedir más)</button>`;
  }

  async function linkAct(body, btn) {
    if (btn) btn.disabled = true;
    try {
      const res = await fetch("/.netlify/functions/admin-link-orders", {
        method: "POST", headers: { "Content-Type": "application/json", "x-admin-key": adminKey }, body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo guardar.");
      (data.orders || []).forEach((u) => { const i = allOrders.findIndex((x) => x.id === u.id); if (i >= 0) allOrders[i] = u; });
      showToast("Guardado ✅");
      applyFilters();
    } catch (err) {
      alert(err.message);
      if (btn) btn.disabled = false;
    }
  }

  document.addEventListener("click", (e) => {
    const t = e.target;
    const con = t.closest("[data-link-con]");
    if (con) { const [a, b] = con.dataset.linkCon.split(":"); linkAct({ orderIds: [a, b] }, con); return; }
    const add = t.closest("[data-link-add]");
    if (add) {
      const inp = document.querySelector(`[data-link-input="${CSS.escape(add.dataset.linkAdd)}"]`);
      const ref = (inp && inp.value || "").trim();
      if (!ref) { alert("Escribe el número del otro pedido (ej. #94FB5B85)."); return; }
      linkAct({ orderIds: [add.dataset.linkAdd, ref] }, add);
      return;
    }
    const quitar = t.closest("[data-link-quitar]");
    if (quitar) { if (confirm("¿Sacar este pedido del envío junto?")) linkAct({ orderId: quitar.dataset.linkQuitar, quitar: true }, quitar); return; }
    const cq = t.closest("[data-caja-quitar]");
    if (cq) { if (confirm("¿Sacar este pedido de esa caja?")) linkAct({ orderIds: [cq.dataset.cajaQuitar], cajaEnvioId: null }, cq); return; }
    const guia = t.closest("[data-link-guia]");
    if (guia) { linkAct({ orderId: guia.dataset.linkGuia, copiarGuia: true }, guia); return; }
    const envJ = t.closest("[data-link-enviado]");
    if (envJ) { linkAct({ orderId: envJ.dataset.linkEnviado, enviadoJunto: true }, envJ); return; }
    const esp = t.closest("[data-espera]");
    if (esp) {
      if (esp.dataset.esperaTo === "1") {
        const nota = prompt("🧺 No mandar todavía: la clienta va a pedir más.\n\nNota opcional (ej. \"espera la preventa\" o \"hasta el 15 de nov\"):", "");
        if (nota === null) return;
        linkAct({ orderId: esp.dataset.espera, espera: true, nota }, esp);
      } else {
        linkAct({ orderId: esp.dataset.espera, espera: false }, esp);
      }
    }
  });

  function orderStage(o) {
    let rank = STAGE_ORDER.indexOf(o.stage);
    if (rank < 0) rank = 0;
    if (o.supplierOrderNumber) rank = Math.max(rank, 1);
    if (o.trackingNumber) rank = Math.max(rank, 3);
    return STAGE_ORDER[rank];
  }

  // En qué "pendiente" está un pedido pagado (null si no está pagado).
  function orderBucket(o) {
    const b = orderBucketBase(o);
    return b === "por_enviar" && enEsperaActiva(o) ? "guardado" : b;
  }
  // "Guardado": la clienta pidió que se lo guarde para juntar su envío con
  // algo que pida después. Ya está listo, pero NO cuenta como "Por enviar"
  // (esos son los que hay que mandar ya).
  const enEsperaActiva = (o) => !!o.enEspera && o.status === "paid" && !o.trackingNumber && !["enviado", "entregado"].includes(orderStage(o));
  function orderBucketBase(o) {
    if (o.status !== "paid") return null;
    const st = orderStage(o);
    if (st === "pagado") return supplierSourceableItems(o).length ? "por_abw" : "por_enviar";
    if (st === "pedido_abw") return "esperando_abw";
    if (st === "llego") return "por_enviar";
    return st;
  }

  /* Ciudad Juárez: Mae entrega en persona (sin guía ni envío nacional).
     Misma regla que isJuarezAddress en app.js y lib/pricing.js. */
  function isJuarezOrder(o) {
    const c = o.customer || {};
    const cpText = String(c.cp || "").trim();
    if (/^\d{5}$/.test(cpText)) return Number(cpText) >= 32000 && Number(cpText) <= 32799;
    return normalizeForSearch(c.municipio || "").includes("juarez") && normalizeForSearch(c.estado || "").includes("chihuahua");
  }
  const isEntregaPersonal = (o) => !!(o.customer && o.customer.entregaPersonal);

  function bucketChipHTML(o) {
    const b = orderBucket(o);
    return b ? `<span class="badge st-${b}">${BUCKETS[b]}</span>` : "";
  }

  function firstName(o) {
    return ((o.customer && o.customer.name) || "").trim().split(/\s+/)[0] || "";
  }

  // Mensajes de WhatsApp listos según la etapa (se abren con un toque).
  function waTemplatesHTML(o) {
    const phone = o.customer && o.customer.phone;
    const base = waLinkFromPhone(phone);
    if (!base) return "";
    const hola = firstName(o) ? `Hola ${firstName(o)} 💕` : "Hola 💕";
    const num = `#${orderNumber(o)}`;
    const b = orderBucket(o);
    const msgs = [];
    if (o.status === "paid") msgs.push(["Recibí tu pago", `${hola} ¡Recibí tu pago del pedido ${num}! Muchas gracias por tu compra en Alpacca. Te voy avisando cómo va 🌸`]);
    if (b === "esperando_abw") msgs.push(["Ya lo pedimos", `${hola} Tu pedido ${num} ya está pedido a Corea 🇰🇷. En cuanto llegue a México te aviso para enviártelo.`]);
    if (b === "por_enviar" && orderStage(o) === "llego" && !isEntregaPersonal(o)) msgs.push(["Llegó a México", `${hola} ¡Tu pedido ${num} ya llegó a México! 🇲🇽 Lo preparo y te mando la guía en cuanto salga.`]);
    if (o.enEspera && ["por_abw", "esperando_abw", "por_enviar", "guardado"].includes(b)) msgs.push(["Te lo guardo", `${hola} ¡Listo! Te guardo tu pedido ${num} para juntarlo con lo que pidas después y que pagues un solo envío 📦. Cuando quieras que te lo mande, solo avísame 🌸`]);
    if (b === "enviado") msgs.push(["¿Ya te llegó?", `${hola} ¿Ya te llegó tu pedido ${num}? Cualquier cosa aquí estoy 🌸`]);
    if (b === "entregado") msgs.push(["Gracias", `${hola} ¡Gracias por tu compra! Si te gustaron tus productos, me ayudaría mucho que dejaras tu reseña en alpacca.mx 💕`]);
    if (!msgs.length) return "";
    return `<div class="wa-row"><span class="wa-label">💬 Mensajes rápidos por WhatsApp</span>${msgs
      .map(([label, text]) => `<a href="${escapeHtml(`${base}?text=${encodeURIComponent(text)}`)}" target="_blank" rel="noopener">${escapeHtml(label)}</a>`)
      .join("")}</div>`;
  }

  /* ---------- 📦 Armar pedido: lista para ir palomeando lo que ya está
     en la caja (ver admin-pack-order.js). Incluye los pedidos ligados que
     van en la misma caja. Lo que falte se quita del pedido y se le avisa
     a la clienta de su reembolso. ---------- */
  const packArmable = (o) => o.status === "paid" && !o.trackingNumber && !["enviado", "entregado"].includes(orderStage(o));
  const packPiezas = (o) => (o.items || []).reduce((s, it) => s + (Number(it.qty) || 0), 0);
  const packEnCaja = (o) => Object.values((o.armado && o.armado.progreso) || {}).reduce((s, n) => s + (Number(n) || 0), 0);

  function armarBtnHTML(o) {
    if (!packArmable(o) || !["por_enviar", "guardado"].includes(orderBucket(o))) return "";
    const total = packPiezas(o);
    const listos = Math.min(total, packEnCaja(o));
    const label = listos >= total && total ? "✅ Caja completa · ver lista" : listos ? `📦 Seguir armando (${listos} de ${total})` : "📦 Armar pedido (ir palomeando)";
    return `<button type="button" class="btn-secondary pack-open" data-armar="${o.id}">${label}</button>`;
  }

  function packWaText(o, lista, monto) {
    const hola = firstName(o) ? `Hola ${firstName(o)} 💕` : "Hola 💕";
    const como = o.source === "mercadopago"
      ? "Te lo regreso a tu tarjeta por Mercado Pago 🙏"
      : "¿Me pasas tu CLABE o número de tarjeta para hacerte la transferencia? 🙏";
    return `${hola} Al armar tu pedido #${orderNumber(o)} me di cuenta de que ya no tenía: ${lista.join(", ")}. Perdón por el inconveniente. Te reembolso ${formatPrice(monto)}. ${como}`;
  }

  function reembolsoHTML(o) {
    const r = o.reembolso;
    if (!r || r.status !== "pendiente") return "";
    const falt = (o.faltantes || []).map((f) => `${f.marca ? `${f.marca} ` : ""}${f.nombre}${f.qty > 1 ? ` ×${f.qty}` : ""}`);
    const base = waLinkFromPhone(o.customer && o.customer.phone);
    return `<div style="background:#fff3f3;border:1px solid #f3c9c9;border-radius:12px;padding:10px 12px;margin:10px 0;">
      <div style="font-weight:700;font-size:14px;">💸 Reembolso pendiente: ${formatPrice(r.monto)}</div>
      <div class="meta">Faltó al armar: ${escapeHtml(falt.join(", "))}. ${o.source === "mercadopago" ? "Pagó con tarjeta: hazlo desde Mercado Pago." : "Pagó por transferencia."}</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;">
        ${base ? `<a class="btn-secondary" style="text-decoration:none;" target="_blank" rel="noopener" href="${escapeHtml(`${base}?text=${encodeURIComponent(packWaText(o, falt, r.monto))}`)}">💬 Escribirle por WhatsApp</a>` : ""}
        <button type="button" class="btn-secondary" data-reembolsado="${o.id}">✅ Ya le reembolsé</button>
      </div>
    </div>`;
  }

  let pack = null; // { ids: [...], prog: {id: {i: n}}, timers: {} }

  function packOpen(id) {
    const o = allOrders.find((x) => x.id === id);
    if (!o) return;
    const grupo = [o, ...pedidosJuntos(o).filter((x) => packArmable(x) && !x.enEspera)];
    pack = { ids: grupo.map((x) => x.id), prog: {}, timers: {}, paso: "lista" };
    grupo.forEach((x) => { pack.prog[x.id] = { ...((x.armado && x.armado.progreso) || {}) }; });
    packMostrar();
  }

  /* Por mandar: una sola lista con TODOS los productos de los pedidos (y
     apartados del Sephora Sale) que van en la caja, juntando los iguales. */
  const PACK_AP_KEY = "alpacca_pack_apartados";
  const packApGuardado = () => { try { return JSON.parse(localStorage.getItem(PACK_AP_KEY) || "{}"); } catch (e) { return {}; } };
  function packOpenCaja({ orderIds = [], apartadoIds = [], nombre = "" }) {
    pack = { ids: orderIds.filter((id) => allOrders.some((x) => x.id === id)), aps: apartadoIds, prog: {}, apProg: {}, timers: {}, paso: "lista", junto: true, nombre };
    pack.ids.forEach((id) => { const o = allOrders.find((x) => x.id === id); pack.prog[id] = { ...((o.armado && o.armado.progreso) || {}) }; });
    const g = packApGuardado();
    pack.aps.forEach((id) => { pack.apProg[id] = { ...(g[id] || {}) }; });
    packMostrar();
  }

  function packMostrar() {
    let el = document.getElementById("pack-modal");
    if (!el) {
      el = document.createElement("div");
      el.id = "pack-modal";
      el.className = "pack-modal";
      el.setAttribute("role", "dialog");
      el.setAttribute("aria-modal", "true");
      document.body.appendChild(el);
    }
    el.hidden = false;
    document.body.style.overflow = "hidden";
    packRender();
  }

  function packClose() {
    const el = document.getElementById("pack-modal");
    if (el) el.hidden = true;
    document.body.style.overflow = "";
    pack = null;
    applyFilters();
  }

  const packOrders = () => pack.ids.map((id) => allOrders.find((x) => x.id === id)).filter(Boolean);
  const packAps = () => (pack.aps || []).map((id) => ((pvData && pvData.apartados) || pvApartadosLigeros || []).find((a) => a.id === id)).filter(Boolean);
  // Renglones juntos: el mismo producto de varios pedidos va en uno solo.
  function packFilas() {
    const m = new Map();
    const add = (t, id, i, it) => {
      const k = [it.sku || "", (itemMarca(it) || "").toLowerCase(), it.nombre || "", it.variante || "", it.tamano || ""].join("|");
      const r = m.get(k) || { it, partes: [] };
      r.partes.push({ t, id, i: String(i), qty: Number(it.qty) || 0 });
      m.set(k, r);
    };
    packOrders().forEach((o) => (o.items || []).forEach((it, i) => add("o", o.id, i, it)));
    packAps().forEach((a) => (a.items || []).forEach((it, i) => add("a", a.id, i, it)));
    return [...m.values()].map((r) => {
      const n = (p) => Math.min(p.qty, ((p.t === "o" ? pack.prog : pack.apProg)[p.id] || {})[p.i] || 0);
      return { ...r, qty: r.partes.reduce((t, p) => t + p.qty, 0), n: r.partes.reduce((t, p) => t + n(p), 0), nParte: n };
    }).sort((a, b) => `${itemMarca(a.it)} ${a.it.nombre}`.localeCompare(`${itemMarca(b.it)} ${b.it.nombre}`));
  }
  function packApSave() {
    const g = packApGuardado();
    Object.entries(pack.apProg || {}).forEach(([id, prog]) => { g[id] = prog; });
    try { localStorage.setItem(PACK_AP_KEY, JSON.stringify(g)); } catch (e) { /* sin almacenamiento */ }
  }
  const packImg = (it) => {
    const src = (skuToInfo.get(it.sku) || {}).imagen || it.imagen;
    // Sin loading="lazy": dentro de la ventana del checklist Safari (iPad /
    // iPhone) a veces no cargaba las fotos. Si una falla, sale la bolsita.
    return src ? `<img src="${escapeHtml(catalogImgSrc(src))}" alt="" decoding="async">` : `<span class="pack-noimg">🛍️</span>`;
  };

  // Foto que no carga en el checklist: en su lugar sale la bolsita (con el
  // CSP no se pueden usar onerror en línea).
  document.addEventListener("error", (e) => {
    const t = e.target;
    if (!t || t.tagName !== "IMG" || !t.closest || !t.closest(".pack-pic")) return;
    const s = document.createElement("span");
    s.className = "pack-noimg";
    s.textContent = "🛍️";
    t.replaceWith(s);
  }, true);

  function packTotals() {
    if (pack.junto) {
      const f = packFilas();
      return { total: f.reduce((t, r) => t + r.qty, 0), listos: f.reduce((t, r) => t + r.n, 0) };
    }
    let total = 0, listos = 0;
    packOrders().forEach((o) => (o.items || []).forEach((it, i) => { total += it.qty; listos += Math.min(it.qty, pack.prog[o.id][i] || 0); }));
    return { total, listos };
  }

  // Redibuja sin perder dónde iba en la lista (si no, en listas largas
  // cada palomita la regresaba hasta arriba).
  function packRender() {
    const el = document.getElementById("pack-modal");
    if (!el || !pack) return;
    const prev = el.querySelector(".pack-list");
    const scroll = prev && pack.vistaPaso === pack.paso ? prev.scrollTop : 0;
    pack.vistaPaso = pack.paso;
    packDibujar(el);
    const list = el.querySelector(".pack-list");
    if (list) list.scrollTop = scroll;
  }

  function packDibujar(el) {
    const orders = packOrders();
    const { total, listos } = packTotals();
    const pct = total ? Math.round((listos / total) * 100) : 0;
    const completo = total > 0 && listos >= total;
    const quien = orders[0] && orders[0].customer && orders[0].customer.name ? orders[0].customer.name : "";

    if (pack.paso === "faltan") return packRenderFaltan(el, orders);
    if (pack.junto) {
      const filas = packFilas();
      const folios = [...orders.map((o) => "#" + orderNumber(o)), ...packAps().map((a) => a.folio)];
      el.innerHTML = `<div class="pack-sheet">
      <div class="pack-head">
        <div><b>📦 Caja de ${escapeHtml(pack.nombre || quien || "la clienta")}</b><small>${folios.length} pedido${folios.length === 1 ? "" : "s"}: ${escapeHtml(folios.join(" + "))}</small></div>
        <button type="button" class="pack-x" data-pack-close aria-label="Cerrar">✕</button>
      </div>
      <div class="pack-progress"><i style="width:${pct}%"></i></div>
      <div class="pack-count">${completo ? "🎉 ¡Todo está en la caja!" : `${listos} de ${total} piezas en la caja · toca cada producto cuando lo eches`}</div>
      <div class="pack-list">
        ${filas.map((r, k) => {
          const ok = r.n >= r.qty;
          return `<div class="pack-row${ok ? " ok" : r.n ? " half" : ""}" data-pack-jrow="${k}" role="button" tabindex="0">
            <span class="pack-pic">${packImg(r.it)}<span class="pack-qty${r.qty > 1 ? " multi" : ""}">×${r.qty}</span></span>
            <span class="pack-name"><b>${escapeHtml(itemMarca(r.it))}</b>${escapeHtml(r.it.nombre)}${r.it.variante ? ` · ${escapeHtml(r.it.variante)}` : ""}${r.it.tamano ? ` (${escapeHtml(r.it.tamano)})` : ""}<em class="pack-cant">${r.qty > 1 ? `${r.qty} piezas · llevas ${r.n}` : "1 pieza"}${r.partes.length > 1 ? ` · de ${r.partes.length} pedidos` : ""}</em></span>
            ${r.qty > 1 && r.n > 0 && !ok ? `<button type="button" class="pack-minus" data-pack-jminus="${k}" aria-label="Quitar una">−</button>` : ""}
            <span class="pack-check">${ok ? "✓" : r.qty > 1 ? `${r.n}/${r.qty}` : ""}</span>
          </div>`;
        }).join("")}
      </div>
      <div class="pack-foot">
        ${completo
          ? `<button type="button" class="btn-primary" data-pack-close>✅ Listo, ya está todo</button>`
          : orders.length ? `<button type="button" class="btn-secondary pack-falta" data-pack-faltan>⚠️ No encontré algo / me falta</button>` : ""}
        <span class="meta">Se guarda solo: puedes cerrar y seguir después.</span>
      </div>
    </div>`;
      return;
    }

    el.innerHTML = `<div class="pack-sheet">
      <div class="pack-head">
        <div><b>📦 Armando ${orders.map((o) => "#" + orderNumber(o)).join(" + ")}</b><small>${escapeHtml(quien)}</small></div>
        <button type="button" class="pack-x" data-pack-close aria-label="Cerrar">✕</button>
      </div>
      <div class="pack-progress"><i style="width:${pct}%"></i></div>
      <div class="pack-count">${completo ? "🎉 ¡Todo está en la caja!" : `${listos} de ${total} piezas en la caja · toca cada producto cuando lo eches`}</div>
      <div class="pack-list">
        ${orders.map((o) => `${orders.length > 1 ? `<div class="pack-sec">Pedido #${orderNumber(o)}</div>` : ""}
          ${(o.items || []).map((it, i) => {
            const n = Math.min(it.qty, pack.prog[o.id][i] || 0);
            const ok = n >= it.qty;
            return `<div class="pack-row${ok ? " ok" : n ? " half" : ""}" data-pack-row="${o.id}:${i}" role="button" tabindex="0">
              <span class="pack-pic">${packImg(it)}<span class="pack-qty${it.qty > 1 ? " multi" : ""}">×${it.qty}</span></span>
              <span class="pack-name"><b>${escapeHtml(itemMarca(it))}</b>${escapeHtml(it.nombre)}<em class="pack-cant">${it.qty > 1 ? `${it.qty} piezas · llevas ${n}` : "1 pieza"}</em></span>
              ${it.qty > 1 && n > 0 && !ok ? `<button type="button" class="pack-minus" data-pack-minus="${o.id}:${i}" aria-label="Quitar una">−</button>` : ""}
              <span class="pack-check">${ok ? "✓" : it.qty > 1 ? `${n}/${it.qty}` : ""}</span>
            </div>`;
          }).join("")}`).join("")}
      </div>
      <div class="pack-foot">
        ${completo
          ? `<button type="button" class="btn-primary" data-pack-close>✅ Listo, ya está todo</button>`
          : `<button type="button" class="btn-secondary pack-falta" data-pack-faltan>⚠️ No encontré algo / me falta</button>`}
        <span class="meta">Se guarda solo: puedes cerrar y seguir después.</span>
      </div>
    </div>`;
  }

  function packRenderFaltan(el, orders) {
    if (!pack.faltan) {
      pack.faltan = {};
      orders.forEach((o) => (o.items || []).forEach((it, i) => {
        const falta = it.qty - Math.min(it.qty, pack.prog[o.id][i] || 0);
        if (falta > 0) pack.faltan[`${o.id}:${i}`] = falta;
      }));
    }
    const filas = [];
    let totalReembolso = 0;
    orders.forEach((o) => (o.items || []).forEach((it, i) => {
      const key = `${o.id}:${i}`;
      const pendientes = it.qty - Math.min(it.qty, pack.prog[o.id][i] || 0);
      if (pendientes <= 0) return;
      const q = pack.faltan[key] || 0;
      totalReembolso += q * (Number(it.precio) || 0);
      filas.push(`<div class="pack-row falt${q ? " sel" : ""}">
        ${packImg(it)}
        <span class="pack-name"><b>${escapeHtml(itemMarca(it))}</b>${escapeHtml(it.nombre)}<em>${orders.length > 1 ? `#${orderNumber(o)} · ` : ""}${formatPrice(it.precio)} c/u</em></span>
        <span class="pack-step">
          <button type="button" data-falt="${key}" data-falt-d="-1" aria-label="Menos">−</button>
          <b>${q}</b>
          <button type="button" data-falt="${key}" data-falt-d="1" data-falt-max="${pendientes}" aria-label="Más">+</button>
        </span>
      </div>`);
    }));
    el.innerHTML = `<div class="pack-sheet">
      <div class="pack-head">
        <div><b>⚠️ ¿Qué no encontraste?</b><small>Pon cuántas piezas te faltan de cada uno</small></div>
        <button type="button" class="pack-x" data-pack-close aria-label="Cerrar">✕</button>
      </div>
      <div class="pack-list">${filas.join("") || `<p class="meta">Todo está palomeado: no falta nada.</p>`}</div>
      <label class="pack-cero"><input type="checkbox" id="pack-cero" checked> Restar también esas piezas del stock de la tienda (para que nadie más compre lo que ya no tienes)</label>
      <div class="pack-foot">
        <div style="font-size:15px;">Se le reembolsa: <b>${formatPrice(totalReembolso)}</b></div>
        <button type="button" class="btn-primary" data-pack-avisar ${totalReembolso > 0 ? "" : "disabled"}>Quitar del pedido y avisarle a la clienta</button>
        <button type="button" class="btn-link pack-back" data-pack-back>← Regresar a la lista</button>
        <span class="meta">Le llega un aviso por correo y WhatsApp de que se agotó y que se le reembolsa. El reembolso lo haces tú.</span>
      </div>
    </div>`;
  }

  function packSave(id) {
    clearTimeout(pack.timers[id]);
    const prog = { ...pack.prog[id] };
    pack.timers[id] = setTimeout(async () => {
      try {
        const res = await fetch("/.netlify/functions/admin-pack-order", {
          method: "POST", headers: { "Content-Type": "application/json", "x-admin-key": adminKey }, body: JSON.stringify({ orderId: id, progreso: prog }),
        });
        const data = await res.json().catch(() => ({}));
        (data.orders || []).forEach((u) => { const k = allOrders.findIndex((x) => x.id === u.id); if (k >= 0) allOrders[k] = u; });
      } catch (err) { /* se reintenta con el siguiente toque */ }
    }, 700);
  }

  async function packAvisar(btn) {
    const orders = packOrders();
    const cero = (document.getElementById("pack-cero") || {}).checked;
    const porPedido = {};
    Object.entries(pack.faltan || {}).forEach(([key, q]) => {
      if (!q) return;
      const [id, i] = key.split(":");
      (porPedido[id] = porPedido[id] || []).push({ i: Number(i), qty: q });
    });
    if (!Object.keys(porPedido).length) return;
    if (!confirm("¿Quitar esos productos del pedido y avisarle a la clienta que se le reembolsa?")) return;
    btn.disabled = true;
    btn.textContent = "Avisando…";
    const hechos = [];
    try {
      for (const o of orders) {
        if (!porPedido[o.id]) continue;
        const res = await fetch("/.netlify/functions/admin-pack-order", {
          method: "POST", headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
          body: JSON.stringify({ orderId: o.id, faltantes: porPedido[o.id], restarStock: !!cero }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "No se pudo guardar.");
        (data.orders || []).forEach((u) => { const k = allOrders.findIndex((x) => x.id === u.id); if (k >= 0) allOrders[k] = u; });
        hechos.push({ o: data.orders[0], lista: data.lista || [], monto: data.reembolso });
        pack.prog[o.id] = { ...((data.orders[0].armado && data.orders[0].armado.progreso) || {}) };
      }
    } catch (err) {
      alert(err.message);
      btn.disabled = false;
      btn.textContent = "Quitar del pedido y avisarle a la clienta";
      if (!hechos.length) return;
    }
    const el = document.getElementById("pack-modal");
    el.innerHTML = `<div class="pack-sheet">
      <div class="pack-head"><div><b>✅ Listo, ya se le avisó</b><small>Se quitó del pedido y quedó apuntado el reembolso pendiente</small></div>
        <button type="button" class="pack-x" data-pack-close aria-label="Cerrar">✕</button></div>
      ${hechos.map(({ o, lista, monto }) => {
        const base = waLinkFromPhone(o.customer && o.customer.phone);
        return `<div class="pack-done">
          <div><b>#${orderNumber(o)}</b> · Reembolso: <b>${formatPrice(monto)}</b></div>
          <div class="meta">${escapeHtml(lista.join(", "))}</div>
          ${base ? `<a class="btn-primary" style="text-decoration:none;display:inline-block;margin-top:8px;" target="_blank" rel="noopener" href="${escapeHtml(`${base}?text=${encodeURIComponent(packWaText(o, lista, monto))}`)}">💬 Escribirle también por WhatsApp</a>` : ""}
        </div>`;
      }).join("")}
      <div class="pack-foot">
        <button type="button" class="btn-secondary" data-pack-back>📦 Seguir armando</button>
        <span class="meta">En el pedido te queda un aviso rojo "💸 Reembolso pendiente" hasta que toques "Ya le reembolsé".</span>
      </div>
    </div>`;
    pack.paso = "lista";
    pack.faltan = null;
  }

  document.addEventListener("click", async (e) => {
    const t = e.target;
    const open = t.closest("[data-armar]");
    if (open) { packOpen(open.dataset.armar); return; }
    const reemb = t.closest("[data-reembolsado]");
    if (reemb) {
      if (!confirm("¿Ya le hiciste su reembolso?")) return;
      reemb.disabled = true;
      try {
        const res = await fetch("/.netlify/functions/admin-pack-order", {
          method: "POST", headers: { "Content-Type": "application/json", "x-admin-key": adminKey }, body: JSON.stringify({ orderId: reemb.dataset.reembolsado, reembolsado: true }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "No se pudo guardar.");
        (data.orders || []).forEach((u) => { const k = allOrders.findIndex((x) => x.id === u.id); if (k >= 0) allOrders[k] = u; });
        showToast("Reembolso marcado como hecho ✅");
        applyFilters();
      } catch (err) { alert(err.message); reemb.disabled = false; }
      return;
    }
    if (!pack || !t.closest("#pack-modal")) return;
    if (t.closest("[data-pack-close]")) { packClose(); return; }
    if (t.closest("[data-pack-faltan]")) { pack.paso = "faltan"; pack.faltan = null; packRender(); return; }
    if (t.closest("[data-pack-back]")) { pack.paso = "lista"; packRender(); return; }
    const av = t.closest("[data-pack-avisar]");
    if (av) { packAvisar(av); return; }
    const f = t.closest("[data-falt]");
    if (f) {
      const key = f.dataset.falt;
      const max = Number(f.dataset.faltMax) || Infinity;
      pack.faltan[key] = Math.max(0, Math.min(max, (pack.faltan[key] || 0) + Number(f.dataset.faltD)));
      packRender();
      return;
    }
    const jminus = t.closest("[data-pack-jminus]");
    const jrow = t.closest("[data-pack-jrow]");
    if (pack.junto && (jminus || jrow)) {
      const r = packFilas()[Number((jminus || jrow).dataset[jminus ? "packJminus" : "packJrow"])];
      if (!r) return;
      const poner = (p, v) => {
        const tabla = p.t === "o" ? pack.prog : pack.apProg;
        tabla[p.id] = tabla[p.id] || {};
        if (v > 0) tabla[p.id][p.i] = v; else delete tabla[p.id][p.i];
      };
      const tocados = [];
      if (jminus) {
        const p = [...r.partes].reverse().find((x) => r.nParte(x) > 0);
        if (p) { poner(p, r.nParte(p) - 1); tocados.push(p); }
      } else if (r.n >= r.qty) {
        r.partes.forEach((p) => { poner(p, 0); tocados.push(p); }); // ya estaba completo: se reinicia
      } else {
        const p = r.partes.find((x) => r.nParte(x) < x.qty);
        if (p) { poner(p, r.nParte(p) + 1); tocados.push(p); }
      }
      if (navigator.vibrate) try { navigator.vibrate(15); } catch (err) { /* nada */ }
      packRender();
      [...new Set(tocados.filter((p) => p.t === "o").map((p) => p.id))].forEach(packSave);
      if (tocados.some((p) => p.t === "a")) packApSave();
      return;
    }
    const minus = t.closest("[data-pack-minus]");
    const row = t.closest("[data-pack-row]");
    if (!minus && !row) return;
    const [id, i] = (minus ? minus.dataset.packMinus : row.dataset.packRow).split(":");
    const o = allOrders.find((x) => x.id === id);
    const it = o && o.items[Number(i)];
    if (!it) return;
    const cur = Math.min(it.qty, pack.prog[id][i] || 0);
    const next = minus ? cur - 1 : cur >= it.qty ? 0 : cur + 1;
    if (next > 0) pack.prog[id][i] = next; else delete pack.prog[id][i];
    if (navigator.vibrate) try { navigator.vibrate(15); } catch (err) { /* nada */ }
    packRender();
    packSave(id);
  });
  document.addEventListener("keydown", (e) => {
    if (!pack) return;
    if (e.key === "Escape") packClose();
    if ((e.key === "Enter" || e.key === " ") && e.target.closest && e.target.closest("[data-pack-row], [data-pack-jrow]")) { e.preventDefault(); e.target.click(); }
  });

  // El botón grande del siguiente paso, según la etapa.
  function nextStepHTML(o) {
    const b = orderBucket(o);
    if (!b) return "";
    const btn = (to, label) => `<button type="button" class="btn-primary" data-stage="${o.id}" data-stage-to="${to}">${label}</button>`;
    let action = "";
    if (b === "por_abw") action = btn("pedido_abw", "🛍️ Ya lo pedí a ABW");
    else if (b === "esperando_abw") action = btn("llego", "📦 Ya llegó a México");
    else if (b === "por_enviar" && isEntregaPersonal(o)) action = `${btn("entregado", "🎁 Ya se lo entregué")}<span class="edit-hint">Entrega personal en Ciudad Juárez: no lleva guía.</span>`;
    else if (b === "por_enviar") action = `${btn("enviado", "🚚 Ya lo envié")}<span class="edit-hint">Para generar la guía con paquetería usa "📦 Generar guía real" más abajo; al guardar la guía se marca como enviado solo.</span>`;
    else if (b === "guardado") action = `<button type="button" class="btn-primary" data-espera="${o.id}" data-espera-to="0">▶️ Ya me dijo que se lo mande</button><span class="edit-hint">Al tocarlo pasa a "📦 Por enviar".</span>`;
    else if (b === "enviado") action = btn("entregado", "🎁 Ya lo recibió");
    const personal = isJuarezOrder(o) && ["por_abw", "esperando_abw", "por_enviar", "guardado"].includes(b)
      ? `<button type="button" class="btn-secondary" data-personal-toggle="${o.id}" data-personal-to="${isEntregaPersonal(o) ? "0" : "1"}">${isEntregaPersonal(o) ? "Quitar entrega personal" : "📍 Marcar como entrega personal (Juárez)"}</button>`
      : "";
    return `<div class="next-step"><span class="ns-label">Siguiente paso · <b>${BUCKETS[b]}</b></span>${armarBtnHTML(o)}${action}${personal}${waTemplatesHTML(o)}</div>${reembolsoHTML(o)}`;
  }

  function stageSelectHTML(o) {
    if (o.status !== "paid") return "";
    const cur = orderStage(o);
    return `<label class="fld" style="max-width:320px;"><span>Cambiar etapa a mano</span>
      <select class="stage-select" data-stage-select="${o.id}">${STAGE_ORDER.map(
        (st) => `<option value="${st}"${st === cur ? " selected" : ""}>${STAGE_SELECT_LABELS[st]}</option>`
      ).join("")}</select></label>`;
  }

  async function updateStage(orderIds, stage, supplierOrderNumber) {
    setStatus("Guardando...");
    try {
      const res = await fetch("/.netlify/functions/admin-update-order-stage", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ orderIds, stage, supplierOrderNumber }),
      });
      const data = await res.json().catch(() => ({}));
      (data.orders || []).forEach((u) => {
        const i = allOrders.findIndex((x) => x.id === u.id);
        if (i >= 0) allOrders[i] = u;
      });
      if (!res.ok) {
        setStatus(data.error || "No se pudo guardar la etapa.");
        return false;
      }
      setStatus("");
      applyFilters();
      return true;
    } catch (err) {
      setStatus("No se pudo conectar con el servidor.");
      return false;
    }
  }

  async function setEntregaPersonal(id, on) {
    setStatus("Guardando...");
    try {
      const res = await fetch("/.netlify/functions/admin-update-order-stage", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ orderId: id, entregaPersonal: on }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setStatus(data.error || "No se pudo guardar."); return; }
      (data.orders || []).forEach((u) => {
        const i = allOrders.findIndex((x) => x.id === u.id);
        if (i >= 0) allOrders[i] = u;
      });
      setStatus("");
      applyFilters();
      showToast(on ? "📍 Marcado como entrega personal." : "Se quitó la entrega personal.");
    } catch (err) {
      setStatus("No se pudo conectar con el servidor.");
    }
  }

  function wireStageControls(container) {
    container.addEventListener("click", async (e) => {
      const pt = e.target.closest("[data-personal-toggle]");
      if (pt && container.contains(pt)) {
        openCards.add(pt.dataset.personalToggle);
        pt.disabled = true;
        await setEntregaPersonal(pt.dataset.personalToggle, pt.dataset.personalTo === "1");
        return;
      }
      const btn = e.target.closest("[data-stage]");
      if (!btn || !container.contains(btn)) return;
      const id = btn.dataset.stage;
      const to = btn.dataset.stageTo;
      let num;
      if (to === "pedido_abw") {
        const o = allOrders.find((x) => x.id === id);
        num = window.prompt("Número de pedido en ABW (opcional):", (o && o.supplierOrderNumber) || "");
        if (num === null) return;
      }
      btn.disabled = true;
      openCards.add(id);
      await updateStage([id], to, num || undefined);
      btn.disabled = false;
    });
    container.addEventListener("change", (e) => {
      const sel = e.target.closest("[data-stage-select]");
      if (!sel) return;
      openCards.add(sel.dataset.stageSelect);
      updateStage([sel.dataset.stageSelect], sel.value);
    });
  }

  /* ---------- Inicio ---------- */
  function paidOrders() {
    return allOrders.filter((o) => o.status === "paid");
  }

  function dayKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  /* Todos los comprobantes que las clientas subieron y Mae no ha revisado:
     tienda (pedido nuevo o lo que faltaba de uno ya pagado), Personal
     shopper / Dirección americana y Sephora Sale. */
  function comprobantesPorRevisar() {
    const tienda = allOrders.filter((o) => (o.status === "pending" && o.hasPaymentProof) || (o.proofsExtra || []).some((x) => x.status === "revision"));
    const enRev = (r) => r.pago && r.pago.status === "revision";
    const compras = swmLoaded ? swmData.compras.filter(enRev) : [];
    const envios = swmLoaded ? swmData.envios.filter(enRev) : [];
    const paquetes = swmLoaded ? swmData.paquetes.filter(enRev) : [];
    const swPs = [...compras, ...envios.filter((e) => envioEsPs(e, swmData))];
    const swDa = [...paquetes, ...envios.filter((e) => !envioEsPs(e, swmData))];
    const sw = [...swPs, ...swDa];
    const pv = pvApartadosLigeros ? pvResumen().revisar : 0;
    const partes = [];
    if (tienda.length) partes.push(`${tienda.length} de la tienda`);
    if (swPs.length) partes.push(`${swPs.length} de Personal shopper`);
    if (swDa.length) partes.push(`${swDa.length} de Dirección americana`);
    if (pv) partes.push(`${pv} del Sephora Sale`);
    const go = tienda.length ? "pending" : swPs.length ? "ps" : swDa.length ? "swm" : pv ? "preventa" : "pending";
    return { total: tienda.length + sw.length + pv, partes, go, ids: [...tienda.map((o) => `o:${o.id}:${(o.proofsExtra || []).length}`), ...sw.map((r) => `s:${r.id}:${r.pago.comprobanteAt || ""}`)] };
  }

  function renderHome() {
    const todoEl = document.getElementById("home-todo");
    if (!todoEl) return;
    const now = new Date();
    document.getElementById("home-hello").textContent =
      `Hola Mae · ${now.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}`;
    const count = (b) => allOrders.filter((o) => orderBucket(o) === b).length;
    const pending = allOrders.filter((o) => o.status === "pending").length;
    const rev = comprobantesPorRevisar();
    const cards = [
      ...(rev.total ? [{ n: rev.total, label: "🔎 Comprobantes por revisar", hint: rev.partes.join(" · "), go: rev.go, cls: "hot" }] : []),
      { n: pending, label: "Por confirmar pago", hint: "Revisa comprobantes", go: "pending", cls: "hot" },
      { n: count("por_abw"), label: "Por pedir a ABW", hint: "Ver lista de compra", go: "abw", cls: "pink" },
      { n: count("esperando_abw"), label: "Esperando ABW", hint: "Ya pedidos, en camino", go: "esperando_abw" },
      { n: count("por_enviar"), label: "Por enviar", hint: "Generar guía", go: "por_enviar", cls: "hot" },
      { n: count("guardado"), label: "No mandar todavía", hint: "La clienta va a pedir más", go: "guardado" },
      { n: swmLoaded ? pmCount : "…", label: "Por mandar", hint: "Clientas con cosas listas", go: "pm", cls: "hot" },
            { n: swmLoaded ? swmNewCount : "…", label: "Dirección americana", hint: "Paquetes y envíos de tus clientas", go: "swm", cls: "blue" },
      { n: swmLoaded ? psCount : "…", label: "Personal shopper", hint: "Cobrar, comprar o mandar", go: "ps", cls: "pink" },
      { n: restockCount == null ? "…" : restockCount, label: "Avisos de restock", hint: "Clientas esperando", go: "restock" },
      { n: pvApartadosLigeros ? pvResumen().activos : "…", label: "Apartados de preventa", hint: pvApartadosLigeros && pvResumen().revisar ? `${pvResumen().revisar} comprobante(s) por revisar` : "Sephora Sale", go: "preventa", cls: "hot" },
    ];
    // Lo que tiene pendientes va primero; lo que está en 0 queda chiquito al final.
    cards.sort((a, b) => (Number(b.n) > 0) - (Number(a.n) > 0));
    // En celular van de dos en dos: si las que tienen pendientes son impares,
    // la última ocupa todo el ancho para no estirar una tarjeta en 0 a su lado.
    const hot = cards.filter((c) => Number(c.n) > 0);
    if (hot.length % 2) hot[hot.length - 1].wide = true;
    todoEl.innerHTML = cards
      .map((c) => `<button type="button" class="todo-card ${c.n ? c.cls || "" : "zero"}${c.wide ? " wide" : ""}" data-home-go="${c.go}">
        <span class="n">${c.n}</span><span>${c.label}</span><span class="hint">${c.hint} ›</span></button>`)
      .join("");

    // Ventas (pedidos pagados, por fecha del pedido)
    const paid = paidOrders();
    const todayKey = dayKey(now);
    const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 6); weekAgo.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    let today = 0, week = 0, month = 0, nToday = 0, nWeek = 0, nMonth = 0;
    const byDay = new Map();
    paid.forEach((o) => {
      if (!o.createdAt) return;
      const d = new Date(o.createdAt);
      const t = o.grandTotal || 0;
      const k = dayKey(d);
      byDay.set(k, (byDay.get(k) || 0) + t);
      if (k === todayKey) { today += t; nToday++; }
      if (d >= weekAgo) { week += t; nWeek++; }
      if (d >= monthStart) { month += t; nMonth++; }
    });
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i);
      days.push({ d, v: byDay.get(dayKey(d)) || 0 });
    }
    const max = Math.max(1, ...days.map((x) => x.v));
    const plural = (n) => `${n} pedido${n === 1 ? "" : "s"}`;
    document.getElementById("home-sales").innerHTML = `
      <h2>💰 Ventas (pedidos pagados)</h2>
      <div class="sales-row">
        <div><span>Hoy</span><b>${formatPrice(today)}</b><span>${plural(nToday)}</span></div>
        <div><span>Últimos 7 días</span><b>${formatPrice(week)}</b><span>${plural(nWeek)}</span></div>
        <div><span>Este mes</span><b>${formatPrice(month)}</b><span>${plural(nMonth)}</span></div>
      </div>
      <div class="bars" role="img" aria-label="Ventas por día de los últimos 14 días">
        ${days.map((x, i) => `<div class="bar${i === days.length - 1 ? " today" : ""}" title="${x.d.toLocaleDateString("es-MX", { day: "numeric", month: "short" })}: ${formatPrice(x.v)}">
          <i style="height:${Math.round((x.v / max) * 100)}%"></i><small>${x.d.getDate()}</small></div>`).join("")}
      </div>`;

    renderHomeProfit(paid, now);
    renderHomeReport(paid, now);

    // Lo más vendido del mes (piezas)
    const tops = new Map();
    paid.filter((o) => o.createdAt && new Date(o.createdAt) >= monthStart).forEach((o) => {
      (o.items || []).forEach((it) => {
        const key = `${itemMarca(it)}||${it.nombre}`;
        tops.set(key, (tops.get(key) || 0) + (it.qty || 0));
      });
    });
    const top = [...tops.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    document.getElementById("home-top").innerHTML = `<h2>⭐ Lo más vendido este mes</h2>${
      top.length
        ? `<ul class="top-list">${top.map(([k, q]) => {
            const [marca, nombre] = k.split("||");
            return `<li><span>${marca ? `<strong>${escapeHtml(marca)}</strong> — ` : ""}${escapeHtml(nombre)}</span><b>${q} pzs</b></li>`;
          }).join("")}</ul>`
        : `<p style="margin:0;color:#5f5866;">Todavía no hay ventas este mes.</p>`
    }`;
  }

  function syncOrdersKindUi(tipo) {
    const abwTabs = bucketTabsEl.querySelectorAll('[data-bucket="por_abw"], [data-bucket="esperando_abw"]');
    abwTabs.forEach((b) => { b.style.display = tipo === "stock" ? "none" : ""; });
    if (tipo === "stock" && (currentBucket === "por_abw" || currentBucket === "esperando_abw")) { currentBucket = ""; syncFilterTabs(); }
    let note = document.getElementById("orders-note");
    if (!note) return;
    const partes = [];
    if (pedidosTodos) partes.push(`<div style="margin-bottom:8px;">👀 Estás viendo los pedidos de <b>Stock y Corea juntos</b>. <button type="button" class="btn-secondary" data-ordkind="pedidos" style="padding:4px 10px;font-size:12px;">Solo Stock</button> <button type="button" class="btn-secondary" data-ordkind="corea" style="padding:4px 10px;font-size:12px;">Solo Corea</button></div>`);
    if (currentBucket === "por_enviar") partes.push(`<div>💡 ¿Varios pedidos de la misma clienta? En <b>Por mandar</b> salen agrupados por clienta: palomeas los pedidos que van juntos y haces la guía de una vez. <button type="button" class="btn-primary" data-ordgo="pm" style="padding:6px 12px;font-size:13px;">📦 Ir a Por mandar</button></div>`);
    note.style.display = partes.length ? "block" : "none";
    note.innerHTML = partes.join("");
  }
  document.addEventListener("click", (e) => {
    const k = e.target.closest("[data-ordkind]");
    if (k) { pedidosTodosNext = false; showView(k.dataset.ordkind); return; }
    const g = e.target.closest("[data-ordgo]");
    if (g) showView(g.dataset.ordgo);
  });

  function goToOrders(filter) {
    // Corea para lo de ABW; lo que mezcla las dos (por enviar, enviados…) se ve junto.
    let vista = "pedidos";
    pedidosTodosNext = false;
    if (filter === "pending") {
      const p = allOrders.find((o) => o.status === "pending");
      vista = p && pedidoTipo(p) === "corea" ? "corea" : "pedidos";
    } else if (filter === "por_abw" || filter === "esperando_abw") vista = "corea";
    else pedidosTodosNext = true;
    showView(vista);
    resetTabs();
    currentBucket = "";
    if (filter === "pending") {
      currentStatus = "pending";
    } else if (BUCKETS[filter]) {
      currentBucket = filter;
    }
    syncFilterTabs();
    applyFilters();
  }

  function syncFilterTabs() {
    statusTabsEl.querySelectorAll(".tab").forEach((b) => {
      const on = b.dataset.status === currentStatus;
      b.classList.toggle("active", on);
      b.style.background = on ? (STATUS_TAB_COLORS[b.dataset.status] || "#e07a8f") : "";
      b.style.color = on ? "#fff" : "";
    });
    bucketTabsEl.querySelectorAll(".tab").forEach((b) => {
      const on = b.dataset.bucket === currentBucket;
      b.classList.toggle("active", on);
      b.style.background = on ? "#e07a8f" : "";
      b.style.color = on ? "#fff" : "";
    });
    syncTabPressed(statusTabsEl);
    syncTabPressed(bucketTabsEl);
  }

  /* ---------- Compras ABW (lista consolidada) ---------- */
  function abwOrders() {
    const all = allOrders.filter((o) => orderBucket(o) === "por_abw");
    return abwFiltro === "compartido" ? all.filter((o) => o.pedidoCompartido) : all;
  }

  function abwSelectedItems() {
    const map = new Map();
    abwOrders().filter((o) => !abwExcluded.has(o.id)).forEach((o) => {
      supplierSourceableItems(o).forEach((it) => {
        const marca = itemMarca(it);
        const key = it.sku || `${marca}||${it.nombre}`;
        const cur = map.get(key) || { marca, nombre: it.nombre, sku: it.sku || "", qty: 0, who: [] };
        cur.qty += it.qty || 0;
        cur.who.push(`${firstName(o) || "?"} ×${it.qty}`);
        map.set(key, cur);
      });
    });
    return [...map.values()].sort((a, b) => (a.marca || "").localeCompare(b.marca || "", "es") || a.nombre.localeCompare(b.nombre, "es"));
  }

  function renderAbw() {
    const nCompartido = allOrders.filter((o) => orderBucket(o) === "por_abw" && o.pedidoCompartido).length;
    if (!nCompartido) abwFiltro = "todos";
    const filtro = document.getElementById("abw-filtro");
    filtro.style.display = nCompartido ? "flex" : "none";
    const chip = (k, t) => `<button type="button" data-abw-filtro="${k}" class="${abwFiltro === k ? "btn-primary" : "btn-secondary"}" style="padding:8px 14px;font-size:14px;">${t}</button>`;
    filtro.innerHTML = nCompartido ? chip("todos", "Todos") + chip("compartido", `👯 Solo pedido compartido (${nCompartido})`) : "";
    const orders = abwOrders();
    const has = orders.length > 0;
    document.getElementById("abw-empty").style.display = has ? "none" : "block";
    document.getElementById("abw-actions").style.display = has ? "flex" : "none";
    document.getElementById("abw-orders").innerHTML = orders
      .map((o) => {
        const n = supplierSourceableItems(o).reduce((s, it) => s + (it.qty || 0), 0);
        return `<label class="abw-order"><input type="checkbox" data-abw-order="${o.id}" ${abwExcluded.has(o.id) ? "" : "checked"} />
          <span class="who"><b>${escapeHtml((o.customer && o.customer.name) || "(sin nombre)")}</b>
          <small>#${orderNumber(o)} · ${formatFecha(o.createdAt)} · ${n} pieza${n === 1 ? "" : "s"} por pedir${o.pedidoCompartido ? ` · 👯 compartido${o.cupon ? ` (${escapeHtml(o.cupon)})` : ""}` : ""}</small></span></label>`;
      })
      .join("");
    const items = abwSelectedItems();
    const total = items.reduce((s, x) => s + x.qty, 0);
    document.getElementById("abw-items").innerHTML = items.length
      ? `<h2 class="section-title" style="margin:6px 0 8px;">🧺 ${total} pieza${total === 1 ? "" : "s"} · ${items.length} producto${items.length === 1 ? "" : "s"}</h2>
         <table class="abw-items"><tbody>${items
           .map((x) => `<tr><td>${x.marca ? `<strong>${escapeHtml(x.marca)}</strong> — ` : ""}${escapeHtml(x.nombre)}
             <small>${escapeHtml(x.who.join(", "))}${x.sku ? ` · SKU ${escapeHtml(x.sku)}` : ""}</small></td><td class="q">×${x.qty}</td></tr>`)
           .join("")}</tbody></table>`
      : (has ? `<p class="abw-intro">Selecciona al menos un pedido.</p>` : "");
    const btn = document.getElementById("abw-mark-done");
    const sel = orders.filter((o) => !abwExcluded.has(o.id)).length;
    btn.textContent = `✅ Ya los pedí a ABW (${sel} pedido${sel === 1 ? "" : "s"})`;
    btn.disabled = !sel;
  }

  function abwListText() {
    return abwSelectedItems().map((x) => `${x.marca ? x.marca + " - " : ""}${x.nombre} x${x.qty}`).join("\n");
  }

  function abwPromptText() {
    const fake = { items: abwSelectedItems().map((x) => ({ nombre: x.nombre, marca: x.marca, qty: x.qty, sku: x.sku })) };
    return buildSupplierPrompt(fake);
  }

  function copyText(text, btn) {
    const done = () => {
      const original = btn.textContent;
      btn.textContent = "✅ ¡Copiado!";
      setTimeout(() => { btn.textContent = original; }, 1500);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => setStatus("No se pudo copiar."));
    } else {
      setStatus("No se pudo copiar.");
    }
  }


  /* ---------- Ganancia estimada ---------- */
  // Costo de una pieza, de más a menos exacto:
  //  1. Pedidos nuevos: el "Precio USD" guardado en el pedido ese día ×
  //     el tipo de cambio de ese día, más el arancel.
  //  2. Productos del catálogo en pedidos viejos: su precio de ese día
  //     sin la comisión (la fórmula de "Precio" del Sheet es costo ×
  //     (1 + comisión) × (1 + arancel), y la comisión es tu ganancia).
  //  3. Stock MX: el "Precio USD" ACTUAL del mismo SKU en el catálogo.
  // Los de Stock MX con SKU propio (STOCK-...) no tienen costo en el Sheet.
  function itemUnitCost(it, o) {
    const c = pricingConfig;
    const aran = 1 + (c.arancelPct || 0) / 100;
    // Dólar del precio a la clienta (el del día del pedido) y dólar del
    // costo (el que de verdad pagas, si lo pusiste en Config).
    const saleRate = (o && o.exchangeRate) || c.exchangeRate;
    const rate = c.costRate || saleRate;
    if (it.costoUSD > 0 && rate > 0) return it.costoUSD * rate * aran;
    if (!it.enStock && it.precioBase > 0 && c.comisionPct > 0) {
      return (it.precioBase / (1 + c.comisionPct / 100)) * (c.costRate && saleRate ? c.costRate / saleRate : 1);
    }
    const info = skuToInfo.get(it.sku) || {};
    if (info.costoUSD > 0 && (c.costRate || c.exchangeRate) > 0) return info.costoUSD * (c.costRate || c.exchangeRate) * aran;
    if (info.costoMXN > 0) return info.costoMXN * aran;
    return null;
  }

  /* Ventas de productos (a precio de transferencia: la comisión de
     tarjeta se va en Mercado Pago, y los envíos los paga la clienta)
     menos el costo de lo que sí tiene costo. */
  function orderProfit(o) {
    let sales = 0, cost = 0, missing = 0, salesNoCost = 0;
    (o.items || []).forEach((it) => {
      const qty = it.qty || 0;
      const venta = itemPrecioTransferencia(it) * qty;
      sales += venta;
      const c = itemUnitCost(it, o);
      if (c == null) { missing += qty; salesNoCost += venta; } else cost += c * qty;
    });
    const known = sales - salesNoCost;
    return { sales, known, cost, profit: known - cost, missing, salesNoCost };
  }

  function profitHTML(o) {
    if (o.status === "cancelled" || o.status === "failed" || !pricingConfig.exchangeRate || !skuToInfo.size) return "";
    const p = orderProfit(o);
    if (!p.known) return "";
    // % sobre el costo (como se pone la comisión), no sobre lo cobrado.
    const pct = p.cost ? Math.round((p.profit / p.cost) * 100) : 0;
    return `<div class="profit-box">💵 Ganancia estimada: <b>${formatPrice(p.profit)}</b> (${pct}% sobre costo)<br/>
      <small>Productos ${formatPrice(p.known)} − costo ABW ${formatPrice(p.cost)}${p.missing ? ` · ${p.missing} pieza${p.missing === 1 ? "" : "s"} de Stock MX sin costo en el Sheet (no incluida${p.missing === 1 ? "" : "s"})` : ""}</small></div>`;
  }

  /* ---------- Reporte de ventas ----------
     Lo que más se vende, ticket promedio y clientas que regresan, para
     decidir qué tener en Stock MX. Solo pedidos pagados; "Productos" es
     lo que pagaron por productos (sin envío). */
  let reportPeriod = "mes";
  const REPORT_PERIODS = [["mes", "Este mes"], ["3m", "Últimos 3 meses"], ["anio", "Este año"], ["todo", "Todo"]];

  function renderHomeReport(paid, now) {
    const el = document.getElementById("home-report");
    if (!el) return;
    const from = reportPeriod === "mes" ? new Date(now.getFullYear(), now.getMonth(), 1)
      : reportPeriod === "3m" ? new Date(now.getFullYear(), now.getMonth() - 2, 1)
      : reportPeriod === "anio" ? new Date(now.getFullYear(), 0, 1) : null;
    const inRange = paid.filter((o) => o.createdAt && (!from || new Date(o.createdAt) >= from));
    const lineTotal = (it) => (Number(it.precio) || 0) * (Number(it.qty) || 0);
    let total = 0, prods = 0, piezas = 0, stockMX = 0;
    const byProd = new Map(), byBrand = new Map(), byClient = new Map();
    inRange.forEach((o) => {
      total += o.grandTotal || 0;
      const k = clientKey(o);
      byClient.set(k, (byClient.get(k) || 0) + (o.grandTotal || 0));
      (o.items || []).forEach((it) => {
        const v = lineTotal(it), q = Number(it.qty) || 0, marca = itemMarca(it) || "Sin marca";
        prods += v; piezas += q;
        if (it.enStock) stockMX += v;
        // Sin distinguir mayúsculas ("Bath & body works" = "Bath & Body Works").
        const pk = `${marca}||${it.nombre}`.toLowerCase();
        const pr = byProd.get(pk) || { q: 0, v: 0, label: `${marca}||${it.nombre}` }; pr.q += q; pr.v += v; byProd.set(pk, pr);
        const bk = marca.toLowerCase();
        const br = byBrand.get(bk) || { q: 0, v: 0, label: marca }; br.q += q; br.v += v; byBrand.set(bk, br);
      });
    });
    // Recurrentes: clientas con 2 o más pedidos pagados en todo el historial.
    const allCount = new Map();
    paid.forEach((o) => { const k = clientKey(o); allCount.set(k, (allCount.get(k) || 0) + 1); });
    const clients = [...byClient.keys()];
    const repeat = clients.filter((k) => (allCount.get(k) || 0) >= 2);
    const repeatSales = repeat.reduce((t, k) => t + byClient.get(k), 0);
    const n = inRange.length;
    const top = (m) => [...m.entries()].sort((a, b) => b[1].v - a[1].v).slice(0, 10);
    const list = (rows, label) => rows.length
      ? `<ul class="top-list">${rows.map(([, x]) => `<li><span>${label(x.label)}</span><b>${formatPrice(x.v)} · ${x.q} pzs</b></li>`).join("")}</ul>`
      : `<p style="margin:0;color:#5f5866;">Sin ventas en este periodo.</p>`;
    // Por mes (12 meses)
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString("es-MX", { month: "short", year: "2-digit" }), n: 0, v: 0, c: new Set() });
    }
    const mk = new Map(months.map((m) => [m.key, m]));
    paid.forEach((o) => {
      if (!o.createdAt) return;
      const d = new Date(o.createdAt);
      const m = mk.get(`${d.getFullYear()}-${d.getMonth()}`);
      if (m) { m.n++; m.v += o.grandTotal || 0; m.c.add(clientKey(o)); }
    });
    const mrows = months.slice().reverse().filter((m, i) => i === 0 || m.n);
    el.innerHTML = `<h2>📊 Reporte de ventas</h2>
      <div class="report-periods">${REPORT_PERIODS.map(([k, l]) => `<button type="button" data-report-period="${k}" class="${k === reportPeriod ? "on" : ""}">${l}</button>`).join("")}</div>
      <div class="report-kpis">
        <div><span>Vendido</span><b>${formatPrice(total)}</b><span>${n} pedido${n === 1 ? "" : "s"}</span></div>
        <div><span>Ticket promedio</span><b>${formatPrice(n ? total / n : 0)}</b><span>${piezas} piezas</span></div>
        <div><span>Clientas</span><b>${clients.length}</b><span>${repeat.length} regresan a comprar${clients.length ? ` (${Math.round((repeat.length / clients.length) * 100)}%)` : ""}</span></div>
        <div><span>Stock MX</span><b>${formatPrice(stockMX)}</b><span>${prods ? Math.round((stockMX / prods) * 100) : 0}% de los productos</span></div>
      </div>
      ${repeat.length ? `<p class="profit-note" style="margin-top:0;">Las clientas que regresan hicieron el ${total ? Math.round((repeatSales / total) * 100) : 0}% de lo vendido en este periodo.</p>` : ""}
      <div class="report-cols">
        <div><h3>⭐ Productos más vendidos</h3>${list(top(byProd), (k) => { const [marca, nombre] = k.split("||"); return `<strong>${escapeHtml(marca)}</strong> — ${escapeHtml(nombre)}`; })}</div>
        <div><h3>🏷️ Marcas más vendidas</h3>${list(top(byBrand), (k) => `<strong>${escapeHtml(k)}</strong>`)}</div>
      </div>
      <h3 style="font-size:15px;margin:16px 0 8px;">📅 Ventas por mes</h3>
      <table class="profit-table"><thead><tr><th>Mes</th><th>Pedidos</th><th>Clientas</th><th>Vendido</th><th>Ticket</th></tr></thead><tbody>
      ${mrows.map((m, i) => `<tr class="${i === 0 ? "now" : ""}"><td>${escapeHtml(m.label)}</td><td>${m.n}</td><td>${m.c.size}</td><td>${formatPrice(m.v)}</td><td>${formatPrice(m.n ? m.v / m.n : 0)}</td></tr>`).join("")}
      </tbody></table>
      <p class="profit-note">Solo pedidos pagados. "Vendido" incluye envíos; los productos y marcas cuentan solo el precio de los productos.</p>`;
    el.onclick = (e) => {
      const b = e.target.closest("[data-report-period]");
      if (!b) return;
      reportPeriod = b.dataset.reportPeriod;
      renderHomeReport(paidOrders(), new Date());
    };
  }

  function renderHomeProfit(paid, now) {
    const el = document.getElementById("home-profit");
    if (!el) return;
    if (!pricingConfig.exchangeRate || !skuToInfo.size) {
      el.innerHTML = `<h2>📈 Ganancia por mes</h2><p class="profit-note">Cargando costos del catálogo…</p>`;
      return;
    }
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString("es-MX", { month: "short", year: "2-digit" }), n: 0, sales: 0, known: 0, cost: 0, profit: 0, missingSales: 0 });
    }
    const byKey = new Map(months.map((m) => [m.key, m]));
    paid.forEach((o) => {
      if (!o.createdAt) return;
      const d = new Date(o.createdAt);
      const m = byKey.get(`${d.getFullYear()}-${d.getMonth()}`);
      if (!m) return;
      const p = orderProfit(o);
      m.n++; m.sales += p.sales; m.known += p.known; m.cost += p.cost; m.profit += p.profit; m.missingSales += p.salesNoCost;
    });
    const rows = months.slice().reverse().filter((m, i) => i === 0 || m.n);
    const anyMissing = months.some((m) => m.missingSales > 0);
    el.innerHTML = `<h2>📈 Ganancia por mes (estimada)</h2>
      <table class="profit-table"><thead><tr><th>Mes</th><th>Pedidos</th><th>Productos</th><th>Costo</th><th>Ganancia</th></tr></thead><tbody>
      ${rows.map((m, i) => `<tr class="${i === 0 ? "now" : ""}"><td>${escapeHtml(m.label)}</td><td>${m.n}</td><td>${formatPrice(m.sales)}</td><td>${formatPrice(m.cost)}</td>
        <td class="g">${formatPrice(m.profit)}${m.cost ? ` <small>(${Math.round((m.profit / m.cost) * 100)}% s/costo)</small>` : ""}</td></tr>`).join("")}
      </tbody></table>
      <p class="profit-note">Costo = Precio USD de ABW × ${pricingConfig.costRate ? `el dólar que pagas a ABW ($${pricingConfig.costRate})` : "tipo de cambio"} + arancel (${pricingConfig.arancelPct}%). ${pricingConfig.costRate ? `A tus clientas les cobras el dólar a $${pricingConfig.exchangeRate}, así que tu ganancia es tu comisión (${pricingConfig.comisionPct}%) más esa diferencia.` : `Tu ganancia es la comisión de Config (${pricingConfig.comisionPct}%). Pon "Dólar que pagas a ABW" en Ajustes para contar también la diferencia del dólar.`} No cuenta envíos (los paga la clienta) ni la comisión de tarjeta.${anyMissing ? " Los productos de Stock MX con SKU propio (STOCK-…) no tienen costo en el Sheet, así que su venta no entra en la ganancia." : ""}</p>`;
  }

  /* ---------- Clientas ---------- */
  let clientsSort = "recent";

  function clientKey(o) {
    const c = o.customer || {};
    const ph = (c.phone || "").replace(/\D/g, "").slice(-10);
    if (ph.length >= 8) return "t" + ph;
    if (c.email) return "e" + String(c.email).trim().toLowerCase();
    return "n" + normalizeForSearch(c.name || "?").trim();
  }

  function buildClients() {
    const map = new Map();
    allOrders
      .filter((o) => o.status === "paid" || o.status === "pending")
      .slice()
      .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""))
      .forEach((o) => {
        const c = o.customer || {};
        const k = clientKey(o);
        const cur = map.get(k) || { key: k, name: "", phone: "", email: "", city: "", paid: 0, pending: 0, spent: 0, profit: 0, firstAt: o.createdAt, lastAt: o.createdAt };
        cur.name = c.name || cur.name;
        cur.phone = c.phone || cur.phone;
        cur.email = c.email || cur.email;
        cur.city = [c.municipio, c.estado].filter(Boolean).join(", ") || cur.city;
        cur.lastAt = o.createdAt || cur.lastAt;
        if (o.status === "paid") {
          cur.paid++;
          cur.spent += o.grandTotal || 0;
          cur.profit += orderProfit(o).profit;
        } else cur.pending++;
        map.set(k, cur);
      });
    return [...map.values()];
  }

  function renderClients() {
    const listEl = document.getElementById("clients-list");
    if (!listEl) return;
    const all = buildClients();
    const buyers = all.filter((c) => c.paid > 0);
    const repeat = buyers.filter((c) => c.paid > 1).length;
    const spent = buyers.reduce((s, c) => s + c.spent, 0);
    const paidOrdersN = buyers.reduce((s, c) => s + c.paid, 0);
    document.getElementById("clients-summary").textContent = all.length
      ? `${buyers.length} clienta${buyers.length === 1 ? "" : "s"} con compra · ${repeat} volvi${repeat === 1 ? "ó" : "eron"} a comprar · ticket promedio ${formatPrice(paidOrdersN ? spent / paidOrdersN : 0)}`
      : "Todavía no hay clientas.";
    const q = normalizeForSearch(document.getElementById("clients-search").value).trim();
    let list = all;
    if (q) {
      const qd = q.replace(/\D/g, "");
      list = list.filter((c) =>
        normalizeForSearch(`${c.name} ${c.email} ${c.city}`).includes(q) || (qd.length >= 3 && (c.phone || "").replace(/\D/g, "").includes(qd)));
    }
    if (clientsSort === "spent") list.sort((a, b) => b.spent - a.spent || b.paid - a.paid);
    else if (clientsSort === "name") list.sort((a, b) => (a.name || "").localeCompare(b.name || "", "es"));
    else list.sort((a, b) => (b.lastAt || "").localeCompare(a.lastAt || ""));
    const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    listEl.innerHTML = list.slice(0, 300).map((c) => {
      const chips = [];
      if (c.paid >= 3) chips.push(`<span class="badge chip-vip">⭐ Frecuente</span>`);
      else if (c.paid === 1 && c.firstAt && new Date(c.firstAt).getTime() > monthAgo) chips.push(`<span class="badge chip-ship">🌱 Nueva</span>`);
      if (c.pending) chips.push(`<span class="badge status-pending">⏳ ${c.pending} por confirmar</span>`);
      const wa = waLinkFromPhone(c.phone);
      return `<div class="client-row">
        <div class="top"><span class="nm">${escapeHtml(c.name || "(sin nombre)")} ${chips.join(" ")}</span><span class="sp">${formatPrice(c.spent)}</span></div>
        <div class="meta">${c.paid} pedido${c.paid === 1 ? "" : "s"} pagado${c.paid === 1 ? "" : "s"} · último ${escapeHtml(formatFecha(c.lastAt))}${c.city ? ` · ${escapeHtml(c.city)}` : ""}${c.paid && c.profit > 0 ? ` · ganancia ≈ ${formatPrice(c.profit)}` : ""}</div>
        <div class="acts">
          ${wa ? `<a class="wa" href="${escapeHtml(wa)}" target="_blank" rel="noopener">💬 WhatsApp</a>` : ""}
          ${c.phone ? `<a class="btn-secondary" href="tel:${escapeAttr(c.phone)}">📞 ${escapeHtml(c.phone)}</a>` : ""}
          <button type="button" class="btn-secondary" data-client-orders="${escapeHtml(c.phone || c.name || "")}">🧾 Ver sus pedidos</button>
        </div></div>`;
    }).join("") || `<p class="abw-intro">No encontré a nadie con esa búsqueda.</p>`;
  }

  /* ---------- Catálogo (editor) ---------- */
  let catalogFilter = "";
  let catalogEditing = null; // { sku, fields, row }

  function renderCatalogList() {
    const listEl = document.getElementById("catalog-list");
    const countEl = document.getElementById("catalog-count");
    if (!catalogRows.length) {
      countEl.textContent = "Cargando catálogo…";
      listEl.innerHTML = "";
      return;
    }
    const words = normalizeForSearch(document.getElementById("catalog-search").value).split(/\s+/).filter(Boolean);
    let list = catalogRows;
    if (catalogFilter) list = list.filter((r) => dispDe(r.disponible) === catalogFilter);
    if (words.length) {
      list = list.filter((r) => {
        const hay = normalizeForSearch(`${r.marca} ${r.nombre} ${r.sku} ${r.presentacion}`);
        return words.every((w) => hay.includes(w));
      });
    }
    const shown = list.slice(0, 60);
    countEl.textContent = words.length || catalogFilter
      ? `${list.length} producto${list.length === 1 ? "" : "s"}${list.length > shown.length ? ` · mostrando ${shown.length}, escribe más para afinar` : ""}`
      : `${catalogRows.length} productos en el catálogo. Escribe para buscar.`;
    listEl.innerHTML = (words.length || catalogFilter ? shown : []).map((r) => `
      <button type="button" class="cat-row" data-cat-sku="${escapeHtml(r.sku)}">
        ${r.imagen ? `<img src="${escapeHtml(catalogImgSrc(r.imagen))}" alt="" loading="lazy" />` : `<img alt="" />`}
        <span class="info"><b>${escapeHtml(r.nombre)}</b><small>${r.marca ? `${escapeHtml(r.marca)} · ` : ""}${r.presentacion ? `${escapeHtml(r.presentacion)} · ` : ""}SKU ${escapeHtml(r.sku)}</small></span>
        <span class="pr">${formatPrice(r.precio)}<small class="${r.disponible === "NO" || r.disponible === "OCULTO" ? "no" : "si"}">${r.disponible === "NO" ? "⛔ No disponible" : r.disponible === "OCULTO" ? "🙈 Oculto" : r.disponible === "PREORDEN" ? "⏳ Preorden" : "✅ Disponible"}</small></span>
      </button>`).join("");
  }

  function catalogImgSrc(src) {
    if (!src) return "";
    if (/^https?:\/\//.test(src)) return src;
    return "/" + src.replace(/^\/+/, "");
  }

  function estimatePrices(usd) {
    const c = pricingConfig;
    if (!(usd > 0) || !c.exchangeRate) return null;
    const precio = Math.ceil(usd * c.exchangeRate * (1 + c.comisionPct / 100) * (1 + c.arancelPct / 100));
    const tarjeta = cardSurchargePct != null ? Math.ceil(precio * (1 + cardSurchargePct / 100)) : null;
    return { precio, tarjeta };
  }

  const CAT_TEXT_FIELDS = [
    ["Nombre", "Nombre"], ["Marca", "Marca"], ["Categoria", "Categoría"], ["Presentacion", "Presentación"],
    ["Capacidad", "Capacidad"], ["Peso", "Peso (kg)"], ["Imagen", "Foto (ruta o link)"], ["Destacado", "Destacado"],
  ];

  async function openCatalogEditor(sku) {
    const wrap = document.getElementById("catalog-editor");
    wrap.style.display = "flex";
    wrap.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="Editar producto"><p>Cargando producto…</p></div>`;
    try {
      const res = await fetch(`/.netlify/functions/admin-catalog?sku=${encodeURIComponent(sku)}`, { headers: { "x-admin-key": adminKey } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo cargar el producto.");
      catalogEditing = { sku, fields: data.fields };
      renderCatalogEditor();
    } catch (err) {
      wrap.innerHTML = `<div class="sheet"><p class="guide-error" style="display:block;">${escapeHtml(err.message)}</p><button type="button" class="btn-secondary" data-cat-close>Cerrar ✕</button></div>`;
    }
  }

  // Disponible en el Sheet: SI, NO, PREORDEN (ABW lo surte en ~21 días) u
  // OCULTO (ya no existe en ABW; no sale en la tienda).
  const dispDe = (x) => { const u = String(x || "SI").toUpperCase(); return ["NO", "PREORDEN", "OCULTO"].includes(u) ? u : "SI"; };

  function renderCatalogEditor(msg) {
    const wrap = document.getElementById("catalog-editor");
    const f = catalogEditing.fields;
    const v = (k) => (f[k] ? String(f[k].value ?? "") : "");
    const has = (k) => Boolean(f[k]);
    const disp = dispDe(v("Disponible"));
    const usd = v("Precio USD");
    const priceInputs = ["Precio", "Precio Tarjeta"].filter((k) => has(k) && !f[k].formula);
    wrap.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="Editar producto">
      <div class="head">${v("Imagen") ? `<img src="${escapeHtml(catalogImgSrc(v("Imagen")))}" alt="" />` : ""}
        <div><h2>${escapeHtml(v("Nombre"))}</h2><small style="color:#5f5866;">${escapeHtml(v("Marca"))} · SKU ${escapeHtml(catalogEditing.sku)}</small></div></div>
      <div><span class="filters-label" style="font-size:13px;">¿Disponible en la tienda?</span>
        <div class="switch" id="cat-disp" data-value="${disp}">
          <button type="button" data-disp="SI" class="${disp === "SI" ? "on-si" : ""}">✅ Sí</button>
          <button type="button" data-disp="PREORDEN" class="${disp === "PREORDEN" ? "on-pre" : ""}">⏳ Preorden</button>
          <button type="button" data-disp="NO" class="${disp === "NO" ? "on-no" : ""}">⛔ No</button>
          <button type="button" data-disp="OCULTO" class="${disp === "OCULTO" ? "on-no" : ""}" title="Ya no existe: no sale en la tienda">🙈 Ocultar</button></div></div>
      ${has("Precio USD") ? `<input aria-label="Precio USD (costo en ABW)" type="number" step="0.01" min="0" data-cat-field="Precio USD" value="${escapeHtml(normalizeMoneyText(usd))}" />` : ""}
      <div class="calc" id="cat-calc">Precio en la tienda ahora: <b>${escapeHtml(v("Precio"))}</b> transferencia · <b>${escapeHtml(v("Precio Tarjeta"))}</b> tarjeta</div>
      ${priceInputs.map((k) => `<input aria-label="${escapeHtml(k)} (MXN)" type="number" step="1" min="0" data-cat-field="${escapeHtml(k)}" value="${escapeHtml(normalizeMoneyText(v(k)))}" />`).join("")}
      <div class="row" style="display:flex;flex-wrap:wrap;gap:8px;">
        ${CAT_TEXT_FIELDS.filter(([k]) => has(k)).map(([k, label]) => `<input aria-label="${escapeHtml(label)}" type="${k === "Peso" ? "number" : "text"}" ${k === "Peso" ? 'step="0.001" min="0"' : ""} data-cat-field="${escapeHtml(k)}" value="${escapeHtml(k === "Peso" ? normalizeMoneyText(v(k)) : v(k))}" style="flex:1 1 ${k === "Nombre" || k === "Imagen" ? "100%" : "140px"};" />`).join("")}
      </div>
      ${has("Descripcion") ? `<textarea aria-label="Descripción" rows="3" data-cat-field="Descripcion">${escapeHtml(v("Descripcion"))}</textarea>` : ""}
      <div class="guide-error" id="cat-error"></div>
      ${msg ? `<p style="color:#17803d;font-weight:700;margin:0;">${escapeHtml(msg)}</p>` : ""}
      <div class="filters-row">
        <button type="button" class="btn-primary" id="cat-save">Guardar cambios</button>
        <button type="button" class="btn-secondary" data-cat-close>Cerrar ✕</button>
      </div></div>`;
    addVisibleLabels(wrap);
    updateCatalogEstimate();
  }

  function updateCatalogEstimate() {
    const el = document.getElementById("cat-calc");
    const inp = document.querySelector('#catalog-editor [data-cat-field="Precio USD"]');
    if (!el || !inp || !catalogEditing) return;
    const orig = parseFloat(normalizeMoneyText(catalogEditing.fields["Precio USD"].value)) || 0;
    const now = parseFloat(inp.value) || 0;
    if (Math.abs(now - orig) < 0.001 || !catalogEditing.fields.Precio || !catalogEditing.fields.Precio.formula) {
      el.innerHTML = `Precio en la tienda ahora: <b>${escapeHtml(catalogEditing.fields.Precio ? catalogEditing.fields.Precio.value : "")}</b> transferencia · <b>${escapeHtml(catalogEditing.fields["Precio Tarjeta"] ? catalogEditing.fields["Precio Tarjeta"].value : "")}</b> tarjeta`;
      return;
    }
    const est = estimatePrices(now);
    el.innerHTML = est
      ? `Con ese costo quedaría en ≈ <b>${formatPrice(est.precio)}</b> transferencia${est.tarjeta ? ` · <b>${formatPrice(est.tarjeta)}</b> tarjeta` : ""} <small>(se calcula en el Sheet al guardar)</small>`
      : "El precio en pesos se recalcula en el Sheet al guardar.";
  }

  async function saveCatalogEditor() {
    const wrap = document.getElementById("catalog-editor");
    const errEl = document.getElementById("cat-error");
    const f = catalogEditing.fields;
    const changes = {};
    wrap.querySelectorAll("[data-cat-field]").forEach((el) => {
      const k = el.dataset.catField;
      const before = f[k] ? String(f[k].value ?? "") : "";
      const after = el.value.trim();
      if (el.type === "number") {
        const a = after === "" ? null : Number(after);
        const b = before.trim() === "" ? null : Number(normalizeMoneyText(before));
        if (a !== b && !(a != null && b != null && Math.abs(a - b) < 0.0005)) changes[k] = after === "" ? "" : a;
      } else if (after !== before.trim()) changes[k] = after;
    });
    const disp = document.getElementById("cat-disp").dataset.value;
    if (disp !== dispDe(f.Disponible && f.Disponible.value)) changes.Disponible = disp;
    if (!Object.keys(changes).length) {
      errEl.textContent = "No cambiaste nada.";
      errEl.style.display = "block";
      return;
    }
    const btn = document.getElementById("cat-save");
    btn.disabled = true;
    btn.textContent = "Guardando…";
    try {
      const res = await fetch("/.netlify/functions/admin-catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ sku: catalogEditing.sku, fields: changes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar.");
      catalogEditing.fields = data.fields;
      const row = catalogRows.find((r) => r.sku === catalogEditing.sku);
      if (row) {
        const nv = (k) => (data.fields[k] ? String(data.fields[k].value ?? "") : "");
        row.nombre = nv("Nombre") || row.nombre;
        row.marca = nv("Marca");
        row.precio = parseFloat(normalizeMoneyText(nv("Precio"))) || row.precio;
        row.precioUSD = parseFloat(normalizeMoneyText(nv("Precio USD"))) || row.precioUSD;
        row.disponible = (nv("Disponible") || "SI").toUpperCase();
        row.imagen = nv("Imagen");
        row.presentacion = nv("Presentacion");
        const info = skuToInfo.get(row.sku);
        if (info) { info.costoUSD = row.precioUSD; info.precio = row.precio; }
      }
      renderCatalogList();
      renderCatalogEditor("✅ Guardado en tu Sheet. La tienda lo mostrará en unos 5 minutos.");
    } catch (err) {
      errEl.textContent = err.message;
      errEl.style.display = "block";
      btn.disabled = false;
      btn.textContent = "Guardar cambios";
    }
  }

  function closeCatalogEditor() {
    const wrap = document.getElementById("catalog-editor");
    wrap.style.display = "none";
    wrap.innerHTML = "";
    catalogEditing = null;
  }

  /* ---------- Ajustes (pestaña Config) ---------- */
  let settingsData = [];

  async function loadSettings() {
    const listEl = document.getElementById("settings-list");
    const errEl = document.getElementById("settings-error");
    errEl.style.display = "none";
    listEl.innerHTML = `<p class="abw-intro">Cargando…</p>`;
    try {
      const res = await fetch("/.netlify/functions/admin-catalog?config=1", { headers: { "x-admin-key": adminKey } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudieron cargar los ajustes.");
      settingsData = data.config || [];
      renderSettings();
    } catch (err) {
      listEl.innerHTML = "";
      errEl.textContent = err.message;
      errEl.style.display = "block";
    }
  }

  function renderSettings(msg) {
    const listEl = document.getElementById("settings-list");
    listEl.innerHTML = settingsData.map((c, i) => `
      <label class="set-row"><span>${escapeHtml(c.key)}${c.formula ? ' <small style="color:#5f5866;font-weight:500;">(fórmula, cámbiala en el Sheet)</small>' : ""}${c.key === "Dólar que pagas a ABW" ? ' <small style="color:#5f5866;font-weight:500;">(solo para calcular tu ganancia; no cambia precios)</small>' : ""}</span>
        <input type="number" step="0.01" min="0" data-set-idx="${i}" value="${escapeHtml(normalizeMoneyText(c.value))}" ${c.formula ? "disabled" : ""} /></label>`).join("")
      + (msg ? `<p style="color:#17803d;font-weight:700;margin:0;">${escapeHtml(msg)}</p>` : "");
    document.getElementById("settings-save").style.display = settingsData.length ? "inline-flex" : "none";
  }

  async function saveSettings() {
    const errEl = document.getElementById("settings-error");
    errEl.style.display = "none";
    const changes = [];
    document.querySelectorAll("#settings-list [data-set-idx]").forEach((el) => {
      const c = settingsData[Number(el.dataset.setIdx)];
      if (!c || c.formula) return;
      const before = parseFloat(normalizeMoneyText(c.value));
      const after = parseFloat(el.value);
      if (el.value.trim() !== "" && !(Math.abs(after - before) < 0.00001)) changes.push({ key: c.key, value: after });
    });
    if (!changes.length) { errEl.textContent = "No cambiaste nada."; errEl.style.display = "block"; return; }
    const resumen = changes.map((c) => `• ${c.key}: ${c.value}`).join("\n");
    if (!window.confirm(`¿Guardar estos ajustes? Los precios de la tienda se recalculan solos.\n\n${resumen}`)) return;
    const btn = document.getElementById("settings-save");
    btn.disabled = true;
    try {
      const res = await fetch("/.netlify/functions/admin-catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ config: changes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudieron guardar los ajustes.");
      settingsData = data.config || settingsData;
      renderSettings("✅ Guardado. La tienda mostrará los precios nuevos en unos 5 minutos.");
      loadCardSurchargePct();
    } catch (err) {
      errEl.textContent = err.message;
      errEl.style.display = "block";
    } finally {
      btn.disabled = false;
    }
  }

  /* ---------- Papelera ---------- */
  let trashLoaded = false;
  let trashOrders = [];

  /* ---------- Revisión ABW ----------
     Claude sube por marca lo que cambió en ABW (admin-abw-revision); aquí
     Mae lo aplica al Sheet (admin-append-catalog-rows con "updates") o lo
     ignora. */
  let revisionData = { marcas: {} };
  let revisionTab = "";
  const REV_TIPOS = {
    sube: "💲 Subió de precio",
    baja: "💲 Bajó de precio",
    agotado: "⛔ Se agotó",
    disponible: "✅ Volvió a haber",
    no_existe: "❓ Ya no está en ABW (se oculta)",
    preorden: "⏳ Pasa a preorden (21 días)",
  };
  const revKind = (c) => (c.tipo === "precio" ? ((c.despues.usd || 0) > (c.antes.usd || 0) ? "sube" : "baja") : c.tipo);
  const revKey = (marca, c) => `${marca}|${c.sku}|${c.tipo}`;

  async function loadRevision() {
    const listEl = document.getElementById("revision-list");
    listEl.innerHTML = `<p class="abw-intro">Cargando…</p>`;
    try {
      const res = await fetch("/.netlify/functions/admin-abw-revision", { headers: { "x-admin-key": adminKey }, cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo cargar la revisión.");
      revisionData = data;
      renderRevision();
    } catch (err) {
      listEl.innerHTML = `<p class="guide-error" style="display:block;">${escapeHtml(err.message)}</p>`;
    }
  }

  function revisionChanges() {
    const out = [];
    Object.entries(revisionData.marcas || {}).forEach(([marca, m]) => (m.cambios || []).forEach((c) => out.push({ marca, c, kind: revKind(c) })));
    return out;
  }

  function updateRevisionBadge() {
    const n = revisionChanges().length;
    const b = document.getElementById("revision-badge");
    if (b) { b.textContent = n; b.style.display = n ? "" : "none"; }
  }

  function renderRevision() {
    const all = revisionChanges();
    const marcas = Object.entries(revisionData.marcas || {});
    const counts = {};
    all.forEach((x) => { counts[x.kind] = (counts[x.kind] || 0) + 1; });
    const last = revisionData.updatedAt ? formatFecha(revisionData.updatedAt) : "";
    document.getElementById("revision-summary").innerHTML = marcas.length
      ? `<p class="abw-intro" style="margin-top:0;">${marcas.length} marca${marcas.length === 1 ? "" : "s"} revisada${marcas.length === 1 ? "" : "s"}${last ? ` · última actualización ${escapeHtml(last)}` : ""} · <b>${all.length} cambio${all.length === 1 ? "" : "s"} por revisar</b></p>`
      : `<p class="abw-intro" style="margin-top:0;">Todavía no hay ninguna revisión. Pídele a Claude "revisa precios en ABW".</p>`;
    document.getElementById("revision-tabs").innerHTML = all.length
      ? [["", `Todos (${all.length})`], ...Object.entries(REV_TIPOS).filter(([k]) => counts[k]).map(([k, l]) => [k, `${l} (${counts[k]})`])]
          .map(([k, l]) => `<button type="button" class="tab${k === revisionTab ? " active" : ""}" aria-pressed="${k === revisionTab}" data-rev-tab="${k}">${l}</button>`).join("")
      : "";
    const shown = all.filter((x) => !revisionTab || x.kind === revisionTab);
    const usd = (v) => (v == null ? "—" : `US$${Number(v).toFixed(2)}`);
    const byBrand = new Map();
    shown.forEach((x) => byBrand.set(x.marca, [...(byBrand.get(x.marca) || []), x]));
    document.getElementById("revision-list").innerHTML = [...byBrand.entries()].map(([marca, rows]) => {
      const m = revisionData.marcas[marca] || {};
      return `<h3 class="rev-brand"><span>${escapeHtml(marca)}</span><small>revisada ${escapeHtml(formatFecha(m.fecha))} · ${m.revisados || 0} productos</small></h3>
        ${rows.map(({ c, kind }) => {
          const chg = c.tipo === "precio"
            ? `<span class="${kind === "sube" ? "rev-up" : "rev-down"}">${usd(c.antes.usd)} → <b>${usd(c.despues.usd)}</b></span>`
            : c.tipo === "disponible" ? `Disponible: ${escapeHtml(c.antes.disp || "NO")} → <b>SI</b>`
            : c.tipo === "preorden" ? `Disponible: ${escapeHtml(c.antes.disp || "SI")} → <b>PREORDEN</b>` : c.tipo === "no_existe" ? `Disponible: ${escapeHtml(c.antes.disp || "SI")} → <b>OCULTO</b>` : `Disponible: ${escapeHtml(c.antes.disp || "SI")} → <b>NO</b>`;
          return `<label class="rev-row"><input type="checkbox" checked data-rev-key="${escapeHtml(revKey(marca, c))}">
            <span class="what">${escapeHtml(c.nombre)}<small>${escapeHtml(c.presentacion || "")} · SKU ${escapeHtml(c.sku)} · ${REV_TIPOS[kind]}</small></span>
            <span class="chg">${chg}</span></label>`;
        }).join("")}`;
    }).join("") || (all.length ? "" : `<p class="abw-intro">🎉 No hay cambios pendientes.</p>`);
    document.getElementById("revision-actions").style.display = shown.length ? "" : "none";
    updateRevisionBadge();
  }

  function selectedRevision() {
    const keys = new Set([...document.querySelectorAll("#revision-list [data-rev-key]:checked")].map((i) => i.dataset.revKey));
    return revisionChanges().filter((x) => keys.has(revKey(x.marca, x.c)));
  }

  async function quitarRevision(sel) {
    const res = await fetch("/.netlify/functions/admin-abw-revision", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
      body: JSON.stringify({ quitar: sel.map((x) => ({ marca: x.marca, sku: x.c.sku, tipo: x.c.tipo })) }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "No se pudo actualizar la revisión.");
  }

  async function applyRevision(ignore) {
    const sel = selectedRevision();
    if (!sel.length) { showToast("Selecciona al menos un cambio."); return; }
    if (!ignore && !window.confirm(`¿Aplicar ${sel.length} cambio${sel.length === 1 ? "" : "s"} a tu Sheet?`)) return;
    const btn = document.getElementById(ignore ? "revision-ignore" : "revision-apply");
    const label = btn.textContent;
    btn.disabled = true;
    btn.textContent = ignore ? "Quitando…" : "Aplicando…";
    try {
      if (!ignore) {
        // Un renglón por SKU con todas sus celdas.
        const bySku = new Map();
        sel.forEach(({ c }) => {
          const f = bySku.get(c.sku) || {};
          if (c.tipo === "precio" && c.despues.usd != null) f["Precio USD"] = c.despues.usd;
          if (c.tipo === "agotado") f.Disponible = "NO";
          if (c.tipo === "no_existe") f.Disponible = "OCULTO";
          if (c.tipo === "disponible") f.Disponible = "SI";
          if (c.tipo === "preorden") f.Disponible = "PREORDEN";
          bySku.set(c.sku, f);
        });
        const updates = [...bySku.entries()].map(([sku, fields]) => ({ sku, fields }));
        let skipped = 0;
        for (let i = 0; i < updates.length; i += 1000) {
          const res = await fetch("/.netlify/functions/admin-append-catalog-rows", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
            body: JSON.stringify({ updates: updates.slice(i, i + 1000) }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || "No se pudo actualizar el Sheet.");
          skipped += (data.skipped || []).length;
        }
        showToast(`✅ ${updates.length - skipped} producto${updates.length - skipped === 1 ? "" : "s"} actualizado${updates.length - skipped === 1 ? "" : "s"} en el Sheet${skipped ? ` (${skipped} no se encontraron)` : ""}. La tienda se actualiza en unos minutos.`);
      }
      await quitarRevision(sel);
      if (ignore) showToast(`Se quitaron ${sel.length} cambio${sel.length === 1 ? "" : "s"} de la lista.`);
      await loadRevision();
    } catch (err) {
      showToast(`⚠️ ${err.message}`);
    } finally {
      btn.disabled = false;
      btn.textContent = label;
    }
  }

  document.getElementById("revision-tabs").addEventListener("click", (e) => {
    const t = e.target.closest("[data-rev-tab]");
    if (!t) return;
    revisionTab = t.dataset.revTab;
    renderRevision();
  });
  document.getElementById("revision-apply").addEventListener("click", () => applyRevision(false));
  document.getElementById("revision-ignore").addEventListener("click", () => applyRevision(true));

  /* ---------- Cupones (admin-coupons; ver lib/coupons.js) ---------- */
  let coupons = [];
  const couponDesc = (c) => `${c.sinMinimo ? `👯 Pedido compartido de Corea (sin mínimo${c.envioKg ? `, envío de Corea ${formatPrice(c.envioKg)}/kg` : ""})` + (c.valor ? " · " : "") : ""}${!c.valor && c.sinMinimo ? "" : c.tipo === "pct" ? `${c.valor}%${c.tope ? ` (máx. ${formatPrice(c.tope)})` : ""}` : formatPrice(c.valor)} · ${{ tienda: "Tienda", swm: "Dirección americana", ambos: "Tienda y dirección americana" }[c.aplica]}${c.minimo ? ` · mínimo ${formatPrice(c.minimo)}` : ""}${c.unaVez ? " · una vez por clienta" : ""}${c.usosMax ? ` · ${c.usosMax} usos en total` : ""}`;

  /* Temporizador: "desde"/"hasta" son "AAAA-MM-DD" o "AAAA-MM-DDTHH:MM" en
     hora de Ciudad Juárez (igual que lib/coupons.js). */
  function ahoraJuarez() {
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Ciudad_Juarez", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date()).map((x) => [x.type, x.value]));
    return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
  }
  const couponIni = (c) => (c.desde ? (c.desde.length === 10 ? `${c.desde}T00:00` : c.desde) : "");
  const couponFin = (c) => (c.hasta ? (c.hasta.length === 10 ? `${c.hasta}T23:59` : c.hasta) : "");
  function couponFecha(v) {
    const [d, t] = v.split("T");
    const [y, m, dd] = d.split("-").map(Number);
    const [hh, mi] = t.split(":").map(Number);
    const dia = new Date(Date.UTC(y, m - 1, dd, 12)).toLocaleDateString("es-MX", { day: "numeric", month: "short", timeZone: "UTC" });
    const h12 = hh % 12 || 12;
    return `${dia}, ${h12}:${String(mi).padStart(2, "0")} ${hh < 12 ? "a.m." : "p.m."}`;
  }
  /* Minutos entre dos "AAAA-MM-DDTHH:MM" (misma zona). */
  const minsEntre = (a, b) => Math.round((Date.parse(`${b}:00Z`) - Date.parse(`${a}:00Z`)) / 60000);
  function enCuanto(min) {
    if (min < 60) return `${min} min`;
    if (min < 48 * 60) return `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ""}`;
    return `${Math.round(min / 1440)} días`;
  }
  /* Etiqueta del temporizador y si ahorita está vigente por fechas. */
  function couponTimer(c) {
    const ahora = ahoraJuarez();
    const ini = couponIni(c), fin = couponFin(c);
    if (fin && ahora >= fin && !(c.hasta.length === 10 && ahora.slice(0, 10) <= c.hasta)) return { html: `<span class="badge" style="background:#eee;color:#666;">⌛ Venció el ${couponFecha(fin)}</span>`, vigente: false };
    if (ini && ahora < ini) return { html: `<span class="badge" style="background:#fff4d6;color:#8a5a00;">🕒 Se activa el ${couponFecha(ini)} (en ${enCuanto(minsEntre(ahora, ini))})</span>`, vigente: false };
    if (fin) return { html: `<span class="badge" style="background:#e7f6ec;color:#1e6b3a;">⏰ Se desactiva el ${couponFecha(fin)} (en ${enCuanto(minsEntre(ahora, fin))})</span>`, vigente: true };
    return { html: "", vigente: true };
  }

  // Los letreros del temporizador ("en 2 h 10 min") se actualizan solos.
  setInterval(() => {
    const v = document.getElementById("coupons-view");
    if (v && v.style.display !== "none" && coupons.length) renderCoupons();
  }, 60000);

  async function loadCoupons() {
    const list = document.getElementById("coupons-list");
    list.innerHTML = `<p class="abw-intro">Cargando…</p>`;
    try {
      const res = await fetch("/.netlify/functions/admin-coupons", { headers: { "x-admin-key": adminKey }, cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudieron cargar los cupones.");
      coupons = data.cupones || [];
      renderCoupons();
    } catch (err) {
      list.innerHTML = `<p class="guide-error" style="display:block;">${escapeHtml(err.message)}</p>`;
    }
  }

  function renderCoupons() {
    document.getElementById("coupons-list").innerHTML = coupons.length
      ? coupons.map((c) => `<div class="trash-row"><div class="who"><b>${escapeHtml(c.code)}</b>${c.activo ? "" : ' <span class="badge">Pausado</span>'} · ${escapeHtml(couponDesc(c))}
          <small>Usado ${c.usos || 0} ${c.usos === 1 ? "vez" : "veces"}${c.nota ? ` · ${escapeHtml(c.nota)}` : ""}</small>
          ${c.activo ? couponTimer(c).html : ""}</div>
          <button type="button" class="btn-secondary" data-coupon-edit="${escapeHtml(c.code)}">✏️ Editar</button>
          <button type="button" class="btn-secondary" data-coupon-toggle="${escapeHtml(c.code)}">${c.activo ? "Pausar" : "Activar"}</button>
          <button type="button" class="btn-danger" data-coupon-delete="${escapeHtml(c.code)}">Borrar</button></div>`).join("")
      : `<p class="abw-intro">Todavía no hay cupones.</p>`;
  }

  function fillCouponForm(c) {
    const f = document.getElementById("coupon-form");
    const set = (k, v) => { const el = f.querySelector(`[name="${k}"]`); if (el.type === "checkbox") el.checked = !!v; else el.value = v ?? ""; };
    ["code", "tipo", "valor", "tope", "aplica", "minimo", "usosMax", "nota", "envioKg"].forEach((k) => set(k, c[k] || (k === "tipo" ? "pct" : k === "aplica" ? "ambos" : "")));
    set("desde", couponIni(c));
    set("hasta", couponFin(c));
    set("unaVez", c.unaVez);
    set("sinMinimo", c.sinMinimo);
    f.querySelector('[name="code"]').readOnly = !!c.code;
    f.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function saveCouponFrom(form, extra = {}) {
    const fd = Object.fromEntries(new FormData(form).entries());
    const prev = coupons.find((c) => c.code === String(fd.code || "").trim().toUpperCase());
    const sinMinimo = form.querySelector('[name="sinMinimo"]').checked;
    // Un pedido compartido nuevo nace en pausa (Mae lo activa cuando abre la
    // dinámica), salvo que tenga hora para activarse solo.
    const cupon = { ...fd, unaVez: form.querySelector('[name="unaVez"]').checked, sinMinimo, activo: prev ? prev.activo : !sinMinimo || !!fd.desde, ...extra };
    const res = await fetch("/.netlify/functions/admin-coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
      body: JSON.stringify({ accion: "guardar", cupon }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "No se pudo guardar.");
    return data.cupon;
  }

  document.getElementById("coupon-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      const c = await saveCouponFrom(form);
      showToast(c.activo ? `🎟️ Cupón ${c.code} guardado.` : `🎟️ ${c.code} guardado en pausa. Tócale "Activar" cuando quieras abrirlo.`);
      form.reset();
      form.querySelector('[name="code"]').readOnly = false;
      await loadCoupons();
    } catch (err) {
      showToast(`⚠️ ${err.message}`);
    } finally {
      btn.disabled = false;
    }
  });
  document.getElementById("coupon-form-new").addEventListener("click", () => {
    const f = document.getElementById("coupon-form");
    f.reset();
    f.querySelector('[name="code"]').readOnly = false;
  });
  document.getElementById("coupons-list").addEventListener("click", async (e) => {
    const ed = e.target.closest("[data-coupon-edit]");
    const tg = e.target.closest("[data-coupon-toggle]");
    const del = e.target.closest("[data-coupon-delete]");
    const find = (code) => coupons.find((c) => c.code === code);
    try {
      if (ed) fillCouponForm(find(ed.dataset.couponEdit));
      if (tg) {
        const c = find(tg.dataset.couponToggle);
        const res = await fetch("/.netlify/functions/admin-coupons", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
          body: JSON.stringify({ accion: "guardar", cupon: { ...c, activo: !c.activo } }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "No se pudo guardar.");
        await loadCoupons();
      }
      if (del) {
        if (!window.confirm(`¿Borrar el cupón ${del.dataset.couponDelete}?`)) return;
        const res = await fetch("/.netlify/functions/admin-coupons", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
          body: JSON.stringify({ accion: "borrar", code: del.dataset.couponDelete }),
        });
        if (!res.ok) throw new Error("No se pudo borrar.");
        await loadCoupons();
      }
    } catch (err) {
      showToast(`⚠️ ${err.message}`);
    }
  });

  async function loadTrash() {
    const listEl = document.getElementById("trash-list");
    listEl.innerHTML = `<p class="abw-intro">Cargando…</p>`;
    try {
      const res = await fetch("/.netlify/functions/admin-trash", { headers: { "x-admin-key": adminKey } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo cargar la papelera.");
      trashOrders = data.orders || [];
      trashLoaded = true;
      renderTrash();
    } catch (err) {
      listEl.innerHTML = `<p class="guide-error" style="display:block;">${escapeHtml(err.message)}</p>`;
    }
  }

  function renderTrash() {
    const listEl = document.getElementById("trash-list");
    if (!trashOrders.length) {
      listEl.innerHTML = `<p class="abw-intro">🎉 La papelera está vacía.</p>`;
      return;
    }
    listEl.innerHTML = trashOrders.map((o) => {
      const until = o.deletedAt ? new Date(new Date(o.deletedAt).getTime() + 30 * 24 * 60 * 60 * 1000) : null;
      return `<div class="trash-row"><div class="who"><b>${escapeHtml((o.customer && o.customer.name) || "(sin nombre)")}</b> · ${formatPrice(o.grandTotal)}
        <small>#${orderNumber(o)} · ${escapeHtml(STATUS_LABELS[o.status] || o.status)} · pedido ${escapeHtml(formatFecha(o.createdAt))}</small>
        <small>Borrado ${escapeHtml(formatFecha(o.deletedAt))}${until ? ` · se elimina solo el ${until.toLocaleDateString("es-MX", { day: "numeric", month: "short" })}` : ""}</small></div>
        <button type="button" class="btn-primary" data-trash-restore="${escapeHtml(o.id)}">↩️ Restaurar</button>
        <button type="button" class="btn-danger" data-trash-purge="${escapeHtml(o.id)}">Borrar para siempre</button></div>`;
    }).join("");
  }

  async function restoreFromTrash(orderId) {
    try {
      const res = await fetch("/.netlify/functions/admin-trash", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ action: "restore", orderId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo restaurar.");
      trashOrders = trashOrders.filter((o) => o.id !== orderId);
      if (currentView === "papelera") renderTrash();
      showToast("↩️ Pedido restaurado.");
      fetchOrders();
    } catch (err) {
      showToast(`⚠️ ${err.message}`);
    }
  }

  async function purgeFromTrash(orderId) {
    if (!window.confirm("¿Borrar este pedido para siempre? Esto ya no se puede deshacer.")) return;
    try {
      const res = await fetch("/.netlify/functions/admin-trash", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ action: "purge", orderId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo borrar.");
      trashOrders = trashOrders.filter((o) => o.id !== orderId);
      renderTrash();
    } catch (err) {
      showToast(`⚠️ ${err.message}`);
    }
  }

  /* ---------- Avisos de pedidos nuevos ---------- */
  // Mientras el admin está abierto, cada 90 s revisa si entró un pedido
  // nuevo o se confirmó un pago (Mercado Pago) y avisa con un mensaje en
  // pantalla; si los activas en Más, también con sonido y notificación.
  const NOTIFY_KEY = "alpacca_admin_notify";
  const POLL_MS = 90 * 1000;
  let knownOrders = new Map(); // id -> status
  let pollTimer = null;
  let unseenCount = 0;
  let audioCtx = null;
  const baseTitle = document.title;
  let usaPendingCount = 0;
  let swmNewCount = 0;
  let psCount = 0;
  let pmCount = 0;
  let swmLoaded = false;

  function notifyEnabled() {
    try { return localStorage.getItem(NOTIFY_KEY) === "1"; } catch (e) { return false; }
  }

  function rememberOrders(list) {
    knownOrders = new Map(list.map((o) => [o.id, o.status]));
  }

  function updateMoreBadge() {
    const n = (restockCount || 0) + (usaPendingCount || 0);
    const el = document.getElementById("more-badge");
    if (!el) return;
    el.textContent = n ? String(n) : "";
    el.style.display = n ? "inline-flex" : "none";
  }

  let toastTimer = null;
  function showToast(text, actionLabel, onAction) {
    const el = document.getElementById("toast");
    el.innerHTML = `<span>${escapeHtml(text)}</span>${actionLabel ? `<button type="button">${escapeHtml(actionLabel)}</button>` : ""}`;
    el.style.display = "flex";
    if (actionLabel) {
      el.querySelector("button").addEventListener("click", () => {
        el.style.display = "none";
        onAction();
      });
    }
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.style.display = "none"; }, actionLabel ? 12000 : 4000);
  }

  function beep() {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") audioCtx.resume();
      [0, 0.18].forEach((t, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.value = i ? 1175 : 880;
        gain.gain.setValueAtTime(0.0001, audioCtx.currentTime + t);
        gain.gain.exponentialRampToValueAtTime(0.25, audioCtx.currentTime + t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + t + 0.16);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + t);
        osc.stop(audioCtx.currentTime + t + 0.18);
      });
    } catch (e) { /* sin sonido */ }
  }

  async function pollOrders() {
    if (!adminKey || !knownOrders.size) return;
    let list;
    try {
      const res = await fetch("/.netlify/functions/admin-orders", { headers: { "x-admin-key": adminKey } });
      if (!res.ok) return;
      list = (await res.json()).orders || [];
    } catch (e) {
      return;
    }
    const nuevos = list.filter((o) => !knownOrders.has(o.id));
    const pagados = list.filter((o) => o.status === "paid" && knownOrders.get(o.id) === "pending");
    const changed = list.length !== knownOrders.size || list.some((o) => knownOrders.get(o.id) !== o.status);
    rememberOrders(list);
    if (!changed) return;
    allOrders = list;
    // Solo se repinta solo lo que no tiene campos a medio escribir.
    if (currentView === "inicio") renderHome();
    if (currentView === "compras") renderAbw();
    if (currentView === "clientas") renderClients();
    if (!nuevos.length && !pagados.length) return;
    const msgs = [
      ...nuevos.map((o) => `🆕 Pedido nuevo de ${firstName(o) || "una clienta"} por ${formatPrice(o.grandTotal)}`),
      ...pagados.map((o) => `💰 ${firstName(o) || "Una clienta"} pagó ${formatPrice(o.grandTotal)}`),
    ];
    const text = msgs.length === 1 ? msgs[0] : `${msgs[0]} (+${msgs.length - 1} más)`;
    showToast(text, "Ver", () => {
      goToOrders(nuevos.some((o) => o.status === "pending") ? "pending" : "");
    });
    // En la pantalla de Pedidos no se repinta sola (podrías estar
    // escribiendo una guía): se repinta al tocar "Ver".
    if (document.hidden) {
      unseenCount += msgs.length;
      document.title = `(${unseenCount}) ${baseTitle}`;
    }
    if (notifyEnabled()) {
      beep();
      if ("Notification" in window && Notification.permission === "granted") {
        try { new Notification("Alpacca", { body: text, icon: "/favicon.ico", tag: "alpacca-admin" }); } catch (e) { /* sin notificación */ }
      }
    }
  }

  /* Comprobantes nuevos de Personal shopper, Dirección americana y Sephora
     Sale (los de la tienda ya los avisa pollOrders como pedido nuevo). Se
     consulta aparte, sin repintar pantallas donde Mae podría estar escribiendo. */
  let knownRev = null;
  async function pollComprobantes() {
    if (!adminKey) return;
    try {
      const [rs] = await Promise.all([
        fetch("/.netlify/functions/admin-swm", { headers: { "x-admin-key": adminKey } }),
        loadPvResumen(),
      ]);
      if (!rs.ok) return;
      const d = await rs.json();
      const enRev = (r) => r.pago && r.pago.status === "revision";
      const sw = [...(d.compras || []), ...(d.envios || []), ...(d.paquetes || [])].filter(enRev);
      const pv = (pvApartadosLigeros || []).filter(pvPorRevisar);
      const ahora = new Map([
        ...sw.map((r) => [`s:${r.id}:${r.pago.comprobanteAt || ""}`, `🔎 ${r.name || "Una clienta"} subió su comprobante (${r.folio || ""})`]),
        ...pv.map((a) => [`p:${a.id}:${(a.anticipo && a.anticipo.comprobanteAt) || ""}:${(a.resto && a.resto.comprobanteAt) || ""}`, `🔎 ${a.name || "Una clienta"} subió su comprobante del Sephora Sale (${a.folio})`]),
      ]);
      const primera = knownRev == null;
      const nuevos = primera ? [] : [...ahora.keys()].filter((k) => !knownRev.has(k));
      knownRev = new Set(ahora.keys());
      if (!nuevos.length) return;
      if (!["swm", "ps", "pm", "preventa"].includes(currentView)) { swmData = d; swmLoaded = true; }
      if (currentView === "inicio") renderHome();
      const msgs = nuevos.map((k) => ahora.get(k));
      const text = msgs.length === 1 ? msgs[0] : `${msgs[0]} (+${msgs.length - 1} más)`;
      const dest = nuevos.some((k) => k.startsWith("s:")) ? (sw.some((r) => (d.compras || []).includes(r)) ? "ps" : "swm") : "preventa";
      showToast(text, "Ver", () => showView(dest));
      if (document.hidden) { unseenCount += msgs.length; document.title = `(${unseenCount}) ${baseTitle}`; }
      if (notifyEnabled()) {
        beep();
        if ("Notification" in window && Notification.permission === "granted") {
          try { new Notification("Alpacca", { body: text, icon: "/favicon.ico", tag: "alpacca-admin-comprobante" }); } catch (e) { /* sin notificación */ }
        }
      }
    } catch (e) { /* se reintenta en la siguiente vuelta */ }
  }

  function startPolling() {
    if (pollTimer) return;
    pollTimer = setInterval(() => { pollOrders(); pollComprobantes(); }, POLL_MS);
    pollComprobantes();
  }

  function stopPolling() {
    clearInterval(pollTimer);
    pollTimer = null;
  }

  function renderNotifyToggle() {
    const btn = document.getElementById("notify-toggle");
    const on = notifyEnabled();
    btn.classList.toggle("on", on);
    document.getElementById("notify-label").innerHTML = on
      ? "Avisos de pedidos nuevos: activados ✅<small>Toca para apagarlos en este dispositivo</small>"
      : "Avisos de pedidos nuevos<small>Sonido y notificación mientras el admin está abierto</small>";
  }

  async function toggleNotify() {
    if (notifyEnabled()) {
      try { localStorage.removeItem(NOTIFY_KEY); } catch (e) { /* nada */ }
      renderNotifyToggle();
      return;
    }
    if ("Notification" in window && Notification.permission === "default") {
      try { await Notification.requestPermission(); } catch (e) { /* nada */ }
    }
    try { localStorage.setItem(NOTIFY_KEY, "1"); } catch (e) { /* nada */ }
    beep();
    renderNotifyToggle();
    showToast("Avisos activados. Deja el admin abierto para recibirlos.");
  }

  /* Una sección a la vez: Pedidos, Inventario, Restock, Reseñas o
     Encargos USA. Antes cada panel se abría debajo de los pedidos (fuera
     de la pantalla en el celular) y parecía que el botón no hacía nada. */

  /* ====================================================================
     Shop with Mae: casillero de las clientas (paquetes, compras, envíos y
     pagos). Ver netlify/functions/admin-swm.js. La tarifa por peso es la
     misma que lib/swm-pricing.js y swm.js.
     ==================================================================== */
  const SWM_TARIFA = { 1: 250, 2: 350, 3: 450, 4: 450, 5: 550, 6: 900, 7: 900, 8: 1000, 9: 1000, 10: 1000, 11: 1000, 12: 1200, 13: 1200, 14: 1400, 15: 2000 };
  let swmData = { paquetes: [], compras: [], envios: [], almacenajeDias: 15 };
  let swmTab = "acciones";
  let swmSearch = "";
  let swmSinRegistroOpen = false;
  let swmNuevaCompraOpen = false;
  let swmConsolidarEmail = ""; // clienta con el formulario "Juntar en una caja" abierto
  let swmEnviarEmail = ""; // clienta con el formulario "Ya lo mandé: anotar guía" abierto
  const swmGuiaState = {}; // envioId -> { rates, selected }
  const swmCliOpen = new Set(); // clientas desplegadas (se conservan al recargar la lista)

  /* Agrupa tarjetas por clienta en un desplegable con su nombre, para que
     la lista no ocupe tanto. "items" pueden ser registros o [tipo, registro]. */
  function swmPorClienta(items, fn, scope) {
    const grupos = new Map();
    items.forEach((x) => {
      const r = Array.isArray(x) ? x[1] : x;
      const k = r.email || `sin:${r.id}`;
      if (!grupos.has(k)) grupos.set(k, []);
      grupos.get(k).push(x);
    });
    const buscando = !!swmSearch.trim();
    return [...grupos.entries()].map(([email, xs]) => {
      const r0 = Array.isArray(xs[0]) ? xs[0][1] : xs[0];
      const cas = r0.email && swmData.casilleros && swmData.casilleros[r0.email];
      const key = `${scope}|${email}`;
      const open = buscando || grupos.size === 1 || swmCliOpen.has(key);
      return `<details class="swm-cli" data-cli="${escapeHtml(key)}"${open ? " open" : ""}>
        <summary><span>👤 <b>${escapeHtml(r0.name || r0.email || "Sin dueña")}</b>${cas ? ` · ${escapeHtml(cas)}` : ""}</span><span class="swm-cli-n">${xs.length}</span></summary>
        <div class="swm-cli-body">${xs.map(fn).join("")}</div>
      </details>`;
    }).join("");
  }
  let swmEditCompraId = "";

  function swmCobrable(kg, alto, ancho, largo) {
    const vol = alto > 0 && ancho > 0 && largo > 0 ? (alto * ancho * largo) / 5000 : 0;
    const p = Math.max(kg || 0, vol);
    return p > 0 ? Math.ceil(p - 1e-9) : 0;
  }
  function swmCrucePeso(kg) {
    if (!kg) return 0;
    return kg <= 15 ? SWM_TARIFA[kg] : SWM_TARIFA[15] + (kg - 15) * 120;
  }
  const swmFecha = (iso) => (iso ? new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short" }) : "");
  const swmPorRevisar = () => [...swmData.compras.map((r) => ["compra", r]), ...swmData.envios.map((r) => ["envio", r]), ...swmData.paquetes.map((r) => ["paquete", r])]
    .filter(([k, r]) => r.pago && r.pago.status === "revision" && (k === "paquete" ? !r.crucePagado : r.status === "cotizado"));

  /* Lo que requiere que Mae haga algo. */
  /* Dirección americana = lo que la clienta compra por su cuenta.
     Personal shopper = lo que Mae compra por ella (compras y sus paquetes y
     envíos). Cada sección enseña solo lo suyo; al buscar se avisan entre sí. */
  const esPsPaquete = (p) => p.origen === "compra";
  function envioEsPs(e, d = swmData) {
    const ps = (e.paqueteIds || []).map((id) => d.paquetes.find((p) => p.id === id)).filter(Boolean);
    return ps.length > 0 && ps.every(esPsPaquete);
  }
  function swmSoloDA(d) {
    return { ...d, compras: [], paquetes: d.paquetes.filter((p) => !esPsPaquete(p)), envios: d.envios.filter((e) => !envioEsPs(e, d)) };
  }
  // Corre fn con swmData filtrado a solo Dirección americana.
  let swmDataFull = null; // mientras se dibuja Dirección americana, aquí queda todo
  function conSoloDA(fn) {
    const full = swmData;
    swmDataFull = full;
    swmData = swmSoloDA(full);
    try { return fn(); } finally { swmData = full; swmDataFull = null; }
  }
  function psPendientes() {
    const envs = swmData.envios.filter((e) => envioEsPs(e));
    return swmData.compras.filter((c) => ["solicitud", "pagado"].includes(c.status) || (c.pago && c.pago.status === "revision")).length
      + envs.filter((e) => ["solicitado", "pagado", "en_mexico"].includes(e.status) || (e.pago && e.pago.status === "revision")).length;
  }

  function swmPendientes() {
    return {
      cotizarCompra: swmData.compras.filter((c) => c.status === "solicitud"),
      comprar: swmData.compras.filter((c) => c.status === "pagado"),
      cotizarEnvio: swmData.envios.filter((e) => e.status === "solicitado"),
      sinDuena: swmData.paquetes.filter((p) => p.status === "sin_dueña"),
      enviar: swmData.envios.filter((e) => e.status === "pagado" || e.status === "en_mexico"),
      pagos: swmPorRevisar(),
      // Servicios extra que pidió la clienta (revisión con fotos solo
      // cuando el paquete ya llegó).
      extras: swmData.paquetes.filter((p) => p.status === "recibido" && ((p.revision && p.revision.estado === "pedida") || (p.separar && p.separar.estado === "pedida"))),
      // La clienta ya corrigió lo que Mae le pidió: falta revisarlo.
      correcciones: swmData.paquetes.filter((p) => p.correccion && p.correccion.estado === "hecha"),
    };
  }

  async function loadSwm({ quiet = false } = {}) {
    const loading = document.getElementById("swm-loading");
    if (!quiet) loading.style.display = "block";
    try {
      const res = await fetch("/.netlify/functions/admin-swm", { headers: { "x-admin-key": adminKey } });
      const data = await res.json();
      if (!res.ok) { if (!quiet) setStatus(data.error || "No se pudo cargar la dirección americana."); return; }
      swmData = data;
      swmLoaded = true;
      const pend = conSoloDA(swmPendientes);
      swmNewCount = pend.cotizarCompra.length + pend.comprar.length + pend.cotizarEnvio.length + pend.enviar.length + pend.pagos.length + pend.sinDuena.length + pend.extras.length + pend.correcciones.length;
      const badge = document.getElementById("swm-badge");
      badge.textContent = swmNewCount ? String(swmNewCount) : "";
      badge.style.display = swmNewCount ? "inline-flex" : "none";
      const pmN = pmPorMandarN();
      pmCount = pmN;
      const pmBadge = document.getElementById("pm-nav-badge");
      if (pmBadge) { pmBadge.textContent = pmN ? String(pmN) : ""; pmBadge.style.display = pmN ? "inline-flex" : "none"; }
      const psN = psPendientes();
      psCount = psN;
      const psBadge = document.getElementById("ps-nav-badge");
      if (psBadge) { psBadge.textContent = psN ? String(psN) : ""; psBadge.style.display = psN ? "inline-flex" : "none"; }
      const navBadge = document.getElementById("swm-nav-badge");
      navBadge.textContent = badge.textContent;
      navBadge.style.display = badge.style.display;
      updateMoreBadge();
      if (currentView === "swm" || currentView === "ps" || currentView === "pm") renderSwmAdmin();
      if (currentView === "inicio") renderHome();
    } catch (err) {
      if (!quiet) setStatus("No se pudo conectar con el servidor.");
    } finally {
      loading.style.display = "none";
    }
  }

  async function swmAct(body, btn) {
    if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = "Guardando..."; }
    try {
      const res = await fetch("/.netlify/functions/admin-swm", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar.");
      showToast("Guardado ✅");
      await loadSwm({ quiet: true });
      return data;
    } catch (err) {
      if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label; }
      alert(err.message);
      return null;
    }
  }

  async function swmGuia(t) {
    const card = t.closest("[data-swm-id]");
    const id = card.dataset.swmId;
    const g = (k) => (card.querySelector(`[data-g="${k}"]`) || {}).value?.trim() || "";
    const errEl = card.querySelector("[data-guia-error]");
    const ratesEl = card.querySelector("[data-guia-rates]");
    const genBtn = card.querySelector("[data-guia-generar]");
    errEl.textContent = "";
    const kindKey = card.dataset.guiaKind === "orden" ? "orderId" : card.dataset.guiaKind === "apartado" ? "apartadoId" : "envioId";
    const rateEl = t.closest("[data-guia-rate]");
    if (rateEl) {
      swmGuiaState[id].selected = Number(rateEl.dataset.guiaRate);
      ratesEl.querySelectorAll("[data-guia-rate]").forEach((l) => l.classList.toggle("selected", l === rateEl));
      rateEl.querySelector("input").checked = true;
      genBtn.disabled = false;
      swmGuiaBoton(card, id);
      return;
    }
    const weight = parseFloat(g("peso"));
    if (!(weight > 0)) { errEl.textContent = "Escribe el peso de la caja."; return; }
    if (!/^\d{5}$/.test(g("cp"))) { errEl.textContent = "Revisa el código postal."; return; }
    if (t.closest("[data-guia-cotizar]")) {
      genBtn.disabled = true; swmGuiaState[id] = null;
      ratesEl.textContent = "Cotizando en Envíos Perros y Skydropx...";
      try {
        const res = await fetch("/.netlify/functions/admin-shipping-rates", {
          method: "POST", headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
          body: JSON.stringify({ [kindKey]: id, weight, destinationZipCode: g("cp"), destinationState: g("estado"), destinationCity: g("ciudad"), destinationNeighborhood: g("colonia") }),
        });
        const data = await res.json();
        if (!res.ok || !(data.rates || []).length) { ratesEl.textContent = ""; errEl.textContent = data.error || "No hay opciones de envío para esos datos."; return; }
        swmGuiaState[id] = { rates: data.rates, selected: null, tabla: data.tabla != null ? Number(data.tabla) : null };
        const nota = card.querySelector("[data-guia-tabla]");
        if (kindKey !== "envioId") {
          if (nota) nota.innerHTML = "🧾 Su envío ya lo pagó en sus pedidos: la paquetería que elijas es lo que te cuesta a ti la guía.";
        } else {
          const yaPagado = Number((card.dataset.pmPagado)) || 0;
          const sugerido = data.tabla != null && yaPagado > 0 ? Math.max(0, Math.round(Number(data.tabla) - yaPagado)) : "";
        if (nota) nota.innerHTML = `${data.tabla != null ? `🧾 Envío según tu tabla (${weight} kg a CP ${escapeHtml(g("cp"))}): <b>${formatPrice(data.tabla)}</b>. La paquetería que elijas es lo que te cuesta a ti la guía.` : "⚠️ Su código postal no está en tu tabla (o pesa más de 30 kg): se le cobra lo que cueste la paquetería que elijas <b>+ $100</b>. Ella solo ve el total del envío, sin desglose."}
          <label style="display:inline-flex;align-items:center;gap:6px;margin-top:6px;font-weight:600;">💲 Cóbrale de envío <input data-g="cobrar" type="number" min="0" step="1" value="${sugerido}" placeholder="${data.tabla != null ? Math.round(data.tabla) : "tabla"}" style="width:110px;padding:6px 8px;"> <span style="font-weight:400;color:#6b6370;">(${yaPagado > 0 && data.tabla != null ? `tabla ${formatPrice(data.tabla)} − ${formatPrice(yaPagado)} que ya pagó en sus pedidos` : `vacío = ${data.tabla != null ? "lo de tu tabla" : "paquetería + $100"}`})</span></label>`;
        }
        const badge = { enviosperros: "📦 Envíos Perros", skydropx: "🛵 Skydropx" };
        ratesEl.innerHTML = zonaExtAviso(data.rates) + data.rates.map((r, i) => `<label class="rate-option" data-guia-rate="${i}"><input type="radio" name="guia-${escapeHtml(id)}"> ${i === 0 ? "🏆 " : ""}${escapeHtml(r.label || "")}${r.days ? " · " + escapeHtml(r.days) : ""}${zonaExtTag(r)} <span style="font-size:13px;color:#6b6370;">(${badge[r.provider] || r.provider})</span> <span class="price">${formatPrice(r.total)}</span></label>`).join("");
      } catch (err) { ratesEl.textContent = ""; errEl.textContent = "No se pudo conectar con el servidor."; }
      return;
    }
    const st = swmGuiaState[id];
    if (!st || st.selected == null) { errEl.textContent = "Elige una paquetería primero."; return; }
    const envio = swmData.envios.find((x) => x.id === id);
    const pagado = envio && ["pagado", "en_mexico"].includes(envio.status);
    if (kindKey !== "envioId" ? !confirm("¿Generar la guía? Se cobra en tu cuenta de la paquetería y sus pedidos se marcan enviados juntos.") : !confirm(pagado ? "¿Generar la guía? Se cobra en tu cuenta de la paquetería y a la clienta le llega el aviso." : "¿Hacer la guía y cobrarle? La guía se paga en tu cuenta de la paquetería ya; a ella le llega lo que tiene que pagar y, en cuanto pague, su guía.")) return;
    const r = st.rates[st.selected];
    const destination = {
      name: g("nombre").slice(0, 30) || "Cliente", phone: g("telefono").replace(/[^0-9]/g, "").slice(-10),
      street: g("calle"), exteriorNumber: g("ext") || "S/N", neighborhood: g("colonia").slice(0, 25), city: g("ciudad"), state: g("estado"),
      zipCode: g("cp"), references: g("referencias").slice(0, 25) || "Sin referencias",
    };
    if (g("int")) destination.interiorNumber = g("int");
    genBtn.disabled = true; const label = genBtn.textContent; genBtn.textContent = "Generando guía...";
    try {
      const res = await fetch("/.netlify/functions/admin-generate-guide", {
        method: "POST", headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ [kindKey]: id, apartadoIds: kindKey === "envioId" ? [] : (card.dataset.apartadoIds || "").split(",").filter(Boolean), weight, total: r.total, cobrarEnvio: g("cobrar") !== "" ? Number(g("cobrar")) : null, premioLealtad: !!(card.querySelector("[data-g-lealtad]") || {}).checked, provider: r.provider, courier: r.carrier, service: r.service, quotationId: r.quotationId, rateId: r.rateId, carrierSlug: r.carrierSlug, serviceCode: r.serviceCode, destination }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo generar la guía.");
      if (data.error) alert(data.error);
      else if (kindKey !== "envioId") showToast(`✅ Guía ${(data.order || data).trackingNumber} generada: todo marcado enviado`);
      else showToast(data.guiaAnticipada ? `✅ Guía ${data.envio.guia} lista y cobro enviado (${formatPrice(data.envio.cotizacion.total)}). Cuando pague, le llega su guía sola.` : `✅ Guía ${data.envio.guia} generada y aviso enviado`);
      if (card.dataset.pmKey && !data.error) pmTerminar(card, data);
      if (kindKey !== "envioId") { if (kindKey === "orderId") await fetchOrders(); if ((card.dataset.apartadoIds || kindKey === "apartadoId")) await loadPreventaAdmin({ quiet: true }); }
      await loadSwm({ quiet: true });
    } catch (err) {
      errEl.textContent = err.message; genBtn.disabled = false; genBtn.textContent = label;
    }
  }

  function swmMatches(r, q) {
    if (typeof q !== "string") q = swmSearch.trim();
    if (!q) return true;
    const cas = r.email && swmData.casilleros ? swmData.casilleros[r.email] : "";
    const d = r.direccion || {};
    // Un envío también se encuentra por el rastreo original o folio de sus paquetes.
    const suyos = (r.paqueteIds || []).map((id) => swmData.paquetes.find((x) => x.id === id)).filter(Boolean);
    return buscaEnTodo([...suyos.flatMap((x) => [x.folio, x.rastreo, x.tienda]), r.folio, r.name, r.email, r.phone, r.tienda, r.paqueteria, r.rastreo, r.guia, r.contenido, r.contenidoCaja, r.links, cas, r.etiqueta, r.ordenTienda, ...(r.guiasUSA || []),
      d.nombre, d.telefono, d.calle, d.colonia, d.ciudad, d.estado, d.cp, d.referencias], q);
  }

  /* ---------- 📦 Por mandar: todo lo de cada clienta junto, sin importar
     de dónde venga (pedidos de la tienda o de Corea, paquetes de su
     casillero, compras de Personal shopper). Dice qué ya se puede mandar,
     qué todavía falta y deja armar UNA caja con lo que esté listo.
     Comparte el panel de Dirección americana (swm-panel) para usar sus
     mismos botones de guía y cobro. ---------- */
  let pmFiltro = "listas";
  let pmCaja = null; // { key, nombre, tel, orderIds, paqueteIds, kg, kgOrdenes, pagado, paso: "dir" | "guia", envioId, orderId }
  let pmAviso = null; // { nombre, tel, html, texto }
  const pmDesmarcados = new Set(); // cosas listas que Mae sacó de la caja
  const pmAbiertos = new Set(); // filas con su lista de productos desplegada ahí mismo

  const pmEmail = (x) => String(x || "").trim().toLowerCase();
  const pmTel = (x) => String(x || "").replace(/\D/g, "").slice(-10);

  function pmGrupos() {
    const D = swmLoaded ? swmData : { paquetes: [], compras: [], envios: [], casilleros: {} };
    const entradas = [];
    const E = (x) => { entradas.push(x); };
    const kgOrden = (o) => { try { return orderPiecesAndWeight(o).weightKg || 0; } catch (err) { return 0; } };
    const folioEnvio = (id) => { const e = D.envios.find((x) => x.id === id); return e ? e.folio : ""; };

    allOrders.forEach((o) => {
      if (o.status === "cancelled" || o.status === "failed") return;
      const c = o.customer || {};
      const piezas = (o.items || []).reduce((t, it) => t + (it.qty || 0), 0);
      const base = {
        tipo: "pedido", id: o.id, o, email: pmEmail(o.customerEmail), tel: pmTel(c.phone), nombre: c.name || "", kg: kgOrden(o),
        titulo: `🧾 Pedido #${orderNumber(o)}`,
        detalle: `${piezas} pieza${piezas === 1 ? "" : "s"} · ${(o.items || []).slice(0, 2).map((it) => it.nombre).join(", ")}${(o.items || []).length > 2 ? "…" : ""}`,
        go: { go: pedidoTipo(o) === "corea" ? "corea" : "pedidos", q: `#${orderNumber(o)}` },
      };
      if (o.status === "pending") return E({ ...base, estado: "falta", nota: `💳 falta su pago (${formatPrice(o.grandTotal)})` });
      const b = orderBucket(o);
      if (!b || b === "enviado" || b === "entregado") return;
      if (b === "por_abw") return E({ ...base, estado: "falta", nota: "🇰🇷 hay que pedirlo a Corea" });
      if (b === "esperando_abw") return E({ ...base, estado: "falta", nota: "🇰🇷 viene de Corea" });
      if (isEntregaPersonal(o)) return E({ ...base, estado: "falta", nota: "📍 se lo entregas en persona (Juárez)" });
      if (o.cajaEnvioId) return E({ ...base, estado: "proceso", nota: `📦 ya va en la caja del envío ${folioEnvio(o.cajaEnvioId)}` });
      if (b === "guardado") return E({ ...base, estado: "guardado", nota: o.enEspera && o.enEspera.nota ? `🧺 ${o.enEspera.nota}` : "🧺 pidió que no se lo mandes todavía" });
      E({ ...base, estado: "listo" });
    });

    D.paquetes.forEach((p) => {
      if (!p.email || ["sin_dueña", "cancelado", "enviado", "entregado", "en_envio"].includes(p.status)) return;
      const ps = p.origen === "compra";
      const base = {
        tipo: "paquete", id: p.id, p, email: pmEmail(p.email), tel: pmTel(p.phone), nombre: p.name || "", kg: Number(p.cobrable) || Number(p.kg) || 0,
        titulo: `${ps ? "🛍️" : "🇺🇸"} Paquete ${p.folio}`,
        detalle: [p.tienda, ps ? "compra de Mae" : "", !ps && p.rastreo ? `rastreo ${p.rastreo}` : ""].filter(Boolean).join(" · "),
        go: { go: ps ? "ps" : "swm", q: p.folio },
      };
      if (p.status === "registrado") return E({ ...base, estado: "falta", nota: "🇺🇸 viene en camino a la dirección americana" });
      if (p.datosPendientes) return E({ ...base, estado: "falta", nota: "✏️ falta que diga qué trae" });
      if ((p.correccion && p.correccion.estado === "pedida") || (p.separar && p.separar.estado === "pedida")) return E({ ...base, estado: "falta", nota: "✏️ tiene una corrección o separación pendiente" });
      if (!p.enMexicoAt) return E({ ...base, estado: "falta", nota: "🇺🇸 ya llegó a EE.UU.; falta cruzarlo a México" });
      E({ ...base, estado: "listo" });
    });

    D.compras.forEach((c) => {
      if (!c.email || ["comprado", "cancelado"].includes(c.status)) return;
      const nota = c.status === "solicitud" ? "🆕 hay que cotizarle" : c.status === "cotizado" ? `💳 falta su pago (${formatPrice(c.cotizacion ? c.cotizacion.total : 0)})` : "🛒 ya pagó: hay que comprarlo";
      E({ tipo: "compra", id: c.id, email: pmEmail(c.email), tel: pmTel(c.phone), nombre: c.name || "", titulo: `🛍️ Compra ${c.folio}`, detalle: c.tienda || "compra por ella", estado: "falta", nota, go: { go: "ps", q: c.folio } });
    });

    D.envios.forEach((e) => {
      if (!e.email || ["enviado", "entregado", "cancelado"].includes(e.status)) return;
      const nota = e.guia && e.status !== "pagado" ? "guía lista, esperando su pago" : { solicitado: "hay que cotizarle", cotizado: "esperando su pago", pagado: "ya pagó: falta hacerle su guía", en_mexico: "ya pagó: falta hacerle su guía" }[e.status] || e.status;
      E({ tipo: "envio", id: e.id, e, email: pmEmail(e.email), tel: pmTel(e.phone), nombre: e.name || "", titulo: `📦 Envío ${e.folio}`, detalle: "su caja a México", estado: "proceso", nota, go: { go: envioEsPs(e, D) ? "ps" : "swm", q: e.folio } });
    });

    // Sephora Sale (preventa): sus apartados también cuentan como cosas por mandar.
    ((pvData && pvData.apartados) || []).forEach((a) => {
      if (!a.cuenta || ["cancelado", "enviado", "entregado"].includes(a.status)) return;
      const piezas = (a.items || []).reduce((t, it) => t + (it.qty || 0), 0);
      const base = {
        tipo: "apartado", id: a.id, a, email: pmEmail(a.email), tel: pmTel(a.phone || (a.direccion && a.direccion.telefono)), nombre: a.name || (a.direccion && a.direccion.nombre) || "",
        kg: Number(a.pesoCobrableKg) || Number(a.pesoKg) || 0,
        titulo: `🛍️ Sephora Sale ${a.folio}`,
        detalle: `${piezas} pieza${piezas === 1 ? "" : "s"} · ${(a.items || []).slice(0, 2).map((it) => it.nombre).join(", ")}${(a.items || []).length > 2 ? "…" : ""}`,
        go: { go: "preventa", q: a.folio, first: a.id },
      };
      if (a.status === "nuevo") return E({ ...base, estado: "falta", nota: "💳 falta que pague su anticipo" });
      if (a.status === "apartado") return E({ ...base, estado: "falta", nota: "🛍️ apartado: esperando a que llegue la mercancía" });
      if (a.status === "llego") return E({ ...base, estado: "falta", nota: `📦 ya llegó: falta que pague ${formatPrice(a.resto ? a.resto.monto : 0)}` });
      if (a.entrega === "personal") return E({ ...base, estado: "falta", nota: "📍 se lo entregas en persona (Juárez)" });
      E({ ...base, estado: "listo" });
    });

    // Una misma clienta puede venir con correo en unas cosas y solo teléfono en otras.
    const padre = new Map();
    const raiz = (k) => { while (padre.get(k) !== k) { padre.set(k, padre.get(padre.get(k))); k = padre.get(k); } return k; };
    entradas.forEach((x) => {
      const ks = [x.email && `e:${x.email}`, x.tel && `t:${x.tel}`].filter(Boolean);
      if (!ks.length) ks.push(`i:${x.id}`);
      ks.forEach((k) => { if (!padre.has(k)) padre.set(k, k); });
      for (let i = 1; i < ks.length; i++) padre.set(raiz(ks[0]), raiz(ks[i]));
      x.k0 = ks[0];
    });
    const grupos = new Map();
    entradas.forEach((x) => {
      const r = raiz(x.k0);
      let g = grupos.get(r);
      if (!g) { g = { raiz: r, nombre: "", email: "", tel: "", entradas: [] }; grupos.set(r, g); }
      g.entradas.push(x);
      if (!g.nombre && x.nombre) g.nombre = x.nombre;
      if (!g.email && x.email) g.email = x.email;
      if (!g.tel && x.tel) g.tel = x.tel;
    });
    return [...grupos.values()].map((g) => {
      g.id = g.email || g.tel || g.raiz;
      g.casillero = g.email && D.casilleros ? D.casilleros[g.email] || "" : "";
      // Pidió "mándame todo junto" desde su cuenta.
      g.pidio = (D.juntar || []).find((j) => j.email === g.email && j.status === "pendiente") || null;
      ["listo", "guardado", "falta", "proceso"].forEach((s) => { g[s] = g.entradas.filter((x) => x.estado === s); });
      return g;
    });
  }

  // La dirección con la que se arma la caja: la del último envío de su
  // casillero; si no hay, la de su último pedido.
  function pmDireccion(g) {
    const envs = swmLoaded ? swmData.envios.filter((e) => e.email === g.email && e.direccion && /^\d{5}$/.test(String(e.direccion.cp || ""))).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))) : [];
    if (envs[0]) return { ...envs[0].direccion };
    const o = g.entradas.filter((x) => x.tipo === "pedido").map((x) => x.o).filter((o) => o.customer && o.customer.cp).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0];
    const c = (o && o.customer) || {};
    return { nombre: c.name || g.nombre || "", telefono: c.phone || g.tel || "", calle: c.street || "", colonia: c.colonia || "", ciudad: c.municipio || "", estado: c.estado || "", cp: c.cp || "", referencias: c.referencias || "" };
  }

  const pmBuscar = (g, q) => buscaEnTodo([g.nombre, g.email, g.tel, g.casillero], q) || g.entradas.some((x) => (x.tipo === "pedido" ? matchesSearch(x.o, q) : x.tipo === "paquete" || x.tipo === "envio" ? swmMatches(x.p || x.e, q) : x.tipo === "apartado" ? buscaEnTodo([x.a.folio, x.a.name, x.a.phone, x.a.email, ...Object.values(x.a.direccion || {}), ...(x.a.items || []).map((it) => `${it.marca || ""} ${it.nombre || ""} ${it.variante || ""}`)], q) : buscaEnTodo([x.titulo, x.detalle], q)));
  const pmPorMandarN = () => pmGrupos().filter((g) => g.listo.length || g.pidio).length;

  const pmSeleccion = (g) => g.listo.filter((x) => !pmDesmarcados.has(`${x.tipo}:${x.id}`));

  function pmFila(x, { check = false, marcada = true } = {}) {
    const color = { listo: "#17803d", guardado: "#6a45b8", falta: "#8a5a00", proceso: "#1b6fb3" }[x.estado];
    return `<div data-pm-fila style="display:flex;align-items:flex-start;gap:8px;padding:6px 0;border-top:1px solid #f6eef2;">
      ${check ? `<input type="checkbox" data-pm-chk="${x.tipo}:${escapeHtml(x.id)}" ${marcada ? "checked" : ""} style="width:22px;height:22px;margin-top:2px;flex:none;accent-color:#c4466e;">` : ""}
      <div style="flex:1;min-width:0;font-size:14px;"><b>${escapeHtml(x.titulo)}</b> <span class="meta">${escapeHtml(x.detalle || "")}${x.kg ? ` · ${x.kg.toFixed(x.kg < 1 ? 2 : 1)} kg` : ""}</span>
        ${x.nota ? `<div style="color:${color};font-size:13px;">${escapeHtml(x.nota)}</div>` : ""}</div>
      <div style="display:flex;gap:6px;flex:none;flex-wrap:wrap;justify-content:flex-end;">
        ${x.estado === "guardado" && x.tipo === "pedido" ? `<button type="button" class="btn-secondary" data-pm-ya="${escapeHtml(x.id)}" style="padding:4px 10px;font-size:12px;">▶️ Ya puede salir</button>` : ""}
        ${pmProductos(x) ? `<button type="button" class="btn-secondary" data-pm-ver="${x.tipo}:${escapeHtml(x.id)}" aria-expanded="${pmAbiertos.has(`${x.tipo}:${x.id}`)}" style="padding:4px 10px;font-size:12px;">${pmAbiertos.has(`${x.tipo}:${x.id}`) ? "Ocultar ▴" : "Ver productos ▾"}</button>`
          : x.go ? `<button type="button" class="btn-secondary" data-global-go="${x.go.go}" data-global-q="${escapeHtml(x.go.q)}"${x.go.first ? ` data-global-first="${escapeHtml(x.go.first)}"` : ""} style="padding:4px 10px;font-size:12px;">Abrir</button>` : ""}
      </div></div>${pmAbiertos.has(`${x.tipo}:${x.id}`) ? pmProductosHTML(x) : ""}`;
  }

  /* Lista de productos de un pedido o apartado, para verla ahí mismo en
     Por mandar sin irse a otra pantalla. */
  function pmProductos(x) {
    if (x.tipo === "pedido") return (x.o && x.o.items) || null;
    if (x.tipo === "apartado") return (x.a && x.a.items) || null;
    return null;
  }
  function pmProductosHTML(x) {
    const items = pmProductos(x) || [];
    const total = items.reduce((t, it) => t + (Number(it.qty) || 0), 0);
    const fila = (it) => `<li style="padding:3px 0;"><b>${Number(it.qty) || 0} ×</b> ${it.marca ? `<span class="meta">${escapeHtml(it.marca)} ·</span> ` : ""}${escapeHtml(it.nombre || it.sku || "")}${it.variante ? ` · ${escapeHtml(it.variante)}` : ""}${it.tamano ? ` <span class="meta">(${escapeHtml(it.tamano)})</span>` : ""}${it.enStock === false && x.tipo === "pedido" ? ` <span class="meta">🇰🇷</span>` : ""}</li>`;
    return `<div data-pm-prod style="margin:2px 0 8px ${x.estado === "listo" ? "30px" : "0"};background:#faf7fb;border-radius:10px;padding:8px 12px;">
      <ul style="margin:0;padding-left:18px;font-size:14px;">${items.map(fila).join("")}</ul>
      <div class="meta" style="margin-top:6px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;">${total} pieza${total === 1 ? "" : "s"} en total${x.go ? ` · <button type="button" class="link-btn" data-global-go="${x.go.go}" data-global-q="${escapeHtml(x.go.q)}"${x.go.first ? ` data-global-first="${escapeHtml(x.go.first)}"` : ""} style="background:none;border:0;padding:0;color:#a33a63;text-decoration:underline;cursor:pointer;font-size:13px;">Ir al ${x.tipo === "apartado" ? "apartado" : "pedido"} completo ›</button>` : ""}</div>
    </div>`;
  }

  function pmCajaHTML(g) {
    const c = pmCaja;
    if (!c || c.key !== g.id) return "";
    if (c.paso === "dir") {
      const d = c.dir;
      const inp = (k, l, v, extra = "") => `<label>${l}<input data-pmf="${k}" type="text" value="${escapeHtml(v || "")}" ${extra}></label>`;
      return `<div style="background:#fdf6f9;border:2px solid #f0d5e0;border-radius:14px;padding:12px;margin-top:10px;">
        <div style="font-weight:700;">📦 Armar la caja: ${c.paqueteIds.length ? `${c.paqueteIds.length} paquete${c.paqueteIds.length > 1 ? "s" : ""}` : ""}${c.paqueteIds.length && c.orderIds.length ? " + " : ""}${c.orderIds.length ? `${c.orderIds.length} pedido${c.orderIds.length > 1 ? "s" : ""}` : ""}</div>
        <div class="meta">¿A dónde va? Revisa la dirección; en el siguiente paso eliges paquetería y se hace la guía.</div>
        ${c.orderIds.length || (c.apartadoIds || []).length ? `<button type="button" class="btn-primary" data-pm-checklist style="padding:6px 12px;font-size:13px;margin:6px 0;">✅ Checklist para armar la caja</button>` : ""}
        <div class="grid" style="margin-top:8px;">${inp("nombre", "Nombre de quien recibe", d.nombre)}${inp("telefono", "Teléfono", d.telefono)}${inp("calle", "Calle y número", d.calle)}${inp("colonia", "Colonia", d.colonia)}${inp("ciudad", "Ciudad", d.ciudad)}${inp("estado", "Estado", d.estado)}${inp("cp", "Código postal", d.cp, 'maxlength="5" inputmode="numeric"')}${inp("referencias", "Referencias", d.referencias)}</div>
        <div data-pm-err style="color:#b33660;font-size:13px;margin-top:6px;"></div>
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;"><button type="button" class="btn-primary" data-pm-dir-seguir>Seguir: elegir paquetería ›</button><button type="button" class="btn-secondary" data-pm-cancelar>Cancelar</button></div>
      </div>`;
    }
    // paso "guia": mismo formulario de guía de Dirección americana.
    const nota = c.pagado > 0 ? `<div class="meta" style="margin-top:6px;">💡 En sus pedidos ya pagó ${formatPrice(c.pagado)} de envío; abajo se le descuenta del envío de esta caja (puedes cambiarlo).</div>` : "";
    if (c.envioId) {
      const e = swmData.envios.find((x) => x.id === c.envioId);
      if (!e) return `<div class="meta">Cargando el envío…</div>`;
      return `<div class="swm-card" data-swm-id="${escapeHtml(e.id)}" data-kind="envio" data-pm-key="${escapeHtml(g.id)}" data-pm-pagado="${c.pagado || 0}" style="margin-top:10px;border:2px solid #f0d5e0;">
        <h4><span>📦 Caja ${escapeHtml(e.folio)}</span><button type="button" class="btn-secondary" data-pm-cancelar style="padding:4px 10px;font-size:12px;">Cerrar</button></h4>
        <div class="meta">${c.paqueteIds.length} paquete${c.paqueteIds.length === 1 ? "" : "s"}${c.orderIds.length ? ` + ${c.orderIds.length} pedido${c.orderIds.length === 1 ? "" : "s"}` : ""}. A ella le llega el cobro del envío; cuando pague, sale su guía${c.orderIds.length ? " y sus pedidos se marcan enviados" : ""}.</div>${nota}
        ${c.orderIds.length ? `<button type="button" class="btn-primary" data-pm-checklist style="padding:6px 12px;font-size:13px;margin:6px 0;">✅ Checklist de los productos de sus pedidos</button>` : ""}
        ${swmGuiaForm({ ...e, kgExtra: c.kgOrdenes }, true)}</div>`;
    }
    const nCaja = c.orderIds.length + (c.apartadoIds || []).length;
    const soloApartados = !c.orderId;
    const primario = c.orderId || c.apartadoId;
    return `<div class="swm-card" data-swm-id="${escapeHtml(primario)}" data-kind="orden" data-guia-kind="${soloApartados ? "apartado" : "orden"}" data-apartado-ids="${escapeHtml((c.apartadoIds || []).join(","))}" data-pm-key="${escapeHtml(g.id)}" style="margin-top:10px;border:2px solid #f0d5e0;">
      <h4><span>📦 Caja con ${nCaja} ${(c.apartadoIds || []).length && !c.orderIds.length ? "apartado" : "pedido"}${nCaja === 1 ? "" : "s"}${(c.apartadoIds || []).length && c.orderIds.length ? ` (${(c.apartadoIds || []).length} del Sephora Sale)` : ""}</span><button type="button" class="btn-secondary" data-pm-cancelar style="padding:4px 10px;font-size:12px;">Cerrar</button></h4>
      <div class="meta">Su envío ya está pagado. Al hacer la guía, todo se marca enviado junto y se le avisa.</div>
      <button type="button" class="btn-primary" data-pm-checklist style="padding:6px 12px;font-size:13px;margin:6px 0;">✅ Checklist para armar la caja</button>
      ${swmGuiaForm({ id: primario, email: g.email, direccion: c.dir, paqueteIds: [], kgExtra: c.kgOrdenes, sugerido: {} }, "orden")}</div>`;
  }

  function pmCardHTML(g) {
    const sel = pmSeleccion(g);
    const chips = [g.listo.length ? `✅ ${g.listo.length} lista${g.listo.length === 1 ? "" : "s"}` : "", g.guardado.length ? `🧺 ${g.guardado.length} guardada${g.guardado.length === 1 ? "" : "s"}` : "", (g.falta.length + g.proceso.length) ? `⏳ ${g.falta.length + g.proceso.length} en proceso` : ""].filter(Boolean).join(" · ");
    const wa = waLinkFromPhone(g.tel);
    const abierta = pmCaja && pmCaja.key === g.id;
    return `<div class="swm-card" data-pm-card="${escapeHtml(g.id)}" style="margin:12px 0;border:2px solid #f6dfe7;">
      <h4><span>👤 ${escapeHtml(g.nombre || g.email || g.tel || "Clienta")}${g.casillero ? ` · ${escapeHtml(g.casillero)}` : ""}</span><span class="meta" style="font-weight:600;">${chips}</span></h4>
      <div class="meta">${[g.email, g.tel].filter(Boolean).map(escapeHtml).join(" · ")}${wa ? ` · <a href="${escapeHtml(wa)}" target="_blank" rel="noopener">WhatsApp</a>` : ""}</div>
      ${g.pidio ? `<div style="background:#fff1f6;border:2px solid #f4b8cc;border-radius:12px;padding:8px 12px;margin-top:8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:space-between;">
        <b style="font-size:14px;">💬 Pidió que le juntes todo en una sola caja <span class="meta" style="font-weight:400;">(${new Date(g.pidio.createdAt).toLocaleDateString("es-MX", { day: "numeric", month: "short" })})</span></b>
        <button type="button" class="btn-secondary" data-pm-atendida="${escapeHtml(g.email)}" style="padding:4px 10px;font-size:12px;">✅ Ya lo atendí</button></div>` : ""}
      ${g.listo.length ? `<div style="margin-top:8px;font-weight:700;color:#17803d;font-size:14px;">✅ Listo para mandar <span class="meta" style="font-weight:400;">(quita la palomita a lo que no vaya en esta caja)</span></div>${g.listo.map((x) => pmFila(x, { check: true, marcada: !pmDesmarcados.has(`${x.tipo}:${x.id}`) })).join("")}
        ${abierta ? "" : `<div style="margin-top:10px;"><button type="button" class="btn-primary" data-pm-armar="${escapeHtml(g.id)}" ${sel.length ? "" : "disabled"}>📦 Armar caja con lo marcado (${sel.length})</button></div>`}` : ""}
      ${pmCajaHTML(g)}
      ${g.guardado.length ? `<div style="margin-top:10px;font-weight:700;color:#6a45b8;font-size:14px;">🧺 No mandar todavía</div>${g.guardado.map((x) => pmFila(x)).join("")}` : ""}
      ${(g.falta.length || g.proceso.length) ? `<div style="margin-top:10px;font-weight:700;color:#8a5a00;font-size:14px;">⏳ Todavía falta / en proceso</div>${[...g.proceso, ...g.falta].map((x) => pmFila(x)).join("")}` : ""}
    </div>`;
  }

  const PM_AYUDA = "Aquí está todo lo de cada clienta junto, venga de donde venga (tienda, Corea, Sephora Sale, su casillero o Personal shopper). 1) Abre “✅ Listas para mandar”: cada tarjeta es una clienta con lo que ya puedes mandar. 2) Quita la palomita a lo que no vaya en esa caja y toca “📦 Armar caja”. 3) Revisa la dirección, elige paquetería y se hace UNA sola guía. Si lleva cosas de su casillero, a ella le llega el cobro del envío y, cuando paga, sale su guía y sus pedidos se marcan enviados solos; si solo son pedidos de la tienda, se marcan enviados al momento. Lo que le falta (Corea, cruzar, pago) sale abajo, en gris, para que no se te olvide.";

  function renderPmAdmin() {
    const label = document.querySelector("#swm-panel .filters-label");
    if (label) label.textContent = "📦 Por mandar";
    const ayuda = document.querySelector("#swm-panel details.help p");
    if (ayuda) ayuda.textContent = PM_AYUDA;
    const todos = pmGrupos();
    const FILTROS = [
      ["listas", "✅ Listas para mandar", (g) => g.listo.length || g.pidio],
      ["guardadas", "🧺 No mandar todavía", (g) => g.guardado.length],
      ["faltan", "⏳ Todavía falta algo", (g) => g.falta.length || g.proceso.length],
      ["todas", "Todas", () => true],
    ];
    document.getElementById("swm-filters").innerHTML = `${FILTROS.map(([k, l, fn]) => `<button type="button" class="btn-secondary ${pmFiltro === k ? "on" : ""}" data-pm-filtro="${k}">${l} (${todos.filter(fn).length})</button>`).join("")}
      <input type="search" id="swm-search" placeholder="🔍 Busca una clienta, pedido, calle, ciudad…" value="${escapeHtml(swmSearch)}" style="flex:1;min-width:200px;padding:10px 12px;border-radius:8px;border:1px solid #ddd;font-size:14px;">`;
    const q = swmSearch.trim();
    const fn = FILTROS.find(([k]) => k === pmFiltro)[2];
    let lista = todos.filter((g) => (q ? pmBuscar(g, q) : fn(g)) || (pmCaja && pmCaja.key === g.id));
    lista.sort((a, b) => (!!b.pidio - !!a.pidio) || (b.listo.length - a.listo.length) || String(a.nombre).localeCompare(String(b.nombre), "es"));
    const vacio = { listas: "Nada listo por ahora 🎉. Cuando una clienta tenga algo para mandar, aparece aquí.", guardadas: "Nadie te pidió que le guardes su pedido.", faltan: "No hay nada en proceso.", todas: "Todavía no hay nada." }[pmFiltro];
    document.getElementById("swm-empty").style.display = "none";
    const aviso = pmAviso ? `<div style="background:#eaf8f0;border:1px solid #bfe6cf;border-radius:14px;padding:12px;margin:10px 0;">
      <div style="font-weight:700;">${pmAviso.html}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">${pmAviso.tel ? `<a class="btn-primary" style="text-decoration:none;padding:8px 14px;" target="_blank" rel="noopener" href="${escapeHtml(`${waLinkFromPhone(pmAviso.tel)}?text=${encodeURIComponent(pmAviso.texto)}`)}">💬 Avisarle por WhatsApp</a>` : ""}<button type="button" class="btn-secondary" data-pm-aviso-cerrar>Cerrar</button></div></div>` : "";
    document.getElementById("swm-list").innerHTML = aviso
      + (lista.map(pmCardHTML).join("") || `<p style="color:#5f5866;font-size:14px;">${q ? `No encontré nada con "${escapeHtml(q)}".` : vacio}</p>`);
  }

  // Quita de la vista el aviso y la caja abierta, y refresca contadores.
  function pmTerminar(card, data) {
    const c = pmCaja;
    if (!c) return;
    const wa = c.tel ? true : false;
    if (card.dataset.guiaKind === "orden" || card.dataset.guiaKind === "apartado") {
      const o = data.order || { trackingNumber: data.trackingNumber, carrier: data.carrier };
      const nCaja = c.orderIds.length + (c.apartadoIds || []).length;
      pmAviso = { nombre: c.nombre, tel: c.tel, html: `✅ Caja de ${escapeHtml(c.nombre || "la clienta")} lista: guía ${escapeHtml(o.trackingNumber || "")}${o.carrier ? ` (${escapeHtml(o.carrier)})` : ""}. ${nCaja === 1 ? "Su pedido ya está marcado enviado" : `Sus ${nCaja} pedidos ya están marcados enviados`} y se le avisó.${data.whatsappSent ? " Ya se le avisó por WhatsApp." : ""}`,
        texto: `Hola${c.nombre ? ` ${String(c.nombre).split(/\s+/)[0]}` : ""} 💕 ¡Ya salió tu caja! 📦 Paquetería: ${o.carrier || ""} · Guía: ${o.trackingNumber || ""}. Incluye todos tus pedidos. Cualquier cosa aquí estoy 🌸` };
    } else {
      const e = data.envio || {};
      pmAviso = { nombre: c.nombre, tel: c.tel, html: `✅ Caja ${escapeHtml(e.folio || "")} de ${escapeHtml(c.nombre || "la clienta")} lista. ${data.guiaAnticipada ? `Ya le llegó el cobro del envío (${formatPrice(e.cotizacion ? e.cotizacion.total : 0)}); cuando pague, sale su guía${c.orderIds.length ? " y sus pedidos se marcan enviados" : ""}.` : "Ya salió con su guía."}`,
        texto: `Hola${c.nombre ? ` ${String(c.nombre).split(/\s+/)[0]}` : ""} 💕 Ya preparé tu caja ${e.folio || ""} 📦. Te mandé el cobro del envío; entra aquí para pagarlo y en cuanto pague te llega tu guía: ${location.origin}/?ver=direccion-americana` };
    }
    pmCaja = null;
    pmDesmarcados.clear();
  }

  async function pmApi(url, body) {
    const res = await fetch(`/.netlify/functions/${url}`, { method: "POST", headers: { "Content-Type": "application/json", "x-admin-key": adminKey }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "No se pudo guardar.");
    return data;
  }
  const pmActualizaOrdenes = (data) => (data.orders || []).forEach((u) => { const i = allOrders.findIndex((x) => x.id === u.id); if (i >= 0) allOrders[i] = u; });

  document.getElementById("swm-panel").addEventListener("click", async (e) => {
    const t = e.target;
    const f = t.closest("[data-pm-filtro]");
    if (f) { e.stopPropagation(); pmFiltro = f.dataset.pmFiltro; swmSearch = ""; renderSwmAdmin(); return; }
    if (t.closest("[data-pm-aviso-cerrar]")) { e.stopPropagation(); pmAviso = null; renderSwmAdmin(); return; }
    if (t.closest("[data-pm-cancelar]")) { e.stopPropagation(); pmCaja = null; renderSwmAdmin(); return; }
    if (t.closest("[data-pm-checklist]")) { e.stopPropagation(); if (pmCaja) packOpenCaja({ orderIds: pmCaja.orderIds || [], apartadoIds: pmCaja.apartadoIds || [], nombre: pmCaja.nombre }); return; }
    const ver = t.closest("[data-pm-ver]");
    if (ver) { e.stopPropagation();
      // Sin volver a pintar todo (no se pierde lo que Mae haya escrito en la caja).
      const k = ver.dataset.pmVer;
      const fila = ver.closest("[data-pm-fila]");
      const abierto = fila && fila.nextElementSibling && fila.nextElementSibling.matches("[data-pm-prod]") ? fila.nextElementSibling : null;
      if (abierto) { abierto.remove(); pmAbiertos.delete(k); ver.textContent = "Ver productos ▾"; ver.setAttribute("aria-expanded", "false"); return; }
      const [tipo, ...rest] = k.split(":");
      const x = pmGrupos().flatMap((g) => g.entradas).find((y) => y.tipo === tipo && y.id === rest.join(":"));
      if (!x || !fila) return;
      fila.insertAdjacentHTML("afterend", pmProductosHTML(x));
      pmAbiertos.add(k); ver.textContent = "Ocultar ▴"; ver.setAttribute("aria-expanded", "true");
      return;
    }
    const chk = t.closest("[data-pm-chk]");
    if (chk) { e.stopPropagation();
      if (chk.checked) pmDesmarcados.delete(chk.dataset.pmChk); else pmDesmarcados.add(chk.dataset.pmChk);
      const card = chk.closest("[data-pm-card]");
      const g = pmGrupos().find((x) => x.id === card.dataset.pmCard);
      const b = card.querySelector("[data-pm-armar]");
      if (g && b) { const n = pmSeleccion(g).length; b.textContent = `📦 Armar caja con lo marcado (${n})`; b.disabled = !n; }
      return;
    }
    const at = t.closest("[data-pm-atendida]");
    if (at) {
      e.stopPropagation();
      at.disabled = true;
      try { await pmApi("admin-swm", { accion: "juntar_atendida", email: at.dataset.pmAtendida }); await loadSwm({ quiet: true }); } catch (err) { alert(err.message); }
      renderSwmAdmin();
      return;
    }
    const ya = t.closest("[data-pm-ya]");
    if (ya) { e.stopPropagation();
      ya.disabled = true;
      try { pmActualizaOrdenes(await pmApi("admin-link-orders", { orderId: ya.dataset.pmYa, espera: false })); showToast("▶️ Listo: ya puede salir."); applyFilters(); } catch (err) { alert(err.message); ya.disabled = false; }
      renderSwmAdmin();
      return;
    }
    const armar = t.closest("[data-pm-armar]");
    if (armar) { e.stopPropagation();
      const g = pmGrupos().find((x) => x.id === armar.dataset.pmArmar);
      if (!g) return;
      const sel = pmSeleccion(g);
      if (!sel.length) return;
      const ords = sel.filter((x) => x.tipo === "pedido");
      const paqs = sel.filter((x) => x.tipo === "paquete");
      const aps = sel.filter((x) => x.tipo === "apartado");
      if (paqs.length && aps.length) { alert("Los del Sephora Sale no se mezclan con paquetes del casillero. Quita la palomita a unos o a otros y arma dos cajas."); return; }
      const kgOrdenes = [...ords, ...aps].reduce((s, x) => s + (x.kg || 0), 0);
      const dirBase = pmDireccion(g);
      const dirAp = aps[0] && aps[0].a.direccion && aps[0].a.direccion.cp ? { ...dirBase, ...aps[0].a.direccion } : dirBase;
      pmCaja = { key: g.id, nombre: g.nombre, tel: g.tel, email: g.email, orderIds: ords.map((x) => x.id), apartadoIds: aps.map((x) => x.id), paqueteIds: paqs.map((x) => x.id), kgOrdenes,
        pagado: paqs.length ? ords.reduce((s, x) => s + (Number(x.o.shippingNacionalMXN) || 0), 0) : 0, dir: ords.length ? dirBase : dirAp, paso: "dir", envioId: "", orderId: "", apartadoId: "" };
      if (!paqs.length) {
        // Solo pedidos de la tienda: se ligan (para que salgan juntos) y se pasa directo a la guía.
        armar.disabled = true;
        try {
          if (ords.length > 1) pmActualizaOrdenes(await pmApi("admin-link-orders", { orderIds: ords.map((x) => x.id) }));
        } catch (err) { alert(err.message); pmCaja = null; armar.disabled = false; return; }
        pmCaja.orderId = ords[0] ? ords[0].id : ""; pmCaja.apartadoId = aps[0] ? aps[0].id : ""; pmCaja.paso = "guia";
      }
      renderSwmAdmin();
      const el = document.querySelector(`[data-pm-card="${CSS.escape(g.id)}"] [data-swm-id], [data-pm-card="${CSS.escape(g.id)}"] [data-pmf]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (t.closest("[data-pm-dir-seguir]")) { e.stopPropagation();
      const box = t.closest("[data-pm-card]");
      const v = (k) => (box.querySelector(`[data-pmf="${k}"]`) || {}).value?.trim() || "";
      const dir = { nombre: v("nombre"), telefono: v("telefono"), calle: v("calle"), colonia: v("colonia"), ciudad: v("ciudad"), estado: v("estado"), cp: v("cp"), referencias: v("referencias") };
      const err = box.querySelector("[data-pm-err]");
      if (!dir.nombre || !dir.telefono || !dir.calle || !dir.ciudad || !/^\d{5}$/.test(dir.cp)) { err.textContent = "Completa nombre, teléfono, calle y número, ciudad y código postal de 5 dígitos."; return; }
      const btn = t.closest("[data-pm-dir-seguir]");
      btn.disabled = true; btn.textContent = "Preparando la caja…";
      try {
        const r = await pmApi("admin-swm", { accion: "crear_envio", email: pmCaja.email, paqueteIds: pmCaja.paqueteIds, direccion: dir });
        if (pmCaja.orderIds.length) pmActualizaOrdenes(await pmApi("admin-link-orders", { orderIds: pmCaja.orderIds, cajaEnvioId: r.envio.id }));
        pmCaja.dir = dir; pmCaja.envioId = r.envio.id; pmCaja.paso = "guia";
        await loadSwm({ quiet: true });
        applyFilters();
      } catch (ex) { err.textContent = ex.message; btn.disabled = false; btn.textContent = "Seguir: elegir paquetería ›"; return; }
      renderSwmAdmin();
      return;
    }
  }, true);

  /* ---------- 🛍️ Personal shopper: las compras que Mae hace por sus
     clientas, en un solo lugar: factura → cobro → compra → cruce →
     dirección y envío. Usa la misma información y los mismos botones que
     Dirección americana (comparten el panel swm-panel). ---------- */
  let swmModo = ""; // "ps" = vista de Personal shopper
  const PS_AYUDA = "Aquí está todo lo que compras tú por tus clientas, en tienda o en línea (lo que ellas compran por su cuenta está en Dirección americana). 1) Compra en tienda: toca “🧾 Nueva factura”, busca a la clienta, sube la foto de tu factura y pon el total en pesos. Compra en línea: “🛒 Nueva cotización” con los artículos en dólares; cuando la pague, la compras y la registras con “Ya compré”. También llegan aquí las que te piden en “Que Mae compre por mí”. 2) Mándale el link por WhatsApp: ahí ve la foto de su factura y paga con tarjeta o transferencia. Si te paga por fuera, toca “✅ Ya me pagó (por fuera)”. 3) En cuanto paga, pasa sola a “🚚 Por mandar” y le pido su dirección de envío. 4) Cuando la cruces, toca “🇲🇽 Ya cruzó a México” con el peso: su envío se arma solo con la dirección que puso. 5) Genera la guía: a ella le llega el cobro del envío y en cuanto paga, le llega su guía. Si no tiene dirección, toca “📍 Pedirle su dirección por WhatsApp”.";
  let psTab = "cobrar";
  let psNuevaTipo = "tienda"; // "tienda" (factura en foto) o "linea" (cotización con artículos en dólares)
  const psPaquetes = (c) => (c.paqueteIds || []).map((id) => swmData.paquetes.find((p) => p.id === id)).filter(Boolean);
  const psEnvios = (c) => { const ids = new Set(c.paqueteIds || []); return swmData.envios.filter((e) => e.status !== "cancelado" && (e.paqueteIds || []).some((x) => ids.has(x))); };
  function psEtapa(c) {
    if (c.status === "cancelado") return "terminadas";
    if (["solicitud", "cotizado"].includes(c.status)) return "cobrar";
    if (c.status === "pagado") return "pagadas";
    const ps = psPaquetes(c).filter((p) => p.status !== "cancelado");
    return ps.length && ps.every((p) => ["enviado", "entregado"].includes(p.status)) ? "terminadas" : "envio";
  }
  const PS_TABS = [
    ["cobrar", "💳 Por cobrar"],
    ["pagadas", "✅ Pagadas"],
    ["envio", "🚚 Por mandar"],
    ["terminadas", "🎁 Terminadas"],
  ];
  const psCasilleroLink = () => `${location.origin}/?ver=direccion-americana`;
  function psDireccionWa(c, cruzo) {
    const wa = waLinkFromPhone(c.phone);
    const nombre = String(c.name || "").split(/\s+/)[0];
    const txt = `Hola${nombre ? ` ${nombre}` : ""} 💕 ${cruzo ? `Tu compra ${c.folio} ya está en México 🇲🇽` : `Ya tengo tu compra ${c.folio} 🛍️`}. Para mandártela necesito tu dirección: ponla aquí en "Tu dirección de envío en México" (entra con tu correo ${c.email}) y en cuanto la tenga te llega el cobro del envío.\n${psCasilleroLink()}`;
    return wa ? `${wa}?text=${encodeURIComponent(txt)}` : `https://wa.me/?text=${encodeURIComponent(txt)}`;
  }
  // Le avisa a la clienta lo que sigue según cómo va su compra.
  function psSiguienteHTML(c) {
    const pk = psPaquetes(c).filter((p) => p.status !== "cancelado");
    const envs = psEnvios(c);
    const out = [];
    if (c.status === "pagado") {
      out.push(c.yaComprado
        ? `<button type="button" class="btn-secondary" data-ps-en-mano="${escapeHtml(c.id)}">📦 Pasar a “Por mandar”</button><span class="meta">Normalmente pasa solo al pagarse.</span>`
        : `<span class="meta">Cuando la compres, llena abajo "Ya compré" con su número de orden.</span>`);
    }
    if (c.status === "comprado") {
      const cruzo = pk.some((p) => p.enMexicoAt);
      const sinEnvio = cruzo && !envs.length;
      if (sinEnvio) out.push(`<div class="meta" style="color:#b33660;font-weight:700;">⚠️ Ya cruzó pero todavía no tiene su dirección de envío guardada: pídesela.</div>`);
      if (!envs.length) out.push(`<a class="btn-secondary" style="text-decoration:none;padding:6px 12px;font-size:13px;" target="_blank" rel="noopener" href="${escapeHtml(psDireccionWa(c, cruzo))}">📍 Pedirle su dirección por WhatsApp</a>`);
    }
    return out.length ? `<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:8px;">${out.join("")}</div>` : "";
  }
  function psCard(c) {
    const pk = psPaquetes(c).filter((p) => !["enviado", "entregado", "cancelado"].includes(p.status) || psEtapa(c) === "terminadas");
    const envs = psEnvios(c);
    const enEnvio = new Set(envs.flatMap((e) => e.paqueteIds || []));
    return `<div class="ps-wrap" style="border:2px solid #f6dfe7;border-radius:18px;padding:10px;margin:12px 0;">
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:6px;">
        ${(c.facturaFotos || []).length
          ? c.facturaFotos.map((f, i) => `<button type="button" class="btn-secondary" data-swm-file="foto/${escapeHtml(f)}" style="padding:6px 12px;font-size:13px;">🧾 Factura${c.facturaFotos.length > 1 ? ` ${i + 1}` : ""}</button>`).join("")
          : `<button type="button" class="btn-secondary" data-ps-factura="${escapeHtml(c.id)}" style="padding:6px 12px;font-size:13px;">📄 Ver / descargar factura</button>`}
        ${c.yaComprado ? `<span class="meta">🛒 Comprado en tienda${c.fechaCompra ? ` el ${escapeHtml(new Date(`${c.fechaCompra}T12:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "long" }))}` : ""}</span>` : ""}
      </div>
      ${swmCompraCard(c)}
      ${psSiguienteHTML(c)}
      ${(() => {
        const sueltos = pk.filter((p) => !enEnvio.has(p.id));
        if (!sueltos.length && !envs.length) return "";
        swmCompacto = true;
        try {
          return `<div class="ps-sub"><div class="ps-sub-t">📦 Paquetes y envío de esta compra</div>${sueltos.map(swmPaqueteCard).join("")}${envs.map(swmEnvioCard).join("")}</div>`;
        } finally { swmCompacto = false; }
      })()}
    </div>`;
  }

  function renderPsAdmin() {
    const label = document.querySelector("#swm-panel .filters-label");
    if (label) label.textContent = "🛍️ Personal shopper";
    const ayuda = document.querySelector("#swm-panel details.help p");
    if (ayuda) ayuda.textContent = PS_AYUDA;
    const compras = swmData.compras;
    const cuenta = (k) => compras.filter((c) => psEtapa(c) === k).length;
    document.getElementById("swm-filters").innerHTML = `${PS_TABS.filter(([k]) => k !== "pagadas" || cuenta(k) || psTab === k).map(([k, l]) => `<button type="button" class="btn-secondary ${psTab === k ? "on" : ""}" data-ps-tab="${k}">${l} (${cuenta(k)})</button>`).join("")}
      <input type="search" id="swm-search" placeholder="🔍 Busca por clienta, folio, tienda, producto…" value="${escapeHtml(swmSearch)}" style="flex:1;min-width:200px;padding:10px 12px;border-radius:8px;border:1px solid #ddd;font-size:14px;">
      <button type="button" class="btn-primary" data-swm-nc-toggle data-ps-tipo="tienda">🧾 Nueva factura (compra en tienda)</button>
      <button type="button" class="btn-secondary" data-swm-nc-toggle data-ps-tipo="linea">🛒 Nueva cotización (compra en línea)</button>
      <div id="swm-nc-box" style="width:100%;">${swmNuevaCompraOpen ? swmNuevaCompraForm(null, { ps: psNuevaTipo !== "linea" }) : ""}</div>`;
    const q = swmSearch.trim();
    const match = (c) => !q || swmMatches(c, q) || buscaEnTodo((c.cotizacion && c.cotizacion.items || []).map((x) => x.nombre), q)
      || psPaquetes(c).some((p) => swmMatches(p, q)) || psEnvios(c).some((e) => swmMatches(e, q));
    const lista = q ? compras.filter(match) : compras.filter((c) => psEtapa(c) === psTab);
    lista.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    const vacio = { cobrar: "No hay facturas por cobrar. Toca “🧾 Nueva factura” para hacer una.", pagadas: "No hay compras pagadas pendientes de comprar.", envio: "No hay compras por mandar.", terminadas: "Todavía no hay compras terminadas." }[psTab];
    document.getElementById("swm-empty").style.display = "none";
    document.getElementById("swm-list").innerHTML = (q ? globalHitsHTML(q, "ps") : "")
      + (lista.map(psCard).join("") || `<p style="color:#5f5866;font-size:14px;">${q ? `No encontré nada con "${escapeHtml(q)}".` : vacio}</p>`);
  }

  /* Factura para mandarle a la clienta (se abre en otra pestaña; de ahí se
     imprime o se guarda en PDF). */
  function psFacturaHTML(c) {
    const q = c.cotizacion || {};
    const items = (q.items || []).filter((x) => !x.envio);
    const envioTienda = (q.items || []).find((x) => x.envio);
    const usd = (n) => `US$${(Number(n) || 0).toFixed(2)}`;
    const conUSD = items.some((x) => x.precioUSD > 0);
    const subUSD = items.reduce((t, x) => t + (x.precioUSD || 0) * x.cantidad, 0);
    const tax = q.taxPct != null ? q.taxPct : 0;
    const taxUSD = Math.round(subUSD * tax) / 100;
    const totUSD = subUSD + taxUSD + (envioTienda ? envioTienda.precioUSD || 0 : 0);
    const fecha = new Date(c.createdAt).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
    const pagada = c.pago && c.pago.status === "pagado";
    const fila = (a, b, strong) => `<tr${strong ? ' class="strong"' : ""}><td>${a}</td><td class="r">${b}</td></tr>`;
    return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Factura ${escapeHtml(c.folio)} · Alpacca</title>
<style>
  body{font-family:Inter,system-ui,sans-serif;color:#2b1f25;background:#fdf2f6;margin:0;padding:24px 12px;}
  .hoja{max-width:720px;margin:0 auto;background:#fff;border-radius:18px;padding:28px 24px;box-shadow:0 2px 20px rgba(196,70,110,.08);}
  .top{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;border-bottom:2px solid #f6dfe7;padding-bottom:16px;}
  .top img{height:56px} h1{font-size:20px;margin:0 0 4px;color:#c4466e} .muted{color:#7d6570;font-size:13px;line-height:1.5}
  table{width:100%;border-collapse:collapse;margin-top:16px;font-size:14px} th{text-align:left;font-size:12px;color:#7d6570;border-bottom:1px solid #f6dfe7;padding:8px 6px}
  td{padding:8px 6px;border-bottom:1px solid #f9edf2;vertical-align:top} .r{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
  .tot{margin-top:14px;margin-left:auto;max-width:360px;font-size:14px} .tot td{border:none;padding:4px 6px} .tot .strong td{font-size:18px;font-weight:800;color:#c4466e;border-top:2px solid #f6dfe7;padding-top:10px}
  .pill{display:inline-block;border-radius:999px;padding:4px 12px;font-weight:700;font-size:13px} .ok{background:#eaf8f0;color:#17803d} .pend{background:#fff1d8;color:#8a5a00}
  .pagar{margin-top:18px;background:#fdf2f6;border-radius:12px;padding:12px 14px;font-size:14px;word-break:break-all}
  .acc{max-width:720px;margin:14px auto 0;display:flex;gap:8px;justify-content:center} .acc button{border:1.5px solid #f4b8cc;background:#fde8f0;color:#b33660;border-radius:999px;padding:10px 18px;font-weight:700;font-size:14px;cursor:pointer}
  @media print{body{background:#fff;padding:0}.hoja{box-shadow:none}.acc{display:none}}
</style></head><body>
<div class="hoja">
  <div class="top">
    <div><img src="${location.origin}/assets/logo-wordmark.png" alt="Alpacca"><div class="muted">Personal shopper · alpacca.mx</div></div>
    <div style="text-align:right"><h1>Factura ${escapeHtml(c.folio)}</h1><div class="muted">${fecha}${c.fechaCompra ? `<br>Compra en tienda: ${escapeHtml(new Date(`${c.fechaCompra}T12:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" }))}` : ""}${c.tienda ? `<br>Tienda: ${escapeHtml(c.tienda)}` : ""}</div>
      <div style="margin-top:6px;"><span class="pill ${pagada ? "ok" : "pend"}">${pagada ? "✅ Pagada" : "⏳ Pendiente de pago"}</span></div></div>
  </div>
  <div class="muted" style="margin-top:12px;">Para: <b style="color:#2b1f25">${escapeHtml(c.name || "")}</b>${c.phone ? ` · ${escapeHtml(c.phone)}` : ""}</div>
  <table><thead><tr><th>Cant.</th><th>Artículo</th>${conUSD ? '<th class="r">Precio c/u</th><th class="r">Importe</th>' : '<th class="r">Importe</th>'}</tr></thead><tbody>
    ${items.map((x) => `<tr><td>${x.cantidad}</td><td>${escapeHtml(x.nombre)}${x.tono ? `<div class="muted">${escapeHtml(x.tono)}</div>` : ""}</td>${conUSD ? `<td class="r">${usd(x.precioUSD)}</td><td class="r">${usd(x.precioUSD * x.cantidad)}</td>` : `<td class="r">${formatPrice(x.precio * x.cantidad)}</td>`}</tr>`).join("")}
  </tbody></table>
  <table class="tot"><tbody>
    ${conUSD ? fila("Subtotal", usd(subUSD)) + (tax ? fila(`Tax (${tax}%)`, usd(taxUSD)) : "") + (envioTienda ? fila("Envío de la tienda", usd(envioTienda.precioUSD)) : "") + fila("Total en dólares", usd(totUSD)) + (q.tipoCambio ? fila(`Tipo de cambio`, `$${Number(q.tipoCambio).toFixed(2)} MXN`) : "") : ""}
    ${fila("Productos en pesos", formatPrice(q.productos))}
    ${q.cruce ? fila("Comisión y cruce a México (15%)", formatPrice(q.cruce)) : ""}
    ${q.descuento ? fila(`Descuento${q.cupon ? ` (${escapeHtml(q.cupon)})` : ""}`, `−${formatPrice(q.descuento)}`) : ""}
    ${fila("Total a pagar", formatPrice(q.total), true)}
  </tbody></table>
  ${pagada ? "" : `<div class="pagar">💳 Págala con tarjeta o transferencia aquí: <b>${escapeHtml(swmCompraLink(c))}</b></div>`}
  <p class="muted" style="margin-top:14px;">${c.cobro === "comision" ? "El cruce a México ya va incluido. " : "El cruce a México se cobra por peso cuando se envíe. "}El envío dentro de México se cobra aparte cuando tu compra cruce, según tu dirección.</p>
</div>
<div class="acc"><button onclick="window.print()">🖨️ Imprimir o guardar PDF</button></div>
</body></html>`;
  }

  function renderSwmAdmin() {
    if (swmModo === "ps") { renderPsAdmin(); return; }
    if (swmModo === "pm") { renderPmAdmin(); return; }
    conSoloDA(renderDaAdmin);
  }

  function renderDaAdmin() {
    { const label = document.querySelector("#swm-panel .filters-label"); if (label) label.textContent = "🇺🇸 Dirección americana";
      const ayuda = document.querySelector("#swm-panel details.help p"); if (ayuda) { if (!ayuda.dataset.swm) ayuda.dataset.swm = ayuda.textContent; ayuda.textContent = ayuda.dataset.swm; } }
    const pend = swmPendientes();
    const P = swmData.paquetes;
    const tabs = [
      ["acciones", `⚡ Por hacer (${swmNewCount})`],
      ["llegar", `⏳ Por llegar (${P.filter((p) => p.status === "registrado").length})`],
      ["almacen", `📥 En almacén (${P.filter((p) => p.status === "recibido" && !p.enMexicoAt).length})`],
      ["mexico", `🇲🇽 En México (${P.filter((p) => ["recibido", "en_envio"].includes(p.status) && p.enMexicoAt).length})`],
      ["sindueña", `❓ Sin dueña (${P.filter((p) => p.status === "sin_dueña").length})`],
      ["envios", `📦 Por mandar (${swmData.envios.filter((e) => !["enviado", "entregado", "cancelado"].includes(e.status)).length})`],
      ["enviados", `✈️ Enviados (${swmData.envios.filter((e) => e.status === "enviado").length})`],
      ["entregados", `✅ Entregados (${swmData.envios.filter((e) => e.status === "entregado").length})`],
      ["historial", "🗂️ Historial"],
    ];
    document.getElementById("swm-filters").innerHTML = `${tabs.map(([k, l]) => `<button type="button" class="btn-secondary ${swmTab === k ? "on" : ""}" data-swm-tab="${k}">${l}</button>`).join("")}
      <input type="search" id="swm-search" placeholder="🔍 Busca por nombre, folio, rastreo, calle, ciudad, estado, CP…" value="${escapeHtml(swmSearch)}" style="flex:1;min-width:200px;padding:10px 12px;border-radius:8px;border:1px solid #ddd;font-size:14px;">
      <button type="button" class="btn-primary" data-swm-sinreg-toggle>📦 Llegó un paquete sin registrar</button>
      <div id="swm-sinreg-box" style="width:100%;">${swmSinRegistroOpen ? swmSinRegistroForm() : ""}</div>`;
    let html = "";
    const sec = (title, items, fn) => (items.length ? `<h4 style="margin:14px 0 8px;font-size:15px;">${title} (${items.length})</h4>${swmPorClienta(items, fn, title)}` : "");
    const lista = (items, fn, vacio) => (items.length ? swmPorClienta(items, fn, swmTab) : `<p style="color:#5f5866;font-size:14px;">${vacio}</p>`);
    if (swmSearch.trim()) {
      html = globalHitsHTML(swmSearch.trim(), "swm") + (sec("Paquetes", P.filter((r) => swmMatches(r)), swmPaqueteCard) + sec("Compras", swmData.compras.filter((r) => swmMatches(r)), swmCompraCard) + sec("Envíos", swmData.envios.filter((r) => swmMatches(r)), swmEnvioCard)
        || `<p style="color:#5f5866;font-size:14px;">No encontré nada con "${escapeHtml(swmSearch)}" en Dirección americana.</p>`);
    } else if (swmTab === "acciones") {
      html = sec("🔎 Pagos por revisar", pend.pagos.filter(([, r]) => swmMatches(r)), ([k, r]) => (k === "compra" ? swmCompraCard(r) : k === "paquete" ? swmPaqueteCard(r) : swmEnvioCard(r)))
        + sec("🛍️ Compras por cotizar", pend.cotizarCompra.filter(swmMatches), swmCompraCard)
        + sec("🛒 Compras pagadas: hay que comprar", pend.comprar.filter(swmMatches), swmCompraCard)
        + sec("🚚 Envíos por cotizar", pend.cotizarEnvio.filter(swmMatches), swmEnvioCard)
        + sec("📦 Envíos pagados: hay que mandar", pend.enviar.filter(swmMatches), swmEnvioCard)
        + sec("❓ Paquetes sin dueña", pend.sinDuena.filter(swmMatches), swmPaqueteCard)
        + sec("📸 Revisiones y separaciones pedidas", pend.extras.filter(swmMatches), swmPaqueteCard)
        + sec("✏️ Ya corrigieron sus datos: revísalos", pend.correcciones.filter(swmMatches), swmPaqueteCard);
      if (!html) html = `<p style="color:#5f5866;font-size:14px;">No hay nada pendiente 🎉</p>`;
    } else if (swmTab === "llegar") {
      html = lista(P.filter((p) => p.status === "registrado" && swmMatches(p)), swmPaqueteCard, "No hay paquetes por llegar.");
    } else if (swmTab === "sindueña") {
      html = P.filter((p) => p.status === "sin_dueña").map(swmPaqueteCard).join("") || `<p style="color:#5f5866;font-size:14px;">No hay paquetes sin dueña.</p>`;
    } else if (swmTab === "almacen") {
      html = lista(P.filter((p) => p.status === "recibido" && !p.enMexicoAt && swmMatches(p)), swmPaqueteCard, "No hay paquetes en el almacén.");
    } else if (swmTab === "mexico") {
      const mx = P.filter((p) => ["recibido", "en_envio"].includes(p.status) && p.enMexicoAt && swmMatches(p));
      const porClienta = new Map();
      mx.forEach((p) => { const k = p.email || "—"; if (!porClienta.has(k)) porClienta.set(k, []); porClienta.get(k).push(p); });
      html = [...porClienta.entries()].map(([email, ps]) => swmMexicoGrupo(email, ps)).join("") || `<p style="color:#5f5866;font-size:14px;">No hay paquetes cruzados a México.</p>`;
    } else if (swmTab === "compras") {
      html = lista(swmData.compras.filter((c) => !["comprado", "cancelado"].includes(c.status) && swmMatches(c)), swmCompraCard, "No hay compras activas.");
    } else if (swmTab === "envios") {
      html = lista(swmData.envios.filter((e) => !["enviado", "entregado", "cancelado"].includes(e.status) && swmMatches(e)), swmEnvioCard, "No hay envíos por mandar.");
    } else if (swmTab === "enviados") {
      html = lista(swmData.envios.filter((e) => e.status === "enviado" && swmMatches(e)), swmEnvioCard, "No hay envíos en camino. Cuando anotes una guía aparecen aquí hasta que los marques entregados.");
    } else if (swmTab === "entregados") {
      html = lista(swmData.envios.filter((e) => e.status === "entregado" && swmMatches(e)), swmEnvioCard, "Todavía no hay envíos entregados.");
    } else {
      html = sec("Envíos cancelados", swmData.envios.filter((e) => e.status === "cancelado" && swmMatches(e)), swmEnvioCard)
        + sec("Compras", swmData.compras.filter((c) => ["comprado", "cancelado"].includes(c.status) && swmMatches(c)), swmCompraCard)
        + sec("Paquetes", P.filter((p) => ["en_envio", "en_mexico", "enviado", "entregado", "cancelado"].includes(p.status) && swmMatches(p)), swmPaqueteCard)
        || `<p style="color:#5f5866;font-size:14px;">Todavía no hay historial.</p>`;
    }
    document.getElementById("swm-empty").style.display = "none";
    document.getElementById("swm-list").innerHTML = html;
  }

  // En Personal shopper, los paquetes y el envío van dentro de la tarjeta de su
  // compra: los datos de la clienta y los productos salen una sola vez, arriba.
  let swmCompacto = false;
  function swmWho(r) {
    if (swmCompacto) return "";
    const wa = waLinkFromPhone(r.phone);
    const cas = r.email && swmData.casilleros && swmData.casilleros[r.email];
    return `${cas ? `<b>${escapeHtml(cas)}</b> · ` : ""}${escapeHtml(r.name || r.email)} · ${escapeHtml(r.email)}${r.phone ? ` · ${escapeHtml(r.phone)}` : ""}${wa ? ` · <a href="${wa}" target="_blank" rel="noopener">WhatsApp</a>` : ""}`;
  }
  const swmPillA = (t, cls = "") => `<span class="swm-pill ${cls}">${t}</span>`;
  const swmCancelBtn = (kind, r) => (["cancelado", "entregado", "comprado", "en_mexico", "enviado"].includes(r.status) || r.enMexicoAt ? "" : `<button type="button" class="btn-secondary" data-swm-cancel="${kind}:${escapeHtml(r.id)}" style="padding:6px 12px;font-size:13px;">Cancelar</button>`);

  /* "≈ $1,080 MXN" del valor declarado con el tipo de cambio de Ajustes y,
     si paga el cruce con el 15%, cuánto le toca. */
  // Paquetes que valen más de 1,000 dólares (en pesos, con el tipo de cambio de Ajustes).
  const SWM_VALOR_ALTO_USD = 1000;
  function swmValorAlto(p) {
    const rates = swmData.tiposCambio || {};
    const rate = p.moneda === "MXN" ? 1 : rates[p.moneda];
    const pesos = Number(p.valorTotal) > 0 && rate ? Number(p.valorTotal) * rate : (Number(p.valorUSD) || 0) * (rates.USD || 0);
    return rates.USD > 0 && pesos >= SWM_VALOR_ALTO_USD * rates.USD;
  }

  function swmValorPesosHTML(p) {
    const rates = swmData.tiposCambio || {};
    const rate = p.moneda === "MXN" ? 1 : rates[p.moneda];
    if (!(Number(p.valorTotal) > 0) || !p.moneda) return "";
    if (!rate) return ` · <span style="color:#b33660">falta el tipo de cambio de ${escapeHtml(p.moneda)} en Ajustes</span>`;
    const pesos = Number(p.valorTotal) * rate;
    const cruce = Math.ceil(pesos * (swmData.comisionPct || 15) / 100);
    return `${p.moneda === "MXN" ? "" : ` ≈ <b>${formatPrice(pesos)}</b>`}${swmValorAlto(p) ? ` <b style="color:#b33660">⚠️ Valor alto: revísalo bien antes de cruzarlo</b>` : ""}${p.cobro === "comision" && !p.crucePagado ? ` → cruce (${swmData.comisionPct || 15}%): <b>${formatPrice(cruce)}</b>` : ""}`;
  }

  /* Qué significa el peso para el cobro: si el cruce ya está pagado (15%
     o de una compra de Mae) o es por comisión, el peso NO se cobra, solo
     sirve para la guía de envío. */
  function swmPesoTexto(p, kg) {
    if (p.crucePagado) return `${kg} kg · cruce ya pagado (15%): el peso no se cobra, solo es para la guía de envío`;
    if (p.cobro === "comision") return `${kg} kg · cruce por porcentaje (15% del valor): el peso no se cobra, solo es para la guía`;
    if (p.cobro === "auto") return `${kg} kg · se cobra lo más barato entre por peso (${formatPrice(swmCrucePeso(kg))}) y el 15% del valor`;
    return `Se cobran ${kg} kg → cruce ${formatPrice(swmCrucePeso(kg))}`;
  }

  function swmPaqueteCard(p) {
    const st = { sin_dueña: "❓ Sin dueña", registrado: "⏳ Por llegar", recibido: p.datosPendientes ? "⚠️ Sin registrar · faltan datos" : p.enMexicoAt ? "🇲🇽 En México" : "🇺🇸 En dirección americana", en_envio: "📦 En un envío", en_mexico: "🇲🇽 En México", enviado: "🚚 Enviado", entregado: "🎁 Entregado", cancelado: "❌ Cancelado" }[p.status] || p.status;
    // El almacenaje gratis corre desde que el paquete llega a México.
    const hasta = p.enMexicoAt ? new Date(new Date(p.enMexicoAt).getTime() + (swmData.almacenajeAntes && String(p.enMexicoAt) < swmData.almacenajeAntes.hasta ? swmData.almacenajeAntes.dias : swmData.almacenajeDias) * 864e5) : null;
    const vence = hasta ? Math.ceil((hasta - Date.now()) / 864e5) : null;
    const fotos = (p.fotos || []).map((f) => `<button type="button" class="btn-secondary" data-swm-file="foto/${escapeHtml(f)}" style="padding:4px 10px;font-size:12px;">📷 Foto</button>`).join(" ");
    const editable = ["registrado", "recibido"].includes(p.status);
    // Paso 2: ya está en la dirección americana y falta cruzarlo.
    const enUSA = p.status === "recibido" && !p.enMexicoAt && !p.datosPendientes;
    const sinDuena = p.status === "sin_dueña";
    const diasAqui = p.receivedAt ? Math.floor((Date.now() - new Date(p.receivedAt)) / 864e5) : 0;
    const limite = swmData.diasSinDuena || 7;
    return `<div class="swm-card" data-swm-id="${escapeHtml(p.id)}" data-kind="paquete">
      <h4><span>${escapeHtml(p.folio)} · ${escapeHtml(p.tienda || "Paquete")}${p.paqueteria ? ` · ${escapeHtml(p.paqueteria)}` : ""}${p.guiasUSA && p.guiasUSA.length ? ` · ${p.guiasUSA.map(escapeHtml).join(" · ")}` : p.rastreo ? ` · ${escapeHtml(p.rastreo)}` : ""}${p.ordenTienda ? ` · 🧾 orden ${escapeHtml(p.ordenTienda)}` : ""}</span>${swmValorAlto(p) ? swmPillA("⚠️ Valor alto", "new") : ""}${swmPillA(st, ["registrado", "sin_dueña"].includes(p.status) || p.datosPendientes ? "new" : "")}</h4>
      ${p.pago ? `<div class="meta">💲 Cruce del 15% por adelantado: <b>${formatPrice(p.pago.monto || 0)}</b>${p.crucePagado ? " · ✅ pagado (en su envío solo se cobra la guía)" : ""}</div>${swmPagoBox("paquete", p)}` : ""}
      ${sinDuena ? `<div class="meta">Etiqueta: <b>${escapeHtml(p.etiqueta || "—")}</b> · ${p.cobrable || "?"} kg · llegó ${swmFecha(p.receivedAt)} · <b style="color:${diasAqui >= limite ? "#b33660" : "inherit"}">${diasAqui} día${diasAqui === 1 ? "" : "s"}${diasAqui >= limite ? ` (ya pasaron ${limite}: puedes disponer de él)` : ` de ${limite}`}</b></div>
      <div class="grid" style="grid-template-columns:1fr auto;align-items:end;"><label>Buscar a la dueña (nombre, correo o teléfono)<input data-swm-buscar type="search" placeholder="Ej. Ana López"></label></div>
      <div data-swm-resultados style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;"></div>
      <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">${fotosHtml(p)}<button type="button" class="btn-secondary" data-swm-cancel="paquete:${escapeHtml(p.id)}" style="padding:6px 12px;font-size:13px;">Ya dispuse de él</button></div>
    </div>` : ""}${sinDuena ? "" : `
      ${p.parteDe ? `<div class="meta" style="color:#6a45b8;">🧩 Otra caja de la orden <b>${escapeHtml(p.parteDeFolio || "")}</b> (la tienda la dividió). El valor declarado va en ${escapeHtml(p.parteDeFolio || "esa")}.</div>` : ""}
      ${p.ordenDividida && !p.parteDe ? `<div class="meta" style="color:#6a45b8;">🧩 Orden dividida en varias cajas${(() => { const otras = (swmData.paquetes || []).filter((x) => x.parteDe === p.id && x.status !== "cancelado").map((x) => x.folio); return otras.length ? `: también ${otras.map(escapeHtml).join(", ")}` : ""; })()}${p.contenidoCaja ? ` · esta caja trae: ${escapeHtml(p.contenidoCaja)}` : ""}</div>` : ""}
      ${(() => { const c = (p.history || []).filter((h) => h.status === "rastreo_cambiado").pop(); return c ? `<div class="meta" style="color:#8a5a00;">🔁 La clienta cambió el rastreo el ${swmFecha(c.at)} (antes: ${escapeHtml(c.antes || "—")})</div>` : ""; })()}
      <div class="meta">${swmWho(p)}${swmCompacto ? "" : "<br>"}${p.origen === "sin_registro" ? `⚠️ Llegó sin registrar (cargo ${formatPrice(p.cargoSinRegistro || 0)})${p.datosPendientes ? " · <b>ella todavía no dice qué trae</b>" : ""} · ` : ""}${p.origen === "compra" && !swmCompacto ? "🛍️ De una compra de Mae · " : ""}Cruce ${p.crucePagado ? "ya pagado (15%)" : p.cobro === "auto" ? "lo más barato (peso o 15%)" : p.cobro === "comision" ? (p.valorTotal && p.moneda ? `15% de ${Number(p.valorTotal).toLocaleString("es-MX", { maximumFractionDigits: 2 })} ${escapeHtml(p.moneda)}` : `15% de US$${Number(p.valorUSD || 0).toFixed(2)}`) : "por peso"}${p.contenido && !swmCompacto ? ` · ${escapeHtml(p.contenido)}` : ""}
        ${p.valorTotal ? `<br>Valor declarado (con tax, sin envío): <b>${escapeHtml(Number(p.valorTotal).toLocaleString("es-MX", { maximumFractionDigits: 2 }))} ${escapeHtml(p.moneda || "")}</b>` : ""}${swmValorPesosHTML(p)}
        ${p.factura ? ` <button type="button" class="btn-secondary" data-swm-file="factura/paquete/${escapeHtml(p.id)}" style="padding:4px 10px;font-size:12px;">📄 Ver factura</button>` : ""}
        ${(p.facturas || []).length ? `<br>${p.facturas.map((f, i) => `<button type="button" class="btn-secondary" data-swm-file="factura/paquete/${escapeHtml(p.id)}/${Number(f.n ?? i)}" style="padding:4px 10px;font-size:12px;margin:2px 4px 2px 0;">📄 ${f.tipo === "application/pdf" ? "PDF" : "Captura"} ${i + 1}</button>`).join("")}` : ""}
        ${p.receivedAt ? `<br>Llegó ${swmFecha(p.receivedAt)}${p.enMexicoAt ? ` · en México desde ${swmFecha(p.enMexicoAt)} · almacenaje gratis ${vence > 0 ? `${vence} días más` : "<b style='color:#b33660'>vencido</b>"}` : ""}` : ""}</div>
      ${fotos ? `<div style="margin-top:6px;">${fotos}</div>` : ""}
      ${p.status === "recibido" && p.phone ? `<div style="margin-top:8px;"><a class="btn-primary" href="${escapeHtml(swmPaqueteWa(p))}" target="_blank" rel="noopener" style="text-decoration:none;display:inline-flex;padding:8px 16px;font-size:13px;background:#25D366;border-radius:999px;color:#fff;font-weight:600;">💬 Avisar por WhatsApp (y mandarle las fotos)</a></div>` : ""}
      ${swmCorreccionAdmin(p)}
      ${swmExtrasAdmin(p)}
      ${p.origen === "compra" ? `<div style="margin-top:8px;background:#faf7fb;border-radius:10px;padding:8px 10px;">
        <div class="meta" style="margin-bottom:4px;">🔒 Notas solo para ti (la clienta no las ve)</div>
        <div class="grid" style="grid-template-columns:1fr 1fr auto;align-items:end;">
          <label>Número de pedido (tienda)<input data-nota-orden type="text" value="${escapeHtml(p.ordenTienda || "")}" placeholder="Ej. W174130258"></label>
          <label>Guía de USA (con la que te llega)<span data-guias style="display:flex;flex-direction:column;gap:4px;">${(p.guiasUSA && p.guiasUSA.length ? p.guiasUSA : [p.rastreo || ""]).map((g) => `<input data-nota-guia type="text" value="${escapeHtml(g)}" placeholder="Ej. 1Z999AA10123456784">`).join("")}</span><button type="button" class="btn-ghost" data-swm-mas-guia style="margin:4px 0 0;padding:2px 6px;font-size:12px;text-align:left;">+ otra guía (la tienda dividió el pedido)</button></label>
          <button type="button" class="btn-secondary" data-swm-nota-priv style="padding:8px 12px;font-size:13px;">💾 Guardar</button>
        </div></div>` : ""}`}
      ${editable ? `<details class="swm-peso"${(p.status === "recibido" && !p.cobrable) || enUSA ? " open" : ""}>
        <summary>${p.status === "registrado" ? "🇺🇸 Ya llegó a la dirección americana: avisarle" : enUSA ? "🇲🇽 Siguiente paso: cruzarlo a México" : `⚖️ Peso, medidas y fotos${p.cobrable ? ` · ${p.cobrable} kg` : ""}`}</summary>
      <div class="grid">
        <label>Peso (kg)<input data-f="kg" type="number" step="0.01" min="0" value="${p.kg || ""}"></label>
        <label>Alto (cm)<input data-f="alto" type="number" min="0" value="${p.alto || ""}"></label>
        <label>Ancho (cm)<input data-f="ancho" type="number" min="0" value="${p.ancho || ""}"></label>
        <label>Largo (cm)<input data-f="largo" type="number" min="0" value="${p.largo || ""}"></label>
      </div>
      <div class="meta" data-swm-calc>${p.cobrable ? swmPesoTexto(p, p.cobrable) : ""}</div>
      <div class="grid" style="grid-template-columns:1fr 1fr;">
        <label>Fotos (opcional)<input data-f="fotos" type="file" accept="image/*" multiple></label>
        <label>Nota para la clienta<input data-f="notaClienta" type="text" value="${escapeHtml(p.notaClienta || "")}"></label>
      </div>
      <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
        ${p.status === "registrado" ? `<button type="button" class="btn-primary" data-swm-recibir data-usa="1">🇺🇸 Ya llegó a la dirección americana</button>`
          : enUSA ? `<button type="button" class="btn-primary" data-swm-cruzar>🇲🇽 Ya cruzó a México (y armar su envío)</button><button type="button" class="btn-secondary" data-swm-recibir>Solo guardar peso / fotos</button>`
          : `<button type="button" class="btn-primary" data-swm-recibir>Guardar peso / fotos</button>`}
      </div></details>
      <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
        ${swmCancelBtn("paquete", p)}
      </div>` : p.status === "en_envio" && !p.enMexicoAt ? `<div style="display:flex;gap:8px;margin-top:10px;"><button type="button" class="btn-secondary" data-swm-pkg-mx>🇲🇽 Cruzado a México</button></div>` : ""}
    ${sinDuena ? "" : "</div>"}`;
  }

  /* Pedirle a la clienta que corrija lo que declaró (no puede pedir envío
     hasta hacerlo) y ver si ya lo corrigió. */
  function swmCorreccionAdmin(p) {
    if (p.origen === "compra" || !["registrado", "recibido"].includes(p.status)) return "";
    const c = p.correccion;
    const id = escapeHtml(p.id);
    if (c && c.estado === "pedida") return `<div class="meta" style="margin-top:6px;background:#fdf2f6;border-radius:8px;padding:6px 8px;">✏️ Le pediste corregir: <i>${escapeHtml(c.motivo || "")}</i> · ${swmFecha(c.at)} <button type="button" class="btn-secondary" data-swm-quitar-correccion="${id}" style="padding:2px 8px;font-size:12px;">Ya no hace falta</button></div>`;
    if (c && c.estado === "hecha") return `<div class="meta" style="margin-top:6px;background:#eef8f2;border-radius:8px;padding:6px 8px;">✅ Ya corrigió sus datos (${swmFecha(c.hechaAt)}). Lo que pediste: <i>${escapeHtml(c.motivo || "")}</i> <button type="button" class="btn-secondary" data-swm-quitar-correccion="${id}" style="padding:2px 8px;font-size:12px;">Ya lo revisé</button> <button type="button" class="btn-secondary" data-swm-pedir-correccion="${id}" style="padding:2px 8px;font-size:12px;">Pedir otra corrección</button></div>`;
    return `<div style="margin-top:6px;"><button type="button" class="btn-secondary" data-swm-pedir-correccion="${id}" style="padding:4px 10px;font-size:12px;">✏️ Pedir corrección a la clienta</button></div>`;
  }

  /* Mensaje de "ya llegó tu paquete" para mandar por WhatsApp con las
     fotos (WhatsApp no deja adjuntarlas desde un link: Mae las agrega). */
  function swmPaqueteWa(p) {
    const nombre = String(p.name || "").split(/\s+/)[0];
    const que = [p.tienda, p.rastreo && `guía ${p.rastreo}`].filter(Boolean).join(", ");
    const txt = `¡Hola${nombre ? ` ${nombre}` : ""}! 📦 Ya llegó tu paquete ${p.folio}${que ? ` (${que})` : ""} a nuestro almacén. Te mando las fotos 👇\n\nTe aviso en cuanto cruce a México y ahí pides tu envío a casa en tu casillero: https://alpacca.mx/?ver=direccion-americana`;
    return `${waLinkFromPhone(p.phone)}?text=${encodeURIComponent(txt)}`;
  }

  /* Revisión con fotos y separar paquete (los pide la clienta). */
  function swmExtrasAdmin(p) {
    const out = [];
    const rv = p.revision, sp = p.separar;
    if (rv && rv.estado === "hecha") out.push(`<div class="meta">📸 Revisión hecha · ${(rv.fotos || []).map((f) => `<button type="button" class="btn-secondary" data-swm-file="foto/${escapeHtml(f)}" style="padding:4px 10px;font-size:12px;">📷</button>`).join(" ")}${rv.nota ? ` · ${escapeHtml(rv.nota)}` : ""}</div>`);
    if (rv && rv.estado === "pedida") {
      out.push(p.status === "recibido"
        ? `<div class="swm-sub" style="margin-top:10px;padding:10px;border-radius:12px;background:#fff6e5;"><b>📸 Pidió revisión con fotos</b>
          <div class="grid" style="grid-template-columns:1fr 1fr;"><label>Fotos del contenido<input data-f="revFotos" type="file" accept="image/*" multiple></label><label>Nota para ella<input data-f="revNota" type="text" placeholder="Ej. Todo completo y sin daños"></label></div>
          <button type="button" class="btn-primary" data-swm-revision-hecha style="margin-top:8px;">📸 Mandar fotos (y avisarle)</button></div>`
        : `<div class="meta">📸 Pidió revisión con fotos (hazla cuando llegue).</div>`);
    }
    if (sp && sp.estado === "pedida") {
      const f = (k, l, t = "number") => `<label>${l}<input data-f="${k}" type="${t}"${t === "number" ? ' step="0.01" min="0"' : ""}></label>`;
      out.push(`<div style="margin-top:10px;padding:10px;border-radius:12px;background:#fff6e5;"><b>✂️ Quiere separar:</b> ${escapeHtml(sp.nota)}
        <div class="meta" style="margin-top:6px;">Lo que se va ahora (paquete nuevo):</div>
        <div class="grid">${f("nKg", "Peso (kg)")}${f("nAlto", "Alto")}${f("nAncho", "Ancho")}${f("nLargo", "Largo")}</div>
        <div class="grid" style="grid-template-columns:1fr 1fr 1fr;">${f("nContenido", "Qué lleva", "text")}${f("nValor", "Valor USD (si es 15%)")}<label>Fotos<input data-f="nFotos" type="file" accept="image/*" multiple></label></div>
        <div class="meta" style="margin-top:6px;">Lo que se queda guardado (${escapeHtml(p.folio)}):</div>
        <div class="grid">${f("rKg", "Peso (kg)")}${f("rAlto", "Alto")}${f("rAncho", "Ancho")}${f("rLargo", "Largo")}</div>
        <div class="grid" style="grid-template-columns:1fr 1fr;">${f("rContenido", "Qué lleva", "text")}${f("rValor", "Valor USD (si es 15%)")}</div>
        <button type="button" class="btn-primary" data-swm-separar-hecho style="margin-top:8px;">✂️ Separar (y avisarle)</button></div>`);
    }
    if ((p.cargos || []).length) out.push(`<div class="meta">Extras: ${p.cargos.map((c) => `${escapeHtml(c.concepto)} ${formatPrice(c.monto)}`).join(" · ")} (se suman a su envío)</div>`);
    return out.join("");
  }

  function fotosHtml(p) {
    return (p.fotos || []).map((f) => `<button type="button" class="btn-secondary" data-swm-file="foto/${escapeHtml(f)}" style="padding:6px 12px;font-size:13px;">📷 Foto</button>`).join("");
  }

  /* Cotización armada por Mae con lo que la clienta mandó por WhatsApp
     (capturas de su carrito). Al guardarla, le manda el link para pagar. */
  const swmNcItemRow = (x = {}) => `<div class="grid" data-swm-nc-item style="grid-template-columns:minmax(0,1fr) 64px minmax(0,1fr) auto;border-top:1px solid #f0e6ec;padding-top:8px;">
      <label style="grid-column:1/-1;">Artículo<input data-k="nombre" type="text" placeholder="Ej. Rare Beauty Blush" value="${escapeHtml(x.nombre || "")}"></label>
      <label>Tono / talla<input data-k="tono" type="text" value="${escapeHtml(x.tono || "")}"></label>
      <label>Cant.<input data-k="cantidad" type="number" min="1" step="1" value="${x.cantidad || 1}"></label>
      <label>Precio c/u (USD, sin tax)<input data-k="precioUSD" type="number" min="0" step="0.01" value="${x.precioUSD || ""}"></label>
      <button type="button" class="btn-secondary" data-swm-nc-del title="Quitar artículo" style="align-self:end;padding:8px 10px;">🗑️</button>
    </div>`;
  /* Lista pegada, un artículo por renglón: "Nombre x2 $1.95", "2 x Nombre - 1.95",
     "Nombre · tono (x3) US$2.25"... Cantidad = "x2" / "2x" / "2 ×"; precio =
     el último número con punto decimal o con "$". */
  function swmNcParse(txt) {
    return String(txt || "").split(/\n+/).map((line) => {
      let s = line.replace(/^[\s•*\-–\d]+[.)]\s+/, (m) => (/\d/.test(m) && !/[.)]/.test(m) ? m : "")).replace(/^\s*[•*\-–]\s*/, "").trim();
      if (!s) return null;
      let precioUSD = 0;
      const pm = s.match(/(?:US)?\$\s*(\d+(?:[.,]\d{1,2})?)|(\d+[.,]\d{2})(?!.*\d)/i);
      if (pm) { precioUSD = parseFloat((pm[1] || pm[2]).replace(",", ".")) || 0; s = s.replace(pm[0], " "); }
      let cantidad = 1;
      const qm = s.match(/(?:^|\s|\()(?:x|×)\s*(\d{1,3})\b|\b(\d{1,3})\s*(?:x|×)(?:\s|$)|(?:cant(?:idad)?|qty)\.?\s*:?\s*(\d{1,3})/i);
      if (qm) { cantidad = parseInt(qm[1] || qm[2] || qm[3], 10) || 1; s = s.replace(qm[0], " "); }
      s = s.replace(/[()]/g, " ").replace(/\s*[-–:,]\s*$/, "").replace(/\s{2,}/g, " ").trim();
      const [nombre, ...rest] = s.split(/\s+[·|]\s+/);
      return nombre ? { nombre: nombre.trim(), tono: rest.join(" · ").trim(), cantidad, precioUSD } : null;
    }).filter(Boolean);
  }
  /* Sin "c": nueva cotización. Con "c": editar esa cotización (misma clienta). */
  function swmNuevaCompraForm(c = null, opts = {}) {
    const q = (c && c.cotizacion) || {};
    const ps = !!(opts.ps || (c && c.ps));
    const cobro = c ? c.cobro : ps ? "comision" : "peso";
    return `<div class="${c ? "" : "swm-card"}" data-swm-nc ${ps ? "data-ps=\"1\"" : ""} ${c ? `data-edit-id="${escapeHtml(c.id)}" style="margin-top:10px;border-top:2px dashed #f0d5e0;padding-top:10px;"` : ""}>
      <h4><span>${c ? `✏️ Editar ${ps ? "factura" : "cotización"} ${escapeHtml(c.folio)}` : ps ? "🧾 Nueva factura · compra en tienda" : "🛒 Nueva cotización · compra en línea"}</span></h4>
      ${ps ? `<div class="grid">
        <label>Fecha de la compra en tienda<input data-n="fechaCompra" type="date" value="${escapeHtml((c && c.fechaCompra) || new Date().toISOString().slice(0, 10))}"></label>
      </div>` : ""}
      ${!c && ps ? `<div class="meta">Sube la foto de tu factura y pon el total. Al guardarla le llega un correo con la foto y te doy el link para mandárselo por WhatsApp; ahí ve su factura y la paga (tarjeta o transferencia). Si te paga por fuera, toca “✅ Ya me pagó (por fuera)”.</div>
      <div class="grid"><label>Buscar a la clienta (código ALP-…, nombre, correo o teléfono)<input data-swm-buscar type="search"></label></div>
      <div data-swm-resultados style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;"></div>` : c ? `<div class="meta">Al guardar le llega un correo con la cotización corregida; el link que ya le mandaste sigue sirviendo.${q.cupon ? ` Tiene el cupón ${escapeHtml(q.cupon)}: el descuento se recalcula.` : ""}</div>
      <input data-n="email" type="hidden" value="${escapeHtml(c.email)}">` : `<div class="meta">Arma la cotización con las capturas que te mandó. Al guardarla le llega un correo y te doy el link para mandárselo por WhatsApp; ahí la ve y la paga (tarjeta o transferencia).</div>
      <div class="grid"><label>Buscar a la clienta (código ALP-…, nombre, correo o teléfono)<input data-swm-buscar type="search"></label></div>
      <div data-swm-resultados style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;"></div>`}
      <div class="grid">
        ${c ? "" : `<label>Correo de su cuenta<input data-n="email" type="email" placeholder="Si no tiene cuenta, el correo con el que la va a crear"></label>
        <label>Nombre<input data-n="name" type="text"></label>
        <label>WhatsApp<input data-n="phone" type="tel"></label>`}
        <label>Tienda<input data-n="tienda" type="text" placeholder="Sephora, Ulta, Amazon…" value="${escapeHtml((c && c.tienda) || "")}"></label>
      </div>
      ${ps ? `<div class="grid">
        <label>🧾 Foto(s) de la factura (la ve la clienta)${c && (c.facturaFotos || []).length ? ` · ya tiene ${c.facturaFotos.length}` : " *"}<input data-n="facturaFotos" type="file" accept="image/*" multiple></label>
        <label>💲 Total a cobrar en pesos *<input data-n="totalMXN" type="number" min="0" step="0.01" placeholder="Ej. 8499.35" value="${c && c.cotizacion ? c.cotizacion.total : ""}"></label>
        <label>Nota para la clienta<input data-n="notaClienta" type="text" value="${escapeHtml((c && c.notaClienta) || "")}"></label>
      </div>
      <div class="meta">El total ya debe traer tu comisión y el cruce (como en tu factura). El envío dentro de México se le cobra después, cuando cruce.</div>` : `
      <details style="margin-top:10px;" ${c ? "" : "open"}><summary style="cursor:pointer;font-weight:600;color:#a33a63;">📋 Pegar la lista de artículos (más rápido)</summary>
        <div class="meta" style="margin-top:4px;">Un artículo por renglón: nombre, cantidad y precio en dólares. Ej.:<br><code>Winterberry Ice x2 $1.95</code><br><code>Champagne Toast · Moisturizing x3 $2.25</code><br>Puedes pedirle a Claude (en Chrome) que te dé el carrito así y pegarlo aquí.</div>
        <textarea data-swm-nc-paste rows="5" style="width:100%;margin-top:6px;border:1px solid #e5d6de;border-radius:10px;padding:8px;font-size:14px;" placeholder="Winterberry Ice x2 $1.95"></textarea>
        <button type="button" class="btn-secondary" data-swm-nc-paste-go style="margin-top:6px;padding:6px 12px;font-size:13px;">Agregar artículos</button>
      </details>
      <div data-swm-nc-items style="margin-top:6px;">${(q.items && q.items.filter((x) => !x.envio).length ? q.items.filter((x) => !x.envio) : [{}]).map(swmNcItemRow).join("")}</div>
      <button type="button" class="btn-secondary" data-swm-nc-add style="margin-top:8px;padding:6px 12px;font-size:13px;">+ Otro artículo</button>
      <div class="grid">
        <label>Tax de la tienda (%)<input data-n="taxPct" type="number" min="0" step="0.01" value="${q.taxPct != null ? q.taxPct : 8.25}"></label>
        <label>Envío de la tienda (USD, si cobra)<input data-n="envioUSD" type="number" min="0" step="0.01" value="${((q.items || []).find((x) => x.envio) || {}).precioUSD || ""}"></label>
      </div>
      <div class="grid">
        <label>Cruce<select data-n="cobro"><option value="peso" ${cobro === "peso" ? "selected" : ""}>Por peso (se cobra al enviar)</option><option value="comision" ${cobro === "comision" ? "selected" : ""}>15% del valor (se cobra ahora)</option></select></label>
        <label>Cruce 15% (vacío = automático)<input data-n="cruce" type="number" min="0" step="0.01"></label>
        <label>Nota para la clienta<input data-n="notaClienta" type="text" value="${escapeHtml((c && c.notaClienta) || "")}"></label>
        <label>${c ? "Agregar " : ""}${ps ? "Fotos de los tickets" : "Capturas"} (solo para ti)<input data-n="fotos" type="file" accept="image/*" multiple></label>
      </div>
      <div class="meta" data-swm-nc-total style="font-size:15px;"></div>`}
      <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;"><button type="button" class="btn-primary" data-swm-nc-save>${c ? "Guardar cambios" : ps ? "Guardar factura y sacar link" : "Guardar y sacar link"}</button><button type="button" class="btn-secondary" ${c ? "data-swm-nc-edit-cancel" : "data-swm-nc-toggle"}>Cancelar</button></div>
    </div>`;
  }
  function swmNcLeer(box) {
    const items = [...box.querySelectorAll("[data-swm-nc-item]")].map((row) => {
      const k = (n) => row.querySelector(`[data-k="${n}"]`).value;
      return { nombre: k("nombre").trim(), tono: k("tono").trim(), cantidad: Math.max(1, parseInt(k("cantidad"), 10) || 1), precioUSD: parseFloat(k("precioUSD")) || 0 };
    }).filter((x) => x.nombre || x.precioUSD);
    const n = (k) => { const el = box.querySelector(`[data-n="${k}"]`); return el ? el.value : ""; };
    // Estimado en pesos con el tipo de cambio de Config (el servidor hace la cuenta final).
    const tc = pricingConfig.exchangeRate || 0;
    const tax = n("taxPct") === "" ? 8.25 : parseFloat(n("taxPct")) || 0;
    const usd = items.reduce((t, x) => t + x.precioUSD * x.cantidad, 0) * (1 + tax / 100) + (parseFloat(n("envioUSD")) || 0);
    const productos = Math.round(usd * tc * 100) / 100;
    const cruce = n("cobro") === "comision" ? (n("cruce") !== "" ? parseFloat(n("cruce")) || 0 : Math.ceil(productos * 0.15)) : 0;
    return { items, productos, cruce, n };
  }
  function swmNcTotal(box) {
    if (!box.querySelector("[data-swm-nc-total]")) return; // factura en foto: no hay lista
    const { productos, cruce } = swmNcLeer(box);
    const tc = pricingConfig.exchangeRate || 0;
    box.querySelector("[data-swm-nc-total]").innerHTML = productos ? `Productos con tax ${formatPrice(productos)}${cruce ? ` + cruce ${formatPrice(cruce)}` : ""} = <b>${formatPrice(productos + cruce)}</b> <small>(dólar a $${tc})</small>` : "";
  }
  const swmCompraLink = (c) => `${location.origin}/?ver=direccion-americana&compra=${encodeURIComponent(c.id)}`;
  function swmCompraWa(c) {
    const wa = waLinkFromPhone(c.phone);
    const nombre = String(c.name || "").split(/\s+/)[0];
    const txt = `Hola${nombre ? ` ${nombre}` : ""} 💕 Ya está tu ${c.ps ? "factura" : "cotización"} ${c.folio}${c.tienda ? ` de ${c.tienda}` : ""}: ${formatPrice(c.cotizacion ? c.cotizacion.total : 0)}.\nAquí la ves y la pagas (tarjeta o transferencia): ${swmCompraLink(c)}\nSi todavía no tienes cuenta, créala con este correo: ${c.email}`;
    return wa ? `${wa}?text=${encodeURIComponent(txt)}` : `https://wa.me/?text=${encodeURIComponent(txt)}`;
  }

  function swmSinRegistroForm() {
    return `<div class="swm-card" data-swm-sinreg>
      <h4><span>📦 Llegó un paquete sin registrar</span></h4>
      <div class="meta">Busca primero en "Por llegar" por el rastreo: si ya lo registró, márcalo ahí como recibido. Si no aparece, regístralo aquí; se le cobra ${formatPrice(swmData.cargoSinRegistro || 80)} y le llega un correo para que diga qué trae. Si no sabes de quién es, déjalo sin dueña (tienes ${swmData.diasSinDuena || 7} días antes de disponer de él).</div>
      <div class="grid">
        <label>Last name de la etiqueta (código ALP-…)<input data-g="etiqueta" type="text"></label>
        <label>Tienda<input data-g="tienda" type="text"></label>
        <label>Rastreo<input data-g="rastreo" type="text"></label>
      </div>
      <div class="grid"><label>Buscar a la dueña (código ALP-…, nombre, correo o teléfono)<input data-swm-buscar type="search" placeholder="Opcional"></label></div>
      <div data-swm-resultados style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;"></div>
      <div class="meta" data-swm-elegida>Sin dueña (se queda en "Sin dueña")</div>
      <div class="grid">
        <label>Peso (kg)<input data-g="kg" type="number" step="0.01" min="0"></label>
        <label>Alto (cm)<input data-g="alto" type="number" min="0"></label>
        <label>Ancho (cm)<input data-g="ancho" type="number" min="0"></label>
        <label>Largo (cm)<input data-g="largo" type="number" min="0"></label>
      </div>
      <div class="grid" style="grid-template-columns:1fr 1fr;"><label>Fotos<input data-g="fotos" type="file" accept="image/*" multiple></label><label>Nota para la clienta<input data-g="notaClienta" type="text"></label></div>
      <div style="display:flex;gap:8px;margin-top:10px;"><button type="button" class="btn-primary" data-swm-sinreg-save>Guardar paquete</button><button type="button" class="btn-secondary" data-swm-sinreg-toggle>Cancelar</button></div>
    </div>`;
  }

  function swmPagoBox(kind, r) {
    if (!r.pago) return "";
    const st = { pendiente: "⏳ Esperando pago", revision: "🔎 Comprobante por revisar", pagado: "✅ Pagado" }[r.pago.status] || r.pago.status;
    const met = r.pago.metodo === "mercadopago" ? "Tarjeta (Mercado Pago)" : r.pago.metodo === "transferencia" ? "Transferencia" : "";
    return `<div class="pay"><b>Pago:</b> ${st}${met ? ` · ${met}` : ""}${r.pago.paidAt ? ` · ${swmFecha(r.pago.paidAt)}` : ""}${r.pago.motivo ? ` · ⚠️ ${escapeHtml(r.pago.motivo)}` : ""}
      ${r.pago.status === "pendiente" ? `<button type="button" class="btn-secondary" data-swm-aprobar="${kind}:${escapeHtml(r.id)}" data-por-fuera="1" style="padding:6px 12px;font-size:13px;">✅ Ya me pagó (por fuera)</button>` : ""}
      ${r.pago.status === "revision" ? `${r.pago.comprobanteAt ? `<button type="button" class="btn-secondary" data-swm-file="comprobante/${kind}/${escapeHtml(r.id)}" style="padding:4px 10px;font-size:13px;">📄 Ver comprobante</button>` : ""}
        <button type="button" class="btn-primary" data-swm-aprobar="${kind}:${escapeHtml(r.id)}" style="padding:6px 12px;font-size:13px;">✅ Aprobar pago</button>
        <button type="button" class="btn-secondary" data-swm-rechazar="${kind}:${escapeHtml(r.id)}" style="padding:6px 12px;font-size:13px;">Rechazar</button>` : ""}
    </div>`;
  }

  function swmCompraCard(c) {
    const st = { solicitud: "🆕 Por cotizar", cotizado: "💳 Cotizada", pagado: "✅ Pagada · hay que comprar", comprado: "🛍️ Comprada", cancelado: "❌ Cancelada" }[c.status] || c.status;
    const q = c.cotizacion;
    let action = "";
    const porPagar = c.status === "cotizado" && (!c.pago || c.pago.status === "pendiente");
    const linkBtns = c.status === "cotizado" ? `<a class="btn-primary" href="${escapeHtml(swmCompraWa(c))}" target="_blank" rel="noopener" style="text-decoration:none;padding:8px 14px;font-size:13px;">💬 Mandar link por WhatsApp</a><button type="button" class="btn-secondary" data-swm-copy-link="${escapeHtml(swmCompraLink(c))}" style="padding:6px 12px;font-size:13px;">🔗 Copiar link</button>` : "";
    if (c.origen === "whatsapp" && porPagar) {
      action = swmEditCompraId === c.id ? swmNuevaCompraForm(c)
        : `<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;align-items:center;">${linkBtns}<button type="button" class="btn-secondary" data-swm-nc-edit style="padding:6px 12px;font-size:13px;">✏️ Editar</button>${swmCancelBtn("compra", c)}</div>`;
    } else if (c.status === "solicitud" || porPagar) {
      action = `<div class="grid">
          <label>Productos (MXN, con tax y envío dentro de EE.UU.)<input data-f="productos" type="number" step="0.01" min="0" value="${q ? q.productos : ""}"></label>
          ${c.cobro === "comision" ? `<label>Cruce 15% (vacío = automático)<input data-f="cruce" type="number" step="0.01" min="0" value="" placeholder="${q ? q.cruce : ""}"></label>` : ""}
          <label>Nota para la clienta<input data-f="notaClienta" type="text" value="${escapeHtml(c.notaClienta || "")}"></label>
        </div>
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;"><button type="button" class="btn-primary" data-swm-cotizar-compra>${c.status === "cotizado" ? "Actualizar cotización" : "Mandar cotización"}</button>${linkBtns}${swmCancelBtn("compra", c)}</div>`;
    } else if (c.status === "pagado") {
      action = `<div style="margin-top:10px;font-size:13px;font-weight:600;">Ya compré: ¿qué paquetes van a llegar?</div>
        <div data-swm-pkgs><div class="grid" data-swm-pkg><label>Tienda<input data-k="tienda" type="text" value="${escapeHtml(c.tienda || "")}"></label><label>Número de orden de la tienda (solo para ti)<input data-k="orden" type="text"></label><label>Guía de USA con la que te llegará (solo para ti)<span data-guias style="display:flex;flex-direction:column;gap:4px;"><input data-k="rastreo" type="text"></span><button type="button" class="btn-ghost" data-swm-mas-guia style="margin:4px 0 0;padding:2px 6px;font-size:12px;text-align:left;">+ otra guía (la tienda dividió el pedido)</button></label></div></div>
        <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;"><button type="button" class="btn-secondary" data-swm-add-pkg style="padding:6px 12px;font-size:13px;">+ Otro paquete</button><button type="button" class="btn-primary" data-swm-comprada>🛍️ Ya compré (avisarle)</button></div>`;
    }
    return `<div class="swm-card" data-swm-id="${escapeHtml(c.id)}" data-kind="compra">
      <h4><span>${escapeHtml(c.folio)} · Compra por ella</span>${swmPillA(st, ["solicitud", "pagado"].includes(c.status) ? "new" : "")}</h4>
      <div class="meta">${swmWho(c)} · ${swmFecha(c.createdAt)}<br>Cruce ${c.cobro === "comision" ? "15% (se cobra con la compra)" : "por peso (se cobra al enviar)"}</div>
      ${c.links ? `<div style="margin-top:8px;font-size:13px;white-space:pre-wrap;word-break:break-all;background:#faf7fb;border-radius:8px;padding:8px;">${escapeHtml(c.links)}</div>` : ""}
      ${c.origen === "whatsapp" ? `<div class="meta">💬 Por WhatsApp${c.tienda ? ` · ${escapeHtml(c.tienda)}` : ""}${(c.capturas || []).length ? ` · ${c.capturas.map((f) => `<button type="button" class="btn-secondary" data-swm-file="foto/${escapeHtml(f)}" style="padding:4px 10px;font-size:12px;">📷 Captura</button>`).join(" ")}` : ""}</div>` : ""}
      ${q && q.items ? `<div style="margin-top:8px;font-size:13px;background:#faf7fb;border-radius:8px;padding:8px;">${q.items.map((x) => `<div style="display:flex;justify-content:space-between;gap:8px;"><span>${x.cantidad} × ${escapeHtml(x.nombre)}${x.tono ? ` · ${escapeHtml(x.tono)}` : ""}</span><span>${formatPrice(x.precio * x.cantidad)}</span></div>`).join("")}</div>` : ""}
      ${c.notas ? `<div class="meta">📝 ${escapeHtml(c.notas)}</div>` : ""}
      ${q ? `<div class="meta">Cotización: productos ${formatPrice(q.productos)}${q.cruce ? ` + cruce ${formatPrice(q.cruce)}` : ""} = <b>${formatPrice(q.total)}</b></div>` : ""}
      ${swmPagoBox("compra", c)}${action}
    </div>`;
  }

  /* Pestaña "En México": paquetes por clienta, con la opción de juntar
     varios en una sola caja (un envío con una sola guía). */
  function swmMexicoGrupo(email, ps) {
    const libres = ps.filter((p) => p.status === "recibido" && !p.datosPendientes);
    const p0 = ps[0];
    const ultimo = swmData.envios.filter((e) => e.email === email && e.direccion).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0];
    const d = (ultimo && ultimo.direccion) || { nombre: p0.name || "", telefono: p0.phone || "" };
    const abierto = swmConsolidarEmail === email;
    const inp = (k, l, extra = "") => `<label>${l}<input data-dir="${k}" type="text" value="${escapeHtml(d[k] || "")}" ${extra}></label>`;
    const form = abierto ? `<div class="swm-card" data-swm-consolidar="${escapeHtml(email)}" style="background:#fdf6f9;">
        <div class="meta" style="font-weight:700;">¿Qué paquetes van en la caja?</div>
        ${libres.map((p) => `<label class="swm-check"><input type="checkbox" data-cons-pick="${escapeHtml(p.id)}" checked> ${escapeHtml(p.folio)} · ${escapeHtml(p.tienda || "")} · ${p.cobrable || "?"} kg</label>`).join("")}
        <div class="meta" style="font-weight:700;margin-top:8px;">Dirección de entrega${ultimo ? " (la de su último envío)" : ""}</div>
        <div class="grid">${inp("nombre", "Nombre de quien recibe")}${inp("telefono", "Teléfono")}${inp("calle", "Calle y número")}${inp("colonia", "Colonia")}${inp("ciudad", "Ciudad")}${inp("estado", "Estado")}${inp("cp", "Código postal", 'maxlength="5" inputmode="numeric"')}${inp("referencias", "Referencias")}</div>
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;"><button type="button" class="btn-primary" data-cons-save>📦 Crear envío en una sola caja</button><button type="button" class="btn-secondary" data-cons-toggle="">Cancelar</button></div>
        <div class="meta">Después lo cotizas en "Por mandar" como siempre y a ella le llega para pagar.</div>
      </div>` : "";
    // "Ya lo mandé": paquetes sueltos o que ya tienen envío; se anota la guía a mano y pasan a Enviados.
    const mandables = ps.filter((p) => (p.status === "recibido" && !p.datosPendientes) || p.status === "en_envio");
    const enviando = swmEnviarEmail === email;
    const formGuia = enviando ? `<div class="swm-card" data-swm-enviar="${escapeHtml(email)}" style="background:#f3f8fd;">
        <div class="meta" style="font-weight:700;">¿Qué paquetes mandaste con esta guía?</div>
        ${mandables.map((p) => `<label class="swm-check"><input type="checkbox" data-env-pick="${escapeHtml(p.id)}" checked> ${escapeHtml(p.folio)} · ${escapeHtml(p.tienda || "")}${p.status === "en_envio" ? " · ya tenía envío" : ""}</label>`).join("")}
        <div class="grid"><label>Paquetería<input data-env-paq type="text" value="Estafeta" list="swm-paqs"></label><label>Número de guía<input data-env-guia type="text" placeholder="Ej. 1234567890"></label></div>
        <datalist id="swm-paqs"><option>Estafeta</option><option>DHL</option><option>FedEx</option><option>Paquetexpress</option><option>J&T</option><option>99minutos</option><option>Redpack</option><option>Entrega en persona</option></datalist>
        <label class="swm-check"><input type="checkbox" data-env-avisar checked> Mandarle correo con su guía</label>
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;"><button type="button" class="btn-primary" data-env-save>🚚 Marcar como enviado</button><button type="button" class="btn-secondary" data-env-personal>📍 Se lo entregué en persona</button><button type="button" class="btn-secondary" data-env-toggle="">Cancelar</button></div>
        <div class="meta">Con guía pasan a "Enviados"; ahí los marcas entregados o corriges la guía. Si se los entregaste en persona (Juárez), no necesitas guía: pasan directo a "Entregados".</div>
      </div>` : "";
    const cas = swmData.casilleros && swmData.casilleros[email];
    const key = `mexico|${email}`;
    const open = abierto || enviando || !!swmSearch.trim() || swmCliOpen.has(key);
    return `<details class="swm-cli" data-cli="${escapeHtml(key)}"${open ? " open" : ""}>
      <summary><span>👤 <b>${escapeHtml(p0.name || email)}</b>${cas ? ` · ${escapeHtml(cas)}` : ""}</span><span class="swm-cli-n">${ps.length}</span></summary>
      <div class="swm-cli-body">
        ${libres.length && !abierto ? `<button type="button" class="btn-primary" data-cons-toggle="${escapeHtml(email)}" style="padding:8px 14px;font-size:13px;margin-bottom:8px;">📦 ${libres.length > 1 ? "Juntar en una caja y crear envío" : "Crear envío"}</button>` : ""}
        ${mandables.length && !enviando ? `<button type="button" class="btn-secondary" data-env-toggle="${escapeHtml(email)}" style="padding:8px 14px;font-size:13px;margin-bottom:8px;">🚚 Ya lo mandé: anotar guía</button>
          <button type="button" class="btn-secondary" data-env-personal-todo="${escapeHtml(email)}" data-env-ids="${escapeHtml(mandables.map((p) => p.id).join(","))}" data-env-folios="${escapeHtml(mandables.map((p) => p.folio).join(", "))}" style="padding:8px 14px;font-size:13px;margin-bottom:8px;">📍 Se lo entregué en persona</button>` : ""}
        ${form}${formGuia}${ps.map(swmPaqueteCard).join("")}
      </div></details>`;
  }

  /* Guía real para un envío de Dirección americana (Envíos Perros /
     Skydropx), igual que en los pedidos de la tienda. */
  function swmGuiaForm(e, cobrar = false) {
    const d = e.direccion || {};
    const pk = (e.paqueteIds || []).map((id) => swmData.paquetes.find((p) => p.id === id)).filter(Boolean);
    const kg = Math.max(1, Math.ceil(pk.reduce((s, p) => s + (Number(p.kg) || Number(p.cobrable) || 0), 0) + (Number(e.kgExtra) || 0)) || Math.ceil((e.sugerido && e.sugerido.kg) || 1));
    const inp = (k, l, v, extra = "") => `<label>${l}<input data-g="${k}" type="text" value="${escapeHtml(v || "")}" ${extra}></label>`;
    const dir = `<div class="grid" style="margin-top:8px;">
        ${inp("nombre", "Nombre", d.nombre)}${inp("telefono", "Teléfono", d.telefono)}
        ${inp("calle", "Calle", d.calle)}${inp("ext", "Núm. exterior", "")}${inp("int", "Núm. interior", "")}
        ${inp("colonia", "Colonia", d.colonia)}${inp("ciudad", "Ciudad", d.ciudad)}${inp("estado", "Estado", d.estado)}${inp("cp", "Código postal", d.cp)}${inp("referencias", "Referencias", d.referencias)}
      </div>`;
    const rates = `<div data-guia-error style="color:#b33660;font-size:13px;margin-top:6px;"></div>
      <div class="rate-options" data-guia-rates style="margin-top:6px;"></div>`;
    if (cobrar === "orden") {
      // Caja solo con pedidos de la tienda: su envío ya está pagado en los pedidos.
      return `<div style="margin-top:10px;">
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:end;">
          <label style="max-width:150px;">Peso de la caja (kg)<input data-g="peso" type="text" inputmode="decimal" value="${kg}"></label>
          <button type="button" class="btn-secondary" data-guia-cotizar style="padding:8px 14px;">1️⃣ Ver precios de envío</button>
        </div>
        <div class="meta" data-guia-tabla style="margin-top:6px;"></div>
        ${rates}
        <details style="margin-top:8px;" open><summary style="cursor:pointer;font-size:13px;color:#6b6370;">📍 Dirección de envío (revísala si quieres)</summary>${dir}</details>
        <div style="margin-top:10px;"><button type="button" class="btn-primary" data-guia-generar disabled>2️⃣ Hacer guía y marcar enviados</button></div>
      </div>`;
    }
    if (cobrar) {
      // Cobro en un solo paso: la guía + cruce + envío con el precio de la paquetería.
      const s = e.sugerido || {};
      const base = (s.cruce || 0) + (s.consolidacion || 0) + (s.sinRegistro || 0) + (s.extras || 0);
      const libres = swmLealtadLibres(e.email);
      return `<div data-cobro-base="${base}" data-cruce="${s.cruce || 0}" style="margin-top:10px;">
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:end;">
          <label style="max-width:150px;">Peso de la caja (kg)<input data-g="peso" type="text" inputmode="decimal" value="${kg}"></label>
          <button type="button" class="btn-secondary" data-guia-cotizar style="padding:8px 14px;">1️⃣ Ver precios de envío</button>
        </div>
        <div class="meta" data-guia-tabla style="margin-top:6px;"></div>
        ${rates}
        ${libres ? `<label class="swm-check" style="margin-top:8px;"><input type="checkbox" data-g-lealtad> 🎁 Cruce al 50% por lealtad (le quedan ${libres})</label>` : ""}
        <details style="margin-top:8px;"><summary style="cursor:pointer;font-size:13px;color:#6b6370;">📍 Dirección de envío (revísala si quieres)</summary>${dir}</details>
        <div style="margin-top:10px;"><button type="button" class="btn-primary" data-guia-generar disabled>2️⃣ Hacer guía y cobrarle</button></div>
        <div class="meta" style="margin-top:4px;">Le cobro cruce ${formatPrice(base)} + el envío (el de tu tabla, o el que pongas en "Cóbrale de envío"). Cuando pague, le llega su guía sola.</div>
      </div>`;
    }
    return `<details style="margin-top:10px;"><summary style="cursor:pointer;font-weight:700;font-size:14px;">📦 Generar guía real (comparar precios)</summary>
      <div class="grid" style="margin-top:8px;">${inp("peso", "Peso total de la caja (kg)", kg, 'inputmode="decimal"')}</div>
      ${dir}
      <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;"><button type="button" class="btn-secondary" data-guia-cotizar>Cotizar paqueterías</button><button type="button" class="btn-primary" data-guia-generar disabled>Generar guía y avisarle</button></div>
      ${rates}
    </details>`;
  }

  /* Descuentos de lealtad (cruce al 50%) que le quedan a la clienta (cada
     5 envíos entregados; lo mismo que lealtadDe en swm-core.js). */
  const SWM_LEALTAD_CADA = 5;
  function swmLealtadLibres(email) {
    const suyos = swmData.envios.filter((x) => x.email === email);
    const entregados = suyos.filter((x) => x.status === "entregado").length;
    const usados = suyos.filter((x) => x.premioLealtad && x.status !== "cancelado").length;
    return Math.max(0, Math.floor(entregados / SWM_LEALTAD_CADA) - usados);
  }

  function swmEnvioCard(e) {
    const st = { solicitado: "🆕 Por cotizar", cotizado: "💳 Cotizado", pagado: "✅ Pagado · hay que mandar", en_mexico: "🇲🇽 En México · hay que mandar", enviado: "🚚 Enviado", entregado: "🎁 Entregado", cancelado: "❌ Cancelado" }[e.status] || e.status;
    const pk = (e.paqueteIds || []).map((id) => swmData.paquetes.find((p) => p.id === id)).filter(Boolean);
    const d = e.direccion || {};
    const q = e.cotizacion; const sug = e.sugerido || {};
    let action = "";
    if (e.status === "solicitado" || (e.status === "cotizado" && (!e.pago || e.pago.status === "pendiente"))) {
      const personal = e.entrega === "personal";
      const juarez = personal || /ju[aá]rez/i.test(`${d.ciudad || ""}`);
      // Lo de antes (montos a mano, sin guía): plegado, para casos especiales.
      const manual = `<details style="margin-top:10px;"${e.guia ? "" : ""}><summary style="cursor:pointer;font-size:13px;color:#6b6370;">✏️ Anotar la guía a mano o ajustar montos</summary>
        <div class="meta" style="margin-top:6px;">Si hiciste la guía por fuera, anótala aquí: le llega sola en cuanto pague. Si no, déjala vacía.</div>
        <div class="grid">
          <label>Paquetería<input data-f="paqueteria" type="text" placeholder="Estafeta" value="${escapeHtml(e.paqueteria || "")}"></label>
          <label>Número de guía (opcional)<input data-f="guia" type="text" value=""></label>
          <label>Envío nacional (MXN)<input data-f="envio" type="number" step="0.01" min="0" value="${q ? q.envio : ""}"></label>
          <label>Cruce (vacío = ${formatPrice(sug.cruce || 0)})<input data-f="cruce" type="number" step="0.01" min="0" placeholder="${sug.cruce || 0}"></label>
          <label>Consolidación (vacío = ${formatPrice(sug.consolidacion || 0)})<input data-f="consolidacion" type="number" step="0.01" min="0" placeholder="${sug.consolidacion || 0}"></label>
          ${sug.sinRegistro ? `<label>Cargo sin registrar (vacío = ${formatPrice(sug.sinRegistro)})<input data-f="sinRegistro" type="number" step="0.01" min="0" placeholder="${sug.sinRegistro}"></label>` : ""}
          ${sug.extras ? `<label>Servicios extra (vacío = ${formatPrice(sug.extras)})<input data-f="extras" type="number" step="0.01" min="0" placeholder="${sug.extras}"></label>` : ""}
          <label>Nota para la clienta<input data-f="notaClienta" type="text" value="${escapeHtml(e.notaClienta || "")}"></label>
        </div>
        ${swmLealtadLibres(e.email) || e.premioLealtad ? `<label class="swm-check" style="margin-top:8px;"><input type="checkbox" data-f="premioLealtad"${e.premioLealtad ? " checked" : ""}> 🎁 Cruce al 50% por lealtad</label>` : ""}
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;"><button type="button" class="btn-primary" data-swm-cotizar-envio>${e.status === "cotizado" ? "Actualizar cobro" : "Mandar cobro"}</button></div>
      </details>`;
      action = e.guia
        ? `<div class="meta" style="margin-top:10px;font-size:14px;">📦 Guía lista: <b>${escapeHtml(e.paqueteria || "")} ${escapeHtml(e.guia)}</b><br>⏳ Esperando que pague ${q ? formatPrice(q.total) : ""}. En cuanto pague, le llega su guía sola.</div>
          <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">${swmCancelBtn("envio", e)}</div>`
        : `${juarez ? `<div style="margin-top:10px;"><button type="button" class="${personal ? "btn-primary" : "btn-secondary"}" data-swm-envio-personal>📍 Se lo entrego en Juárez: ${(sug.cruce || 0) + (sug.consolidacion || 0) + (sug.sinRegistro || 0) + (sug.extras || 0) ? `cobrarle solo el cruce (${formatPrice((sug.cruce || 0) + (sug.consolidacion || 0) + (sug.sinRegistro || 0) + (sug.extras || 0))})` : "no hay nada que cobrar"}</button></div>` : ""}
          ${personal ? "" : swmGuiaForm(e, true)}
          ${manual}
          <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">${swmCancelBtn("envio", e)}</div>`;
    } else if (e.entrega === "personal" && (e.status === "pagado" || e.status === "en_mexico")) {
      action = `<div class="meta" style="margin-top:10px;">📍 Entrega personal: acuerda con ella lugar y hora por WhatsApp.</div>
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">${e.status === "pagado" ? `<button type="button" class="btn-secondary" data-swm-en-mexico>🇲🇽 Ya está en México</button>` : ""}<button type="button" class="btn-primary" data-swm-entregado>🎁 Ya se lo entregué</button></div>`;
    } else if (e.status === "pagado" || e.status === "en_mexico") {
      action = `<div class="grid"><label>Paquetería<input data-f="paqueteria" type="text" value="${escapeHtml(e.paqueteria || "Estafeta")}"></label><label>Número de guía<input data-f="guia" type="text" value="${escapeHtml(e.guia || "")}"></label></div>
        <div style="display:flex;gap:8px;margin-top:10px;">${e.status === "pagado" ? `<button type="button" class="btn-secondary" data-swm-en-mexico>🇲🇽 Ya está en México</button>` : ""}<button type="button" class="btn-primary" data-swm-enviado>🚚 Marcar enviado (mandarle la guía)</button></div>
        ${e.guia ? "" : swmGuiaForm(e)}`;
    } else if (e.status === "enviado") {
      action = `<div style="display:flex;gap:8px;margin-top:10px;"><button type="button" class="btn-secondary" data-swm-entregado>🎁 Marcar entregado</button></div>`;
    }
    if (e.status === "enviado" || e.status === "entregado") {
      action += `<details style="margin-top:10px;"><summary style="cursor:pointer;font-size:13px;color:#6b6370;">✏️ Corregir la guía</summary>
        <div class="grid"><label>Paquetería<input data-f="paqueteria" type="text" value="${escapeHtml(e.paqueteria || "Estafeta")}"></label><label>Número de guía<input data-f="guia" type="text" value="${escapeHtml(e.guia || "")}"></label></div>
        <div style="display:flex;gap:8px;margin-top:10px;"><button type="button" class="btn-primary" data-swm-corregir-guia>💾 Guardar y avisarle</button></div>
      </details>`;
    }
    return `<div class="swm-card" data-swm-id="${escapeHtml(e.id)}" data-kind="envio">
      <h4><span>${escapeHtml(e.folio)} · Envío a México</span>${swmPillA(st, ["solicitado", "pagado", "en_mexico"].includes(e.status) ? "new" : "")}</h4>
      <div class="meta">${swmWho(e)}${swmCompacto ? "" : " · "}${swmFecha(e.createdAt)}${e.consolidar ? " · <b>consolidar</b>" : ""}</div>
      <ul style="margin:8px 0 0;padding-left:18px;font-size:14px;">${pk.map((p) => `<li>${escapeHtml([p.folio, p.tienda].filter(Boolean).join(" · "))}${p.rastreo ? ` · 🔎 rastreo original: <b>${escapeHtml(p.paqueteria ? `${p.paqueteria} ` : "")}${escapeHtml(p.rastreo)}</b>` : ""} · ${p.cobrable || "?"} kg · cruce ${p.crucePagado ? "ya pagado" : p.cobro === "auto" ? "lo más barato" : p.cobro === "comision" ? "15%" : "por peso"}</li>`).join("")}</ul>
      <div class="meta">${e.entrega === "personal" ? `<b>📍 Entrega personal en Ciudad Juárez</b> · ${escapeHtml([d.nombre, d.telefono].filter(Boolean).join(", "))}` : `📍 ${escapeHtml([d.nombre, d.telefono, d.calle, d.colonia, d.ciudad, d.estado, d.cp].filter(Boolean).join(", "))}${d.referencias ? ` (${escapeHtml(d.referencias)})` : ""}`}</div>
      <div class="meta">Sugerido: cruce ${formatPrice(sug.cruce || 0)}${sug.consolidacion ? ` + consolidación ${formatPrice(sug.consolidacion)}` : ""}${sug.sinRegistro ? ` + sin registrar ${formatPrice(sug.sinRegistro)}` : ""}${sug.extras ? ` + extras ${formatPrice(sug.extras)}` : ""} · ${sug.kg || 0} kg en total</div>
      ${q ? `<div class="meta">Cotización: cruce ${formatPrice(q.cruce)}${q.consolidacion ? ` + consolidación ${formatPrice(q.consolidacion)}` : ""}${q.sinRegistro ? ` + sin registrar ${formatPrice(q.sinRegistro)}` : ""}${q.extras ? ` + extras ${formatPrice(q.extras)}` : ""} + envío ${formatPrice(q.envio)} = <b>${formatPrice(q.total)}</b></div>` : ""}
      ${e.guia ? `<div class="meta">🚚 ${escapeHtml(e.paqueteria)} · ${escapeHtml(e.guia)}</div>` : ""}
      ${swmPagoBox("envio", e)}${action}
    </div>`;
  }

  /* Achica fotos del celular antes de subirlas (máx. 1600 px, JPEG). */
  /* Fotos HEIC (las del iPhone): Chrome no las sabe leer, así que se
     pasan a JPG en el servidor (admin-heic.js). Si una foto no se puede
     leer, se avisa (antes se perdía sin decir nada). */
  const swmEsHeic = (f) => /hei[cf]/i.test(f.type || "") || /\.(heic|heif)$/i.test(f.name || "");
  const fileToBase64 = (f) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1] || ""); r.onerror = rej; r.readAsDataURL(f); });
  let fotosFallidas = [];
  let fotosFallidasTimer = null;
  function swmFotoFallida(file) {
    fotosFallidas.push(file.name || "foto");
    clearTimeout(fotosFallidasTimer);
    fotosFallidasTimer = setTimeout(() => {
      alert(`⚠️ No pude leer ${fotosFallidas.length === 1 ? "esta foto" : `estas ${fotosFallidas.length} fotos`}: ${fotosFallidas.join(", ")}.\nNo se guardó${fotosFallidas.length === 1 ? "" : "ron"}. Prueba con una captura de pantalla o guárdala como JPG.`);
      fotosFallidas = [];
    }, 300);
  }
  /* El botón "Hacer guía y cobrarle $X" se recalcula al elegir paquetería,
     al escribir en "Cóbrale de envío" o al marcar la lealtad. */
  function swmGuiaBoton(card, id) {
    const st = swmGuiaState[id];
    const genBtn = card.querySelector("[data-guia-generar]");
    const cobro = card.querySelector("[data-cobro-base]");
    if (!st || st.selected == null || !cobro || !genBtn) return;
    const r = st.rates[st.selected];
    const lealtad = card.querySelector("[data-g-lealtad]");
    const cruce = Number(cobro.dataset.cruce) || 0;
    const aMano = (card.querySelector('[data-g="cobrar"]') || {}).value;
    // A la clienta se le cobra lo que Mae puso a mano; si no, el envío de su
    // tabla; si su CP no está, la paquetería + $100.
    const envioCobro = aMano !== "" && aMano != null && Number(aMano) >= 0 ? Number(aMano) : st.tabla != null ? st.tabla : (Number(r.total) || 0) + 100;
    const total = (Number(cobro.dataset.cobroBase) || 0) - (lealtad && lealtad.checked ? cruce / 2 : 0) + envioCobro;
    genBtn.textContent = `2️⃣ Hacer guía y cobrarle ${formatPrice(total)}`;
  }
  document.getElementById("swm-panel").addEventListener("input", (e) => {
    if (!e.target.matches('[data-g="cobrar"], [data-g-lealtad]')) return;
    const card = e.target.closest("[data-swm-id]");
    if (card) swmGuiaBoton(card, card.dataset.swmId);
  });

  async function swmResize(file) {
    if (swmEsHeic(file)) {
      if (file.size > 4.3 * 1024 * 1024) { swmFotoFallida(file); return null; }
      try {
        const res = await fetch("/.netlify/functions/admin-heic", { method: "POST", headers: { "Content-Type": "application/json", "x-admin-key": adminKey }, body: JSON.stringify({ dataBase64: await fileToBase64(file) }) });
        const d = await res.json().catch(() => ({}));
        if (res.ok && d.dataBase64) return { contentType: "image/jpeg", dataBase64: d.dataBase64 };
      } catch (err) { /* abajo se avisa */ }
      swmFotoFallida(file);
      return null;
    }
    const r = await swmResizeImg(file);
    if (!r) swmFotoFallida(file);
    return r;
  }
  function swmResizeImg(file) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, 1600 / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        resolve({ contentType: "image/jpeg", dataBase64: c.toDataURL("image/jpeg", 0.82).split(",")[1] });
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => resolve(null);
      img.src = URL.createObjectURL(file);
    });
  }

  // Se muestra en el mismo visor de los comprobantes de la tienda. Abrir
  // una pestaña nueva con blob: se quedaba en about:blank en el iPhone.
  async function swmOpenFile(key) {
    try {
      const res = await fetch(`/.netlify/functions/admin-swm?archivo=${encodeURIComponent(key)}`, { headers: { "x-admin-key": adminKey } });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const blob = await res.blob();
      openProofViewer(URL.createObjectURL(blob), blob.type);
    } catch (err) {
      alert("No se pudo abrir el archivo.");
    }
  }

  document.getElementById("swm-panel").addEventListener("toggle", (e) => {
    const d = e.target;
    if (!d.matches || !d.matches("details[data-cli]")) return;
    if (d.open) swmCliOpen.add(d.dataset.cli); else swmCliOpen.delete(d.dataset.cli);
  }, true);

  document.getElementById("swm-panel").addEventListener("click", async (e) => {
    const t = e.target;
    const tab = t.closest("[data-swm-tab]");
    if (tab) { swmTab = tab.dataset.swmTab; renderSwmAdmin(); return; }
    const psT = t.closest("[data-ps-tab]");
    if (psT) { psTab = psT.dataset.psTab; swmSearch = ""; renderSwmAdmin(); return; }
    const psF = t.closest("[data-ps-factura]");
    if (psF) {
      const c = swmData.compras.find((x) => x.id === psF.dataset.psFactura);
      const w = c && window.open("", "_blank");
      if (w) { w.document.open(); w.document.write(psFacturaHTML(c)); w.document.close(); }
      else if (c) alert("Tu navegador bloqueó la ventana nueva. Permite ventanas emergentes para alpacca.mx.");
      return;
    }
    const psM = t.closest("[data-ps-en-mano]");
    if (psM) {
      if (!confirm("¿Pasarla a “Por mandar”?")) return;
      const data = await swmAct({ accion: "compra_en_mano", id: psM.dataset.psEnMano }, psM);
      if (data) { psTab = "envio"; renderSwmAdmin(); showToast("📦 Listo. Cuando la cruces toca “🇲🇽 Ya cruzó a México” y su envío se arma solo."); }
      return;
    }
    const consToggle = t.closest("[data-cons-toggle]");
    if (consToggle) { swmConsolidarEmail = consToggle.dataset.consToggle; renderSwmAdmin(); return; }
    if (t.closest("[data-cons-save]")) {
      const box = t.closest("[data-swm-consolidar]");
      const paqueteIds = [...box.querySelectorAll("[data-cons-pick]:checked")].map((c) => c.dataset.consPick);
      if (!paqueteIds.length) { alert("Elige al menos un paquete."); return; }
      const direccion = Object.fromEntries([...box.querySelectorAll("[data-dir]")].map((i) => [i.dataset.dir, i.value.trim()]));
      const ok = await swmAct({ accion: "crear_envio", email: box.dataset.swmConsolidar, paqueteIds, direccion }, t.closest("button"));
      if (ok) { swmConsolidarEmail = ""; swmTab = "envios"; renderSwmAdmin(); }
      return;
    }
    const envToggle = t.closest("[data-env-toggle]");
    if (envToggle) { swmEnviarEmail = envToggle.dataset.envToggle; renderSwmAdmin(); return; }
    // "Se lo entregué en persona" afuera del cuadro: todos sus paquetes en México.
    const personalTodo = t.closest("[data-env-personal-todo]");
    if (personalTodo) {
      const paqueteIds = personalTodo.dataset.envIds.split(",").filter(Boolean);
      if (!confirm(`¿Marcar como entregado en persona ${personalTodo.dataset.envFolios}? Le llega un correo avisándole.`)) return;
      const ok = await swmAct({ accion: "enviar_directo", personal: true, email: personalTodo.dataset.envPersonalTodo, paqueteIds, avisar: true }, personalTodo);
      if (ok) { swmTab = "entregados"; renderSwmAdmin(); }
      return;
    }
    if (t.closest("[data-env-personal]")) {
      const box = t.closest("[data-swm-enviar]");
      const paqueteIds = [...box.querySelectorAll("[data-env-pick]:checked")].map((c) => c.dataset.envPick);
      if (!paqueteIds.length) { alert("Elige al menos un paquete."); return; }
      if (!confirm(`¿Marcar ${paqueteIds.length === 1 ? "este paquete" : `estos ${paqueteIds.length} paquetes`} como entregados en persona?`)) return;
      const ok = await swmAct({ accion: "enviar_directo", personal: true, email: box.dataset.swmEnviar, paqueteIds, avisar: box.querySelector("[data-env-avisar]").checked }, t.closest("button"));
      if (ok) { swmEnviarEmail = ""; swmTab = "entregados"; renderSwmAdmin(); }
      return;
    }
    if (t.closest("[data-env-save]")) {
      const box = t.closest("[data-swm-enviar]");
      const paqueteIds = [...box.querySelectorAll("[data-env-pick]:checked")].map((c) => c.dataset.envPick);
      const paqueteria = box.querySelector("[data-env-paq]").value.trim();
      const guia = box.querySelector("[data-env-guia]").value.trim();
      if (!paqueteIds.length) { alert("Elige al menos un paquete."); return; }
      if (!guia) { alert("Pon el número de guía."); box.querySelector("[data-env-guia]").focus(); return; }
      const ok = await swmAct({ accion: "enviar_directo", email: box.dataset.swmEnviar, paqueteIds, paqueteria, guia, avisar: box.querySelector("[data-env-avisar]").checked }, t.closest("button"));
      if (ok) { swmEnviarEmail = ""; swmTab = "enviados"; renderSwmAdmin(); }
      return;
    }
    if (t.closest("[data-guia-cotizar]") || t.closest("[data-guia-generar]") || t.closest("[data-guia-rate]")) {
      swmGuia(t);
      return;
    }
    if (t.closest("[data-swm-nc-toggle]")) {
      const tipo = t.closest("[data-swm-nc-toggle]").dataset.psTipo;
      if (tipo && swmNuevaCompraOpen && tipo !== psNuevaTipo) swmNuevaCompraOpen = false; // cambia de una a otra
      if (tipo) psNuevaTipo = tipo;
      swmNuevaCompraOpen = !swmNuevaCompraOpen;
      document.getElementById("swm-nc-box").innerHTML = swmNuevaCompraOpen ? swmNuevaCompraForm(null, { ps: swmModo === "ps" && psNuevaTipo !== "linea" }) : "";
      return;
    }
    if (t.closest("[data-swm-nc-edit]")) {
      swmEditCompraId = t.closest("[data-swm-id]").dataset.swmId;
      renderSwmAdmin();
      const box = document.querySelector(`[data-swm-nc][data-edit-id="${CSS.escape(swmEditCompraId)}"]`);
      if (box) { swmNcTotal(box); box.scrollIntoView({ behavior: "smooth", block: "start" }); }
      return;
    }
    if (t.closest("[data-swm-nc-edit-cancel]")) { swmEditCompraId = ""; renderSwmAdmin(); return; }
    if (t.closest("[data-swm-nc-del]")) {
      const box = t.closest("[data-swm-nc]");
      const rows = box.querySelectorAll("[data-swm-nc-item]");
      if (rows.length > 1) t.closest("[data-swm-nc-item]").remove();
      else rows[0].querySelectorAll("input").forEach((i) => { i.value = i.dataset.k === "cantidad" ? "1" : ""; });
      swmNcTotal(box);
      return;
    }
    if (t.closest("[data-swm-nc-paste-go]")) {
      const box = t.closest("[data-swm-nc]");
      const ta = box.querySelector("[data-swm-nc-paste]");
      const items = swmNcParse(ta.value);
      if (!items.length) { alert("No encontré artículos. Pon uno por renglón, por ejemplo: Winterberry Ice x2 $1.95"); return; }
      const cont = box.querySelector("[data-swm-nc-items]");
      // Quita los renglones vacíos antes de agregar los pegados.
      cont.querySelectorAll("[data-swm-nc-item]").forEach((row) => { if (!row.querySelector('[data-k="nombre"]').value.trim()) row.remove(); });
      cont.insertAdjacentHTML("beforeend", items.map(swmNcItemRow).join(""));
      ta.value = "";
      swmNcTotal(box);
      const sinPrecio = items.filter((x) => !x.precioUSD).length;
      showToast(`✅ ${items.length} artículo${items.length === 1 ? "" : "s"} agregado${items.length === 1 ? "" : "s"}${sinPrecio ? ` · ${sinPrecio} sin precio, ponlo a mano` : ""}`);
      return;
    }
    if (t.closest("[data-swm-nc-add]")) {
      t.closest("[data-swm-nc]").querySelector("[data-swm-nc-items]").insertAdjacentHTML("beforeend", swmNcItemRow());
      return;
    }
    const copyLink = t.closest("[data-swm-copy-link]");
    if (copyLink) {
      navigator.clipboard.writeText(copyLink.dataset.swmCopyLink).then(() => showToast("🔗 Link copiado"), () => prompt("Copia el link:", copyLink.dataset.swmCopyLink));
      return;
    }
    const ncSave = t.closest("[data-swm-nc-save]");
    if (ncSave) {
      const box = ncSave.closest("[data-swm-nc]");
      if (box.dataset.ps) {
        const n = (k) => { const el = box.querySelector(`[data-n="${k}"]`); return el ? el.value : ""; };
        if (!n("email").trim()) { alert("Busca a la clienta o pon su correo."); return; }
        const total = parseFloat(n("totalMXN")) || 0;
        if (!(total > 0)) { alert("Pon el total a cobrar en pesos."); return; }
        const files = [...(box.querySelector('[data-n="facturaFotos"]').files || [])].slice(0, 6);
        if (!box.dataset.editId && !files.length) { alert("Sube la foto de la factura."); return; }
        const facturaFotos = (await Promise.all(files.map(swmResize))).filter(Boolean);
        const body = { ps: true, totalMXN: total, facturaFotos, tienda: n("tienda"), notaClienta: n("notaClienta"),
          yaComprado: true, fechaCompra: n("fechaCompra") };
        if (box.dataset.editId) {
          const id = box.dataset.editId;
          swmEditCompraId = "";
          const ok = await swmAct({ accion: "editar_compra", id, ...body, quitarFactura: facturaFotos.length > 0 }, ncSave);
          if (!ok) swmEditCompraId = id;
          return;
        }
        const data = await swmAct({ accion: "crear_compra", email: n("email"), name: n("name"), phone: n("phone"), ...body }, ncSave);
        if (data && data.compra) {
          swmNuevaCompraOpen = false; swmSearch = ""; psTab = "cobrar"; renderSwmAdmin();
          if (!data.tieneCuenta) alert(`Ese correo todavía no tiene cuenta. Cuando ${data.compra.name || "la clienta"} la cree con ${data.compra.email}, verá su factura y la podrá pagar.`);
          const card = document.querySelector(`[data-swm-id="${CSS.escape(data.compra.id)}"]`);
          if (card) { card.scrollIntoView({ behavior: "smooth", block: "start" }); card.style.outline = "3px solid #c4466e"; }
          showToast("✅ Factura lista: toca “💬 Mandar link por WhatsApp”.");
        }
        return;
      }
      const { items, n } = swmNcLeer(box);
      if (!n("email").trim()) { alert("Busca a la clienta o pon su correo."); return; }
      if (!items.length || items.some((x) => !x.nombre || !(x.precioUSD > 0))) { alert("Cada artículo necesita nombre y precio en dólares."); return; }
      const fotos = (await Promise.all([...(box.querySelector('[data-n="fotos"]').files || [])].slice(0, 8).map(swmResize))).filter(Boolean);
      const psExtra = box.dataset.ps ? { ps: true, yaComprado: true, fechaCompra: n("fechaCompra") } : {};
      if (box.dataset.editId) {
        const id = box.dataset.editId;
        swmEditCompraId = "";
        const ok = await swmAct({ accion: "editar_compra", id, tienda: n("tienda"), items, taxPct: n("taxPct"), envioUSD: n("envioUSD"), cobro: n("cobro"), cruce: n("cruce"), notaClienta: n("notaClienta"), fotos, ...psExtra }, ncSave);
        if (!ok) swmEditCompraId = id;
        return;
      }
      const data = await swmAct({ accion: "crear_compra", email: n("email"), name: n("name"), phone: n("phone"), tienda: n("tienda"), items, taxPct: n("taxPct"), envioUSD: n("envioUSD"), cobro: n("cobro"), cruce: n("cruce"), notaClienta: n("notaClienta"), fotos, ...psExtra }, ncSave);
      if (data && data.compra) {
        swmNuevaCompraOpen = false; swmSearch = "";
        psTab = "cobrar";
        renderSwmAdmin();
        if (!data.tieneCuenta) alert(`Ese correo todavía no tiene cuenta. Cuando ${data.compra.name || "la clienta"} la cree con ${data.compra.email}, verá su cotización.`);
        const card = document.querySelector(`[data-swm-id="${CSS.escape(data.compra.id)}"]`);
        if (card) { card.scrollIntoView({ behavior: "smooth", block: "start" }); card.style.outline = "3px solid #c4466e"; }
        showToast("✅ Cotización lista: toca “💬 Mandar link por WhatsApp”.");
      }
      return;
    }
    if (t.closest("[data-swm-sinreg-toggle]")) {
      swmSinRegistroOpen = !swmSinRegistroOpen;
      document.getElementById("swm-sinreg-box").innerHTML = swmSinRegistroOpen ? swmSinRegistroForm() : "";
      return;
    }
    const pick = t.closest("[data-swm-pick-email]");
    if (pick) {
      const nc = pick.closest("[data-swm-nc]");
      if (nc) {
        const c = swmBuscados[pick.dataset.swmPickEmail] || {};
        nc.querySelector('[data-n="email"]').value = pick.dataset.swmPickEmail;
        nc.querySelector('[data-n="name"]').value = c.name || "";
        nc.querySelector('[data-n="phone"]').value = c.phone || "";
        pick.parentElement.innerHTML = `<span class="meta">✅ ${escapeHtml(pick.textContent)}</span>`;
        return;
      }
      const box = pick.closest("[data-swm-sinreg]");
      if (box) {
        box.dataset.email = pick.dataset.swmPickEmail;
        box.querySelector("[data-swm-elegida]").innerHTML = `Dueña: <b>${escapeHtml(pick.textContent)}</b>`;
        return;
      }
      const card = pick.closest("[data-swm-id]");
      if (card && confirm(`¿Asignar este paquete a ${pick.textContent}? Le llega un correo y se le cobra el cargo por no registrarlo.`)) {
        swmAct({ accion: "asignar_paquete", id: card.dataset.swmId, email: pick.dataset.swmPickEmail }, pick);
      }
      return;
    }
    const sinregSave = t.closest("[data-swm-sinreg-save]");
    if (sinregSave) {
      const box = sinregSave.closest("[data-swm-sinreg]");
      const g = (k) => box.querySelector(`[data-g="${k}"]`).value;
      const fotos = (await Promise.all([...(box.querySelector('[data-g="fotos"]').files || [])].slice(0, 6).map(swmResize))).filter(Boolean);
      const ok = await swmAct({ accion: "sin_registrar", email: box.dataset.email || "", etiqueta: g("etiqueta"), tienda: g("tienda"), rastreo: g("rastreo"), kg: g("kg"), alto: g("alto"), ancho: g("ancho"), largo: g("largo"), notaClienta: g("notaClienta"), fotos }, sinregSave);
      if (ok) { swmSinRegistroOpen = false; swmTab = box.dataset.email ? "almacen" : "sindueña"; renderSwmAdmin(); }
      return;
    }
    const file = t.closest("[data-swm-file]");
    if (file) { swmOpenFile(file.dataset.swmFile); return; }
    const pc = t.closest("[data-swm-pedir-correccion]");
    if (pc) {
      const motivo = prompt("¿Qué tiene que corregir? (se lo mandamos por correo)", "El valor que registraste no coincide con lo que trae el paquete.");
      if (motivo && motivo.trim()) swmAct({ accion: "pedir_correccion", id: pc.dataset.swmPedirCorreccion, motivo: motivo.trim() }, pc);
      return;
    }
    const qc = t.closest("[data-swm-quitar-correccion]");
    if (qc) { swmAct({ accion: "quitar_correccion", id: qc.dataset.swmQuitarCorreccion }, qc); return; }
    const ap = t.closest("[data-swm-aprobar]");
    if (ap) {
      const [kind, id] = ap.dataset.swmAprobar.split(":");
      const pregunta = ap.dataset.porFuera ? "¿Marcarlo como pagado? (te pagó por fuera: efectivo, transferencia directa…). Le llega el aviso a la clienta y sigue el proceso." : "¿Ya verificaste que el dinero llegó a tu cuenta?";
      if (confirm(pregunta)) swmAct({ accion: "aprobar_pago", kind, id }, ap);
      return;
    }
    const re = t.closest("[data-swm-rechazar]");
    if (re) { const [kind, id] = re.dataset.swmRechazar.split(":"); const motivo = prompt("¿Por qué lo rechazas? (se lo mandamos a la clienta)", "No encontramos tu transferencia, revisa el comprobante."); if (motivo != null) swmAct({ accion: "rechazar_pago", kind, id, motivo }, re); return; }
    const ca = t.closest("[data-swm-cancel]");
    if (ca) { const [kind, id] = ca.dataset.swmCancel.split(":"); const motivo = prompt("¿Cancelar? Escribe el motivo para la clienta (o deja vacío):", ""); if (motivo != null) swmAct({ accion: "cancelar", kind, id, motivo }, ca); return; }
    const masGuia = t.closest("[data-swm-mas-guia]");
    if (masGuia) {
      const caja = masGuia.parentElement.querySelector("[data-guias]");
      const nuevo = caja.querySelector("input").cloneNode(true);
      nuevo.value = "";
      caja.appendChild(nuevo);
      nuevo.focus();
      return;
    }
    const nota = t.closest("[data-swm-nota-priv]");
    if (nota) {
      const c = nota.closest("[data-swm-id]");
      swmAct({ accion: "nota_paquete", id: c.dataset.swmId, ordenTienda: c.querySelector("[data-nota-orden]").value, rastreos: [...c.querySelectorAll("[data-nota-guia]")].map((i) => i.value.trim()).filter(Boolean) }, nota);
      return;
    }
    const add = t.closest("[data-swm-add-pkg]");
    if (add) {
      const box = add.closest(".swm-card").querySelector("[data-swm-pkgs]");
      const clone = box.querySelector("[data-swm-pkg]").cloneNode(true);
      clone.querySelectorAll("[data-guias]").forEach((g) => [...g.querySelectorAll("input")].slice(1).forEach((i) => i.remove()));
      clone.querySelectorAll("input").forEach((i) => { i.value = ""; });
      box.appendChild(clone);
      return;
    }
    const card = t.closest("[data-swm-id]");
    if (!card) return;
    const id = card.dataset.swmId;
    const v = (k) => { const el = card.querySelector(`[data-f="${k}"]`); return el ? el.value : undefined; };
    const btn = t.closest("button");
    if (t.closest("[data-swm-recibir]")) {
      const input = card.querySelector('[data-f="fotos"]');
      const fotos = (await Promise.all([...(input.files || [])].slice(0, 6).map(swmResize))).filter(Boolean);
      const enUSA = !!t.closest("[data-usa]");
      const nuevo = !enUSA && t.closest("[data-swm-recibir]").textContent.includes("Recibido en México");
      const data = await swmAct({ accion: "recibir_paquete", id, kg: v("kg"), alto: v("alto"), ancho: v("ancho"), largo: v("largo"), notaClienta: v("notaClienta"), fotos, enUSA }, btn);
      if (data && enUSA) showToast("🇺🇸 Listo: quedó en la dirección americana y ya le avisé. Cuando lo cruces toca \"🇲🇽 Cruzado a México\" y su envío se arma solo.");
      if (data && nuevo) showToast(data.envio ? `✅ Recibido. Su envío ${data.envio.folio} ya está en "Envíos por cotizar": haz la guía y cóbrale.` : "✅ Recibido. Todavía no tiene su dirección guardada; le pedí que la ponga y su envío se arma solo.");
    } else if (t.closest("[data-swm-cruzar]")) {
      if (!(parseFloat(v("kg")) > 0)) { alert("Pon el peso del paquete para poder armar su envío."); return; }
      if (!confirm("¿Ya lo cruzaste a México? Le aviso a la clienta y se arma su envío a casa.")) return;
      const input = card.querySelector('[data-f="fotos"]');
      const fotos = (await Promise.all([...(input.files || [])].slice(0, 6).map(swmResize))).filter(Boolean);
      const ok = await swmAct({ accion: "recibir_paquete", id, kg: v("kg"), alto: v("alto"), ancho: v("ancho"), largo: v("largo"), notaClienta: v("notaClienta"), fotos, sinAviso: true }, btn);
      if (!ok) return;
      const data = await swmAct({ accion: "paquete_en_mexico", id }, null);
      if (data) showToast(data.envio ? `🇲🇽 Cruzado. Su envío ${data.envio.folio} ya está en "Envíos por cotizar": haz la guía y cóbrale.` : "🇲🇽 Cruzado y ya le avisé. Todavía no tiene su dirección guardada; le pedí que la ponga.");
    } else if (t.closest("[data-swm-cotizar-compra]")) {
      if (!(parseFloat(v("productos")) > 0)) { alert("Pon el costo de los productos."); return; }
      swmAct({ accion: "cotizar_compra", id, productos: v("productos"), cruce: v("cruce"), notaClienta: v("notaClienta") }, btn);
    } else if (t.closest("[data-swm-comprada]")) {
      const paquetes = [...card.querySelectorAll("[data-swm-pkg]")].map((row) => ({ ...Object.fromEntries([...row.querySelectorAll("[data-k]")].filter((i) => i.dataset.k !== "rastreo").map((i) => [i.dataset.k, i.value])), rastreos: [...row.querySelectorAll('[data-k="rastreo"]')].map((i) => i.value.trim()).filter(Boolean) }));
      swmAct({ accion: "compra_comprada", id, paquetes }, btn);
    } else if (t.closest("[data-swm-envio-personal]")) {
      if (!confirm("¿Cobrarle solo el cruce? Le aviso que se lo entregas en Juárez.")) return;
      swmAct({ accion: "cotizar_envio", id, envio: 0, notaClienta: "Te lo entrego personalmente en Ciudad Juárez." }, btn);
    } else if (t.closest("[data-swm-cotizar-envio]")) {
      if (v("envio") === "") { alert("Pon el costo del envío nacional."); return; }
      const premio = card.querySelector('[data-f="premioLealtad"]');
      swmAct({ accion: "cotizar_envio", id, envio: v("envio"), cruce: v("cruce"), consolidacion: v("consolidacion"), sinRegistro: v("sinRegistro"), extras: v("extras"), notaClienta: v("notaClienta"), paqueteria: v("paqueteria"), guia: v("guia"), ...(premio ? { premioLealtad: premio.checked } : {}) }, btn);
    } else if (t.closest("[data-swm-revision-hecha]")) {
      const input = card.querySelector('[data-f="revFotos"]');
      const fotos = (await Promise.all([...(input.files || [])].slice(0, 10).map(swmResize))).filter(Boolean);
      if (!fotos.length) { alert("Sube al menos una foto del contenido."); return; }
      swmAct({ accion: "revision_hecha", id, fotos, nota: v("revNota") }, btn);
    } else if (t.closest("[data-swm-separar-hecho]")) {
      if (!(parseFloat(v("nKg")) > 0) || !(parseFloat(v("rKg")) > 0)) { alert("Pon el peso de las dos partes."); return; }
      const input = card.querySelector('[data-f="nFotos"]');
      const fotos = (await Promise.all([...(input.files || [])].slice(0, 6).map(swmResize))).filter(Boolean);
      swmAct({ accion: "separar_paquete", id, fotos,
        nuevo: { contenido: v("nContenido"), valorUSD: v("nValor"), kg: v("nKg"), alto: v("nAlto"), ancho: v("nAncho"), largo: v("nLargo") },
        resto: { contenido: v("rContenido"), valorUSD: v("rValor"), kg: v("rKg"), alto: v("rAlto"), ancho: v("rAncho"), largo: v("rLargo") } }, btn);
    } else if (t.closest("[data-swm-pkg-mx]")) {
      if (!confirm("¿Marcar este paquete como cruzado a México? Le llega un aviso a la clienta.")) return;
      const data = await swmAct({ accion: "paquete_en_mexico", id }, btn);
      if (data) showToast(data.envio ? `🇲🇽 Cruzado. Su envío ${data.envio.folio} ya está en "Envíos por cotizar".` : "🇲🇽 Cruzado y ya le avisé.");
    } else if (t.closest("[data-swm-en-mexico]")) {
      swmAct({ accion: "marcar_en_mexico", id }, btn);
    } else if (t.closest("[data-swm-enviado]")) {
      if (!v("guia")) { alert("Pon el número de guía."); return; }
      swmAct({ accion: "marcar_enviado", id, paqueteria: v("paqueteria"), guia: v("guia") }, btn);
    } else if (t.closest("[data-swm-corregir-guia]")) {
      if (!v("guia")) { alert("Pon el número de guía."); return; }
      swmAct({ accion: "corregir_guia", id, paqueteria: v("paqueteria"), guia: v("guia") }, btn);
    } else if (t.closest("[data-swm-entregado]")) {
      swmAct({ accion: "marcar_entregado", id }, btn);
    }
  });

  let swmBuscarTimer = null;
  const swmBuscados = {};
  document.getElementById("swm-panel").addEventListener("input", (e) => {
    const nc = e.target.closest("[data-swm-nc]");
    if (nc && !e.target.matches("[data-swm-buscar]")) { swmNcTotal(nc); return; }
    const buscar = e.target.closest("[data-swm-buscar]");
    if (buscar) {
      clearTimeout(swmBuscarTimer);
      const out = buscar.closest(".swm-card").querySelector("[data-swm-resultados]");
      swmBuscarTimer = setTimeout(async () => {
        const q = buscar.value.trim();
        if (q.length < 2) { out.innerHTML = ""; return; }
        out.textContent = "Buscando...";
        try {
          const res = await fetch(`/.netlify/functions/admin-swm?buscarClienta=${encodeURIComponent(q)}`, { headers: { "x-admin-key": adminKey } });
          const data = await res.json();
          (data.clientas || []).forEach((c) => { swmBuscados[c.email] = c; });
          out.innerHTML = (data.clientas || []).map((c) => `<button type="button" class="btn-secondary" data-swm-pick-email="${escapeHtml(c.email)}" style="padding:6px 10px;font-size:13px;">${c.casillero ? `${escapeHtml(c.casillero)} · ` : ""}${escapeHtml(c.name || c.email)} · ${escapeHtml(c.email)}</button>`).join("") || "No encontré ninguna cuenta.";
        } catch (err) { out.textContent = "No se pudo buscar."; }
      }, 350);
      return;
    }
    if (e.target.id === "swm-search") {
      swmSearch = e.target.value;
      const pos = e.target.selectionStart;
      renderSwmAdmin();
      const s = document.getElementById("swm-search");
      s.focus(); s.setSelectionRange(pos, pos);
      return;
    }
    const card = e.target.closest('[data-kind="paquete"]');
    if (!card || !["kg", "alto", "ancho", "largo"].includes(e.target.dataset.f)) return;
    const n = (k) => parseFloat(card.querySelector(`[data-f="${k}"]`).value) || 0;
    const kg = swmCobrable(n("kg"), n("alto"), n("ancho"), n("largo"));
    const p = swmData.paquetes.find((x) => x.id === card.dataset.swmId) || {};
    card.querySelector("[data-swm-calc]").textContent = kg ? swmPesoTexto(p, kg) : "";
  });

  /* ===== Preventa (ej. Sephora Sale): campaña, productos con cupo y
     apartados con anticipo. Backend: admin-preventa.js. ===== */
  let pvData = null; // { config, productos, apartados }
  let pvApartadosLigeros = null; // solo estado de cada apartado (ver loadPvResumen)
  let pvAjustesAbierto = false; // "Productos y ajustes" desplegado
  let pvFiltro = ""; // vacío = el primero que tenga algo (comprobantes por revisar, si hay)
  let pvEditando = ""; // id del producto que está en el formulario

  const PV_ESTADOS = {
    nuevo: ["💳 Falta anticipo", "#fff1d8", "#8a5a00"],
    apartado: ["✅ Apartado (anticipo pagado)", "#e2f4ea", "#1f7a4d"],
    llego: ["📦 Llegó · falta el resto", "#fde8f0", "#b33660"],
    liquidado: ["💰 Liquidado · por entregar", "#e2f0fb", "#0b6bc2"],
    enviado: ["🚚 Enviado", "#efe8fb", "#6a45b8"],
    entregado: ["🎁 Entregado", "#f1f0f3", "#5f5866"],
    cancelado: ["Cancelado", "#f1f0f3", "#8a828f"],
    vencido: ["⌛ Venció sin pagar", "#f1f0f3", "#8a828f"],
  };
  const pvEstado = (a) => (a.status === "cancelado" ? "cancelado" : !a.cuenta ? "vencido" : a.status);
  const pvPorRevisar = (a) => a.cuenta && ((a.anticipo && a.anticipo.status === "revision") || (a.resto && a.resto.status === "revision"));
  const PV_FILTROS = [
    ["activos", "📋 Todos los activos", (a) => a.cuenta && !["entregado", "cancelado"].includes(a.status)],
    ["revisar", "🔎 Comprobantes por revisar", pvPorRevisar],
    ["anticipo", "💳 Falta anticipo", (a) => a.cuenta && a.status === "nuevo" && !pvPorRevisar(a)],
    ["apartado", "✅ Apartados", (a) => a.cuenta && a.status === "apartado"],
    ["llego", "📦 Llegó · falta el resto", (a) => a.cuenta && a.status === "llego" && !pvPorRevisar(a)],
    ["liquidado", "💰 Por entregar", (a) => a.status === "liquidado"],
    ["enviado", "🚚 Enviados", (a) => a.status === "enviado"],
    ["entregado", "🎁 Entregados", (a) => a.status === "entregado"],
    ["cancelado", "Cancelados / vencidos", (a) => a.status === "cancelado" || !a.cuenta],
  ];
  const pvLocal = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };

  async function loadPreventaAdmin({ quiet = false } = {}) {
    const box = document.getElementById("pv-admin");
    if (!quiet && !pvData) box.innerHTML = `<p class="abw-intro">Cargando…</p>`;
    try {
      const res = await fetch("/.netlify/functions/admin-preventa", { headers: { "x-admin-key": adminKey }, cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo cargar.");
      pvData = data;
      renderPreventaAdmin();
      // Los apartados liquidados también salen en "Por mandar".
      if (typeof pmPorMandarN === "function" && swmLoaded) {
        const pmN = pmPorMandarN();
        pmCount = pmN;
        const pmBadge = document.getElementById("pm-nav-badge");
        if (pmBadge) { pmBadge.textContent = pmN ? String(pmN) : ""; pmBadge.style.display = pmN ? "inline-flex" : "none"; }
      }
      if (currentView === "pm") renderSwmAdmin();
    } catch (err) {
      if (!quiet) box.innerHTML = `<p class="guide-error">${escapeHtml(err.message)}</p>`;
    }
  }

  /* Resumen de apartados para Inicio y Pedidos (sin cargar los ~2,600
     productos de la preventa). */
  const pvActivo = (a) => a.cuenta && !["entregado", "cancelado"].includes(a.status);
  function pvResumen() {
    const aps = pvApartadosLigeros || [];
    return { activos: aps.filter(pvActivo).length, revisar: aps.filter(pvPorRevisar).length };
  }
  async function loadPvResumen() {
    try {
      const res = await fetch("/.netlify/functions/admin-preventa?solo=apartados", { headers: { "x-admin-key": adminKey }, cache: "no-store" });
      const data = await res.json();
      if (!res.ok) return;
      pvApartadosLigeros = data.apartados || [];
      pvBadge();
    } catch (err) { /* el aviso es opcional */ }
  }

  function pvBadge() {
    if (pvData) pvApartadosLigeros = pvData.apartados;
    const { activos, revisar } = pvResumen();
    const b = document.getElementById("preventa-badge");
    if (b) { b.textContent = revisar; b.style.display = revisar ? "inline-flex" : "none"; }
    const aviso = document.getElementById("pv-orders-banner");
    if (aviso) {
      aviso.style.display = activos || revisar ? "" : "none";
      aviso.innerHTML = `🛍️ <b>Preventa Sephora:</b> ${activos} apartado${activos === 1 ? "" : "s"}${revisar ? ` · <b>${revisar} comprobante${revisar === 1 ? "" : "s"} por revisar</b>` : ""} <span style="text-decoration:underline;">Ver apartados ›</span>`;
    }
    if (currentView === "inicio") renderHome();
  }

  async function pvAct(body, btn) {
    if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = "Guardando..."; }
    try {
      const res = await fetch("/.netlify/functions/admin-preventa", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar.");
      showToast("Guardado ✅");
      await loadPreventaAdmin({ quiet: true });
      return data;
    } catch (err) {
      if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label; }
      alert(err.message);
      return null;
    }
  }

  function pvConfigHTML(c) {
    const abierta = c.activa && (!c.cierre || Date.now() < Date.parse(c.cierre));
    const estado = abierta ? `<span class="badge" style="background:#e2f4ea;color:#1f7a4d;">🟢 Abierta en la tienda</span>`
      : `<span class="badge" style="background:#f1f0f3;color:#5f5866;">🔴 ${c.activa ? "Ya pasó la fecha de cierre" : "Cerrada"}</span>`;
    return `<div class="swm-card" data-pv-config>
      <h4><span>📣 Campaña</span>${estado}</h4>
      <div class="grid">
        <label>Título<input data-c="titulo" type="text" value="${escapeHtml(c.titulo || "")}"></label>
        <label>Cierra el (fecha y hora)<input data-c="cierre" type="datetime-local" value="${pvLocal(c.cierre)}"></label>
        <label>Llega aprox.<input data-c="llegada" type="text" value="${escapeHtml(c.llegada || "")}" placeholder="Ej. a mediados de diciembre"></label>
        <label>% de anticipo<input data-c="anticipoPct" type="number" min="1" max="100" value="${c.anticipoPct || 50}"></label>
      </div>
      <label style="margin-top:8px;">Descripción (sale en la tienda)<textarea data-c="descripcion" rows="2" style="width:100%;">${escapeHtml(c.descripcion || "")}</textarea></label>
      <label class="swm-check"><input data-c="activa" type="checkbox" ${c.activa ? "checked" : ""}> Preventa abierta (se ve en la tienda)</label>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
        <button type="button" class="btn-primary" data-pv-guardar-config>💾 Guardar campaña</button>
        <a class="btn-secondary" href="https://alpacca.mx/?ver=preventa" target="_blank" rel="noopener" style="text-decoration:none;padding:12px 18px;">Ver en la tienda ↗</a>
        <button type="button" class="btn-secondary" data-pv-copiar-link>📋 Copiar link para tus clientas</button>
      </div>
    </div>`;
  }

  function pvProductoFormHTML() {
    const p = (pvEditando && pvData.productos.find((x) => x.id === pvEditando)) || {};
    return `<details class="swm-card" data-pv-prod-form ${pvEditando ? "open" : ""}>
      <summary style="cursor:pointer;font-weight:700;">${pvEditando ? "✏️ Editando producto" : "➕ Agregar un producto a mano"}</summary>
      <div class="grid">
        <label>Nombre *<input data-p="nombre" type="text" value="${escapeHtml(p.nombre || "")}" placeholder="Ej. Soft Pinch Liquid Blush"></label>
        <label>Marca<input data-p="marca" type="text" value="${escapeHtml(p.marca || "")}" placeholder="Ej. Rare Beauty"></label>
        <label>${p.numVariantes > 1 ? "Precio (cada tono tiene el suyo)" : "Precio por pieza ($) *"}<input data-p="precio" type="number" min="0" step="1" value="${p.precio || ""}"></label>
        <label>Precio antes ($, opcional)<input data-p="precioAntes" type="number" min="0" step="1" value="${p.precioAntes || ""}"></label>
        <label>Piezas para apartar (vacío = sin límite)<input data-p="piezas" type="number" min="0" step="1" value="${p.piezas != null ? p.piezas : ""}"></label>
        <label>Peso por pieza (kg)${p.numVariantes ? " · vacío = el estimado de cada tono" : ""}<input data-p="peso" type="number" min="0" step="0.01" value="${p.peso || ""}" placeholder="Ej. 0.15"></label>
      </div>
      <label style="margin-top:8px;">Link de la foto (clic derecho en la foto de Sephora → "Copiar dirección de imagen")<input data-p="imagen" type="text" value="${escapeHtml(p.imagen || "")}" placeholder="https://..." style="width:100%;"></label>
      <label style="margin-top:8px;">Descripción o tono (opcional)<input data-p="descripcion" type="text" value="${escapeHtml(p.descripcion || "")}" placeholder="Ej. Tono Joy, 7.5 ml" style="width:100%;"></label>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">
        <button type="button" class="btn-primary" data-pv-guardar-prod>💾 ${pvEditando ? "Guardar cambios" : "Agregar a la preventa"}</button>
        ${pvEditando ? `<button type="button" class="btn-secondary" data-pv-cancelar-edicion>Cancelar</button>` : ""}
      </div>
    </details>`;
  }

  let pvGrupo = "";
  let pvBuscar = "";
  let pvMostrar = 30;
  let pvVerCompra = false;

  /* Piezas con anticipo pagado, agrupadas por producto + tono + tamaño
     (lo que Mae tiene que comprar). */
  function pvListaCompra() {
    const m = new Map();
    pvData.apartados.forEach((a) => {
      if (!a.cuenta || a.status === "nuevo") return;
      (a.items || []).forEach((it) => {
        const k = `${it.id}|${it.sku || ""}`;
        const r = m.get(k) || { marca: it.marca || "", nombre: it.nombre, variante: it.variante || "", tamano: it.tamano || "", sku: it.sku || "", qty: 0, folios: [] };
        r.qty += it.qty;
        r.folios.push(a.folio);
        m.set(k, r);
      });
    });
    return [...m.values()].sort((x, y) => `${x.marca} ${x.nombre} ${x.variante}`.localeCompare(`${y.marca} ${y.nombre} ${y.variante}`));
  }
  const pvCompraTexto = (r) => `${r.qty} × ${r.marca ? `${r.marca} · ` : ""}${r.nombre}${r.variante ? ` · ${r.variante}` : ""}${r.tamano ? ` (${r.tamano})` : ""}${r.sku ? ` [SKU ${r.sku}]` : ""}`;

  function pvProductosHTML() {
    if (!pvData.productos.length) return `<p class="abw-intro">Todavía no subes productos.</p>`;
    const compra = pvListaCompra();
    const totalComprar = compra.reduce((s, r) => s + r.qty, 0);
    const conteo = {};
    pvData.productos.forEach((p) => { const g = p.grupo || "Otros"; conteo[g] = (conteo[g] || 0) + 1; });
    const grupos = Object.keys(conteo);
    const q = pvBuscar.trim().toLowerCase();
    const lista = pvData.productos.filter((p) => (!pvGrupo || (p.grupo || "Otros") === pvGrupo) && (!q || `${p.marca} ${p.nombre}`.toLowerCase().includes(q)));
    const vis = lista.slice(0, pvMostrar);
    const ocultosGrupo = lista.filter((p) => p.activo === false).length;
    return `<div class="swm-card">
        <h4><span>🛒 Lista de compra</span><span class="badge" style="background:#fde8f0;color:#b33660;">${totalComprar} pieza${totalComprar === 1 ? "" : "s"} pagada${totalComprar === 1 ? "" : "s"}</span></h4>
        <p class="meta">Solo cuenta apartados con anticipo pagado, separado por tono y tamaño.</p>
        ${compra.length ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
          <button type="button" class="btn-secondary" data-pv-ver-compra>${pvVerCompra ? "Ocultar lista" : `Ver lista (${compra.length} renglones)`}</button>
          <button type="button" class="btn-secondary" data-pv-copiar-compra>📋 Copiar lista</button></div>
          ${pvVerCompra ? `<ul style="margin:10px 0 0;padding-left:20px;font-size:14px;">${compra.map((r) => `<li><b>${r.qty} ×</b> ${escapeHtml(r.marca ? `${r.marca} · ` : "")}${escapeHtml(r.nombre)}${r.variante ? ` · <b>${escapeHtml(r.variante)}</b>` : ""}${r.tamano ? ` <span style="color:#6b6b6b;">(${escapeHtml(r.tamano)})</span>` : ""} <span style="color:#6b6b6b;font-size:12px;">${escapeHtml(r.folios.join(", "))}</span></li>`).join("")}</ul>` : ""}` : ""}
      </div>
      ${grupos.length > 1 ? `<div class="tabs" style="flex-wrap:wrap;"><button type="button" class="tab ${!pvGrupo ? "active" : ""}" data-pv-grupo="">Todo (${pvData.productos.length})</button>${grupos.map((g) => `<button type="button" class="tab ${pvGrupo === g ? "active" : ""}" data-pv-grupo="${escapeHtml(g)}">${escapeHtml(g)} (${conteo[g]})</button>`).join("")}</div>` : ""}
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
        <input type="search" data-pv-buscar value="${escapeHtml(pvBuscar)}" placeholder="🔍 Buscar producto" style="flex:1;min-width:180px;">
        ${pvGrupo ? `<button type="button" class="btn-secondary" data-pv-grupo-activo="${ocultosGrupo === lista.length ? "1" : "0"}">${ocultosGrupo === lista.length ? `👀 Mostrar todo ${escapeHtml(pvGrupo)}` : `🙈 Ocultar todo ${escapeHtml(pvGrupo)}`}</button>` : ""}
      </div>
      <p class="meta">${lista.length} producto${lista.length === 1 ? "" : "s"}${ocultosGrupo ? ` · ${ocultosGrupo} oculto${ocultosGrupo === 1 ? "" : "s"}` : ""}</p>
      ${vis.map((p) => `<div class="cat-row" style="cursor:default;">
        ${p.imagen ? `<img src="${escapeHtml(p.imagen)}" alt="" loading="lazy">` : `<span style="width:52px;height:52px;display:flex;align-items:center;justify-content:center;font-size:26px;">🛍️</span>`}
        <div class="info"><b>${escapeHtml(p.marca ? `${p.marca} · ` : "")}${escapeHtml(p.nombre)}</b>
          <small>${p.numVariantes > 1 ? `desde ` : ""}${formatPrice(p.precio)}${p.precioAntes ? ` (antes ${formatPrice(p.precioAntes)})` : ""}${p.numVariantes > 1 ? ` · ${p.numVariantes} ${/size/i.test(p.variacion || "") ? "tamaños" : "tonos"}` : ""} · ⚖️ ${p.peso ? `${p.peso} kg` : p.pesoEst ? `~${p.pesoEst} kg` : "sin peso"}${p.volEst ? ` (vol. ~${Math.round(p.volEst * 1.2 / 50) / 100} kg)` : ""} · 💗 ${p.apartadas} apartada${p.apartadas === 1 ? "" : "s"} · ${p.piezas == null ? "sin límite" : `quedan ${p.disponibles} de ${p.piezas}`}${p.activo === false ? " · 🙈 oculto" : ""}</small></div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;">
          <button type="button" class="btn-secondary" data-pv-editar="${escapeHtml(p.id)}" style="padding:6px 12px;font-size:13px;">✏️ Editar</button>
          <button type="button" class="btn-secondary" data-pv-ocultar="${escapeHtml(p.id)}" style="padding:6px 12px;font-size:13px;">${p.activo === false ? "👀 Mostrar" : "🙈 Ocultar"}</button>
          <button type="button" class="btn-danger" data-pv-borrar="${escapeHtml(p.id)}" style="padding:6px 12px;font-size:13px;">🗑️</button>
        </div>
      </div>`).join("")}
      ${lista.length > vis.length ? `<button type="button" class="btn-secondary" data-pv-mas>Ver más (${lista.length - vis.length})</button>` : ""}`;
  }

  function pvApartadoHTML(a) {
    const [txt, bg, fg] = pvPorRevisar(a) ? ["🔎 Comprobante por revisar", "#fff1d8", "#8a5a00"] : PV_ESTADOS[pvEstado(a)] || [a.status, "#eee", "#333"];
    const id = escapeHtml(a.id);
    const tel = String(a.phone || (a.direccion && a.direccion.telefono) || "").replace(/\D/g, "").slice(-10);
    const d = a.direccion || {};
    const pago = (etapa) => {
      const p = a[etapa] || {};
      const st = { pagado: "✅ pagado", revision: "🔎 por revisar", pendiente: "⏳ pendiente", espera: "al llegar" }[p.status] || p.status || "";
      return `${formatPrice(p.monto)} <span style="color:#6b6b6b;">(${st}${p.metodo && p.status !== "espera" ? ` · ${p.metodo === "mercadopago" ? "tarjeta" : p.metodo}` : ""})</span>`;
    };
    const acciones = [];
    for (const etapa of ["anticipo", "resto"]) {
      const p = a[etapa] || {};
      if (!a.cuenta || p.status === "pagado") continue;
      if (etapa === "anticipo" && a.status !== "nuevo") continue;
      if (etapa === "resto" && a.status !== "llego" && !(a.status === "apartado" && a.adelantado)) continue;
      if (p.status === "revision") {
        if (p.comprobanteAt) {
          const n = Math.max(1, Math.min(3, Number(p.comprobanteN) || 1));
          for (let i = 1; i <= n; i++) acciones.push(`<button type="button" class="btn-secondary" data-pv-file="comprobante/${id}/${etapa}${i > 1 ? `/${i}` : ""}">📄 Ver comprobante${n > 1 ? ` ${i}` : ""}</button>`);
        }
        acciones.push(`<button type="button" class="btn-primary" data-pv-aprobar="${id}:${etapa}">✅ Aprobar ${etapa}</button>`);
        acciones.push(`<button type="button" class="btn-secondary" data-pv-rechazar="${id}:${etapa}">❌ Rechazar</button>`);
      } else {
        acciones.push(`<button type="button" class="btn-secondary" data-pv-aprobar="${id}:${etapa}">✅ Ya me pagó ${a.pagoCompleto ? (etapa === "anticipo" ? "todo" : "el envío") : `el ${etapa}`} (por fuera)</button>`);
      }
    }
    if (a.cuenta && a.status === "apartado") {
      acciones.push(a.entrega === "personal"
        ? `<button type="button" class="btn-primary" data-pv-llego="${id}">📦 Ya llegó: cobrar el resto</button>`
        : `<span style="display:inline-flex;gap:6px;align-items:center;flex-wrap:wrap;"><input data-pv-envio="${id}" type="number" min="0" step="1" value="${a.envioEstimado != null ? a.envioEstimado : ""}" placeholder="Envío $" style="width:110px;"><button type="button" class="btn-primary" data-pv-llego="${id}">📦 Ya llegó: cobrar resto + envío</button></span>`);
    }
    if (a.status === "liquidado") {
      if (a.entrega === "envio") acciones.push(`<span style="display:inline-flex;gap:6px;align-items:center;flex-wrap:wrap;"><input data-pv-paq="${id}" type="text" value="Estafeta" list="pv-paqs" style="width:120px;"><input data-pv-guia="${id}" type="text" placeholder="Número de guía" style="width:160px;"><button type="button" class="btn-primary" data-pv-enviar="${id}">🚚 Marcar enviado</button></span>`);
      acciones.push(`<button type="button" class="btn-secondary" data-pv-entregado="${id}">🎁 Ya se entregó</button>`);
    }
    if (a.status === "enviado") acciones.push(`<button type="button" class="btn-secondary" data-pv-entregado="${id}">🎁 Marcar entregado</button>`);
    if (a.llegoAt && (a.status === "llego" || (a.status === "liquidado" && a.resto && a.resto.metodo === "nada")) && !(a.resto && a.resto.status === "revision")) acciones.push(`<button type="button" class="btn-secondary" data-pv-deshacer-llego="${id}">↩️ Deshacer "Ya llegó"</button>`);
    if (a.cuenta && ["nuevo", "apartado", "llego"].includes(a.status)) acciones.push(`<button type="button" class="btn-secondary" data-pve-abrir="${id}">✏️ Cambiar productos</button>`);
    if (a.status !== "cancelado" && a.status !== "entregado") acciones.push(`<button type="button" class="btn-ghost" data-pv-cancelar="${id}" style="margin-left:0;padding:8px 10px;">Cancelar${pvYaPago(a) > 0 ? " (con reembolso)" : ""}</button>`);
    return `<div class="swm-card" id="pv-ap-${id}">
      <h4><span>${escapeHtml(a.folio)} · ${escapeHtml(a.name || a.email)}</span><span class="badge" style="background:${bg};color:${fg};">${txt}</span></h4>
      <div class="meta">${escapeHtml(a.email)}${tel ? ` · <a href="https://wa.me/52${tel}" target="_blank" rel="noopener">📱 ${tel}</a>` : ""} · ${formatFecha(a.createdAt)}</div>
      <ul style="margin:8px 0;padding-left:20px;font-size:14px;">${(a.items || []).map((it) => `<li>${it.qty} × ${escapeHtml(it.marca ? `${it.marca} · ` : "")}${escapeHtml(it.nombre)}${it.variante ? ` · <b>${escapeHtml(it.variante)}</b>` : ""}${it.tamano ? ` (${escapeHtml(it.tamano)})` : ""} <span style="color:#6b6b6b;">(${formatPrice(it.precio)} c/u)</span></li>`).join("")}</ul>
      <div class="meta">${a.pesoKg ? `⚖️ ${a.pesoKg} kg real${a.pesoVolKg ? ` · ${a.pesoVolKg} kg volumétrico` : ""}${a.pesoCobrableKg ? ` → se cobra ${a.pesoCobrableKg} kg` : ""}${a.entrega === "envio" && a.envioEstimado != null && a.status === "apartado" ? ` · envío estimado ${formatPrice(a.envioEstimado)}` : ""} · ` : ""}Total <b>${formatPrice(a.total)}</b> · ${a.pagoCompleto ? `<b style="color:#17803d;">💳 Pago completo</b> ${pago("anticipo")} · Envío al llegar ${pago("resto")}` : `Anticipo ${pago("anticipo")} · Resto ${pago("resto")}`}${a.envio ? ` · incluye envío ${formatPrice(a.envio)}` : ""}</div>
      ${a.adelantado ? `<div class="meta" style="color:#8a5a00;font-weight:600;">💳 Quiere liquidar antes de que lleguen: está pendiente su pago del resto.</div>` : ""}${a.liquidadoAntesAt ? `<div class="meta" style="color:#17803d;font-weight:600;">✅ Ya liquidó antes de que llegaran (al llegar solo falta el envío).</div>` : ""}
      <div class="meta">${a.entrega === "personal" ? "📍 Entrega personal en Ciudad Juárez" : `📦 Envío a: ${escapeHtml([d.nombre, d.calle, d.colonia, d.ciudad, d.estado, d.cp && `CP ${d.cp}`].filter(Boolean).join(", "))}${d.referencias ? ` (${escapeHtml(d.referencias)})` : ""}`}</div>
      ${a.nota ? `<div class="meta">📝 ${escapeHtml(a.nota)}</div>` : ""}
      ${a.guia ? `<div class="meta">🚚 ${escapeHtml(a.paqueteria || "")} · guía <b>${escapeHtml(a.guia)}</b></div>` : ""}
      ${[a.anticipo, a.resto].some((p) => p && p.rechazo && p.status !== "pagado") ? `<div class="meta" style="color:#b42318;">Rechazaste un comprobante: ${escapeHtml((a.resto.rechazo && a.resto.status !== "pagado" ? a.resto : a.anticipo).rechazo)}</div>` : ""}
      ${pvReembolsoHTML(a)}
      ${acciones.length ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;align-items:center;">${acciones.join("")}</div>` : ""}
      ${pvEdit && pvEdit.id === a.id ? pvEditHTML(a) : ""}
    </div>`;
  }

  /* Lo que la clienta ya pagó de este apartado. */
  const pvYaPago = (a) => Math.max(0, (a.anticipo && a.anticipo.status === "pagado" ? Number(a.anticipo.monto) || 0 : 0) + (a.resto && a.resto.status === "pagado" ? Number(a.resto.monto) || 0 : 0) - (Number(a.devuelto) || 0));

  function pvReembolsoHTML(a) {
    const r = a.reembolso;
    if (!r || r.status !== "pendiente") return "";
    const tel = String(a.phone || (a.direccion && a.direccion.telefono) || "").replace(/\D/g, "").slice(-10);
    const txt = `Hola ${String(a.name || "").split(/\s+/)[0]} 💕 sobre tu apartado ${a.folio} del Sephora Sale: te reembolso ${formatPrice(r.monto)}. ¿Me pasas tu CLABE o cuenta para depositártelo?`;
    return `<div style="background:#fff3f3;border:1px solid #f3c9c9;border-radius:12px;padding:10px 12px;margin:10px 0;">
      <div style="font-weight:700;font-size:14px;">💸 Reembolso pendiente: ${formatPrice(r.monto)}</div>
      <div class="meta">${(a.anticipo && a.anticipo.metodo === "mercadopago") || (a.resto && a.resto.metodo === "mercadopago") ? "Pagó (al menos en parte) con tarjeta: esa parte hazla desde Mercado Pago." : "Pagó por transferencia."} El reembolso lo haces tú.</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;">
        ${tel ? `<a class="btn-secondary" style="text-decoration:none;" target="_blank" rel="noopener" href="https://wa.me/52${tel}?text=${encodeURIComponent(txt)}">💬 Escribirle por WhatsApp</a>` : ""}
        <button type="button" class="btn-secondary" data-pv-reembolsado="${escapeHtml(a.id)}">✅ Ya le reembolsé</button>
      </div></div>`;
  }

  /* Cambiar los productos de un apartado: mismo buscador que el apartado nuevo. */
  function pvEditHTML(a) {
    return `<div id="pve" style="margin-top:12px;border:2px solid #c4466e;border-radius:14px;padding:12px;background:#fffafc;">
      <b>✏️ Cambiar los productos de ${escapeHtml(a.folio)}</b>
      <p class="meta">Busca para agregar, o quita con la ✕. Se conserva el precio de lo que ya tenía; lo nuevo va a precio de hoy.</p>
      <input type="search" data-pvn-buscar placeholder="🔍 Busca un producto para agregar" style="width:100%;">
      <div id="pvn-res" style="margin-top:6px;"></div>
      <div id="pvn-items" style="margin-top:8px;"></div>
      <p id="pve-resumen" style="font-weight:700;margin:8px 0;"></p>
      <label class="swm-check"><input type="checkbox" data-pve-avisar checked> Avisarle por correo y WhatsApp lo que cambió</label>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
        <button type="button" class="btn-primary" data-pve-guardar>💾 Guardar cambios</button>
        <button type="button" class="btn-secondary" data-pve-cerrar>Cancelar</button>
      </div></div>`;
  }

  /* Qué pasa con el dinero si se guarda como está. */
  function pvEditResumen() {
    const el = document.getElementById("pve-resumen");
    const a = pvEdit && pvData.apartados.find((x) => x.id === pvEdit.id);
    if (!el || !a) return;
    const total = Math.round(pvNuevoTotal() * 100) / 100;
    const pagado = pvYaPago(a);
    let txt = `Total nuevo ${formatPrice(total)} (antes ${formatPrice(a.total)}). `;
    if (a.status === "nuevo") {
      txt += `Su anticipo sería de ${formatPrice(Math.ceil(total * (a.anticipoPct || 50) / 100))}.`;
    } else {
      const falta = Math.round((total + (a.status === "llego" ? a.envio || 0 : 0) - pagado) * 100) / 100;
      txt += falta < 0 ? `💸 Ya pagó ${formatPrice(pagado)}: le debes reembolsar ${formatPrice(-falta)}.`
        : a.status === "llego" ? (falta > 0 ? `💳 Le falta pagar ${formatPrice(falta)}.` : "Ya queda todo pagado.")
        : `Cuando lleguen paga ${formatPrice(Math.max(0, falta))}${a.entrega === "envio" ? " + envío" : ""}.`;
    }
    el.textContent = txt;
  }


  /* ----- ➕ Agregar un apartado a una clienta (por su correo) ----- */
  let pvNuevo = null; // null = cerrado
  let pvEdit = null; // { id, items, prod, buscar } cuando Mae cambia los productos de un apartado
  const pvSel = () => pvEdit || pvNuevo;
  const pvNuevoVacio = () => ({ items: [], prod: null, buscar: "" });

  function pvNuevoHTML() {
    if (!pvNuevo) return `<button type="button" class="btn-primary" data-pvn-abrir style="margin-bottom:12px;">➕ Agregar apartado a una clienta</button>`;
    const campo = (k, t, tipo = "text", ph = "") => `<label>${t}<input data-pvn="${k}" type="${tipo}" placeholder="${ph}" ${tipo === "email" ? 'autocapitalize="off" inputmode="email"' : ""}></label>`;
    return `<div class="swm-card" id="pvn" style="border:2px solid #c4466e;">
      <h4><span>➕ Apartado nuevo para una clienta</span><button type="button" class="btn-ghost" data-pvn-cerrar style="margin-left:0;">✕ Cerrar</button></h4>
      <p class="meta">1) Pon su correo (el mismo con el que entra a alpacca.mx). 2) Busca y agrega sus productos. 3) Guardar: le llega el aviso para pagar.</p>
      <div class="grid">
        ${campo("email", "Correo de la clienta *", "email", "ejemplo@gmail.com")}
        ${campo("nombre", "Nombre", "text", "Se llena solo si ya tiene cuenta")}
        ${campo("telefono", "WhatsApp (10 dígitos)", "tel")}
      </div>
      <p class="meta" data-pvn-cuenta></p>
      <h4 style="margin:12px 0 6px;font-size:15px;">🛍️ Productos</h4>
      <input type="search" data-pvn-buscar placeholder="🔍 Busca el producto (marca o nombre)" style="width:100%;">
      <div id="pvn-res" style="margin-top:6px;"></div>
      <div id="pvn-items" style="margin-top:8px;"></div>
      <h4 style="margin:12px 0 6px;font-size:15px;">📦 Entrega</h4>
      <div style="display:flex;gap:14px;flex-wrap:wrap;">
        <label class="swm-check"><input type="radio" name="pvn-entrega" value="envio" data-pvn-entrega checked> Envío a domicilio</label>
        <label class="swm-check"><input type="radio" name="pvn-entrega" value="personal" data-pvn-entrega> Entrega personal en Juárez</label>
      </div>
      <div class="grid" data-pvn-dir style="margin-top:6px;">
        ${campo("calle", "Calle y número")}${campo("colonia", "Colonia")}${campo("ciudad", "Ciudad")}${campo("estado", "Estado")}${campo("cp", "Código postal", "text", "5 dígitos")}${campo("referencias", "Referencias")}
      </div>
      <p class="meta" data-pvn-dir-nota>La dirección es opcional: puedes dejarla vacía y poner el envío cuando llegue.</p>
      <h4 style="margin:12px 0 6px;font-size:15px;">💳 Pago</h4>
      <label class="swm-check"><input type="checkbox" data-pvn-completo> Va a pagar todo ahora (al llegar solo paga el envío)</label>
      <label class="swm-check"><input type="checkbox" data-pvn-ya> Ya me pagó el anticipo (por fuera) · queda apartado de una vez</label>
      <label class="swm-check"><input type="checkbox" data-pvn-avisar checked> Avisarle por correo y WhatsApp</label>
      <label style="margin-top:6px;">Nota (opcional)<input data-pvn="nota" type="text" style="width:100%;"></label>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">
        <button type="button" class="btn-primary" data-pvn-guardar>💾 Guardar apartado</button>
        <button type="button" class="btn-secondary" data-pvn-cerrar>Cancelar</button>
      </div>
    </div>`;
  }

  const pvNuevoTotal = (st = pvSel()) => st.items.reduce((s, it) => s + it.precio * it.qty, 0);

  function pvNuevoPintar() {
    const st = pvSel();
    if (!st) return;
    const items = document.getElementById("pvn-items");
    if (items) {
      items.innerHTML = st.items.length
        ? `<div style="border:1px solid #eee;border-radius:12px;padding:8px 10px;">${st.items.map((it, i) => `<div style="display:flex;gap:8px;align-items:center;justify-content:space-between;padding:4px 0;font-size:14px;">
            <span>${it.qty} × ${escapeHtml(it.marca ? `${it.marca} · ` : "")}${escapeHtml(it.nombre)}${it.variante ? ` · <b>${escapeHtml(it.variante)}</b>` : ""} <span style="color:#6b6b6b;">(${formatPrice(it.precio)} c/u)</span></span>
            <button type="button" class="btn-ghost" data-pvn-quitar="${i}" style="margin-left:0;padding:4px 8px;">✕</button></div>`).join("")}
          <div style="text-align:right;font-weight:700;margin-top:4px;">Total ${formatPrice(pvNuevoTotal())}</div></div>`
        : `<p class="meta">Todavía no agregas productos.</p>`;
    }
    if (pvEdit) pvEditResumen();
    const res = document.getElementById("pvn-res");
    if (!res) return;
    if (st.prod) {
      const p = st.prod;
      const vs = p.variantes || [];
      res.innerHTML = `<div style="background:#fff6f9;border-radius:12px;padding:10px;">
        <b>${escapeHtml(p.marca ? `${p.marca} · ` : "")}${escapeHtml(p.nombre)}</b>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:6px;">
          ${vs.length ? `<select data-pvn-var style="max-width:100%;">${vs.map((v) => `<option value="${escapeHtml(v.id)}">${escapeHtml(v.nombre)}${v.tamano ? ` (${escapeHtml(v.tamano)})` : ""} · ${formatPrice(v.precio)}${v.agotado ? " · agotado" : ""}</option>`).join("")}</select>` : `<span>${formatPrice(p.precio)}</span>`}
          <input type="number" data-pvn-qty min="1" max="20" value="1" style="width:70px;">
          <button type="button" class="btn-primary" data-pvn-poner>Agregar</button>
          <button type="button" class="btn-ghost" data-pvn-otro style="margin-left:0;">Elegir otro</button>
        </div></div>`;
      return;
    }
    const q = (st.buscar || "").trim().toLowerCase();
    if (!q) { res.innerHTML = ""; return; }
    const lista = pvData.productos.filter((p) => `${p.marca} ${p.nombre}`.toLowerCase().includes(q)).slice(0, 8);
    res.innerHTML = lista.length
      ? lista.map((p) => `<button type="button" class="btn-secondary" data-pvn-elegir="${escapeHtml(p.id)}" style="display:block;width:100%;text-align:left;margin-bottom:4px;">${escapeHtml(p.marca ? `${p.marca} · ` : "")}${escapeHtml(p.nombre)} <span style="color:#6b6b6b;">${p.numVariantes > 1 ? `desde ${formatPrice(p.precio)} · ${p.numVariantes} opciones` : formatPrice(p.precio)}</span></button>`).join("")
      : `<p class="meta">No encontré ese producto en la preventa.</p>`;
  }

  /* Si la pantalla se vuelve a pintar (llegan datos nuevos), lo que Mae ya
     escribió en el formulario no se pierde. */
  function pvNuevoGuardarCampos() {
    const box = document.getElementById("pvn");
    if (!pvNuevo || !box) return;
    const vals = {};
    box.querySelectorAll("[data-pvn]").forEach((i) => { vals[i.dataset.pvn] = i.value; });
    vals._entrega = (box.querySelector("[data-pvn-entrega]:checked") || {}).value || "envio";
    ["completo", "ya", "avisar"].forEach((k) => { const c = box.querySelector(`[data-pvn-${k}]`); if (c) vals["_" + k] = c.checked; });
    pvNuevo.vals = vals;
  }
  function pvNuevoRestaurarCampos() {
    const box = document.getElementById("pvn");
    if (!pvNuevo || !box || !pvNuevo.vals) return;
    const vals = pvNuevo.vals;
    box.querySelectorAll("[data-pvn]").forEach((i) => { if (vals[i.dataset.pvn] != null) i.value = vals[i.dataset.pvn]; });
    const r = box.querySelector(`[data-pvn-entrega][value="${vals._entrega}"]`);
    if (r) { r.checked = true; r.dispatchEvent(new Event("change", { bubbles: true })); }
    ["completo", "ya", "avisar"].forEach((k) => { const c = box.querySelector(`[data-pvn-${k}]`); if (c && vals["_" + k] != null) c.checked = vals["_" + k]; });
  }

  let pvnTimer = null;
  document.getElementById("pv-admin").addEventListener("input", (e) => {
    const t = e.target;
    if (t.matches("[data-pvn-buscar]")) {
      clearTimeout(pvnTimer);
      pvnTimer = setTimeout(() => { const st = pvSel(); if (!st) return; st.buscar = t.value; st.prod = null; pvNuevoPintar(); }, 200);
    }
  });
  document.getElementById("pv-admin").addEventListener("change", async (e) => {
    const t = e.target;
    if (t.matches('[data-pvn="email"]')) {
      const em = t.value.trim();
      const nota = document.querySelector("[data-pvn-cuenta]");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { if (nota) nota.textContent = ""; return; }
      try {
        const res = await fetch(`/.netlify/functions/admin-preventa?cliente=${encodeURIComponent(em)}`, { headers: { "x-admin-key": adminKey } });
        const d = await res.json();
        const n = document.querySelector('[data-pvn="nombre"]');
        const tel = document.querySelector('[data-pvn="telefono"]');
        if (d.existe) {
          if (n && !n.value) n.value = d.nombre || "";
          if (tel && !tel.value) tel.value = d.telefono || "";
        }
        if (nota) nota.innerHTML = d.existe ? `✅ Ya tiene cuenta${d.nombre ? ` (${escapeHtml(d.nombre)})` : ""}: verá su apartado al entrar.` : `⚠️ Todavía no tiene cuenta con este correo. Pídele que se registre con este mismo correo para ver y pagar su apartado.`;
      } catch (err) { /* sin aviso */ }
    }
    if (t.matches("[data-pvn-entrega]")) {
      const dir = document.querySelector("[data-pvn-dir]");
      const nota = document.querySelector("[data-pvn-dir-nota]");
      const personal = t.value === "personal" && t.checked;
      if (dir) dir.style.display = personal ? "none" : "";
      if (nota) nota.style.display = personal ? "none" : "";
    }
  });
  document.getElementById("pv-admin").addEventListener("click", async (e) => {
    const t = e.target;
    if (t.closest("[data-pvn-abrir]")) { pvEdit = null; pvNuevo = pvNuevoVacio(); renderPreventaAdmin(); const b = document.getElementById("pvn"); if (b) b.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    if (t.closest("[data-pvn-cerrar]")) {
      if (pvNuevo && pvNuevo.items.length && !confirm("¿Cerrar sin guardar? Se pierde lo que llevas.")) return;
      pvNuevo = null; renderPreventaAdmin(); return;
    }
    const abrirEd = t.closest("[data-pve-abrir]");
    if (abrirEd) {
      const a = pvData.apartados.find((x) => x.id === abrirEd.dataset.pveAbrir);
      if (!a) return;
      pvNuevo = null;
      pvEdit = { id: a.id, prod: null, buscar: "", items: (a.items || []).map((it) => ({ k: `${it.id}|${it.sku || ""}`, id: it.id, sku: it.sku || "", marca: it.marca || "", nombre: it.nombre, variante: it.variante || "", precio: Number(it.precio) || 0, qty: it.qty })) };
      renderPreventaAdmin();
      const box = document.getElementById("pve"); if (box) box.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (t.closest("[data-pve-cerrar]")) { pvEdit = null; renderPreventaAdmin(); return; }
    if (t.closest("[data-pve-guardar]") && pvEdit) {
      const btn = t.closest("button");
      if (!pvEdit.items.length) { alert("Deja al menos un producto, o mejor cancela el apartado."); return; }
      const r = await pvAct({ accion: "editar_items", id: pvEdit.id, items: pvEdit.items.map((it) => ({ id: it.id, sku: it.sku, qty: it.qty })), avisar: document.querySelector("[data-pve-avisar]").checked }, btn);
      if (r) {
        pvEdit = null;
        renderPreventaAdmin();
        if (r.avisos && r.avisos.length) alert(`Listo, pero ojo:\n- ${r.avisos.join("\n- ")}`);
        if (r.reembolso > 0) alert(`Ya había pagado más: le debes reembolsar ${formatPrice(r.reembolso)}. Quedó apuntado en su apartado.`);
      }
      return;
    }
    const reemb = t.closest("[data-pv-reembolsado]");
    if (reemb) { if (confirm("¿Ya le hiciste su reembolso? Le llega un aviso por correo y WhatsApp.")) await pvAct({ accion: "reembolsado", id: reemb.dataset.pvReembolsado }, reemb); return; }
    const st = pvSel();
    if (!st) return;
    const elegir = t.closest("[data-pvn-elegir]");
    if (elegir) {
      const base = pvData.productos.find((p) => p.id === elegir.dataset.pvnElegir);
      if (!base) return;
      st.prod = { ...base, variantes: [] };
      if (base.numVariantes) {
        elegir.textContent = "Cargando…";
        try {
          const res = await fetch(`/.netlify/functions/admin-preventa?producto=${encodeURIComponent(base.id)}`, { headers: { "x-admin-key": adminKey } });
          const d = await res.json();
          if (!res.ok) throw new Error(d.error || "No se pudo cargar.");
          st.prod = { ...base, ...d.producto, marca: base.marca };
        } catch (err) { alert(err.message); st.prod = null; }
      }
      pvNuevoPintar();
      return;
    }
    if (t.closest("[data-pvn-otro]")) { st.prod = null; pvNuevoPintar(); return; }
    if (t.closest("[data-pvn-poner]")) {
      const p = st.prod;
      const qty = Math.max(1, Math.min(20, parseInt(document.querySelector("[data-pvn-qty]").value, 10) || 1));
      let v = null;
      if ((p.variantes || []).length) { const sel = document.querySelector("[data-pvn-var]").value; v = p.variantes.find((x) => x.id === sel); }
      const precio = Number(v ? v.precio : p.precio) || 0;
      const k = `${p.id}|${v ? v.id : ""}`;
      const ya = st.items.find((it) => it.k === k);
      if (ya) ya.qty += qty;
      else st.items.push({ k, id: p.id, sku: v ? v.id : "", marca: p.marca || "", nombre: p.nombre, variante: v ? v.nombre : "", precio, qty });
      st.prod = null;
      const b = document.querySelector("[data-pvn-buscar]"); if (b) { b.value = ""; st.buscar = ""; }
      pvNuevoPintar();
      return;
    }
    const quitar = t.closest("[data-pvn-quitar]");
    if (quitar) { st.items.splice(Number(quitar.dataset.pvnQuitar), 1); pvNuevoPintar(); return; }
    if (t.closest("[data-pvn-guardar]") && pvNuevo) {
      const btn = t.closest("button");
      const box = document.getElementById("pvn");
      const v = (k) => (box.querySelector(`[data-pvn="${k}"]`) || {}).value || "";
      const email = v("email").trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { alert("Pon el correo de la clienta."); return; }
      if (!v("nombre").trim() && !confirm("No pusiste nombre. Si la clienta ya tiene cuenta se usa el de su cuenta; si no, no se puede guardar. ¿Seguir?")) return;
      if (!pvNuevo.items.length) { alert("Agrega al menos un producto."); return; }
      const entrega = (box.querySelector("[data-pvn-entrega]:checked") || {}).value || "envio";
      const direccion = {};
      ["calle", "colonia", "ciudad", "estado", "cp", "referencias"].forEach((k) => { direccion[k] = v(k); });
      const ya = box.querySelector("[data-pvn-ya]").checked;
      const r = await pvAct({
        accion: "crear_apartado", email, nombre: v("nombre"), telefono: v("telefono"), nota: v("nota"), entrega, direccion,
        items: pvNuevo.items.map((it) => ({ id: it.id, sku: it.sku, qty: it.qty })),
        pagoCompleto: box.querySelector("[data-pvn-completo]").checked, yaPagoAnticipo: ya, avisar: box.querySelector("[data-pvn-avisar]").checked,
      }, btn);
      if (r) {
        pvNuevo = null;
        if (r.avisos && r.avisos.length) alert(`Listo, pero ojo:\n- ${r.avisos.join("\n- ")}`);
        if (!r.tieneCuenta) alert("Ojo: esa clienta todavía no tiene cuenta con ese correo. Pídele que se registre en alpacca.mx con ese mismo correo para ver y pagar su apartado.");
        pvFiltro = ya ? "apartado" : "anticipo";
        renderPreventaAdmin();
      }
    }
  });

  function renderPreventaAdmin() {
    pvBadge();
    if (!pvData) return;
    pvNuevoGuardarCampos();
    const aps = pvData.apartados;
    const chips = PV_FILTROS.map(([k, t, fn]) => `<button type="button" class="tab ${pvFiltro === k ? "active" : ""}" data-pv-filtro="${k}">${t} (${aps.filter(fn).length})</button>`).join("");
    if (!pvFiltro) pvFiltro = aps.some(pvPorRevisar) ? "revisar" : "activos";
    const fn = (PV_FILTROS.find(([k]) => k === pvFiltro) || PV_FILTROS[0])[2];
    const lista = aps.filter(fn);
    const llegaTodo = pvFiltro === "apartado" && lista.length > 1
      ? `<p class="meta" style="margin-bottom:6px;">El envío de cada clienta ya viene calculado por peso y código postal; cámbialo en su cuadrito si hace falta y luego avísales a todas juntas:</p><button type="button" class="btn-primary" data-pv-llego-todo style="margin-bottom:8px;">📦 Llegó todo: avisar a las ${lista.length} y cobrar el resto + su envío</button>` : "";
    document.getElementById("pv-admin").innerHTML = `
      <div id="pv-lotes-box"></div>
      ${pvNuevoHTML()}
      <h4 style="margin:4px 0 8px;font-size:16px;">💗 Apartados (${aps.length})</h4>
      <div class="tabs" style="flex-wrap:wrap;">${chips}</div>
      <div style="margin-top:12px;">${llegaTodo}${lista.map(pvApartadoHTML).join("") || `<p class="abw-intro">No hay apartados aquí.</p>`}</div>
      <details data-pv-ajustes ${pvAjustesAbierto || pvEditando ? "open" : ""} style="margin-top:22px;">
        <summary style="cursor:pointer;font-weight:600;font-size:16px;padding:8px 0;">⚙️ Productos y ajustes de la preventa (${pvData.productos.length} productos)</summary>
        ${pvConfigHTML(pvData.config)}
        ${pvProductoFormHTML()}
        <h4 style="margin:18px 0 8px;font-size:16px;">🛍️ Productos (${pvData.productos.length})</h4>
        <div style="display:flex;flex-direction:column;gap:8px;">${pvProductosHTML()}</div>
      </details>`;
    pvNuevoRestaurarCampos();
    pvNuevoPintar();
    renderPvLotes();
  }

  /* Productos nuevos para la preventa que Claude deja en
     /preventa-lotes/*.json (ej. una marca completa). Sale una tarjeta con
     un botón para subirlos; los que ya están en el catálogo se saltan. */
  let pvLotes = null;
  let pvLotesMsg = "";
  async function renderPvLotes() {
    const box = document.getElementById("pv-lotes-box");
    if (!box || !pvData) return;
    try {
      if (!pvLotes) {
        const idx = await (await fetch("/preventa-lotes/index.json", { cache: "no-store" })).json();
        pvLotes = await Promise.all(idx.map(async (f) => ({ f, ...(await (await fetch(`/preventa-lotes/${f}`, { cache: "no-store" })).json()) })));
      }
    } catch (err) { return; }
    const ids = new Set(pvData.productos.map((p) => p.id));
    const pendientes = pvLotes.map((l) => ({ ...l, falta: (l.productos || []).filter((p) => !ids.has(p.id)) })).filter((l) => l.falta.length);
    const caja = document.getElementById("pv-lotes-box");
    if (!caja) return;
    if (!pendientes.length) {
      caja.innerHTML = pvLotesMsg ? `<div class="swm-card" style="border:2px solid #17803d;margin-bottom:12px;"><div style="font-size:14px;">${pvLotesMsg}</div></div>` : "";
      return;
    }
    caja.innerHTML = pendientes.map((l) => `<div class="swm-card" style="border:2px solid #c4466e;margin-bottom:12px;">
      <h4><span>🛍️ Productos nuevos para la preventa</span></h4>
      <div class="meta">${escapeHtml(l.nombre || l.f)}</div>
      <ul style="margin:6px 0 8px;padding-left:20px;font-size:14px;">${l.falta.map((p) => `<li>${escapeHtml(p.nombre)} · desde ${formatPrice(p.precio)}${(p.variantes || []).length > 1 ? ` (${p.variantes.length} tamaños)` : ""}</li>`).join("")}</ul>
      <button type="button" class="btn-primary" data-pv-lote="${escapeHtml(l.f)}">📥 Subir ${l.falta.length} producto${l.falta.length === 1 ? "" : "s"} a la preventa</button></div>`).join("");
    caja.querySelectorAll("[data-pv-lote]").forEach((btn) => btn.addEventListener("click", async () => {
      const l = pendientes.find((x) => x.f === btn.dataset.pvLote);
      if (!l) return;
      const r = await pvAct({ accion: "importar", productos: l.falta }, btn);
      if (r) { pvLotesMsg = `✅ Listo: se subieron ${r.importados} productos a la preventa. Ya los ven tus clientas.`; renderPvLotes(); }
    }));
  }

  async function pvOpenFile(key) {
    try {
      const res = await fetch(`/.netlify/functions/admin-preventa?archivo=${encodeURIComponent(key)}`, { headers: { "x-admin-key": adminKey } });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const blob = await res.blob();
      openProofViewer(URL.createObjectURL(blob), blob.type);
    } catch (err) {
      alert("No se pudo abrir el archivo.");
    }
  }

  document.getElementById("pv-admin").addEventListener("click", async (e) => {
    const t = e.target;
    const btn = t.closest("button");
    const filtro = t.closest("[data-pv-filtro]");
    if (filtro) { pvFiltro = filtro.dataset.pvFiltro; renderPreventaAdmin(); return; }
    const grupo = t.closest("[data-pv-grupo]");
    if (grupo) { pvGrupo = grupo.dataset.pvGrupo; pvMostrar = 30; renderPreventaAdmin(); return; }
    if (t.closest("[data-pv-mas]")) { pvMostrar += 30; renderPreventaAdmin(); return; }
    if (t.closest("[data-pv-ver-compra]")) { pvVerCompra = !pvVerCompra; renderPreventaAdmin(); return; }
    if (t.closest("[data-pv-copiar-compra]")) {
      const txt = pvListaCompra().map(pvCompraTexto).join("\n");
      try { await navigator.clipboard.writeText(txt); showToast("Lista copiada ✅"); } catch (err) { prompt("Copia la lista:", txt); }
      return;
    }
    const grupoActivo = t.closest("[data-pv-grupo-activo]");
    if (grupoActivo) {
      const activo = grupoActivo.dataset.pvGrupoActivo === "1";
      if (!confirm(`¿${activo ? "Mostrar" : "Ocultar"} todos los productos de ${pvGrupo} en la tienda?`)) return;
      await pvAct({ accion: "activar_grupo", grupo: pvGrupo, activo }, btn);
      return;
    }
    if (t.closest("[data-pv-guardar-config]")) {
      const box = t.closest("[data-pv-config]");
      const v = (k) => box.querySelector(`[data-c="${k}"]`);
      const cierre = v("cierre").value;
      await pvAct({
        accion: "guardar_config", titulo: v("titulo").value, descripcion: v("descripcion").value, llegada: v("llegada").value,
        cierre: cierre ? new Date(cierre).toISOString() : "", anticipoPct: v("anticipoPct").value, activa: v("activa").checked,
      }, btn);
      return;
    }
    if (t.closest("[data-pv-copiar-link]")) {
      try { await navigator.clipboard.writeText("https://alpacca.mx/?ver=preventa"); showToast("Link copiado ✅"); } catch (err) { prompt("Copia el link:", "https://alpacca.mx/?ver=preventa"); }
      return;
    }
    if (t.closest("[data-pv-guardar-prod]")) {
      const box = t.closest("[data-pv-prod-form]");
      const v = (k) => box.querySelector(`[data-p="${k}"]`).value;
      const prev = pvEditando && pvData.productos.find((x) => x.id === pvEditando);
      const ok = await pvAct({ accion: "guardar_producto", id: pvEditando, nombre: v("nombre"), marca: v("marca"), precio: v("precio"), precioAntes: v("precioAntes"), piezas: v("piezas"), peso: v("peso"), imagen: v("imagen"), descripcion: v("descripcion"), activo: prev ? prev.activo !== false : true }, btn);
      if (ok) { pvEditando = ""; renderPreventaAdmin(); }
      return;
    }
    if (t.closest("[data-pv-cancelar-edicion]")) { pvEditando = ""; renderPreventaAdmin(); return; }
    const editar = t.closest("[data-pv-editar]");
    if (editar) { pvEditando = editar.dataset.pvEditar; renderPreventaAdmin(); document.querySelector("[data-pv-prod-form]").scrollIntoView({ behavior: "smooth", block: "center" }); return; }
    const ocultar = t.closest("[data-pv-ocultar]");
    if (ocultar) {
      const p = pvData.productos.find((x) => x.id === ocultar.dataset.pvOcultar);
      if (p) await pvAct({ accion: "guardar_producto", ...p, activo: p.activo === false }, btn);
      return;
    }
    const borrar = t.closest("[data-pv-borrar]");
    if (borrar) {
      if (!confirm("¿Borrar este producto de la preventa? Si ya tiene apartados, solo se oculta.")) return;
      const r = await pvAct({ accion: "borrar_producto", id: borrar.dataset.pvBorrar }, btn);
      if (r && r.oculto) showToast("Tenía apartados: lo oculté de la tienda 🙈");
      return;
    }
    const file = t.closest("[data-pv-file]");
    if (file) { pvOpenFile(file.dataset.pvFile); return; }
    const aprobar = t.closest("[data-pv-aprobar]");
    if (aprobar) {
      const [id, etapa] = aprobar.dataset.pvAprobar.split(":");
      if (!confirm(`¿Confirmas que recibiste el ${etapa}? Le llega un aviso a la clienta.`)) return;
      await pvAct({ accion: "aprobar_pago", id, etapa }, btn);
      return;
    }
    const rechazar = t.closest("[data-pv-rechazar]");
    if (rechazar) {
      const [id, etapa] = rechazar.dataset.pvRechazar.split(":");
      const motivo = prompt("¿Por qué lo rechazas? (se lo mandamos a la clienta)", "No encontramos tu transferencia, revisa el comprobante.");
      if (motivo != null) await pvAct({ accion: "rechazar_pago", id, etapa, motivo }, btn);
      return;
    }
    const deshacer = t.closest("[data-pv-deshacer-llego]");
    if (deshacer) {
      const id = deshacer.dataset.pvDeshacerLlego;
      const a = pvData.apartados.find((x) => x.id === id);
      if (!a || !confirm(`¿Regresar ${a.folio} a "apartado"? Se quita el cobro de la llegada${a.envio ? ` (envío ${formatPrice(a.envio)})` : ""} y queda como si todavía no llegara.`)) return;
      const avisarle = confirm(`¿Le aviso a ${a.name || "la clienta"} por WhatsApp y correo que fue un error y que todavía no paga nada?\n\nAceptar = sí le aviso · Cancelar = no le aviso`);
      const r = await pvAct({ accion: "deshacer_llego", id, avisar: avisarle }, deshacer);
      if (r) showToast(`↩️ ${a.folio} regresó a apartado${avisarle ? " y se le avisó" : ""}.`);
      return;
    }
    const llego = t.closest("[data-pv-llego]");
    if (llego) {
      const id = llego.dataset.pvLlego;
      const input = document.querySelector(`[data-pv-envio="${CSS.escape(id)}"]`);
      const envio = input ? input.value : 0;
      const ap = pvData.apartados.find((x) => x.id === id);
      if (!confirm(`¿Ya llegaron los productos de ${ap ? ap.folio : "este apartado"}? Se le avisa a la clienta por WhatsApp y correo para que pague.`)) return;
      if (input && envio === "" && !confirm("No pusiste envío. ¿Cobrar solo el resto, sin envío?")) return;
      await pvAct({ accion: "llego", id, envio }, btn);
      return;
    }
    if (t.closest("[data-pv-llego-todo]")) {
      const lista = pvData.apartados.filter((a) => a.cuenta && a.status === "apartado");
      const envioDe = (a) => { const i = document.querySelector(`[data-pv-envio="${CSS.escape(a.id)}"]`); return i ? i.value.trim() : "0"; };
      const sinEnvio = lista.filter((a) => a.entrega === "envio" && envioDe(a) === "");
      if (sinEnvio.length) { alert(`Te falta poner el envío de: ${sinEnvio.map((a) => a.folio).join(", ")}`); return; }
      if (!confirm(`¿Avisar a las ${lista.length} clientas que ya llegó y cobrarles el resto + el envío que pusiste a cada una? (Las de entrega personal no pagan envío.)`)) return;
      btn.disabled = true;
      let n = 0;
      for (const a of lista) {
        btn.textContent = `Avisando ${++n} de ${lista.length}...`;
        try {
          const res = await fetch("/.netlify/functions/admin-preventa", { method: "POST", headers: { "Content-Type": "application/json", "x-admin-key": adminKey }, body: JSON.stringify({ accion: "llego", id: a.id, envio: envioDe(a) }) });
          if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "error");
        } catch (err) { alert(`${a.folio}: ${err.message}`); }
      }
      showToast("Listo ✅ Ya les llegó el aviso");
      await loadPreventaAdmin({ quiet: true });
      return;
    }
    const enviar = t.closest("[data-pv-enviar]");
    if (enviar) {
      const id = enviar.dataset.pvEnviar;
      const guia = document.querySelector(`[data-pv-guia="${CSS.escape(id)}"]`).value.trim();
      const paqueteria = document.querySelector(`[data-pv-paq="${CSS.escape(id)}"]`).value.trim();
      if (!guia && !confirm("No pusiste número de guía. ¿Marcar enviado de todos modos?")) return;
      await pvAct({ accion: "marcar_enviado", id, guia, paqueteria }, btn);
      return;
    }
    const entregado = t.closest("[data-pv-entregado]");
    if (entregado) { await pvAct({ accion: "marcar_entregado", id: entregado.dataset.pvEntregado }, btn); return; }
    const cancelar = t.closest("[data-pv-cancelar]");
    if (cancelar) {
      const motivo = prompt("¿Por qué se cancela? (se lo mandamos a la clienta por correo y WhatsApp; déjalo vacío si no quieres decirle nada). Si ya había pagado, queda apuntado su reembolso pendiente.", "");
      if (motivo == null) return;
      await pvAct({ accion: "cancelar", id: cancelar.dataset.pvCancelar, motivo, avisar: true }, btn);
    }
  });

  let pvBuscarTimer = null;
  // <details> "Productos y ajustes": que no se cierre solo al volver a pintar.
  document.getElementById("pv-admin").addEventListener("toggle", (e) => {
    if (e.target.matches && e.target.matches("[data-pv-ajustes]")) pvAjustesAbierto = e.target.open;
  }, true);
  document.getElementById("pv-orders-banner").addEventListener("click", () => showView("preventa"));
  document.getElementById("pv-admin").addEventListener("input", (e) => {
    const t = e.target;
    if (!t.matches("[data-pv-buscar]")) return;
    clearTimeout(pvBuscarTimer);
    pvBuscarTimer = setTimeout(() => {
      pvBuscar = t.value;
      pvMostrar = 30;
      renderPreventaAdmin();
      const nuevo = document.querySelector("#pv-admin [data-pv-buscar]");
      if (nuevo) { nuevo.focus(); nuevo.setSelectionRange(nuevo.value.length, nuevo.value.length); }
    }, 250);
  });

  const VIEWS = {
    inicio: { el: "home-view", title: "🌸 Inicio", nav: "inicio" },
    compras: { el: "abw-view", title: "🛍️ Compras ABW", nav: "inicio" },
    pedidos: { el: "orders-view", title: "🧾 Pedidos de stock", display: "block" },
    corea: { el: "orders-view", title: "🇰🇷 Pedidos de Corea", display: "block" },
    clientas: { el: "clients-view", title: "👩 Clientas" },
    catalogo: { el: "catalog-view", title: "🏷️ Catálogo" },
    inventario: { el: "inventory-panel", title: "📦 Stock en México" },
    mas: { el: "more-view", title: "☰ Más", display: "grid" },
    restock: { el: "restock-requests-panel", title: "🔔 Avisos de restock", nav: "mas" },
    resenas: { el: "reviews-panel", title: "⭐ Reseñas", nav: "mas" },
    usa: { el: "usa-orders-panel", title: "🛍️ Encargos USA", nav: "mas" },
    swm: { el: "swm-panel", title: "🇺🇸 Dirección americana" },
    ps: { el: "swm-panel", title: "🛍️ Personal shopper" },
    pm: { el: "swm-panel", title: "📦 Por mandar" },
    ajustes: { el: "settings-view", title: "⚙️ Ajustes", nav: "mas" },
    papelera: { el: "trash-view", title: "🗑️ Papelera", nav: "mas" },
    revision: { el: "revision-view", title: "🔄 Revisión ABW", nav: "mas" },
    cupones: { el: "coupons-view", title: "🎟️ Cupones", nav: "mas" },
    preventa: { el: "preventa-view", title: "🛍️ Preventa", nav: "inventario" },
  };
  let currentView = "inicio";

  function showView(view) {
    if (!VIEWS[view]) view = "pedidos";
    if (currentView === "usa" && view !== "usa") {
      closeUsaClientForm();
      closeUsaClientDetailView();
    }
    currentView = view;
    // Dos vistas pueden compartir el mismo panel (Personal shopper usa el de Dirección americana).
    Object.entries(VIEWS).forEach(([key, v]) => {
      if (v.el === VIEWS[view].el && key !== view) return;
      const el = document.getElementById(v.el);
      el.style.display = key === view ? (v.display || "flex") : "none";
    });
    document.getElementById("view-title").textContent = VIEWS[view].title;
    const navKey = VIEWS[view].nav || view;
    toolbar.querySelectorAll("[data-view]").forEach((b) => {
      const on = b.dataset.view === navKey;
      b.classList.toggle("active", on);
      if (on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    });
    if (view === "pedidos" || view === "corea") {
      pedidosTodos = pedidosTodosNext; pedidosTodosNext = false;
      if (typeof applyFilters === "function" && allOrders) applyFilters();
    }
    if (view === "inicio") renderHome();
    if (view === "compras") renderAbw();
    if (view === "clientas") renderClients();
    if (view === "catalogo") renderCatalogList();
    if (view === "ajustes") loadSettings();
    if (view === "papelera") loadTrash();
    if (view === "revision") loadRevision();
    if (view === "cupones") loadCoupons();
    if (view === "preventa") loadPreventaAdmin();
    if (view === "pm" && !pvData) loadPreventaAdmin({ quiet: true });
    if (view === "mas") renderNotifyToggle();
    if (view !== "catalogo" && catalogEditing) closeCatalogEditor();
    if (view === "inventario" && !inventoryLoaded) loadInventory();
    if (view === "restock" && !restockRequestsLoaded) loadRestockRequests();
    if (view === "resenas" && !reviewsLoaded) loadReviews();
    if (view === "usa" && !usaClientsLoaded) loadUsaClients();
    if (view === "swm" || view === "ps" || view === "pm") {
      const modo = view === "ps" ? "ps" : view === "pm" ? "pm" : "";
      if (swmModo !== modo) { swmSearch = ""; swmNuevaCompraOpen = false; }
      swmModo = modo;
      renderSwmAdmin(); loadSwm();
    }
    window.scrollTo({ top: 0 });
  }

  function setLoggedInUI(on) {
    loginBox.style.display = on ? "none" : "block";
    toolbar.style.display = on ? "flex" : "none";
    document.getElementById("logout-btn").style.display = on ? "inline-flex" : "none";
    if (on) { showView("inicio"); startPolling(); loadSwm({ quiet: true }); loadRevision(); loadPreventaAdmin({ quiet: true }); }
    else stopPolling();
    if (!on) Object.values(VIEWS).forEach((v) => { document.getElementById(v.el).style.display = "none"; });
  }

  /* Etiqueta visible arriba de cada campo (antes solo tenían el texto de
     ejemplo, que desaparece en cuanto escribes). Se toma del aria-label;
     los buscadores y casillas se quedan como están. */
  function addVisibleLabels(root) {
    root.querySelectorAll("input[aria-label], textarea[aria-label], select[aria-label]").forEach((el) => {
      if (el.dataset.labeled || el.type === "checkbox" || el.type === "radio" || el.type === "password") return;
      if (/search/.test(el.id || "") || (el.getAttribute("aria-label") || "").startsWith("🔍")) return;
      if (el.closest(".inventory-qty") || el.closest("label")) return;
      el.dataset.labeled = "1";
      const text = el.getAttribute("aria-label").replace(/\s*\*\s*$/, " *");
      const label = document.createElement("label");
      label.className = "fld";
      if (el.style.flex) { label.style.flex = el.style.flex; el.style.flex = ""; }
      if (el.style.width === "100%") label.style.flexBasis = "100%";
      const span = document.createElement("span");
      span.textContent = text;
      el.parentNode.insertBefore(label, el);
      label.appendChild(span);
      label.appendChild(el);
    });
  }

  async function login() {
    const value = document.getElementById("admin-key-input").value.trim();
    if (!value) return;

    const loginBtn = document.getElementById("login-btn");
    const originalLabel = loginBtn.textContent;
    loginBtn.disabled = true;
    loginBtn.textContent = "Verificando...";
    setStatus("");

    try {
      const res = await fetch("/.netlify/functions/admin-orders", {
        headers: { "x-admin-key": value },
      });
      if (res.status === 401) {
        setStatus("Clave incorrecta.");
        return;
      }
      if (!res.ok) {
        setStatus("No se pudo verificar la clave. Intenta de nuevo.");
        return;
      }
    } catch (err) {
      setStatus("No se pudo conectar con el servidor.");
      return;
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = originalLabel;
    }

    adminKey = value;
    sessionStorage.setItem(KEY_STORAGE, value);
    setLoggedInUI(true);
    fetchOrders();
    loadSkuMarcaMap();
    loadCardSurchargePct();
    loadRestockRequests();
    loadPvResumen();
  }

  function resetTabs() {
    currentStatus = "";
    currentRange = "all";
    currentBucket = "";
    bucketTabsEl.querySelectorAll(".tab").forEach((b) => {
      const isDefault = b.dataset.bucket === "";
      b.classList.toggle("active", isDefault);
      b.style.background = isDefault ? "#e07a8f" : "";
      b.style.color = isDefault ? "#fff" : "";
    });
    syncTabPressed(bucketTabsEl);
    statusTabsEl.querySelectorAll(".tab").forEach((b) => {
      const isDefault = b.dataset.status === "";
      b.classList.toggle("active", isDefault);
      b.style.background = isDefault ? STATUS_TAB_COLORS[""] : "";
      b.style.color = isDefault ? "#fff" : "";
    });
    timeTabsEl.querySelectorAll(".tab").forEach((b) => {
      const isDefault = b.dataset.range === "all";
      b.classList.toggle("active", isDefault);
      b.style.background = isDefault ? "#e07a8f" : "";
      b.style.color = isDefault ? "#fff" : "";
    });
    syncTabPressed(statusTabsEl);
    syncTabPressed(timeTabsEl);
  }

  function logout() {
    adminKey = "";
    sessionStorage.removeItem(KEY_STORAGE);
    setLoggedInUI(false);
    currentView = "inicio";
    currentBucket = "";
    ordersEl.innerHTML = "";
    emptyEl.style.display = "none";
    historyEl.innerHTML = "";
    historyEmptyEl.style.display = "none";
    historyTitleEl.style.display = "none";
    filtersEl.style.display = "none";
    allOrders = [];
    knownOrders = new Map();
    filteredOrders = [];
    closeCatalogEditor();
    trashLoaded = false;
    trashOrders = [];
    filterSearchEl.value = "";
    filterCountEl.textContent = "";
    document.getElementById("add-stock-form").style.display = "none";
    document.getElementById("inventory-panel").style.display = "none";
    inventoryLoaded = false;
    inventoryProducts = [];
    document.getElementById("restock-requests-panel").style.display = "none";
    restockRequestsLoaded = false;
    document.getElementById("reviews-panel").style.display = "none";
    reviewsLoaded = false;
    document.getElementById("usa-orders-panel").style.display = "none";
    closeUsaClientForm();
    closeUsaClientDetailView();
    usaClientsLoaded = false;
    usaClients = [];
    usaOpenClientId = null;
    resetTabs();
  }

  document.getElementById("proof-viewer-close").addEventListener("click", closeProofViewer);
  document.getElementById("proof-viewer-img").addEventListener("click", (e) => {
    setProofZoom(!e.currentTarget.dataset.zoomed);
  });
  document.getElementById("proof-viewer-overlay").addEventListener("click", (e) => {
    if (e.target.id === "proof-viewer-overlay") closeProofViewer();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && document.getElementById("proof-viewer-overlay").style.display !== "none") {
      closeProofViewer();
    }
  });

  document.getElementById("login-btn").addEventListener("click", login);
  document.getElementById("admin-key-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") login();
  });
  initProductAutocomplete();
  document.getElementById("refresh-btn").addEventListener("click", fetchOrders);
  toolbar.querySelectorAll("[data-view]").forEach((btn) => {
    btn.addEventListener("click", () => showView(btn.dataset.view));
  });
  // Abrir/cerrar el detalle de un pedido al tocar su resumen.
  [ordersEl, historyEl].forEach((container) => {
    container.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-card-toggle]");
      if (!btn || !container.contains(btn)) return;
      const id = btn.dataset.cardToggle;
      const body = document.getElementById(`card-body-${id}`);
      if (!body) return;
      const open = body.hasAttribute("hidden");
      body.toggleAttribute("hidden", !open);
      btn.setAttribute("aria-expanded", String(open));
      if (container === ordersEl) { if (open) closedPendingCards.delete(id); else closedPendingCards.add(id); }
      else { if (open) openCards.add(id); else openCards.delete(id); }
    });
  });
  // Etiquetas visibles: en lo que ya está en la página y en lo que se pinte después.
  addVisibleLabels(document);
  new MutationObserver((muts) => {
    muts.forEach((m) => m.addedNodes.forEach((n) => { if (n.nodeType === 1) addVisibleLabels(n); }));
  }).observe(document.querySelector(".wrap"), { childList: true, subtree: true });
  document.getElementById("logout-btn").addEventListener("click", logout);
  document.getElementById("export-btn").addEventListener("click", exportCSV);
  document.getElementById("add-stock-toggle").addEventListener("click", toggleAddStockForm);
  document.getElementById("stock-add-submit").addEventListener("click", submitAddStockProduct);
  document.getElementById("stock-multi-tono-toggle").addEventListener("change", toggleMultiTono);
  document.getElementById("stock-precio").addEventListener("input", autoFillPrecioTarjeta);
  document.getElementById("stock-precio-tarjeta").addEventListener("input", () => { tarjetaManuallyEdited = true; });
  document.getElementById("stock-tono-add-row").addEventListener("click", addTonoRow);
  document.getElementById("inventory-search").addEventListener("input", (e) => {
    inventorySearchTerm = e.target.value;
    renderInventoryList();
  });
  document.getElementById("usa-client-new-toggle").addEventListener("click", openUsaClientForm);
  document.getElementById("usa-client-cancel").addEventListener("click", closeUsaClientForm);
  document.getElementById("usa-client-submit").addEventListener("click", submitUsaClientForm);
  document.getElementById("usa-client-search").addEventListener("input", (e) => {
    usaClientSearchTerm = e.target.value;
    renderUsaClientsList();
  });
  document.getElementById("usa-client-back").addEventListener("click", closeUsaClientDetailView);
  document.getElementById("usa-client-edit-cancel").addEventListener("click", closeUsaClientMetaForm);
  document.getElementById("usa-client-edit-submit").addEventListener("click", submitUsaClientMetaForm);
  document.getElementById("usa-pedido-new-toggle").addEventListener("click", () => openUsaPedidoForm(null));
  document.getElementById("usa-pedido-cancel").addEventListener("click", closeUsaPedidoForm);
  document.getElementById("usa-pedido-submit").addEventListener("click", submitUsaPedidoForm);
  document.getElementById("usa-pedidos-status-tabs").querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      usaPedidoStatusFilter = btn.dataset.usaStatus;
      document.getElementById("usa-pedidos-status-tabs").querySelectorAll(".tab").forEach((b) => {
        b.classList.toggle("active", b === btn);
      });
      syncTabPressed(document.getElementById("usa-pedidos-status-tabs"));
      renderUsaPedidosList();
    });
  });
  filterSearchEl.addEventListener("input", applyFilters);
  bucketTabsEl.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentBucket = btn.dataset.bucket;
      syncFilterTabs();
      applyFilters();
    });
  });
  wireStageControls(ordersEl);
  wireStageControls(historyEl);
  document.getElementById("home-todo").addEventListener("click", (e) => {
    const c = e.target.closest("[data-home-go]");
    if (!c) return;
    const go = c.dataset.homeGo;
    if (go === "abw") showView("compras");
    else if (go === "restock" || go === "swm" || go === "ps" || go === "pm" || go === "preventa") showView(go);
    else goToOrders(go);
  });
  document.getElementById("abw-filtro").addEventListener("click", (e) => {
    const b = e.target.closest("[data-abw-filtro]");
    if (!b) return;
    abwFiltro = b.dataset.abwFiltro;
    renderAbw();
  });
  document.getElementById("abw-orders").addEventListener("change", (e) => {
    const cb = e.target.closest("[data-abw-order]");
    if (!cb) return;
    if (cb.checked) abwExcluded.delete(cb.dataset.abwOrder); else abwExcluded.add(cb.dataset.abwOrder);
    renderAbw();
  });
  document.getElementById("abw-copy-list").addEventListener("click", (e) => copyText(abwListText(), e.currentTarget));
  document.getElementById("abw-copy-prompt").addEventListener("click", (e) => copyText(abwPromptText(), e.currentTarget));
  document.getElementById("abw-mark-done").addEventListener("click", async (e) => {
    const ids = abwOrders().filter((o) => !abwExcluded.has(o.id)).map((o) => o.id);
    if (!ids.length) return;
    if (!window.confirm(`¿Marcar ${ids.length} pedido${ids.length === 1 ? "" : "s"} como pedidos a ABW?`)) return;
    const btn = e.currentTarget;
    btn.disabled = true;
    const num = document.getElementById("abw-order-number").value.trim();
    const ok = await updateStage(ids, "pedido_abw", num || undefined);
    btn.disabled = false;
    if (ok) {
      document.getElementById("abw-order-number").value = "";
      renderAbw();
    }
  });

  ["more-view", "inventory-panel"].forEach((id) => document.getElementById(id).addEventListener("click", (e) => {
    const b = e.target.closest("[data-goto]");
    if (b) showView(b.dataset.goto);
  }));
  document.getElementById("notify-toggle").addEventListener("click", toggleNotify);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && unseenCount) {
      unseenCount = 0;
      document.title = baseTitle;
    }
    if (!document.hidden && adminKey) pollOrders();
  });
  document.getElementById("clients-search").addEventListener("input", renderClients);
  document.getElementById("clients-sort").addEventListener("click", (e) => {
    const b = e.target.closest("[data-sort]");
    if (!b) return;
    clientsSort = b.dataset.sort;
    e.currentTarget.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t === b));
    syncTabPressed(e.currentTarget);
    renderClients();
  });
  document.getElementById("clients-list").addEventListener("click", (e) => {
    const b = e.target.closest("[data-client-orders]");
    if (!b) return;
    goToOrders("");
    filterSearchEl.value = b.dataset.clientOrders;
    applyFilters();
  });
  document.getElementById("catalog-search").addEventListener("input", renderCatalogList);
  document.getElementById("catalog-filter").addEventListener("click", (e) => {
    const b = e.target.closest("[data-cf]");
    if (!b) return;
    catalogFilter = b.dataset.cf;
    e.currentTarget.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t === b));
    syncTabPressed(e.currentTarget);
    renderCatalogList();
  });
  document.getElementById("catalog-list").addEventListener("click", (e) => {
    const b = e.target.closest("[data-cat-sku]");
    if (b) openCatalogEditor(b.dataset.catSku);
  });
  const catalogEditorEl = document.getElementById("catalog-editor");
  catalogEditorEl.addEventListener("click", (e) => {
    if (e.target === catalogEditorEl || e.target.closest("[data-cat-close]")) { closeCatalogEditor(); return; }
    const d = e.target.closest("[data-disp]");
    if (d) {
      const sw = document.getElementById("cat-disp");
      sw.dataset.value = d.dataset.disp;
      sw.querySelectorAll("button").forEach((x) => { x.className = x === d ? ({ SI: "on-si", PREORDEN: "on-pre" }[d.dataset.disp] || "on-no") : ""; });
      return;
    }
    if (e.target.closest("#cat-save")) saveCatalogEditor();
  });
  catalogEditorEl.addEventListener("input", (e) => {
    if (e.target.matches('[data-cat-field="Precio USD"]')) updateCatalogEstimate();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && catalogEditing) closeCatalogEditor();
  });
  document.getElementById("settings-save").addEventListener("click", saveSettings);
  document.getElementById("trash-list").addEventListener("click", (e) => {
    const r = e.target.closest("[data-trash-restore]");
    if (r) { restoreFromTrash(r.dataset.trashRestore); return; }
    const p = e.target.closest("[data-trash-purge]");
    if (p) purgeFromTrash(p.dataset.trashPurge);
  });

  statusTabsEl.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentStatus = btn.dataset.status;
      statusTabsEl.querySelectorAll(".tab").forEach((b) => {
        b.classList.remove("active");
        b.style.background = "";
        b.style.color = "";
      });
      btn.classList.add("active");
      btn.style.background = STATUS_TAB_COLORS[btn.dataset.status] || "#e07a8f";
      btn.style.color = "#fff";
      syncTabPressed(statusTabsEl);
      applyFilters();
    });
  });

  timeTabsEl.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentRange = btn.dataset.range;
      timeTabsEl.querySelectorAll(".tab").forEach((b) => {
        b.classList.remove("active");
        b.style.background = "";
        b.style.color = "";
      });
      btn.classList.add("active");
      btn.style.background = "#e07a8f";
      btn.style.color = "#fff";
      syncTabPressed(timeTabsEl);
      applyFilters();
    });
  });

  const savedKey = sessionStorage.getItem(KEY_STORAGE);
  if (savedKey) {
    adminKey = savedKey;
    setLoggedInUI(true);
    fetchOrders();
    loadSkuMarcaMap();
    loadCardSurchargePct();
    loadRestockRequests();
    loadPvResumen();
  }
