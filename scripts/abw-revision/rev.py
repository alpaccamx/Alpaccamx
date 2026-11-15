"""Revisión de precios y disponibilidad contra Asian Beauty Wholesale (ABW).

La corre GitHub Actions cada día (.github/workflows/revision-abw.yml). En cada
corrida revisa, de la más vieja a la más nueva, las marcas que no se han
revisado en los últimos días, hasta que se acaba el tiempo; así en una semana
se recorre todo el catálogo aunque cada corrida tenga un límite de horas.

- La sesión de ABW (cookies) se lee de /.netlify/functions/admin-abw-sesion y
  al terminar se guarda renovada. ABW pide un código por correo para entrar,
  así que si la sesión caduca la corrida falla y hay que volver a entrar.
- Compara con el Sheet (Precio USD y Disponible) y sube los cambios a
  /.netlify/functions/admin-abw-revision; Mae los aplica desde el admin
  (Más → Revisión ABW). Lo que ABW surte con espera pasa directo a PREORDEN.
- listas.json: (marca normalizada) -> [[pid, nombre]] de los listados de ABW.
  skus.json: SKU del Sheet -> pid de ABW (cuando el SKU no es el pid).

Necesita la variable de entorno ADMIN_KEY. Nunca imprime la clave ni las cookies.
uso: python3 scripts/abw-revision/rev.py [--horas 5] [--dias 6] [MARCA ...]
"""
import csv, datetime, html as H, io, json, os, re, sys, time, urllib.request
from playwright.sync_api import sync_playwright

AQUI = os.path.dirname(os.path.abspath(__file__))
SITIO = "https://alpacca.mx/.netlify/functions"
SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQKHS0v5DGhx8RjW3XOcBxJL4RzNtVof_psSTBs6fZrScYofhRU5nTcEYYBS3u0V-EzMJXR2L5SZcyE/pub?gid=114583060&single=true&output=csv"
PAGES = os.environ.get("ABW_PAGES", os.path.join(AQUI, "pages"))
FRESH_H = 96  # una página bajada hace menos de esto se reutiliza (caché entre corridas)
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
os.makedirs(PAGES, exist_ok=True)
norm = lambda s: re.sub(r"[^a-z0-9]", "", (s or "").lower())
log = lambda *a: print(time.strftime("%H:%M:%S"), *a, flush=True)


class SesionCaducada(Exception):
    pass


def api(path, body=None, timeout=120):
    req = urllib.request.Request(f"{SITIO}/{path}", data=None if body is None else json.dumps(body).encode(),
                                 headers={"x-admin-key": os.environ["ADMIN_KEY"], "Content-Type": "application/json"},
                                 method="GET" if body is None else "POST")
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode() or "{}")


def usd(s):
    s = re.sub(r"[^0-9.]", "", (s or "").replace("&nbsp;", ""))
    return round(float(s), 2) if s else None


def avail(o):
    # Regla de Mae (oct 2026): en stock -> SI; cualquier espera (7-14, 21, 30 días) -> PREORDEN; agotado/descontinuado -> NO
    if not o.get("isSellable"): return "NO"
    a = o.get("availibility") or ""
    if re.search(r"out of|to be determined", a, re.I): return "NO"
    if "in-stock" in a.lower(): return "SI"
    n = [int(x) for x in re.findall(r"\d+", a)]
    return "SI" if not n or max(n) < 7 else "PREORDEN"


# ---------- páginas ----------
def grab(h, key):
    i = h.find(key)
    if i < 0: return None
    try: return json.JSONDecoder().raw_decode(h[i + len(key):])[0]
    except Exception: return None


def parse(h):
    m = re.search(r'<meta property="og:title" content="([^"]*)"', h)
    d = {"og_title": H.unescape(m.group(1)) if m else None, "options": grab(h, '"productOptions":'),
         "loggedIn": '"customer_id":"' in h}
    if d["og_title"] and not d["options"]:
        # Diagnóstico (solo nombres de claves y conteos, nada de la cuenta):
        # qué trae una página que carga pero de la que no salen opciones.
        d["pistas"] = {"len": len(h), "productId": h.count('"productId"'), "productOptions": h.count("productOptions"),
                       "priceColumnContent": h.count("priceColumnContent"), "claves": sorted(set(re.findall(r'"(product[A-Za-z]{2,30})"\s*:', h)))[:15]}
    return d


