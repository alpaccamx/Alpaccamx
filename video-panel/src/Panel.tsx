import React from "react";
import {
  AbsoluteFill, Audio, Easing, Img, OffthreadVideo, Sequence, interpolate, spring, staticFile,
  useCurrentFrame, delayRender, continueRender, getStaticFiles,
} from "remotion";
import datos from "./datos.json";

// ---------- marca ----------
export const ROSA = "#D9468A", CLARO = "#FFE3EE", MEDIO = "#F7B6D2", VINO = "#7A4A5E", VINO_OSC = "#4E2A3A", BLANCO = "#FFFFFF";

const fuentes: [string, string, string][] = [
  ["RTP", "fuentes/ReadyToParty.ttf", "400"], ["Inter", "fuentes/Inter-Medium.otf", "500"], ["Inter", "fuentes/Inter-SemiBold.otf", "600"],
  ["Inter", "fuentes/Inter-Bold.otf", "700"], ["Inter", "fuentes/Inter-ExtraBold.otf", "800"],
];
const espera = delayRender("fuentes");
Promise.all(fuentes.map(([f, u, w]) => new FontFace(f, `url(${staticFile(u)})`, { weight: w }).load().then((x) => document.fonts.add(x)))).then(() => continueRender(espera));

// ---------- tiempos ----------
const FPS = 30;
const L = datos.lineas as { a: number; z: number }[];
const P = datos.palabras as { w: string; a: number; z: number; l: number }[];
const hayAudio = getStaticFiles().some((f) => f.name === "audio/mezcla.wav");

const ease = Easing.bezier(0.45, 0, 0.2, 1);
const lerp = (t: number, a: number, b: number, from: number, to: number, e = ease) =>
  interpolate(t, [a, b], [from, to], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: e });
const resorte = (t: number, t0: number, cfg = { damping: 13, stiffness: 140, mass: 0.7 }) => (t < t0 ? 0 : spring({ frame: (t - t0) * FPS, fps: FPS, config: cfg }));

// ---------- planos de la grabación ----------
// cada plano: tramo de la grabación (seg), dónde empieza y acaba en el video final, y el acercamiento (z, centro x/y en px de la grabación)
type Plano = { desde: number; hasta: number; a: number; z: number; z0: number; z1: number; c0: [number, number]; c1: [number, number] };
const VW = 1080, VH = 2336;
const tramo = (desde: number, hasta: number, a: number, z: number, z0: number, z1: number, c0: [number, number], c1: [number, number]): Plano => {
  const dur = z - a, maxVel = 2.2;
  if ((hasta - desde) / dur > maxVel) hasta = desde + dur * maxVel; // si habría que acelerar demasiado, mejor se corta
  return { desde, hasta, a, z, z0, z1, c0, c1 };
};
const fin1 = L[1].a - 0.5; // la pantalla entra con la línea 2
const PLANOS: Plano[] = [
  tramo(0.0, 2.95, fin1, L[2].a - 0.1, 1.0, 1.1, [540, 700], [540, 400]),                                        // entra con su clave
  tramo(3.0, 8.45, L[2].a - 0.1, L[3].a - 0.1, 1.02, 1.1, [540, 700], [540, 1000]),                                // resumen de ventas
  tramo(8.5, 13.45, L[3].a - 0.1, L[3].a + (L[3].z - L[3].a) * 0.5, 1.04, 1.12, [540, 900], [540, 1300]),          // abre el pedido
  tramo(13.5, 16.95, L[3].a + (L[3].z - L[3].a) * 0.5, L[4].a - 0.1, 1.1, 1.35, [540, 1150], [540, 1080]),      // el comprobante
  tramo(17.0, 20.97, L[4].a - 0.1, L[4].a + (L[4].z - L[4].a) * 0.45, 1.05, 1.2, [540, 1400], [540, 1214]),     // «Ya me pagó»
  tramo(21.0, 24.45, L[4].a + (L[4].z - L[4].a) * 0.45, L[5].a - 0.1, 1.4, 1.15, [400, 760], [540, 1100]),        // ya aparece pagado
  tramo(24.5, 32.45, L[5].a - 0.1, L[6].a - 0.1, 1.04, 1.12, [540, 900], [540, 1300]),                              // por mandar
  tramo(32.5, 37.95, L[6].a - 0.1, L[6].a + (L[6].z - L[6].a) * 0.4, 1.04, 1.12, [540, 900], [540, 1200]),        // inventario
  tramo(38.0, 41.95, L[6].a + (L[6].z - L[6].a) * 0.4, L[6].a + (L[6].z - L[6].a) * 0.7, 1.04, 1.12, [540, 900], [540, 1300]), // cupones
  tramo(42.0, 45.95, L[6].a + (L[6].z - L[6].a) * 0.7, L[7].a + 0.55, 1.04, 1.12, [540, 900], [540, 1200]),        // clientas
];
// toque en «Ya me pagó» (en la grabación, segundo 20.4, botón en x 540, y 1214)
const toqueEn = (seg: number) => { const p = PLANOS.find((q) => seg >= q.desde && seg <= q.hasta)!; return p.a + ((seg - p.desde) / (p.hasta - p.desde)) * (p.z - p.a); };
const TOQUES: [number, number, number][] = [[toqueEn(20.4), 540, 1214]];

