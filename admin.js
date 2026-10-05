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

  let allOrders = [];
  let filteredOrders = [];
  let currentStatus = "";
  let currentRange = "all";
  // Lo que hay escrito en el buscador (ya en minúsculas), para resaltar en
  // amarillo el producto que coincide dentro de cada pedido -- si no, con
  // pedidos de muchos artículos es difícil ver cuál fue el que hizo match.
  let currentSearchTerm = "";

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
        if (CARD_PCT_KEY_ALIASES.includes(key)) {
          const num = parseFloat((r[1] || "").replace(/[^0-9.,-]/g, "").replace(",", "."));
          if (!Number.isNaN(num)) cardSurchargePct = num;
        }
      }
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
      skuToInfo.set(sku, {
        marca: marca || prev.marca || "",
        precio: precio || prev.precio || 0,
        peso: peso || prev.peso || 0,
      });

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
    if (results[0].status === "fulfilled" && results[0].value) addSkuInfoFromCSV(results[0].value, { isStock: false });
    if (results[1].status === "fulfilled" && results[1].value) addSkuInfoFromCSV(results[1].value, { isStock: true });
    // Ya con el mapa listo, se vuelve a pintar lo que esté en pantalla
    // para que los pedidos viejos (sin marca/precio base guardados) los
    // muestren.
    if (allOrders.length) {
      applyFilters();
    }
  }

  const STATUS_TAB_COLORS = {
    "": "#e07a8f",
    paid: "#2fa968",
    pending: "#f0ad4e",
    cancelled: "#999999",
    failed: "#d9534f",
  };

  const STATUS_BORDER_COLORS = {
    pending: "#f0ad4e",
    paid: "#2fa968",
    cancelled: "#bbbbbb",
    failed: "#d9534f",
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
      filtersEl.style.display = "flex";
      applyFilters();
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
      search ? pendingOrders.filter((o) => matchesSearch(o, search)) : pendingOrders,
      Boolean(search) && pendingOrders.length > 0
    );

    renderHistory(filteredOrders);
    const total = allOrders.length;
    filterCountEl.textContent = filteredOrders.length === total
      ? `${total} pedido${total === 1 ? "" : "s"}`
      : `${filteredOrders.length} de ${total} pedidos`;
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

  function renderHistory(orders) {
    historyTitleEl.style.display = "block";
    if (!orders.length) {
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
      ? "⚠️ Este pedido está PAGADO. ¿Seguro que lo quieres borrar? No se puede deshacer."
      : "¿Borrar este pedido cancelado? No se puede deshacer.";
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
      fetchOrders();
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
      } else {
        if (waWindow) waWindow.close();
        setStatus("Guía guardada, pero el pedido no tiene teléfono para avisar por WhatsApp.");
      }

      setStatus("");
      fetchOrders();
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
          <span style="font-size:11px;color:#999;">(${providerBadge[r.provider] || r.provider})</span>
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

      setStatus("");
      fetchOrders();
    } catch (err) {
      if (waWindow) waWindow.close();
      errorEl.textContent = "No se pudo conectar con el servidor.";
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }

  const STATUS_LABELS = {
    pending: "⏳ Pendiente",
    paid: "✅ Pagado",
    cancelled: "✕ Cancelado",
    failed: "⚠️ Falló",
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
        ${hasAddress ? `<button type="button" class="btn-secondary" data-copy-address="${o.id}" style="margin-top:8px;padding:6px 14px;font-size:12px;">📋 Copiar dirección</button>` : ""}
      </div>`;
  }

  function proofLinkHTML(o) {
    if (!o.hasPaymentProof) return "";
    return `<div style="margin-top:8px;"><button type="button" data-view-proof="${o.id}" style="font-size:12px;font-weight:700;color:#0b6bc2;text-decoration:none;background:none;border:none;padding:0;cursor:pointer;">📎 Ver comprobante de pago</button></div>`;
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
          <textarea readonly id="supplier-prompt-text-${o.id}" rows="12" style="width:100%;font-family:monospace;font-size:12px;padding:8px;box-sizing:border-box;"></textarea>
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

  function openProofViewer(blobUrl) {
    currentProofBlobUrl = blobUrl;
    document.getElementById("proof-viewer-frame").src = blobUrl;
    document.getElementById("proof-viewer-overlay").style.display = "flex";
  }

  function closeProofViewer() {
    document.getElementById("proof-viewer-overlay").style.display = "none";
    document.getElementById("proof-viewer-frame").src = "about:blank";
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
      openProofViewer(URL.createObjectURL(blob));
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
          <input type="text" placeholder="Número de guía" data-tracking-number="${o.id}" value="${escapeHtml(o.trackingNumber || "")}" />
          <input type="text" placeholder="Paquetería (opcional)" data-tracking-carrier="${o.id}" value="${escapeHtml(o.carrier || "")}" />
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
            <input type="number" step="0.1" min="0.1" placeholder="Ej. 1.5" list="weight-presets" data-guide-weight="${o.id}" />
            <button type="button" class="btn-secondary" data-guide-quote="${o.id}">💲 Cotizar y comparar</button>
          </div>
          <label class="field-label">Datos del destinatario (revísalos antes de generar)</label>
          <div class="row">
            <input type="text" placeholder="Nombre" value="${escapeHtml(c.name || "")}" data-guide-name="${o.id}" />
            <input type="text" placeholder="Teléfono" value="${escapeHtml(c.phone || "")}" data-guide-phone="${o.id}" />
          </div>
          <div class="row">
            <input type="text" placeholder="Calle" value="${escapeHtml(c.street || "")}" data-guide-street="${o.id}" />
            <input type="text" placeholder="No. ext." data-guide-ext="${o.id}" />
            <input type="text" placeholder="No. int. (opcional)" data-guide-int="${o.id}" />
          </div>
          <div class="row">
            <input type="text" placeholder="Colonia" value="${escapeHtml(c.colonia || "")}" data-guide-neighborhood="${o.id}" />
            <input type="text" placeholder="Código postal" value="${escapeHtml(c.cp || "")}" data-guide-zip="${o.id}" />
          </div>
          <div class="row">
            <input type="text" placeholder="Municipio/Alcaldía" value="${escapeHtml(c.municipio || "")}" data-guide-city="${o.id}" />
            <input type="text" placeholder="Estado" value="${escapeHtml(c.estado || "")}" data-guide-state="${o.id}" />
          </div>
          <input type="text" placeholder="Referencias" value="${escapeHtml(c.referencias || "")}" data-guide-references="${o.id}" />
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
        <input type="text" class="edit-item-nombre" placeholder="Nombre del producto" value="${escapeHtml((it && it.nombre) || "")}" />
        <input type="text" class="edit-item-marca" placeholder="Marca" value="${escapeHtml(it ? itemMarca(it) : "")}" />
        <input type="text" class="edit-item-sku" placeholder="SKU" value="${escapeHtml((it && it.sku) || "")}" />
        <input type="number" class="edit-item-qty" min="1" step="1" value="${it ? it.qty : 1}" placeholder="Cant." />
        <input type="number" class="edit-item-precio" min="0" step="1" value="${precio}" placeholder="Precio (transf.) c/u" />
        <label class="edit-stock-label"><input type="checkbox" class="edit-item-enstock" ${it && it.enStock ? "checked" : ""} /> en stock</label>
        <button type="button" class="btn-danger edit-item-remove">✕</button>
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

  function historyCardHTML(o) {
    const statusLabel = STATUS_LABELS[o.status] || o.status;
    const borderColor = STATUS_BORDER_COLORS[o.status] || "#ddd";
    const deleteBtn = (o.status === "cancelled" || o.status === "paid")
      ? `<div class="actions"><button type="button" class="btn-danger" data-delete="${o.id}">🗑️ Borrar este pedido</button></div>`
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
    return `
      <div class="order-card" style="border-left-color:${borderColor};">
        <div class="top">
          <span>
            <span class="badge ${o.source}">${sourceLabel(o)}</span>
            <span class="badge status-${o.status}">${statusLabel}</span>
          </span>
          <span class="fecha">#${orderNumber(o)} · ${formatFecha(o.createdAt)}</span>
        </div>
        <ul>${itemsListHTML(o)}</ul>
        ${totalsBreakdownHTML(o)}
        <div class="total">${formatPrice(o.grandTotal)}</div>
        ${customerHTML(o)}
        ${proofLinkHTML(o)}
        ${trackingBlockHTML(o)}
        ${guideBlockHTML(o)}
        ${editBlock}
        ${supplierBlock}
        ${supplierNote}
        ${deleteBtn}
      </div>`;
  }

  function pendingCardHTML(o) {
    const borderColor = STATUS_BORDER_COLORS[o.status] || "#f0ad4e";
    return `
      <div class="order-card" style="border-left-color:${borderColor};">
        <div class="top">
          <span class="badge ${o.source}">${sourceLabel(o)} · esperando</span>
          <span class="fecha">#${orderNumber(o)} · ${formatFecha(o.createdAt)}</span>
        </div>
        <ul>${itemsListHTML(o)}</ul>
        ${totalsBreakdownHTML(o)}
        <div class="total">${formatPrice(o.grandTotal)}</div>
        ${customerHTML(o)}
        ${proofLinkHTML(o)}
        ${editBlockHTML(o)}
        ${supplierPromptBlockHTML(o)}
        ${supplierNoteBlockHTML(o)}
        <div class="actions">
          <button class="btn-primary" data-confirm="${o.id}" title="Esto resta las piezas vendidas del stock automáticamente">✅ Ya me pagó</button>
          <button class="btn-danger" data-cancel="${o.id}">✕ No pagó / Cancelar</button>
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
        <button type="button" class="btn-danger tono-remove">✕</button>
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

  function toggleInventoryPanel() {
    const panel = document.getElementById("inventory-panel");
    const opening = panel.style.display === "none";
    panel.style.display = opening ? "flex" : "none";
    if (opening && !inventoryLoaded) loadInventory();
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
          <input type="text" class="inv-nombre" value="${escapeHtml(p.nombre)}" placeholder="Nombre" />
          <input type="text" class="inv-marca" value="${escapeHtml(p.marca)}" placeholder="Marca" style="flex:1 1 110px;min-width:90px;" />
          <span class="inv-sku">SKU: ${escapeHtml(p.sku)}</span>
        </div>
        <input type="text" class="inv-imagen" value="${escapeHtml(p.imagen)}" placeholder="Link de la foto" />
        <div class="inv-fields">
          <div class="inventory-qty">
            <button type="button" class="inv-qty-dec" title="Restar 1">−</button>
            <input type="number" class="inv-piezas" value="${p.piezas}" min="0" step="1" title="Piezas disponibles" />
            <button type="button" class="inv-qty-inc" title="Sumar 1">+</button>
          </div>
          <input type="number" class="inv-precio" value="${p.precio || ""}" min="0" step="1" placeholder="Precio MXN" title="Precio transferencia (MXN)" />
          <input type="number" class="inv-precio-tarjeta" value="${p.precioTarjeta || ""}" min="0" step="1" placeholder="Precio tarjeta" title="Precio tarjeta (MXN)" />
          <input type="text" class="inv-categoria" value="${escapeHtml(p.categoria)}" placeholder="Categoría" />
          <input type="number" class="inv-peso" value="${p.peso || ""}" min="0" step="0.01" placeholder="Peso (kg)" title="Peso en kg" />
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

  function toggleRestockPanel() {
    const panel = document.getElementById("restock-requests-panel");
    const opening = panel.style.display === "none";
    panel.style.display = opening ? "flex" : "none";
    if (opening && !restockRequestsLoaded) loadRestockRequests();
  }

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

    badgeEl.textContent = requests.length ? ` (${requests.length})` : "";
    badgeEl.style.display = requests.length ? "inline" : "none";

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
            ${waLink ? `<a class="btn-primary" style="text-decoration:none;display:inline-flex;align-items:center;" href="${escapeHtml(waLink)}" target="_blank" rel="noopener">💬 WhatsApp</a>` : ""}
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

  function toggleReviewsPanel() {
    const panel = document.getElementById("reviews-panel");
    const opening = panel.style.display === "none";
    panel.style.display = opening ? "flex" : "none";
    if (opening && !reviewsLoaded) loadReviews();
  }

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

  function toggleUsaOrdersPanel() {
    const panel = document.getElementById("usa-orders-panel");
    const opening = panel.style.display === "none";
    panel.style.display = opening ? "flex" : "none";
    if (!opening) {
      closeUsaClientForm();
      closeUsaClientDetailView();
    }
    if (opening && !usaClientsLoaded) loadUsaClients();
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
    badgeEl.textContent = pendientesTotal ? ` (${pendientesTotal})` : "";
    badgeEl.style.display = pendientesTotal ? "inline" : "none";

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
          <p style="font-size:13px;color:#888;margin:8px 0 0;">${escapeHtml(usaClientPedidoSummary(c))}</p>
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
      ${c.notas ? `<p style="font-size:13px;color:#777;margin:6px 0 0;">📝 ${escapeHtml(c.notas)}</p>` : ""}
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
          ${detalles.length ? `<p style="font-size:13px;color:#888;margin:4px 0 0;">${detalles.join(" · ")}</p>` : ""}
          ${p.link ? `<p style="font-size:13px;margin:4px 0 0;"><a href="${escapeHtml(p.link)}" target="_blank" rel="noopener" style="color:#0b6bc2;">🔗 Ver producto</a></p>` : ""}
          ${p.notas ? `<p style="font-size:13px;color:#777;margin:6px 0 0;">📝 ${escapeHtml(p.notas)}</p>` : ""}
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

  function escapeAttr(str) {
    return String(str ?? "").replace(/[^0-9+]/g, "");
  }

  async function confirmOrCancel(orderId, action) {
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
    loginBox.style.display = "none";
    toolbar.style.display = "flex";
    fetchOrders();
    loadSkuMarcaMap();
    loadCardSurchargePct();
  }

  function resetTabs() {
    currentStatus = "";
    currentRange = "all";
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
  }

  function logout() {
    adminKey = "";
    sessionStorage.removeItem(KEY_STORAGE);
    loginBox.style.display = "block";
    toolbar.style.display = "none";
    ordersEl.innerHTML = "";
    emptyEl.style.display = "none";
    historyEl.innerHTML = "";
    historyEmptyEl.style.display = "none";
    historyTitleEl.style.display = "none";
    filtersEl.style.display = "none";
    allOrders = [];
    filteredOrders = [];
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
  document.getElementById("logout-btn").addEventListener("click", logout);
  document.getElementById("export-btn").addEventListener("click", exportCSV);
  document.getElementById("add-stock-toggle").addEventListener("click", toggleAddStockForm);
  document.getElementById("stock-add-submit").addEventListener("click", submitAddStockProduct);
  document.getElementById("stock-multi-tono-toggle").addEventListener("change", toggleMultiTono);
  document.getElementById("stock-precio").addEventListener("input", autoFillPrecioTarjeta);
  document.getElementById("stock-precio-tarjeta").addEventListener("input", () => { tarjetaManuallyEdited = true; });
  document.getElementById("stock-tono-add-row").addEventListener("click", addTonoRow);
  document.getElementById("inventory-toggle").addEventListener("click", toggleInventoryPanel);
  document.getElementById("inventory-search").addEventListener("input", (e) => {
    inventorySearchTerm = e.target.value;
    renderInventoryList();
  });
  document.getElementById("restock-requests-toggle").addEventListener("click", toggleRestockPanel);
  document.getElementById("reviews-toggle").addEventListener("click", toggleReviewsPanel);
  document.getElementById("usa-orders-toggle").addEventListener("click", toggleUsaOrdersPanel);
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
      renderUsaPedidosList();
    });
  });
  filterSearchEl.addEventListener("input", applyFilters);

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
      applyFilters();
    });
  });

  const savedKey = sessionStorage.getItem(KEY_STORAGE);
  if (savedKey) {
    adminKey = savedKey;
    loginBox.style.display = "none";
    toolbar.style.display = "flex";
    fetchOrders();
    loadSkuMarcaMap();
    loadCardSurchargePct();
  }