class Fetcher:
    def __init__(self, state):
        self.p = sync_playwright().start()
        self.b = self.p.chromium.launch()
        self.ctx = self.b.new_context(storage_state=state, user_agent=UA)
        self.delay = 6.0
        self.n = 0

    def page(self, pid):
        f = f"{PAGES}/{pid}.json"
        if os.path.exists(f) and time.time() - os.path.getmtime(f) < FRESH_H * 3600:
            return json.load(open(f))
        for a in range(3):
            try:
                r = self.ctx.request.get(f"https://www.asianbeautywholesale.com/en/x/info.html/pid.{pid}", timeout=90000)
                st = r.status
                if st == 429:
                    self.delay = min(20, self.delay + 2)
                    log("429 de ABW, espero", 60 * 2 ** a, "s"); time.sleep(60 * 2 ** a); continue
                d = parse(r.text()); d["status"] = st; d["pid"] = pid; d["at"] = time.time()
                if st == 200 and not d["loggedIn"]:
                    raise SesionCaducada()
                if st == 200 and d["og_title"] and not d["options"] and a < 1:
                    # Página incompleta (pasa cuando ABW frena las visitas): se
                    # espera y se vuelve a pedir, y así no se guarda en caché.
                    log("página sin opciones, reintento", pid, json.dumps(d.get("pistas")))
                    time.sleep(20); continue
                if d["options"] or st != 200:
                    json.dump(d, open(f, "w"))
                self.n += 1
                time.sleep(self.delay)
                if self.n % 40 == 0 and self.delay > 5: self.delay -= 0.5
                return d
            except SesionCaducada: raise
            except Exception as e:
                log("reintento", pid, str(e)[:80]); time.sleep(10 * (a + 1))
        return None

    def state(self):
        return self.ctx.storage_state()

    def close(self):
        self.b.close(); self.p.stop()


# ---------- datos ----------
def sheet():
    with urllib.request.urlopen(SHEET_URL, timeout=120) as r:
        return list(csv.DictReader(io.StringIO(r.read().decode("utf-8"))))


SIZE = re.compile(r"^\s*\d[\d.,]*\s*(ml|g|mg|kg|l|cm|pcs?|pieces?|sheets?|pads?|ea|sets?|pairs?|packs?|capsules?|tablets?|sticks?|bags?)\b.*$", re.I)
def shade_key(t):
    t = re.sub(r"\s+x\s*\d+\s*$", "", re.sub(r"\s+", " ", t or "")).strip()
    return norm(t)