// ---------- celular ----------
export const SW = 540, STATUS = 54, VIDH = Math.round((SW * VH) / VW), SH = STATUS + VIDH;
export const BarraEstado: React.FC = () => (
  <div style={{ position: "absolute", top: 0, left: 0, width: SW, height: STATUS, background: BLANCO, zIndex: 5, display: "flex", alignItems: "center",
    justifyContent: "space-between", padding: "6px 40px 0 52px", boxSizing: "border-box", fontFamily: "Inter", fontWeight: 700, fontSize: 22, color: "#111" }}>
    <span>9:41</span>
    <svg width="92" height="18" viewBox="0 0 92 18">
      {[0, 1, 2, 3].map((i) => <rect key={i} x={i * 7} y={12 - i * 3.5} width="5" height={6 + i * 3.5} rx="1.3" fill="#111" />)}
      <path d="M40 6.5a12 12 0 0 1 16.5 0l-1.8 1.9a9.3 9.3 0 0 0-12.9 0z M43.4 10a7.2 7.2 0 0 1 9.7 0l-1.9 1.9a4.4 4.4 0 0 0-5.9 0z M46.3 13.3a2.8 2.8 0 0 1 3.9 0l-1.95 2z" fill="#111" />
      <rect x="62" y="3" width="25" height="12" rx="3.5" fill="none" stroke="#111" strokeOpacity="0.45" strokeWidth="1.4" />
      <rect x="64" y="5" width="19" height="8" rx="2" fill="#111" />
    </svg>
  </div>
);

