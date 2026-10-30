"""Hace Descripciones-carruseles.pdf: el calendario de publicación y la descripción de Instagram y TikTok de cada
carrusel (de su descripcion.txt). Uso: python3 pdf_descripciones.py"""
import html, os, subprocess

AQUI = os.path.dirname(os.path.abspath(__file__))
ORDEN = ["mas-vendidos", "sets-navidad", "lo-que-todas-compran", "calendarios-2026", "kits", "rubores-piel", "mas-amados", "lujo",
         "sephora-top", "cada-marca", "perfumes", "labios-piel", "cada-centavo", "regalos", "fijadores-piel", "cada-centavo-2", "coreano", "cabello"]
TITULOS = {"sephora-top": "Lo más pedido del Sephora Sale", "kits": "Kits y sets de regalo", "rubores-piel": "Qué blush elegir según tu piel",
           "calendarios-2026": "Calendarios de adviento 2026", "perfumes": "Perfumes y mists", "coreano": "Skincare coreano", "cabello": "Para tu cabello",
           "regalos": "Regalos de menos de $500", "labios-piel": "NO compres otro gloss sin ver esto", "fijadores-piel": "NO compres fijador sin ver esto",
           "cada-centavo": "Cosas que valen cada centavo", "cada-centavo-2": "Cosas que valen cada centavo pt.2", "mas-vendidos": "Lo más vendido de Sephora",
           "lo-que-todas-compran": "Lo que TODAS compran en Sephora", "cada-marca": "Lo más vendido de cada marca", "lujo": "Dior, Chanel, Fenty y Huda",
           "mas-amados": "Los más amados de Sephora", "sets-navidad": "Sets de Navidad edición limitada"}
DIAS = ["31 de octubre", "1 de noviembre", "2 de noviembre", "3 de noviembre"]
HORAS = ["9:00 a. m.", "12:00 p. m.", "3:00 p. m.", "6:00 p. m.", "9:00 p. m."]

H = ['''<!doctype html><html><head><meta charset="utf-8"><style>
body{font-family:"Poppins","Noto Sans",sans-serif;color:#222;margin:0;font-size:11pt}
h1{color:#e87091;font-size:22pt;margin:0 0 6px}.sub{color:#777;margin-bottom:18px}
.card{page-break-inside:avoid;border:1.5px solid #f5c3cf;border-radius:14px;padding:14px 18px;margin:0 0 16px}
.card h2{margin:0;font-size:15pt}.meta{color:#e87091;font-weight:600;margin:4px 0 10px;font-size:10pt}
.lbl{display:inline-block;background:#e87091;color:#fff;border-radius:20px;padding:2px 12px;font-size:9pt;font-weight:700;margin:8px 0 4px}
pre{white-space:pre-wrap;font-family:inherit;margin:0;line-height:1.45}
table{border-collapse:collapse;width:100%;margin-bottom:20px;font-size:10pt}td,th{border:1px solid #f5c3cf;padding:5px 8px;text-align:left}th{background:#fde8ee}
</style></head><body><h1>Descripciones de los carruseles</h1>
<div class="sub">@alpaccamx · Preventa Sephora Sale · 18 publicaciones, 5 al día (hora de CDMX)</div>
<table><tr><th>#</th><th>Fecha y hora</th><th>Carrusel</th><th>Carpeta</th></tr>''']
for i, c in enumerate(ORDEN):
    H.append(f"<tr><td>{i + 1}</td><td>{DIAS[i // 5]}, {HORAS[i % 5]}</td><td>{html.escape(TITULOS[c])}</td><td>{c}</td></tr>")
H.append("</table>")
for i, c in enumerate(ORDEN):
    t = open(os.path.join(AQUI, c, "descripcion.txt")).read()
    a = t.index("INSTAGRAM (carrusel)")
    tk, ig = t[:a].replace("TIKTOK (modo foto)", "").strip(), t[a + len("INSTAGRAM (carrusel)"):].strip()
    H.append(f'<div class="card"><h2>{i + 1}. {html.escape(TITULOS[c])}</h2><div class="meta">{DIAS[i // 5]}, {HORAS[i % 5]} · carpeta {c}</div>'
             f'<span class="lbl">INSTAGRAM</span><pre>{html.escape(ig)}</pre><span class="lbl">TIKTOK</span><pre>{html.escape(tk)}</pre></div>')
H.append("</body></html>")
tmp = os.path.join(AQUI, ".desc.html"); open(tmp, "w").write("".join(H))
js = ("const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage();"
      f"await p.goto('file://{tmp}');await p.pdf({{path:'{os.path.join(AQUI, 'Descripciones-carruseles.pdf')}',format:'Letter',"
      "margin:{top:'18mm',bottom:'18mm',left:'16mm',right:'16mm'},printBackground:true});await b.close();})()")
subprocess.run(["node", "-e", js], check=True); os.remove(tmp); print("ok Descripciones-carruseles.pdf")