def revisar(marca, rows, lst, known, F, ocultos=False):
    nb = norm(marca)
    items = lst.get(nb, [])
    pages = {}
    for pid, name in items:
        d = F.page(pid)
        if d: pages[pid] = (name, d)
    opt = {}
    for pid, (name, d) in pages.items():
        for o in d.get("options") or []:
            opt[str(o["productId"])] = o
    # cajas: "<pid pieza>-C<n>" -> opción de la caja
    fam = {}
    for pid, (name, d) in pages.items():
        if "Bulk Box" not in name:
            fam.setdefault(norm(name), []).append(d)
    boxmap = {}
    for pid, (name, d) in pages.items():
        mm = re.match(r"(.*?)\s*\(x\s*(\d+)\)\s*\(Bulk Box\)", name)
        if not mm: continue
        base, q = mm.group(1).strip(), int(mm.group(2))
        pieces = {}
        for fd in fam.get(norm(base), []):
            for o in fd.get("options") or []:
                pieces[shade_key(o["titleOption"])] = str(o["productId"])
        for o in d.get("options") or []:
            pp = pieces.get(shade_key(o["titleOption"])) or (list(pieces.values())[0] if len(pieces) == 1 else None)
            if pp: boxmap[f"{pp}-C{q}"] = o

    # Pieza: su pid de ABW (el SKU, o el mapeo guardado); si no salió en las
    # listas de la marca, se baja su propia página.
    def pid_of(sku):
        if sku in known: return known[sku]
        if sku.isdigit(): return sku
        return None
    cambios, revisados, sin = [], 0, 0
    for r in rows:
        sku = r["SKU"].strip()
        if not sku or sku.startswith("STOCK"): continue
        # OCULTO lo pone Mae a mano (ej. quitar una marca un tiempo): no se toca.
        # En un barrido completo (ocultos=True) sí se revisan, por si se ocultó
        # algo que en realidad sigue en ABW.
        if (r.get("Disponible") or "").strip().upper() == "OCULTO" and not ocultos: continue
        o = None; checked = False
        if "-C" in sku:
            base, q = sku.rsplit("-C", 1)
            bp = pid_of(base) or base
            o = boxmap.get(f"{bp}-C{q}")
            if o is None and known.get(sku):
                kp = known[sku]; o = opt.get(kp)
                if o is None:
                    d = F.page(kp); checked = bool(d and (d.get("status") in (404, 410) or (d.get("status") == 200 and not d.get("og_title"))))
                    for oo in (d or {}).get("options") or []: opt[str(oo["productId"])] = oo
                    o = opt.get(kp)
        else:
            p = pid_of(sku)
            if p:
                o = opt.get(p)
                if o is None:
                    d = F.page(p)
                    # Solo cuenta como "ya no existe" si ABW de verdad no tiene la
                    # página (404/410, o 200 sin título = te manda al inicio). Si
                    # la página carga con su título, el producto SÍ existe aunque
                    # no se hayan podido leer sus opciones: eso queda sin revisar.
                    checked = bool(d and (d.get("status") in (404, 410) or (d.get("status") == 200 and not d.get("og_title"))))
                    for oo in (d or {}).get("options") or []: opt[str(oo["productId"])] = oo
                    o = opt.get(p)
        antes = {"usd": usd(r.get("Precio USD")), "disp": (r.get("Disponible") or "").strip().upper() or "SI"}
        base_c = {"sku": sku, "nombre": r["Nombre"], "presentacion": r.get("Presentacion", "")}
        if o is None and d_dbg(sku, pages, opt):
            pass
        if o is None:
            # Solo un SKU de ABW (número) se puede dar por "ya no existe"; los nuestros (ALTHEA-001…) no.
            if checked and antes["disp"] in ("SI", "PREORDEN") and re.fullmatch(r"\d+", sku.split("-")[0]):
                revisados += 1
                cambios.append({**base_c, "tipo": "no_existe", "antes": antes, "despues": {"usd": None, "disp": "NO"}})
            else:
                sin += 1
            continue
        revisados += 1
        nu, nd = usd(o.get("priceColumnContent")), avail(o)
        if antes["disp"] == "OCULTO":
            # Estaba oculto y sí existe en ABW: se reporta para que Mae decida.
            tipo = {"SI": "disponible", "PREORDEN": "preorden"}.get(nd, "agotado")
            cambios.append({**base_c, "tipo": tipo, "antes": antes, "despues": {"usd": nu, "disp": nd}, "oculto": True})
            continue
        if antes["usd"] is not None and nu is not None and abs(nu - antes["usd"]) >= 0.01:
            cambios.append({**base_c, "tipo": "precio", "antes": antes, "despues": {"usd": nu, "disp": nd}})
        if nd != antes["disp"]:
            cambios.append({**base_c, "tipo": {"SI": "disponible", "PREORDEN": "preorden"}.get(nd, "agotado"), "antes": antes, "despues": {"usd": nu, "disp": nd}})
    # Freno: si una marca sale con muchos "ya no existe", lo más seguro es que
    # ABW cambió su página y no se pudo leer bien (pasó el 13-15 nov: SKIN1004
    # salió con 252 de 262). Esos no se reportan, para no ocultar productos que sí hay.
    ne = [c for c in cambios if c["tipo"] == "no_existe"]
    if len(ne) > max(5, 0.15 * max(revisados, 1)):
        log(f"{marca}: {len(ne)} 'ya no existe' de {revisados} revisados -- parece error de lectura, no se reportan")
        cambios = [c for c in cambios if c["tipo"] != "no_existe"]
        revisados -= len(ne); sin += len(ne)
    return cambios, revisados, sin


_dbg = {"n": 0}
def d_dbg(sku, pages, opt):
    """Diagnóstico: los primeros SKUs que no se encuentran en una marca (sin datos de la cuenta)."""
    if _dbg["n"] < 8:
        _dbg["n"] += 1
        base = sku.split("-")[0]
        pg = next((d for pid, (n, d) in pages.items() if pid == base), None)
        log("no encontrado", sku, "| página en listas:", bool(pg), "| status:", pg and pg.get("status"),
            "| título:", bool(pg and pg.get("og_title")), "| opciones:", len((pg or {}).get("options") or []),
            "| ids:", [str(o.get("productId")) for o in ((pg or {}).get("options") or [])][:4], "| opts marca:", len(opt))
    return False