const Pantalla: React.FC<{ t: number }> = ({ t }) => {
  const k = SW / VW;
  return (
    <div style={{ position: "absolute", left: 0, top: STATUS, width: SW, height: VIDH, overflow: "hidden", background: "#fff" }}>
      {PLANOS.map((p, i) => {
        // cuadros enteros: cada plano empieza justo donde acaba el anterior (sin cuadros vacíos entre planos)
        const desdeFr = Math.round(p.a * FPS), hastaFr = Math.round(p.z * FPS), durFr = Math.max(1, hastaFr - desdeFr);
        const fr = Math.round(t * FPS), vis = fr >= desdeFr && fr < hastaFr;
        const u = lerp(t, p.a, p.z, 0, 1, Easing.inOut(Easing.sin));
        const z = p.z0 + (p.z1 - p.z0) * u, cx = p.c0[0] + (p.c1[0] - p.c0[0]) * u, cy = p.c0[1] + (p.c1[1] - p.c0[1]) * u;
        // limita el centro para no salir de la grabación
        const mx = VW / (2 * z), my = (VIDH / k) / (2 * z);
        const ccx = Math.min(VW - mx, Math.max(mx, cx)), ccy = Math.min(VH - my, Math.max(my, cy));
        const tx = SW / 2 - ccx * k * z, ty = VIDH / 2 - ccy * k * z;
        return (
          <Sequence key={i} from={desdeFr} durationInFrames={durFr} layout="none">
            <div style={{ position: "absolute", left: 0, top: 0, width: SW, height: VIDH, opacity: vis ? 1 : 0 }}>
              <div style={{ position: "absolute", left: tx, top: ty, width: VW * k * z, height: VH * k * z }}>
                <OffthreadVideo src={staticFile("video/panel.mp4")} startFrom={Math.round(p.desde * FPS)} playbackRate={(p.hasta - p.desde) / (p.z - p.a)} muted
                  style={{ width: "100%", height: "100%" }} />
                {TOQUES.filter(([tt]) => tt >= p.a && tt < p.z).map(([tt, x, y], j) => <Toque key={j} t={t} t0={tt} x={x * k * z} y={y * k * z} />)}
              </div>
            </div>
          </Sequence>
        );
      })}
    </div>
  );
};

const Toque: React.FC<{ t: number; t0: number; x: number; y: number }> = ({ t, t0, x, y }) => {
  const d = t - t0;
  if (d < -0.3 || d > 0.6) return null;
  const aparece = lerp(d, -0.3, -0.1, 0, 1), presion = d < 0 ? 1 : lerp(d, 0, 0.1, 1, 0.8) + lerp(d, 0.1, 0.25, 0, 0.2);
  const sale = lerp(d, 0.35, 0.6, 1, 0), onda = lerp(d, 0, 0.5, 0, 1, Easing.out(Easing.quad));
  return (
    <>
      {d > 0 && <div style={{ position: "absolute", left: x - 70, top: y - 70, width: 140, height: 140, borderRadius: 70, border: `5px solid ${ROSA}`, transform: `scale(${0.4 + onda})`, opacity: (1 - onda) * 0.9 }} />}
      <div style={{ position: "absolute", left: x - 38, top: y - 38, width: 76, height: 76, borderRadius: 38, background: "rgba(255,255,255,0.55)", border: "5px solid rgba(255,255,255,0.95)",
        boxShadow: "0 4px 18px rgba(78,42,58,0.55)", transform: `scale(${aparece * presion})`, opacity: aparece * sale }} />
    </>
  );
};

const Celular: React.FC<{ t: number }> = ({ t }) => (
  <div style={{ position: "relative", width: SW + 32, height: SH + 32 }}>
    {[[-5, 250, 70], [-5, 350, 120], [-5, 490, 120], [SW + 31, 380, 170]].map(([x, y, h], i) => (
      <div key={i} style={{ position: "absolute", left: x, top: y, width: 6, height: h, borderRadius: 3, background: "linear-gradient(90deg,#9c8f96,#e3dade)" }} />
    ))}
    <div style={{ position: "absolute", inset: 0, borderRadius: 92, background: "linear-gradient(135deg,#f6eff2 0%,#c7bac1 45%,#efe7eb 100%)",
      boxShadow: "0 60px 100px -30px rgba(20,4,12,0.75), 0 0 0 1px rgba(255,255,255,0.3)" }} />
    <div style={{ position: "absolute", inset: 4, borderRadius: 88, background: "#0d0d0f" }} />
    <div style={{ position: "absolute", left: 16, top: 16, width: SW, height: SH, borderRadius: 72, overflow: "hidden", background: BLANCO }}>
      <Pantalla t={t} />
      <BarraEstado />
      <div style={{ position: "absolute", left: SW / 2 - 66, top: 12, width: 132, height: 38, borderRadius: 19, background: "#000", zIndex: 10 }} />
      <div style={{ position: "absolute", left: SW / 2 - 75, bottom: 9, width: 150, height: 6, borderRadius: 3, background: "rgba(0,0,0,0.7)", zIndex: 10 }} />
    </div>
  </div>
);

