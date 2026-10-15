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
  const pricingConfig = { exchangeRate: 0, comisionPct: 0, arancelPct: 0 };
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
      }
      if (currentView === "inicio") renderHome();
      // Para que las tarjetas de pedido ya muestren la ganancia.
      if (allOrders.length && currentView !== "pedidos") applyFilters();
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

  function applyFilters() {
    const search = filterSearchEl.value.trim().toLowerCase();
    currentSearchTerm = search;
    const bounds = getRangeBounds(currentRange);

    filteredOrders = allOrders.filter((o) => {
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
    const pendingOrders = allOrders.filter((o) => o.status === "pending");
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
    const total = allOrders.length;
    filterCountEl.textContent = filteredOrders.length === total
      ? `${total} pedido${total === 1 ? "" : "s"}`
      : `${filteredOrders.length} de ${total} pedidos`;
    if (currentView === "inicio") renderHome();
    if (currentView === "compras") renderAbw();
  }

  function matchesSearch(o, query) {
    const haystack = [
      o.customer?.name,
      o.customer?.phone,
      o.customer?.cp,
      o.customer?.colonia,
      o.customer?.municipio,
      orderNumber(o),
      o.supplierOrderNumber,
      ...((o.items || []).map((it) => it.nombre)),
      ...((o.items || []).map((it) => itemMarca(it))),
    ].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(query);
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
    wireCopyAddressButtons(ordersEl);
    wireEditButtons(ordersEl);
    wireProofLinkButtons(ordersEl);
    wireSupplierPromptButtons(ordersEl);
    wireSupplierNoteButtons(ordersEl);
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

  function useComputedTotal(orderId) {
    const computedEl = document.getElementById(`edit-computed-${orderId}`);
    const totalInput = document.getElementById(`edit-total-${orderId}`);
    if (!computedEl || !totalInput) return;
    const num = Number(String(computedEl.textContent).replace(/[^0-9.-]/g, "")) || 0;
    totalInput.value = num;
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
    container.querySelectorAll('[id^="edit-form-"]').forEach((form) => {
      const orderId = form.id.replace("edit-form-", "");
      wireEditItemRowRemovers(form);
      form.addEventListener("input", (e) => {
        if (e.target.matches(".edit-item-qty, .edit-item-precio") || e.target.id === `edit-shipping-${orderId}`) {
          updateEditComputedTotal(orderId);
        }
      });
      updateEditComputedTotal(orderId);
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
      if (!res.ok) {
        ratesEl.innerHTML = "";
        errorEl.textContent = data.error || "No se pudo cotizar el envío.";
        return;
      }
      const rates = data.rates || [];
      if (!rates.length) {
        ratesEl.innerHTML = "";
        errorEl.textContent = "No hay opciones de envío disponibles para esos datos.";
        return;
      }
      guideState[orderId] = { rates, selected: null };
      const providerBadge = { enviosperros: "📦 Envíos Perros", skydropx: "🛵 Skydropx" };
      ratesEl.innerHTML = rates.map((r, i) => `
        <label class="rate-option" data-rate-option="${orderId}" data-rate-index="${i}">
          <input type="radio" name="rate-${orderId}" value="${i}" />
          ${i === 0 ? "🏆 " : ""}${escapeHtml(r.label || "")}${r.days ? " · " + escapeHtml(r.days) : ""}
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
        return `<li${isMatch ? ' class="item-hit"' : ""}>${marcaHTML}${highlightMatch(it.nombre, term)} x${it.qty}${it.enStock ? " · en stock" : ""} <span class="unit-price">(${formatPrice(precio)} c/u)</span> — ${formatPrice(precio * it.qty)}</li>`;
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
    if (!o.hasPaymentProof) return "";
    return `<div style="margin-top:8px;"><button type="button" data-view-proof="${escapeHtml(o.id)}" style="font-size: 14px;font-weight:700;color:#0b6bc2;text-decoration:none;background:none;border:none;padding:0;cursor:pointer;">📎 Ver comprobante de pago</button></div>`;
  }

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
      btn.addEventListener("click", () => viewPaymentProof(btn.dataset.viewProof, btn));
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

  async function viewPaymentProof(orderId, btn) {
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Cargando...";
    try {
      const res = await fetch(`/.netlify/functions/admin-payment-proof?orderId=${encodeURIComponent(orderId)}`, {
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
    if (o.status !== "paid") return "";
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
      <div class="edit-item-row">
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
          ${mpWarning}
          ${stockHint}
          <div class="guide-error" id="edit-error-${o.id}"></div>
          <button type="button" class="btn-primary" data-edit-save="${o.id}">💾 Guardar cambios</button>
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
          <div class="actions primary-actions">
            <button class="btn-primary" data-confirm="${o.id}" title="Esto resta las piezas vendidas del stock automáticamente">✅ Ya me pagó</button>
            <button class="btn-danger" data-cancel="${o.id}">✕ No pagó / Cancelar</button>
          </div>
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
          <button type="button" class="btn-danger inv-delete">🗑️ Quitar</button>
          <span class="inv-status"></span>
        </div>
      </div>`;
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
      if (product) Object.assign(product, body);
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

  async function confirmOrCancel(orderId, action) {
    if (action === "cancel") {
      const o = allOrders.find((x) => x.id === orderId);
      const who = o && o.customer && o.customer.name ? ` de ${o.customer.name}` : "";
      if (!window.confirm(`¿Cancelar el pedido${who}? Se marcará como NO pagado.`)) return;
    }
    setStatus(action === "confirm" ? "Confirmando..." : "Cancelando...");
    try {
      const res = await fetch("/.netlify/functions/admin-confirm-order", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ orderId, action }),
      });
      const data = await res.json();
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
    enviado: "🚚 Enviado",
    entregado: "🎁 Entregado",
  };
  let currentBucket = "";
  let restockCount = null;
  const abwExcluded = new Set();

  function orderStage(o) {
    let rank = STAGE_ORDER.indexOf(o.stage);
    if (rank < 0) rank = 0;
    if (o.supplierOrderNumber) rank = Math.max(rank, 1);
    if (o.trackingNumber) rank = Math.max(rank, 3);
    return STAGE_ORDER[rank];
  }

  // En qué "pendiente" está un pedido pagado (null si no está pagado).
  function orderBucket(o) {
    if (o.status !== "paid") return null;
    const st = orderStage(o);
    if (st === "pagado") return supplierSourceableItems(o).length ? "por_abw" : "por_enviar";
    if (st === "pedido_abw") return "esperando_abw";
    if (st === "llego") return "por_enviar";
    return st;
  }

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
    if (b === "por_enviar" && orderStage(o) === "llego") msgs.push(["Llegó a México", `${hola} ¡Tu pedido ${num} ya llegó a México! 🇲🇽 Lo preparo y te mando la guía en cuanto salga.`]);
    if (b === "enviado") msgs.push(["¿Ya te llegó?", `${hola} ¿Ya te llegó tu pedido ${num}? Cualquier cosa aquí estoy 🌸`]);
    if (b === "entregado") msgs.push(["Gracias", `${hola} ¡Gracias por tu compra! Si te gustaron tus productos, me ayudaría mucho que dejaras tu reseña en alpacca.mx 💕`]);
    if (!msgs.length) return "";
    return `<div class="wa-row"><span class="wa-label">💬 Mensajes rápidos por WhatsApp</span>${msgs
      .map(([label, text]) => `<a href="${escapeHtml(`${base}?text=${encodeURIComponent(text)}`)}" target="_blank" rel="noopener">${escapeHtml(label)}</a>`)
      .join("")}</div>`;
  }

  // El botón grande del siguiente paso, según la etapa.
  function nextStepHTML(o) {
    const b = orderBucket(o);
    if (!b) return "";
    const btn = (to, label) => `<button type="button" class="btn-primary" data-stage="${o.id}" data-stage-to="${to}">${label}</button>`;
    let action = "";
    if (b === "por_abw") action = btn("pedido_abw", "🛍️ Ya lo pedí a ABW");
    else if (b === "esperando_abw") action = btn("llego", "📦 Ya llegó a México");
    else if (b === "por_enviar") action = `${btn("enviado", "🚚 Ya lo envié")}<span class="edit-hint">Para generar la guía con paquetería usa "📦 Generar guía real" más abajo; al guardar la guía se marca como enviado solo.</span>`;
    else if (b === "enviado") action = btn("entregado", "🎁 Ya lo recibió");
    return `<div class="next-step"><span class="ns-label">Siguiente paso · <b>${BUCKETS[b]}</b></span>${action}${waTemplatesHTML(o)}</div>`;
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

  function wireStageControls(container) {
    container.addEventListener("click", async (e) => {
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

  function renderHome() {
    const todoEl = document.getElementById("home-todo");
    if (!todoEl) return;
    const now = new Date();
    document.getElementById("home-hello").textContent =
      `Hola Mae · ${now.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}`;
    const count = (b) => allOrders.filter((o) => orderBucket(o) === b).length;
    const pending = allOrders.filter((o) => o.status === "pending").length;
    const cards = [
      { n: pending, label: "Por confirmar pago", hint: "Revisa comprobantes", go: "pending", cls: "hot" },
      { n: count("por_abw"), label: "Por pedir a ABW", hint: "Ver lista de compra", go: "abw", cls: "pink" },
      { n: count("esperando_abw"), label: "Esperando ABW", hint: "Ya pedidos, en camino", go: "esperando_abw" },
      { n: count("por_enviar"), label: "Por enviar", hint: "Generar guía", go: "por_enviar", cls: "hot" },
      { n: restockCount == null ? "…" : restockCount, label: "Avisos de restock", hint: "Clientas esperando", go: "restock" },
    ];
    todoEl.innerHTML = cards
      .map((c) => `<button type="button" class="todo-card ${c.n ? c.cls || "" : "zero"}" data-home-go="${c.go}">
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

  function goToOrders(filter) {
    showView("pedidos");
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
    return allOrders.filter((o) => orderBucket(o) === "por_abw");
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
    const orders = abwOrders();
    const has = orders.length > 0;
    document.getElementById("abw-empty").style.display = has ? "none" : "block";
    document.getElementById("abw-actions").style.display = has ? "flex" : "none";
    document.getElementById("abw-orders").innerHTML = orders
      .map((o) => {
        const n = supplierSourceableItems(o).reduce((s, it) => s + (it.qty || 0), 0);
        return `<label class="abw-order"><input type="checkbox" data-abw-order="${o.id}" ${abwExcluded.has(o.id) ? "" : "checked"} />
          <span class="who"><b>${escapeHtml((o.customer && o.customer.name) || "(sin nombre)")}</b>
          <small>#${orderNumber(o)} · ${formatFecha(o.createdAt)} · ${n} pieza${n === 1 ? "" : "s"} por pedir</small></span></label>`;
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
    const rate = (o && o.exchangeRate) || c.exchangeRate;
    if (it.costoUSD > 0 && rate > 0) return it.costoUSD * rate * aran;
    if (!it.enStock && it.precioBase > 0 && c.comisionPct > 0) return it.precioBase / (1 + c.comisionPct / 100);
    const info = skuToInfo.get(it.sku) || {};
    if (info.costoUSD > 0 && c.exchangeRate > 0) return info.costoUSD * c.exchangeRate * aran;
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
    const pct = p.known ? Math.round((p.profit / p.known) * 100) : 0;
    return `<div class="profit-box">💵 Ganancia estimada: <b>${formatPrice(p.profit)}</b> (${pct}%)<br/>
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
        <td class="g">${formatPrice(m.profit)}${m.known ? ` <small>(${Math.round((m.profit / m.known) * 100)}%)</small>` : ""}</td></tr>`).join("")}
      </tbody></table>
      <p class="profit-note">Costo = Precio USD de ABW × tipo de cambio + arancel (${pricingConfig.arancelPct}%), con los precios del día de cada pedido. Tu ganancia es la comisión de Config (${pricingConfig.comisionPct}%). No cuenta envíos (los paga la clienta) ni la comisión de tarjeta.${anyMissing ? " Los productos de Stock MX con SKU propio (STOCK-…) no tienen costo en el Sheet, así que su venta no entra en la ganancia." : ""}</p>`;
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
    if (catalogFilter) list = list.filter((r) => (r.disponible === "NO" ? "NO" : "SI") === catalogFilter);
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
        <span class="pr">${formatPrice(r.precio)}<small class="${r.disponible === "NO" ? "no" : "si"}">${r.disponible === "NO" ? "⛔ No disponible" : "✅ Disponible"}</small></span>
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

  function renderCatalogEditor(msg) {
    const wrap = document.getElementById("catalog-editor");
    const f = catalogEditing.fields;
    const v = (k) => (f[k] ? String(f[k].value ?? "") : "");
    const has = (k) => Boolean(f[k]);
    const disp = (v("Disponible") || "SI").toUpperCase() === "NO" ? "NO" : "SI";
    const usd = v("Precio USD");
    const priceInputs = ["Precio", "Precio Tarjeta"].filter((k) => has(k) && !f[k].formula);
    wrap.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="Editar producto">
      <div class="head">${v("Imagen") ? `<img src="${escapeHtml(catalogImgSrc(v("Imagen")))}" alt="" />` : ""}
        <div><h2>${escapeHtml(v("Nombre"))}</h2><small style="color:#5f5866;">${escapeHtml(v("Marca"))} · SKU ${escapeHtml(catalogEditing.sku)}</small></div></div>
      <div><span class="filters-label" style="font-size:13px;">¿Disponible en la tienda?</span>
        <div class="switch" id="cat-disp" data-value="${disp}">
          <button type="button" data-disp="SI" class="${disp === "SI" ? "on-si" : ""}">✅ Sí</button>
          <button type="button" data-disp="NO" class="${disp === "NO" ? "on-no" : ""}">⛔ No</button></div></div>
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
    if (disp !== ((f.Disponible && String(f.Disponible.value).toUpperCase() === "NO") ? "NO" : "SI")) changes.Disponible = disp;
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
      <label class="set-row"><span>${escapeHtml(c.key)}${c.formula ? ' <small style="color:#5f5866;font-weight:500;">(fórmula, cámbiala en el Sheet)</small>' : ""}</span>
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

  function notifyEnabled() {
    try { return localStorage.getItem(NOTIFY_KEY) === "1"; } catch (e) { return false; }
  }

  function rememberOrders(list) {
    knownOrders = new Map(list.map((o) => [o.id, o.status]));
  }

  function updateMoreBadge() {
    const n = (restockCount || 0) + (usaPendingCount || 0) + (swmNewCount || 0);
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

  function startPolling() {
    if (pollTimer) return;
    pollTimer = setInterval(pollOrders, POLL_MS);
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
  let swmData = { paquetes: [], compras: [], envios: [], almacenajeDias: 30 };
  let swmTab = "acciones";
  let swmSearch = "";
  let swmSinRegistroOpen = false;

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
  const swmPorRevisar = () => [...swmData.compras.map((r) => ["compra", r]), ...swmData.envios.map((r) => ["envio", r])].filter(([, r]) => r.pago && r.pago.status === "revision" && r.status === "cotizado");

  /* Lo que requiere que Mae haga algo. */
  function swmPendientes() {
    return {
      cotizarCompra: swmData.compras.filter((c) => c.status === "solicitud"),
      comprar: swmData.compras.filter((c) => c.status === "pagado"),
      cotizarEnvio: swmData.envios.filter((e) => e.status === "solicitado"),
      sinDuena: swmData.paquetes.filter((p) => p.status === "sin_dueña"),
      enviar: swmData.envios.filter((e) => e.status === "pagado"),
      pagos: swmPorRevisar(),
    };
  }

  async function loadSwm({ quiet = false } = {}) {
    const loading = document.getElementById("swm-loading");
    if (!quiet) loading.style.display = "block";
    try {
      const res = await fetch("/.netlify/functions/admin-swm", { headers: { "x-admin-key": adminKey } });
      const data = await res.json();
      if (!res.ok) { if (!quiet) setStatus(data.error || "No se pudo cargar Shop with Mae."); return; }
      swmData = data;
      const pend = swmPendientes();
      swmNewCount = pend.cotizarCompra.length + pend.comprar.length + pend.cotizarEnvio.length + pend.enviar.length + pend.pagos.length + pend.sinDuena.length;
      const badge = document.getElementById("swm-badge");
      badge.textContent = swmNewCount ? String(swmNewCount) : "";
      badge.style.display = swmNewCount ? "inline-flex" : "none";
      updateMoreBadge();
      if (currentView === "swm") renderSwmAdmin();
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

  function swmMatches(r) {
    const q = swmSearch.trim().toLowerCase();
    if (!q) return true;
    const cas = r.email && swmData.casilleros ? swmData.casilleros[r.email] : "";
    return [r.folio, r.name, r.email, r.phone, r.tienda, r.rastreo, r.contenido, r.links, cas, r.etiqueta].some((v) => String(v || "").toLowerCase().includes(q));
  }

  function renderSwmAdmin() {
    const pend = swmPendientes();
    const P = swmData.paquetes;
    const tabs = [
      ["acciones", `⚡ Por hacer (${swmNewCount})`],
      ["llegar", `⏳ Por llegar (${P.filter((p) => p.status === "registrado").length})`],
      ["almacen", `📥 En almacén (${P.filter((p) => p.status === "recibido").length})`],
      ["sindueña", `❓ Sin dueña (${P.filter((p) => p.status === "sin_dueña").length})`],
      ["compras", `🛍️ Compras (${swmData.compras.filter((c) => !["comprado", "cancelado"].includes(c.status)).length})`],
      ["envios", `🚚 Envíos (${swmData.envios.filter((e) => !["entregado", "cancelado"].includes(e.status)).length})`],
      ["historial", "🗂️ Historial"],
    ];
    document.getElementById("swm-filters").innerHTML = `${tabs.map(([k, l]) => `<button type="button" class="btn-secondary ${swmTab === k ? "on" : ""}" data-swm-tab="${k}">${l}</button>`).join("")}
      <input type="search" id="swm-search" placeholder="🔍 Buscar por folio, nombre, tienda o rastreo" value="${escapeHtml(swmSearch)}" style="flex:1;min-width:200px;padding:10px 12px;border-radius:8px;border:1px solid #ddd;font-size:14px;">
      <button type="button" class="btn-primary" data-swm-sinreg-toggle>📦 Llegó un paquete sin registrar</button>
      <div id="swm-sinreg-box" style="width:100%;">${swmSinRegistroOpen ? swmSinRegistroForm() : ""}</div>`;
    let html = "";
    const sec = (title, items, fn) => (items.length ? `<h4 style="margin:14px 0 8px;font-size:15px;">${title} (${items.length})</h4>${items.map(fn).join("")}` : "");
    if (swmSearch.trim()) {
      html = sec("Paquetes", P.filter(swmMatches), swmPaqueteCard) + sec("Compras", swmData.compras.filter(swmMatches), swmCompraCard) + sec("Envíos", swmData.envios.filter(swmMatches), swmEnvioCard)
        || `<p style="color:#5f5866;font-size:14px;">No encontré nada con "${escapeHtml(swmSearch)}".</p>`;
    } else if (swmTab === "acciones") {
      html = sec("🔎 Pagos por revisar", pend.pagos.filter(([, r]) => swmMatches(r)), ([k, r]) => (k === "compra" ? swmCompraCard(r) : swmEnvioCard(r)))
        + sec("🛍️ Compras por cotizar", pend.cotizarCompra.filter(swmMatches), swmCompraCard)
        + sec("🛒 Compras pagadas: hay que comprar", pend.comprar.filter(swmMatches), swmCompraCard)
        + sec("🚚 Envíos por cotizar", pend.cotizarEnvio.filter(swmMatches), swmEnvioCard)
        + sec("📦 Envíos pagados: hay que mandar", pend.enviar.filter(swmMatches), swmEnvioCard)
        + sec("❓ Paquetes sin dueña", pend.sinDuena.filter(swmMatches), swmPaqueteCard);
      if (!html) html = `<p style="color:#5f5866;font-size:14px;">No hay nada pendiente 🎉</p>`;
    } else if (swmTab === "llegar") {
      html = P.filter((p) => p.status === "registrado" && swmMatches(p)).map(swmPaqueteCard).join("") || `<p style="color:#5f5866;font-size:14px;">No hay paquetes por llegar.</p>`;
    } else if (swmTab === "sindueña") {
      html = P.filter((p) => p.status === "sin_dueña").map(swmPaqueteCard).join("") || `<p style="color:#5f5866;font-size:14px;">No hay paquetes sin dueña.</p>`;
    } else if (swmTab === "almacen") {
      html = P.filter((p) => p.status === "recibido" && swmMatches(p)).map(swmPaqueteCard).join("") || `<p style="color:#5f5866;font-size:14px;">No hay paquetes en el almacén.</p>`;
    } else if (swmTab === "compras") {
      html = swmData.compras.filter((c) => !["comprado", "cancelado"].includes(c.status) && swmMatches(c)).map(swmCompraCard).join("") || `<p style="color:#5f5866;font-size:14px;">No hay compras activas.</p>`;
    } else if (swmTab === "envios") {
      html = swmData.envios.filter((e) => !["entregado", "cancelado"].includes(e.status) && swmMatches(e)).map(swmEnvioCard).join("") || `<p style="color:#5f5866;font-size:14px;">No hay envíos activos.</p>`;
    } else {
      html = sec("Envíos", swmData.envios.filter((e) => ["entregado", "cancelado"].includes(e.status) && swmMatches(e)), swmEnvioCard)
        + sec("Compras", swmData.compras.filter((c) => ["comprado", "cancelado"].includes(c.status) && swmMatches(c)), swmCompraCard)
        + sec("Paquetes", P.filter((p) => ["en_envio", "enviado", "entregado", "cancelado"].includes(p.status) && swmMatches(p)), swmPaqueteCard)
        || `<p style="color:#5f5866;font-size:14px;">Todavía no hay historial.</p>`;
    }
    document.getElementById("swm-empty").style.display = "none";
    document.getElementById("swm-list").innerHTML = html;
  }

  function swmWho(r) {
    const wa = waLinkFromPhone(r.phone);
    const cas = r.email && swmData.casilleros && swmData.casilleros[r.email];
    return `${cas ? `<b>${escapeHtml(cas)}</b> · ` : ""}${escapeHtml(r.name || r.email)} · ${escapeHtml(r.email)}${r.phone ? ` · ${escapeHtml(r.phone)}` : ""}${wa ? ` · <a href="${wa}" target="_blank" rel="noopener">WhatsApp</a>` : ""}`;
  }
  const swmPillA = (t, cls = "") => `<span class="swm-pill ${cls}">${t}</span>`;
  const swmCancelBtn = (kind, r) => (["cancelado", "entregado", "comprado", "enviado"].includes(r.status) ? "" : `<button type="button" class="btn-secondary" data-swm-cancel="${kind}:${escapeHtml(r.id)}" style="padding:6px 12px;font-size:13px;">Cancelar</button>`);

  function swmPaqueteCard(p) {
    const st = { sin_dueña: "❓ Sin dueña", registrado: "⏳ Por llegar", recibido: p.datosPendientes ? "⚠️ Sin registrar · faltan datos" : "📥 En almacén", en_envio: "📦 En un envío", enviado: "🚚 Enviado", entregado: "🎁 Entregado", cancelado: "❌ Cancelado" }[p.status] || p.status;
    const hasta = p.receivedAt ? new Date(new Date(p.receivedAt).getTime() + swmData.almacenajeDias * 864e5) : null;
    const vence = hasta ? Math.ceil((hasta - Date.now()) / 864e5) : null;
    const fotos = (p.fotos || []).map((f) => `<button type="button" class="btn-secondary" data-swm-file="foto/${escapeHtml(f)}" style="padding:4px 10px;font-size:12px;">📷 Foto</button>`).join(" ");
    const editable = ["registrado", "recibido"].includes(p.status);
    const sinDuena = p.status === "sin_dueña";
    const diasAqui = p.receivedAt ? Math.floor((Date.now() - new Date(p.receivedAt)) / 864e5) : 0;
    const limite = swmData.diasSinDuena || 7;
    return `<div class="swm-card" data-swm-id="${escapeHtml(p.id)}" data-kind="paquete">
      <h4><span>${escapeHtml(p.folio)} · ${escapeHtml(p.tienda || "Paquete")}${p.rastreo ? ` · ${escapeHtml(p.rastreo)}` : ""}</span>${swmPillA(st, ["registrado", "sin_dueña"].includes(p.status) || p.datosPendientes ? "new" : "")}</h4>
      ${sinDuena ? `<div class="meta">Etiqueta: <b>${escapeHtml(p.etiqueta || "—")}</b> · ${p.cobrable || "?"} kg · llegó ${swmFecha(p.receivedAt)} · <b style="color:${diasAqui >= limite ? "#b33660" : "inherit"}">${diasAqui} día${diasAqui === 1 ? "" : "s"}${diasAqui >= limite ? ` (ya pasaron ${limite}: puedes disponer de él)` : ` de ${limite}`}</b></div>
      <div class="grid" style="grid-template-columns:1fr auto;align-items:end;"><label>Buscar a la dueña (nombre, correo o teléfono)<input data-swm-buscar type="search" placeholder="Ej. Ana López"></label></div>
      <div data-swm-resultados style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;"></div>
      <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">${fotosHtml(p)}<button type="button" class="btn-secondary" data-swm-cancel="paquete:${escapeHtml(p.id)}" style="padding:6px 12px;font-size:13px;">Ya dispuse de él</button></div>
    </div>` : ""}${sinDuena ? "" : `
      <div class="meta">${swmWho(p)}<br>${p.origen === "sin_registro" ? `⚠️ Llegó sin registrar (cargo ${formatPrice(p.cargoSinRegistro || 0)})${p.datosPendientes ? " · <b>ella todavía no dice qué trae</b>" : ""} · ` : ""}${p.origen === "compra" ? "🛍️ De una compra de Mae · " : ""}Cruce ${p.crucePagado ? "ya pagado (15%)" : p.cobro === "comision" ? `15% de US$${Number(p.valorUSD || 0).toFixed(2)}` : "por peso"}${p.contenido ? ` · ${escapeHtml(p.contenido)}` : ""}
        ${p.receivedAt ? `<br>Llegó ${swmFecha(p.receivedAt)} · almacenaje gratis ${vence > 0 ? `${vence} días más` : "<b style='color:#b33660'>vencido</b>"}` : ""}</div>
      ${fotos ? `<div style="margin-top:6px;">${fotos}</div>` : ""}`}
      ${editable ? `<div class="grid">
        <label>Peso (kg)<input data-f="kg" type="number" step="0.01" min="0" value="${p.kg || ""}"></label>
        <label>Alto (cm)<input data-f="alto" type="number" min="0" value="${p.alto || ""}"></label>
        <label>Ancho (cm)<input data-f="ancho" type="number" min="0" value="${p.ancho || ""}"></label>
        <label>Largo (cm)<input data-f="largo" type="number" min="0" value="${p.largo || ""}"></label>
      </div>
      <div class="meta" data-swm-calc>${p.cobrable ? `Peso cobrado: ${p.cobrable} kg${p.cobro === "peso" && !p.crucePagado ? ` → cruce ${formatPrice(swmCrucePeso(p.cobrable))}` : ""}` : ""}</div>
      <div class="grid" style="grid-template-columns:1fr 1fr;">
        <label>Fotos (opcional)<input data-f="fotos" type="file" accept="image/*" multiple></label>
        <label>Nota para la clienta<input data-f="notaClienta" type="text" value="${escapeHtml(p.notaClienta || "")}"></label>
      </div>
      <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
        ${p.status === "registrado" ? `<button type="button" class="btn-primary" data-swm-recibir>📥 Marcar como recibido (y avisarle)</button>` : `<button type="button" class="btn-primary" data-swm-recibir>Guardar peso / fotos</button>`}
        ${swmCancelBtn("paquete", p)}
      </div>` : ""}
    ${sinDuena ? "" : "</div>"}`;
  }

  function fotosHtml(p) {
    return (p.fotos || []).map((f) => `<button type="button" class="btn-secondary" data-swm-file="foto/${escapeHtml(f)}" style="padding:6px 12px;font-size:13px;">📷 Foto</button>`).join("");
  }

  function swmSinRegistroForm() {
    return `<div class="swm-card" data-swm-sinreg>
      <h4><span>📦 Llegó un paquete sin registrar</span></h4>
      <div class="meta">Busca primero en "Por llegar" por el rastreo: si ya lo registró, márcalo ahí como recibido. Si no aparece, regístralo aquí; se le cobra ${formatPrice(swmData.cargoSinRegistro || 80)} y le llega un correo para que diga qué trae. Si no sabes de quién es, déjalo sin dueña (tienes ${swmData.diasSinDuena || 7} días antes de disponer de él).</div>
      <div class="grid">
        <label>Nombre o número de casillero en la etiqueta (ALP-…)<input data-g="etiqueta" type="text"></label>
        <label>Tienda<input data-g="tienda" type="text"></label>
        <label>Rastreo<input data-g="rastreo" type="text"></label>
      </div>
      <div class="grid"><label>Buscar a la dueña (número ALP-…, nombre, correo o teléfono)<input data-swm-buscar type="search" placeholder="Opcional"></label></div>
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
      ${r.pago.status === "revision" ? `${r.pago.comprobanteAt ? `<button type="button" class="btn-secondary" data-swm-file="comprobante/${kind}/${escapeHtml(r.id)}" style="padding:4px 10px;font-size:13px;">📄 Ver comprobante</button>` : ""}
        <button type="button" class="btn-primary" data-swm-aprobar="${kind}:${escapeHtml(r.id)}" style="padding:6px 12px;font-size:13px;">✅ Aprobar pago</button>
        <button type="button" class="btn-secondary" data-swm-rechazar="${kind}:${escapeHtml(r.id)}" style="padding:6px 12px;font-size:13px;">Rechazar</button>` : ""}
    </div>`;
  }

  function swmCompraCard(c) {
    const st = { solicitud: "🆕 Por cotizar", cotizado: "💳 Cotizada", pagado: "✅ Pagada · hay que comprar", comprado: "🛍️ Comprada", cancelado: "❌ Cancelada" }[c.status] || c.status;
    const q = c.cotizacion;
    let action = "";
    if (c.status === "solicitud" || (c.status === "cotizado" && (!c.pago || c.pago.status === "pendiente"))) {
      action = `<div class="grid">
          <label>Productos (MXN, con tax y envío dentro de EE.UU.)<input data-f="productos" type="number" step="0.01" min="0" value="${q ? q.productos : ""}"></label>
          ${c.cobro === "comision" ? `<label>Cruce 15% (vacío = automático)<input data-f="cruce" type="number" step="0.01" min="0" value="" placeholder="${q ? q.cruce : ""}"></label>` : ""}
          <label>Nota para la clienta<input data-f="notaClienta" type="text" value="${escapeHtml(c.notaClienta || "")}"></label>
        </div>
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;"><button type="button" class="btn-primary" data-swm-cotizar-compra>${c.status === "cotizado" ? "Actualizar cotización" : "Mandar cotización"}</button>${swmCancelBtn("compra", c)}</div>`;
    } else if (c.status === "pagado") {
      action = `<div style="margin-top:10px;font-size:13px;font-weight:600;">Ya compré: ¿qué paquetes van a llegar?</div>
        <div data-swm-pkgs><div class="grid" data-swm-pkg><label>Tienda<input data-k="tienda" type="text"></label><label>Rastreo<input data-k="rastreo" type="text"></label><label>Contenido<input data-k="contenido" type="text"></label></div></div>
        <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;"><button type="button" class="btn-secondary" data-swm-add-pkg style="padding:6px 12px;font-size:13px;">+ Otro paquete</button><button type="button" class="btn-primary" data-swm-comprada>🛍️ Ya compré (avisarle)</button></div>`;
    }
    return `<div class="swm-card" data-swm-id="${escapeHtml(c.id)}" data-kind="compra">
      <h4><span>${escapeHtml(c.folio)} · Compra por ella</span>${swmPillA(st, ["solicitud", "pagado"].includes(c.status) ? "new" : "")}</h4>
      <div class="meta">${swmWho(c)} · ${swmFecha(c.createdAt)}<br>Cruce ${c.cobro === "comision" ? "15% (se cobra con la compra)" : "por peso (se cobra al enviar)"}</div>
      <div style="margin-top:8px;font-size:13px;white-space:pre-wrap;word-break:break-all;background:#faf7fb;border-radius:8px;padding:8px;">${escapeHtml(c.links)}</div>
      ${c.notas ? `<div class="meta">📝 ${escapeHtml(c.notas)}</div>` : ""}
      ${q ? `<div class="meta">Cotización: productos ${formatPrice(q.productos)}${q.cruce ? ` + cruce ${formatPrice(q.cruce)}` : ""} = <b>${formatPrice(q.total)}</b></div>` : ""}
      ${swmPagoBox("compra", c)}${action}
    </div>`;
  }

  function swmEnvioCard(e) {
    const st = { solicitado: "🆕 Por cotizar", cotizado: "💳 Cotizado", pagado: "✅ Pagado · hay que mandar", enviado: "🚚 Enviado", entregado: "🎁 Entregado", cancelado: "❌ Cancelado" }[e.status] || e.status;
    const pk = (e.paqueteIds || []).map((id) => swmData.paquetes.find((p) => p.id === id)).filter(Boolean);
    const d = e.direccion || {};
    const q = e.cotizacion; const sug = e.sugerido || {};
    let action = "";
    if (e.status === "solicitado" || (e.status === "cotizado" && (!e.pago || e.pago.status === "pendiente"))) {
      action = `<div class="grid">
          <label>Envío nacional (MXN)<input data-f="envio" type="number" step="0.01" min="0" value="${q ? q.envio : ""}"></label>
          <label>Cruce (vacío = ${formatPrice(sug.cruce || 0)})<input data-f="cruce" type="number" step="0.01" min="0" placeholder="${sug.cruce || 0}"></label>
          <label>Consolidación (vacío = ${formatPrice(sug.consolidacion || 0)})<input data-f="consolidacion" type="number" step="0.01" min="0" placeholder="${sug.consolidacion || 0}"></label>
          ${sug.sinRegistro ? `<label>Cargo sin registrar (vacío = ${formatPrice(sug.sinRegistro)})<input data-f="sinRegistro" type="number" step="0.01" min="0" placeholder="${sug.sinRegistro}"></label>` : ""}
          <label>Nota para la clienta<input data-f="notaClienta" type="text" value="${escapeHtml(e.notaClienta || "")}"></label>
        </div>
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;"><button type="button" class="btn-primary" data-swm-cotizar-envio>${e.status === "cotizado" ? "Actualizar cotización" : "Mandar cotización"}</button>${swmCancelBtn("envio", e)}</div>`;
    } else if (e.status === "pagado") {
      action = `<div class="grid"><label>Paquetería<input data-f="paqueteria" type="text" value="${escapeHtml(e.paqueteria || "Estafeta")}"></label><label>Número de guía<input data-f="guia" type="text" value="${escapeHtml(e.guia || "")}"></label></div>
        <div style="display:flex;gap:8px;margin-top:10px;"><button type="button" class="btn-primary" data-swm-enviado>🚚 Marcar enviado (mandarle la guía)</button></div>`;
    } else if (e.status === "enviado") {
      action = `<div style="display:flex;gap:8px;margin-top:10px;"><button type="button" class="btn-secondary" data-swm-entregado>🎁 Marcar entregado</button></div>`;
    }
    return `<div class="swm-card" data-swm-id="${escapeHtml(e.id)}" data-kind="envio">
      <h4><span>${escapeHtml(e.folio)} · Envío a México</span>${swmPillA(st, ["solicitado", "pagado"].includes(e.status) ? "new" : "")}</h4>
      <div class="meta">${swmWho(e)} · ${swmFecha(e.createdAt)}${e.consolidar ? " · <b>consolidar</b>" : ""}</div>
      <ul style="margin:8px 0 0;padding-left:18px;font-size:14px;">${pk.map((p) => `<li>${escapeHtml(p.folio)} · ${escapeHtml(p.tienda || "")} · ${p.cobrable || "?"} kg · cruce ${p.crucePagado ? "ya pagado" : p.cobro === "comision" ? "15%" : "por peso"}</li>`).join("")}</ul>
      <div class="meta">📍 ${escapeHtml([d.nombre, d.telefono, d.calle, d.colonia, d.ciudad, d.estado, d.cp].filter(Boolean).join(", "))}${d.referencias ? ` (${escapeHtml(d.referencias)})` : ""}</div>
      <div class="meta">Sugerido: cruce ${formatPrice(sug.cruce || 0)}${sug.consolidacion ? ` + consolidación ${formatPrice(sug.consolidacion)}` : ""}${sug.sinRegistro ? ` + sin registrar ${formatPrice(sug.sinRegistro)}` : ""} · ${sug.kg || 0} kg en total</div>
      ${q ? `<div class="meta">Cotización: cruce ${formatPrice(q.cruce)}${q.consolidacion ? ` + consolidación ${formatPrice(q.consolidacion)}` : ""}${q.sinRegistro ? ` + sin registrar ${formatPrice(q.sinRegistro)}` : ""} + envío ${formatPrice(q.envio)} = <b>${formatPrice(q.total)}</b></div>` : ""}
      ${e.guia ? `<div class="meta">🚚 ${escapeHtml(e.paqueteria)} · ${escapeHtml(e.guia)}</div>` : ""}
      ${swmPagoBox("envio", e)}${action}
    </div>`;
  }

  /* Achica fotos del celular antes de subirlas (máx. 1600 px, JPEG). */
  function swmResize(file) {
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

  async function swmOpenFile(key) {
    const w = window.open("", "_blank");
    try {
      const res = await fetch(`/.netlify/functions/admin-swm?archivo=${encodeURIComponent(key)}`, { headers: { "x-admin-key": adminKey } });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const url = URL.createObjectURL(await res.blob());
      if (w) w.location.href = url; else window.location.href = url;
    } catch (err) {
      if (w) w.close();
      alert("No se pudo abrir el archivo.");
    }
  }

  document.getElementById("swm-panel").addEventListener("click", async (e) => {
    const t = e.target;
    const tab = t.closest("[data-swm-tab]");
    if (tab) { swmTab = tab.dataset.swmTab; renderSwmAdmin(); return; }
    if (t.closest("[data-swm-sinreg-toggle]")) {
      swmSinRegistroOpen = !swmSinRegistroOpen;
      document.getElementById("swm-sinreg-box").innerHTML = swmSinRegistroOpen ? swmSinRegistroForm() : "";
      return;
    }
    const pick = t.closest("[data-swm-pick-email]");
    if (pick) {
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
    const ap = t.closest("[data-swm-aprobar]");
    if (ap) { const [kind, id] = ap.dataset.swmAprobar.split(":"); if (confirm("¿Ya verificaste que el dinero llegó a tu cuenta?")) swmAct({ accion: "aprobar_pago", kind, id }, ap); return; }
    const re = t.closest("[data-swm-rechazar]");
    if (re) { const [kind, id] = re.dataset.swmRechazar.split(":"); const motivo = prompt("¿Por qué lo rechazas? (se lo mandamos a la clienta)", "No encontramos tu transferencia, revisa el comprobante."); if (motivo != null) swmAct({ accion: "rechazar_pago", kind, id, motivo }, re); return; }
    const ca = t.closest("[data-swm-cancel]");
    if (ca) { const [kind, id] = ca.dataset.swmCancel.split(":"); const motivo = prompt("¿Cancelar? Escribe el motivo para la clienta (o deja vacío):", ""); if (motivo != null) swmAct({ accion: "cancelar", kind, id, motivo }, ca); return; }
    const add = t.closest("[data-swm-add-pkg]");
    if (add) {
      const box = add.closest(".swm-card").querySelector("[data-swm-pkgs]");
      const clone = box.querySelector("[data-swm-pkg]").cloneNode(true);
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
      swmAct({ accion: "recibir_paquete", id, kg: v("kg"), alto: v("alto"), ancho: v("ancho"), largo: v("largo"), notaClienta: v("notaClienta"), fotos }, btn);
    } else if (t.closest("[data-swm-cotizar-compra]")) {
      if (!(parseFloat(v("productos")) > 0)) { alert("Pon el costo de los productos."); return; }
      swmAct({ accion: "cotizar_compra", id, productos: v("productos"), cruce: v("cruce"), notaClienta: v("notaClienta") }, btn);
    } else if (t.closest("[data-swm-comprada]")) {
      const paquetes = [...card.querySelectorAll("[data-swm-pkg]")].map((row) => Object.fromEntries([...row.querySelectorAll("[data-k]")].map((i) => [i.dataset.k, i.value])));
      swmAct({ accion: "compra_comprada", id, paquetes }, btn);
    } else if (t.closest("[data-swm-cotizar-envio]")) {
      if (v("envio") === "") { alert("Pon el costo del envío nacional."); return; }
      swmAct({ accion: "cotizar_envio", id, envio: v("envio"), cruce: v("cruce"), consolidacion: v("consolidacion"), sinRegistro: v("sinRegistro"), notaClienta: v("notaClienta") }, btn);
    } else if (t.closest("[data-swm-enviado]")) {
      if (!v("guia")) { alert("Pon el número de guía."); return; }
      swmAct({ accion: "marcar_enviado", id, paqueteria: v("paqueteria"), guia: v("guia") }, btn);
    } else if (t.closest("[data-swm-entregado]")) {
      swmAct({ accion: "marcar_entregado", id }, btn);
    }
  });

  let swmBuscarTimer = null;
  document.getElementById("swm-panel").addEventListener("input", (e) => {
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
    card.querySelector("[data-swm-calc]").textContent = kg ? `Se cobran ${kg} kg${p.cobro === "peso" && !p.crucePagado ? ` → cruce ${formatPrice(swmCrucePeso(kg))}` : ""}` : "";
  });

  const VIEWS = {
    inicio: { el: "home-view", title: "🌸 Inicio", nav: "inicio" },
    compras: { el: "abw-view", title: "🛍️ Compras ABW", nav: "inicio" },
    pedidos: { el: "orders-view", title: "🧾 Pedidos", display: "block" },
    clientas: { el: "clients-view", title: "👩 Clientas" },
    catalogo: { el: "catalog-view", title: "🏷️ Catálogo" },
    inventario: { el: "inventory-panel", title: "📦 Stock en México" },
    mas: { el: "more-view", title: "☰ Más", display: "grid" },
    restock: { el: "restock-requests-panel", title: "🔔 Avisos de restock", nav: "mas" },
    resenas: { el: "reviews-panel", title: "⭐ Reseñas", nav: "mas" },
    usa: { el: "usa-orders-panel", title: "🛍️ Encargos USA", nav: "mas" },
    swm: { el: "swm-panel", title: "🇺🇸 Shop with Mae", nav: "mas" },
    ajustes: { el: "settings-view", title: "⚙️ Ajustes", nav: "mas" },
    papelera: { el: "trash-view", title: "🗑️ Papelera", nav: "mas" },
  };
  let currentView = "inicio";

  function showView(view) {
    if (!VIEWS[view]) view = "pedidos";
    if (currentView === "usa" && view !== "usa") {
      closeUsaClientForm();
      closeUsaClientDetailView();
    }
    currentView = view;
    Object.entries(VIEWS).forEach(([key, v]) => {
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
    if (view === "inicio") renderHome();
    if (view === "compras") renderAbw();
    if (view === "clientas") renderClients();
    if (view === "catalogo") renderCatalogList();
    if (view === "ajustes") loadSettings();
    if (view === "papelera") loadTrash();
    if (view === "mas") renderNotifyToggle();
    if (view !== "catalogo" && catalogEditing) closeCatalogEditor();
    if (view === "inventario" && !inventoryLoaded) loadInventory();
    if (view === "restock" && !restockRequestsLoaded) loadRestockRequests();
    if (view === "resenas" && !reviewsLoaded) loadReviews();
    if (view === "usa" && !usaClientsLoaded) loadUsaClients();
    if (view === "swm") { renderSwmAdmin(); loadSwm(); }
    window.scrollTo({ top: 0 });
  }

  function setLoggedInUI(on) {
    loginBox.style.display = on ? "none" : "block";
    toolbar.style.display = on ? "flex" : "none";
    document.getElementById("logout-btn").style.display = on ? "inline-flex" : "none";
    if (on) { showView("inicio"); startPolling(); loadSwm({ quiet: true }); }
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
    else if (go === "restock") showView("restock");
    else goToOrders(go);
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

  document.getElementById("more-view").addEventListener("click", (e) => {
    const b = e.target.closest("[data-goto]");
    if (b) showView(b.dataset.goto);
  });
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
      sw.querySelectorAll("button").forEach((x) => { x.className = x === d ? (d.dataset.disp === "SI" ? "on-si" : "on-no") : ""; });
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
  }