def aplicar_preorden(pre):
    res = []
    for i in range(0, len(pre), 1000):
        r = api("admin-append-catalog-rows", {"updates": [{"sku": c["sku"], "fields": {"Disponible": "PREORDEN"}} for c in pre[i:i + 1000]], "dryRun": False})
        res.append(str(r)[:120])
    return res


def opcion(nombre, default):
    if nombre in sys.argv:
        i = sys.argv.index(nombre)
        return float(sys.argv[i + 1])
    return default


def main():
    horas, dias = opcion("--horas", 5.0), opcion("--dias", 6.0)
    pedidas = [a.strip() for i, a in enumerate(sys.argv[1:], 1) if not a.startswith("--") and sys.argv[i - 1] not in ("--horas", "--dias") and a.strip()]
    limite = time.time() + horas * 3600
    rows = sheet()
    by = {}
    for r in rows: by.setdefault(r["Marca"], []).append(r)
    lst = {k: [tuple(x) for x in v] for k, v in json.load(open(os.path.join(AQUI, "listas.json"))).items()}
    known = json.load(open(os.path.join(AQUI, "skus.json")))

    barrido = ""
    if pedidas:
        marcas = [m for m in pedidas if m in by]
    else:
        # Las que no se han revisado en los últimos días, de la más vieja a la más nueva.
        rep = api("admin-abw-revision")
        fechas = {m: (d or {}).get("fecha", "") for m, d in (rep.get("marcas") or {}).items()}
        corte = (datetime.datetime.utcnow() - datetime.timedelta(days=dias)).isoformat()
        barrido = rep.get("barrido") or ""
        if barrido and barrido > corte: corte = barrido
        if barrido: log("barrido completo pedido desde", barrido)
        marcas = sorted((m for m in by if fechas.get(m, "") < corte), key=lambda m: (fechas.get(m, ""), -len(by[m])))
    log("marcas por revisar:", len(marcas))

    sesion = api("admin-abw-sesion")
    F = Fetcher(sesion["state"])
    hechas = 0
    try:
        for m in marcas:
            if time.time() > limite:
                log("se acabó el tiempo de esta corrida; faltan", len(marcas) - hechas, "marcas (siguen mañana)")
                break
            log("revisando", m, len(by[m]), "renglones")
            _dbg["n"] = 0
            cambios, rev, sin = revisar(m, by[m], lst, known, F, ocultos=bool(barrido) or "--ocultos" in sys.argv)
            # Lo que estaba OCULTO nunca se cambia solo: lo decide Mae.
            pre = [c for c in cambios if c["tipo"] == "preorden" and not c.get("oculto")]
            if pre:
                log(m, "a preorden directo", len(pre), aplicar_preorden(pre))
                cambios = [c for c in cambios if c["tipo"] != "preorden" or c.get("oculto")]
            log(m, "revisados", rev, "sin revisar", sin, "cambios", len(cambios))
            r = api("admin-abw-revision", {"marca": m, "fecha": datetime.datetime.utcnow().isoformat() + "Z", "revisados": rev, "cambios": cambios})
            log("subido", "ok" if r.get("ok") else str(r)[:120])
            hechas += 1
            # Guarda la sesión renovada después de cada marca, por si la
            # corrida se corta por tiempo.
            try: api("admin-abw-sesion", {"state": F.state()})
            except Exception as e: log("no se pudo guardar la sesión:", str(e)[:80])
    except SesionCaducada:
        log("La sesión de ABW ya no está iniciada (sin precios). Hay que volver a entrar a ABW con el código que llega por correo.")
        F.close()
        sys.exit(2)
    # Guarda las cookies renovadas para que la sesión siga viva la próxima vez.
    try:
        api("admin-abw-sesion", {"state": F.state()})
        log("sesión de ABW renovada")
    except Exception as e:
        log("no se pudo guardar la sesión renovada:", str(e)[:80])
    F.close()
    log("FIN", hechas, "marcas revisadas en esta corrida")


if __name__ == "__main__":
    main()