// ---------- fondo ----------
export const Destello: React.FC<{ x: number; y: number; s: number; t: number; c?: string; fase?: number }> = ({ x, y, s, t, c = MEDIO, fase = 0 }) => (
  <svg style={{ position: "absolute", left: x - s / 2, top: y - s / 2, transform: `rotate(${t * 20 + fase * 30}deg) scale(${0.75 + 0.25 * Math.sin(t * 2.2 + fase)})` }} width={s} height={s} viewBox="0 0 100 100">
    <path d="M50 0 C54 36 64 46 100 50 C64 54 54 64 50 100 C46 64 36 54 0 50 C36 46 46 36 50 0Z" fill={c} />
  </svg>
);
export const Fondo: React.FC<{ t: number }> = ({ t }) => (
  <AbsoluteFill style={{ background: `linear-gradient(165deg, #8A5468 0%, ${VINO} 40%, ${VINO_OSC} 100%)`, overflow: "hidden" }}>
    {[[180, 420, 700, 0], [920, 900, 760, 2], [300, 1600, 680, 4]].map(([x, y, s, f], i) => (
      <div key={i} style={{ position: "absolute", left: x - s / 2 + 50 * Math.sin(t * 0.45 + f), top: y - s / 2 + 60 * Math.cos(t * 0.4 + f), width: s, height: s, borderRadius: "50%",
        background: `radial-gradient(circle, ${ROSA}66 0%, ${ROSA}00 70%)` }} />
    ))}
    <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,0.08) 2.5px, transparent 3px)", backgroundSize: "46px 46px" }} />
    <Destello x={100} y={230} s={60} t={t} /><Destello x={990} y={330} s={70} t={t} fase={1} c={BLANCO} />
    <Destello x={70} y={1250} s={48} t={t} fase={2} /><Destello x={1010} y={1380} s={56} t={t} fase={3} c={BLANCO} />
    <Destello x={150} y={1800} s={44} t={t} fase={4} c={ROSA} /><Destello x={930} y={1840} s={40} t={t} fase={5} />
  </AbsoluteFill>
);

// ---------- textos ----------
const PASOS: [number, string][] = [
  [1, "Así se ve por dentro"], [2, "Tus ventas de un vistazo"], [3, "El comprobante, ahí mismo"], [4, "Un toque y queda pagado"],
  [5, "Lo que falta por mandar"], [6, "Precios, cupones y clientas"],
];
const Paso: React.FC<{ t: number }> = ({ t }) => {
  return (
    <>
      {PASOS.map(([l, texto], i) => {
        const t0 = L[l].a - 0.15, t1 = l + 1 < L.length ? L[l + 1].a - 0.2 : L[l].z;
        if (t < t0 - 0.05 || t > t1 + 0.3) return null;
        const e = resorte(t, t0), s = lerp(t, t1, t1 + 0.25, 1, 0);
        return (
          <div key={i} style={{ position: "absolute", left: 0, width: 1080, top: 120, display: "flex", justifyContent: "center", alignItems: "center", gap: 18,
            opacity: Math.min(e, s), transform: `translateY(${(1 - e) * 40 + 3 * Math.sin(t * 2)}px)`, zIndex: 20 }}>
            {i > 0 && <div style={{ width: 74, height: 74, borderRadius: 37, background: ROSA, color: BLANCO, fontFamily: "RTP", fontSize: 50, display: "flex",
              alignItems: "center", justifyContent: "center", boxShadow: "0 8px 20px rgba(20,4,12,0.35)" }}>{i}</div>}
            <div style={{ fontFamily: "RTP", fontSize: 76, color: BLANCO, textShadow: `0 5px 0 ${VINO_OSC}`, whiteSpace: "nowrap" }}>{texto}</div>
          </div>
        );
      })}
    </>
  );
};

const CHUNKS: [number, number][] = (() => {
  // grupos de hasta 5 palabras, cortando en puntuación y sin mezclar líneas
  const out: [number, number][] = []; let ini = 0;
  for (let i = 0; i < P.length; i++) {
    const debil = /^(y|de|del|en|el|la|lo|los|las|que|con|su|tu|tus|a|por|se|un|una|te|me|sin|al)$/i.test(P[i].w);
    const fin = i === P.length - 1 || P[i + 1].l !== P[i].l || (/[,.:?!»]$/.test(P[i].w) && i - ini >= 1) || (i - ini >= 3 && !debil) || i - ini >= 5;
    if (fin) { out.push([ini, i]); ini = i + 1; }
  }
  return out;
})();
const Subtitulos: React.FC<{ t: number }> = ({ t }) => {
  let actual = -1;
  CHUNKS.forEach(([a, b], k) => {
    const ini = P[a].a - 0.08, sig = k + 1 < CHUNKS.length ? P[CHUNKS[k + 1][0]].a - 0.08 : P[b].z + 0.8;
    if (t >= ini && t < Math.min(sig, P[b].z + 0.8)) actual = k;
  });
  if (actual < 0) return null;
  const [a, b] = CHUNKS[actual]; const e = resorte(t, P[a].a - 0.08, { damping: 14, stiffness: 220, mass: 0.6 });
  return (
    <div style={{ position: "absolute", left: 50, width: 980, top: 1555, display: "flex", justifyContent: "center", zIndex: 60 }}>
      <div style={{ background: BLANCO, borderRadius: 30, padding: "18px 32px", boxShadow: "0 14px 40px rgba(20,4,12,0.45)", fontFamily: "Inter", fontWeight: 800, fontSize: 60,
        lineHeight: 1.16, textAlign: "center", color: VINO, transform: `scale(${0.88 + 0.12 * e})`, opacity: e }}>
        {P.slice(a, b + 1).map((p, i, arr) => (
          <span key={i} style={{ color: t >= p.a - 0.04 ? (t < p.z + 0.12 ? ROSA : VINO) : "rgba(122,74,94,0.4)" }}>{p.w}{i < arr.length - 1 ? " " : ""}</span>
        ))}
      </div>
    </div>
  );
};

// gancho: mensajes que llegan sin parar
export const MENSAJES = ["¿Precio? 🙏", "¿Todavía lo tienes?", "¿Precio?", "Ya te transferí, ¿lo viste?", "¿Hay en talla M?", "¿Precio??", "Te mandé el comprobante arriba 👆"];
const Gancho: React.FC<{ t: number }> = ({ t }) => {
  const fin = L[1].a - 0.45;
  if (t > fin + 0.5) return null;
  const sale = lerp(t, fin - 0.2, fin + 0.35, 0, 1, Easing.in(Easing.cubic));
  return (
    <>
      <div style={{ position: "absolute", left: 0, width: 1080, top: 150, textAlign: "center", fontFamily: "RTP", fontSize: 96, color: BLANCO, lineHeight: 1.0,
        textShadow: `0 6px 0 ${VINO_OSC}`, opacity: 1 - sale, zIndex: 20 }}>
        ¿Te suena<br /><span style={{ color: MEDIO }}>conocido?</span>
      </div>
      {MENSAJES.map((m, i) => {
        const t0 = 0.15 + i * 0.5, e = resorte(t, t0, { damping: 12, stiffness: 180, mass: 0.6 });
        const izq = i % 2 === 0, y = 430 + i * 150;
        const temblor = t > 3.2 ? Math.sin(t * 40 + i) * 3 : 0;
        return (
          <div key={i} style={{ position: "absolute", top: y, left: izq ? 70 : undefined, right: izq ? undefined : 70, maxWidth: 760, zIndex: 15,
            transform: `translateX(${temblor + (izq ? -1 : 1) * sale * 900}px) scale(${0.6 + 0.4 * e})`, transformOrigin: izq ? "left center" : "right center", opacity: e }}>
            <div style={{ background: BLANCO, color: "#111", fontFamily: "Inter", fontWeight: 600, fontSize: 46, padding: "22px 34px", borderRadius: 34,
              borderTopLeftRadius: izq ? 8 : 34, borderTopRightRadius: izq ? 34 : 8, boxShadow: "0 12px 30px rgba(20,4,12,0.35)", display: "flex", gap: 18, alignItems: "flex-end" }}>
              <span>{m}</span><span style={{ fontSize: 24, color: "#888", fontWeight: 500 }}>9:4{i}</span>
            </div>
          </div>
        );
      })}
      {/* contador de mensajes sin leer */}
      <div style={{ position: "absolute", right: 90, top: 330, zIndex: 16, transform: `scale(${resorte(t, 1.0)})`, opacity: 1 - sale }}>
        <div style={{ background: ROSA, color: BLANCO, fontFamily: "Inter", fontWeight: 800, fontSize: 40, padding: "10px 26px", borderRadius: 40, boxShadow: "0 8px 20px rgba(20,4,12,0.4)" }}>
          {Math.min(99, Math.floor(lerp(t, 1.0, fin, 3, 47)))} sin leer
        </div>
      </div>
    </>
  );
};

export const WhatsApp: React.FC<{ s: number; c?: string }> = ({ s, c = BLANCO }) => (
  <svg width={s} height={s} viewBox="0 0 32 32"><path fill={c} d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3zm0 23.7a10.7 10.7 0 0 1-5.5-1.5l-.4-.2-3.9 1 1-3.8-.3-.4A10.7 10.7 0 1 1 16 26.7zm5.9-8c-.3-.2-1.9-.9-2.2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7.1a8.8 8.8 0 0 1-4.4-3.8c-.3-.6.3-.5 1-1.7.1-.2 0-.4 0-.5l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.9.4 3.6 3.6 0 0 0-1.1 2.7 6.3 6.3 0 0 0 1.3 3.3 14.4 14.4 0 0 0 5.5 4.9c2 .9 2.8 1 3.8.8a3.2 3.2 0 0 0 2.1-1.5 2.6 2.6 0 0 0 .2-1.5c-.1-.1-.3-.2-.6-.3z" /></svg>
);
export const TikTok: React.FC<{ s: number; c?: string }> = ({ s, c = BLANCO }) => (
  <svg width={s} height={s} viewBox="0 0 32 32"><path fill={c} d="M22.5 3h-4.6v17.4a3.9 3.9 0 1 1-3.9-3.9c.4 0 .8.1 1.2.2v-4.7a8.6 8.6 0 1 0 7.3 8.5V11.6a10.8 10.8 0 0 0 6.3 2V9a6.3 6.3 0 0 1-6.3-6z" /></svg>
);

const Cierre: React.FC<{ t: number }> = ({ t }) => {
  const c0 = L[7].a + 0.35;
  if (t < c0 - 0.05) return null;
  const eLogo = resorte(t, c0, { damping: 11, stiffness: 120, mass: 0.8 }), eTxt = resorte(t, c0 + 0.35);
  const eW = resorte(t, P.findIndex((p) => p.w.startsWith("WhatsApp")) >= 0 ? P[P.findIndex((p) => p.w.startsWith("WhatsApp"))].a - 0.2 : c0 + 2, { damping: 10, stiffness: 140, mass: 0.7 });
  const eT = resorte(t, (P.find((p) => p.w.startsWith("¡Escríbeme"))?.a ?? c0 + 3) - 0.1, { damping: 10, stiffness: 140, mass: 0.7 });
  return (
    <>
      <div style={{ position: "absolute", left: 540 - 380, top: 210, width: 760, height: 230, borderRadius: 115, background: BLANCO, zIndex: 30, display: "flex", alignItems: "center", justifyContent: "center",
        transform: `scale(${(0.5 + 0.5 * eLogo) * (1 + 0.012 * Math.sin(t * 2.2))}) rotate(${-2 + 0.8 * Math.sin(t * 1.4)}deg)`, opacity: Math.min(1, eLogo * 1.5), boxShadow: "0 18px 50px rgba(20,4,12,0.45)" }}>
        <Img src={staticFile("marca/logo-wordmark-2x.png")} style={{ width: 600 }} />
      </div>
      <div style={{ position: "absolute", left: 60, width: 960, top: 500, textAlign: "center", fontFamily: "RTP", fontSize: 78, color: BLANCO, lineHeight: 1.05, zIndex: 30,
        textShadow: `0 5px 0 ${VINO_OSC}`, opacity: eTxt, transform: `translateY(${(1 - eTxt) * 40}px)` }}>
        Tu tienda con tu marca,<br /><span style={{ color: MEDIO }}>tus colores y tu link</span>
      </div>
      <Img src={staticFile("marca/mascot.png")} style={{ position: "absolute", left: 540 - 200, top: 700 + 10 * Math.sin(t * 4), width: 400, zIndex: 29, opacity: eTxt,
        transform: `scale(${0.6 + 0.4 * eTxt})`, filter: "drop-shadow(0 20px 26px rgba(20,4,12,0.45))" }} />
      <div style={{ position: "absolute", left: 0, width: 1080, top: 1140, display: "flex", flexDirection: "column", alignItems: "center", gap: 22, zIndex: 31 }}>
        <div style={{ transform: `scale(${eW * (t > c0 + 3 ? 1 + 0.03 * Math.sin(t * 6) : 1)})`, display: "flex", alignItems: "center", gap: 18, background: "#25B864", color: BLANCO,
          fontFamily: "Inter", fontWeight: 800, fontSize: 52, padding: "22px 44px", borderRadius: 999, boxShadow: "0 12px 30px rgba(20,4,12,0.45)" }}>
          <WhatsApp s={60} />657 192 0559
        </div>
        <div style={{ transform: `scale(${eT})`, display: "flex", alignItems: "center", gap: 16, background: "#111", color: BLANCO, fontFamily: "Inter", fontWeight: 800, fontSize: 44,
          padding: "18px 40px", borderRadius: 999, boxShadow: "0 12px 30px rgba(20,4,12,0.45)" }}>
          <TikTok s={46} />@alpaccamx
        </div>
      </div>
    </>
  );
};

export const Panel: React.FC = () => {
  const f = useCurrentFrame(); const t = f / FPS;
  // el celular entra después del gancho y sale al cierre
  const entra = lerp(t, L[1].a - 0.45, L[1].a + 0.25, 0, 1, Easing.out(Easing.back(1.1)));
  const sale = lerp(t, L[7].a + 0.05, L[7].a + 0.5, 0, 1, Easing.in(Easing.cubic));
  const cy = 900 + (1 - entra) * 1400 + sale * 1500 + 8 * Math.sin(t * 1.6);
  const rot = (1 - entra) * 8 - sale * 10 + 0.6 * Math.sin(t * 1.1);
  return (
    <AbsoluteFill style={{ background: VINO }}>
      {hayAudio && <Audio src={staticFile("audio/mezcla.wav")} />}
      <Fondo t={t} />
      <Gancho t={t} />
      {entra > 0 && sale < 1 && (
        <div style={{ position: "absolute", left: 540, top: cy, transform: `translate(-50%,-50%) rotate(${rot}deg)`, zIndex: 10 }}>
          <Celular t={t} />
          <div style={{ position: "absolute", right: -70, top: -34, transform: `rotate(8deg) scale(${resorte(t, L[1].a + 0.6)})`, zIndex: 12 }}>
            <div style={{ background: ROSA, color: BLANCO, fontFamily: "Inter", fontWeight: 800, fontSize: 30, padding: "12px 24px", borderRadius: 18,
              boxShadow: "0 10px 24px rgba(20,4,12,0.45)", letterSpacing: 1 }}>TIENDA DE EJEMPLO</div>
          </div>
        </div>
      )}
      <Paso t={t} />
      <Cierre t={t} />
      <Subtitulos t={t} />
    </AbsoluteFill>
  );
};
