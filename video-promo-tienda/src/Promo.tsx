import React from "react";
import {
  AbsoluteFill, Audio, Easing, Img, interpolate, spring, staticFile,
  useCurrentFrame, useVideoConfig, delayRender, continueRender,
} from "remotion";
import datos from "./datos.json";

// ---------- marca ----------
const ROSA = "#D9468A", CLARO = "#FFE3EE", MEDIO = "#F7B6D2", VINO = "#7A4A5E", BLANCO = "#FFFFFF";
const MORA = ["#B4562F", "#5F6F52", "#EAD9C6", "#2B2522"]; // colores de la tienda de ejemplo

// ---------- fuentes ----------
const fuentes: [string, string, string][] = [
  ["RTP", "fuentes/ReadyToParty.ttf", "400"],
  ["Inter", "fuentes/Inter-Medium.otf", "500"],
  ["Inter", "fuentes/Inter-SemiBold.otf", "600"],
  ["Inter", "fuentes/Inter-Bold.otf", "700"],
  ["Inter", "fuentes/Inter-ExtraBold.otf", "800"],
];
const espera = delayRender("fuentes");
Promise.all(fuentes.map(([f, u, w]) => new FontFace(f, `url(${staticFile(u)})`, { weight: w }).load().then((x) => document.fonts.add(x))))
  .then(() => continueRender(espera));

// ---------- tiempos (todo sale de los tiempos reales de la voz) ----------
const P = datos.palabras as { w: string; a: number; z: number }[];
const ta = (i: number) => P[i].a, tz = (i: number) => P[i].z;
const T = {
  mira: ta(6) - 0.15, mis: ta(12) - 0.1, eligen: ta(18), tono: ta(20), pagan: ta(21), yAmi: ta(22), llega: ta(26),
  tuya: ta(31), marca: ta(37), colores: ta(39), logo: ta(42), incluye: ta(43) - 0.1, yo: ta(73) - 0.1, fin: datos.total,
};
const ITEMS: [number, string, string][] = [
  [44, "Pago con tarjeta o transferencia", "tarjeta"],
  [49, "Envío calculado por código postal", "envio"],
  [54, "Tonos y tallas", "tonos"],
  [57, "Inventario que se descuenta solo", "inventario"],
  [62, "Panel de pedidos y guías", "panel"],
  [67, "Cupones", "cupon"],
  [68, "Reseñas", "resena"],
  [70, "Avisos por correo", "correo"],
];
const CHUNKS: [number, number][] = [
  [6, 11], [12, 14], [15, 17], [18, 20], [21, 21], [22, 28], [29, 34], [35, 37], [38, 42],
  [43, 46], [47, 48], [49, 50], [51, 53], [54, 56], [57, 61], [62, 66], [67, 67], [68, 72], [73, 76], [77, 79], [80, 84],
];

// ---------- utilidades ----------
const ease = Easing.bezier(0.45, 0, 0.2, 1);
const lerp = (t: number, a: number, b: number, from: number, to: number, e = ease) =>
  interpolate(t, [a, b], [from, to], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: e });
const useT = () => { const f = useCurrentFrame(); const { fps } = useVideoConfig(); return f / fps; };
const resorte = (t: number, t0: number, cfg = { damping: 13, stiffness: 140, mass: 0.7 }) =>
  t < t0 ? 0 : spring({ frame: (t - t0) * 30, fps: 30, config: cfg });

// ---------- celular ----------
const K = 480 / 390; // px de pantalla por punto CSS de la captura
const SW = 480, SH = Math.round(844 * K), STATUS = Math.round(47 * K), PAGE_H = SH - STATUS;
const yP = (css: number) => STATUS + css * K;

const BarraEstado: React.FC = () => (
  <div style={{ position: "absolute", top: 0, left: 0, width: SW, height: STATUS, background: BLANCO, zIndex: 5,
    display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 34px 0 46px", boxSizing: "border-box",
    fontFamily: "Inter", fontWeight: 700, fontSize: 21, color: "#111" }}>
    <span>9:41</span>
    <svg width="92" height="18" viewBox="0 0 92 18">
      {[0, 1, 2, 3].map((i) => <rect key={i} x={i * 7} y={12 - i * 3.5} width="5" height={6 + i * 3.5} rx="1.3" fill="#111" />)}
      <path d="M40 6.5a12 12 0 0 1 16.5 0l-1.8 1.9a9.3 9.3 0 0 0-12.9 0z M43.4 10a7.2 7.2 0 0 1 9.7 0l-1.9 1.9a4.4 4.4 0 0 0-5.9 0z M46.3 13.3a2.8 2.8 0 0 1 3.9 0l-1.95 2z" fill="#111" />
      <rect x="62" y="3" width="25" height="12" rx="3.5" fill="none" stroke="#111" strokeOpacity="0.45" strokeWidth="1.4" />
      <rect x="64" y="5" width="19" height="8" rx="2" fill="#111" />
      <rect x="88.5" y="7" width="2" height="4" rx="1" fill="#111" fillOpacity="0.45" />
    </svg>
  </div>
);

// página larga con encabezado fijo (sticky), desplazada `scroll` puntos
const PaginaLarga: React.FC<{ src: string; scroll: number; header?: number }> = ({ src, scroll, header = 155 }) => (
  <div style={{ position: "absolute", top: STATUS, left: 0, width: SW, height: PAGE_H, overflow: "hidden", background: BLANCO }}>
    <Img src={staticFile(src)} style={{ position: "absolute", left: 0, top: 0, width: SW, transform: `translateY(${-scroll * K}px)` }} />
    <div style={{ position: "absolute", left: 0, top: 0, width: SW, height: header * K, overflow: "hidden", boxShadow: scroll > 4 ? "0 2px 8px rgba(0,0,0,0.06)" : "none" }}>
      <Img src={staticFile(src)} style={{ position: "absolute", left: 0, top: 0, width: SW }} />
    </div>
  </div>
);
// captura del tamaño de la pantalla (opcionalmente recortada desde `desde` puntos, para la hoja que sube)
const Captura: React.FC<{ src: string; desde?: number; hasta?: number; dy?: number; dx?: number; opacidad?: number }> = ({ src, desde = 0, hasta = 797, dy = 0, dx = 0, opacidad = 1 }) => (
  <div style={{ position: "absolute", top: STATUS + desde * K, left: 0, width: SW, height: (hasta - desde) * K, overflow: "hidden",
    transform: `translate(${dx}px, ${dy}px)`, opacity: opacidad }}>
    <Img src={staticFile(src)} style={{ position: "absolute", left: 0, top: -desde * K, width: SW }} />
  </div>
);
// toque del dedo
const Toque: React.FC<{ t: number; t0: number; x: number; y: number }> = ({ t, t0, x, y }) => {
  const d = t - t0;
  if (d < -0.25 || d > 0.55) return null;
  const aparece = lerp(d, -0.25, -0.08, 0, 1);
  const presion = d < 0 ? 1 : lerp(d, 0, 0.1, 1, 0.82) + lerp(d, 0.1, 0.25, 0, 0.18);
  const sale = lerp(d, 0.3, 0.55, 1, 0);
  const onda = lerp(d, 0, 0.45, 0, 1, Easing.out(Easing.quad));
  const cx = x * K, cy = yP(y);
  return (
    <>
      {d > 0 && <div style={{ position: "absolute", left: cx - 60, top: cy - 60, width: 120, height: 120, borderRadius: 60,
        border: `4px solid ${ROSA}`, transform: `scale(${0.4 + onda})`, opacity: (1 - onda) * 0.8, zIndex: 30 }} />}
      <div style={{ position: "absolute", left: cx - 34, top: cy - 34, width: 68, height: 68, borderRadius: 34, zIndex: 31,
        background: "rgba(255,255,255,0.55)", border: "4px solid rgba(255,255,255,0.95)", boxShadow: "0 4px 18px rgba(122,74,94,0.45)",
        transform: `scale(${aparece * presion})`, opacity: aparece * sale }} />
    </>
  );
};
// menú de tonos (como el selector de iPhone)
const TONOS = ["#Hope", "#Joy", "#Happy", "#Bliss", "#Encourage", "#Love", "#Virtue"];
const MenuTonos: React.FC<{ t: number }> = ({ t }) => {
  const abre = lerp(t, T.eligen + 0.05, T.eligen + 0.28, 0, 1, Easing.out(Easing.back(1.4)));
  const cierra = lerp(t, T.tono + 0.32, T.tono + 0.5, 1, 0);
  const v = Math.min(abre, cierra);
  if (v <= 0.01) return null;
  const sel = Math.round(lerp(t, T.eligen + 0.45, T.tono + 0.05, 0, 5, Easing.inOut(Easing.cubic)));
  const altoItem = 44 * K, x = 16 * K, y = yP(611 - 7 * 44 - 12);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 250 * K, borderRadius: 14 * K, background: "rgba(250,249,251,0.97)",
      boxShadow: "0 18px 50px rgba(0,0,0,0.28)", overflow: "hidden", zIndex: 20, transformOrigin: "20% 100%",
      transform: `scale(${0.6 + 0.4 * v})`, opacity: v }}>
      {TONOS.map((n, i) => (
        <div key={n} style={{ height: altoItem, display: "flex", alignItems: "center", padding: `0 ${16 * K}px`, gap: 12,
          fontFamily: "Inter", fontWeight: 500, fontSize: 17 * K, color: "#111", background: i === sel ? "rgba(0,0,0,0.08)" : "transparent",
          borderTop: i ? "1px solid rgba(0,0,0,0.07)" : "none" }}>
          <span style={{ width: 18, color: ROSA, fontWeight: 800 }}>{i === sel ? "✓" : ""}</span>{n}
        </div>
      ))}
    </div>
  );
};
// notificación de pedido nuevo
const Notificacion: React.FC<{ t: number }> = ({ t }) => {
  const t0 = T.llega - 0.2;
  const v = lerp(t, t0, t0 + 0.35, 0, 1, Easing.out(Easing.back(1.3))) * lerp(t, T.tuya - 0.55, T.tuya - 0.25, 1, 0);
  if (v <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 14, top: 12 + (1 - v) * -140, width: SW - 28, borderRadius: 30, zIndex: 40,
      background: "rgba(255,255,255,0.96)", boxShadow: "0 14px 40px rgba(122,74,94,0.35)", padding: "16px 18px", boxSizing: "border-box",
      display: "flex", gap: 14, alignItems: "center", fontFamily: "Inter" }}>
      <div style={{ width: 62, height: 62, borderRadius: 15, background: CLARO, flexShrink: 0, overflow: "hidden" }}>
        <Img src={staticFile("marca/mascot.png")} style={{ width: 62, height: 62, objectFit: "cover", transform: "scale(1.25) translateY(4px)" }} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 19, color: "#666", fontWeight: 600 }}><span style={{ color: "#111", fontWeight: 700 }}>Alpacca</span><span>ahora</span></div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#111", marginTop: 2 }}>¡Nuevo pedido!</div>
        <div style={{ fontSize: 19, fontWeight: 500, color: "#333" }}>Te acaban de comprar 1 producto</div>
      </div>
    </div>
  );
};

const PantallaContenido: React.FC<{ t: number; mora: boolean }> = ({ t, mora }) => {
  if (mora) {
    const s = lerp(t, T.tuya + 0.5, T.incluye, 0, 1500, Easing.inOut(Easing.sin));
    return <><PaginaLarga src="pantallas/mora-inicio.png" scroll={s} /><BarraEstado /></>;
  }
  // inicio de alpacca.mx que baja suave
  const s = lerp(t, T.mira + 0.2, T.mis + 0.1, 0, 1180, Easing.inOut(Easing.sin));
  // hoja del producto
  const hoja = lerp(t, T.mis + 0.05, T.mis + 0.55, 1, 0, Easing.out(Easing.cubic)); // 1 = abajo
  const cierraHoja = lerp(t, T.pagan - 0.02, T.pagan + 0.3, 0, 1, Easing.in(Easing.cubic));
  const yHoja = Math.max(hoja, cierraHoja) * (797 - 128) * K;
  const dim = t < T.mis ? 0 : Math.min(lerp(t, T.mis, T.mis + 0.4, 0, 1), 1 - cierraHoja);
  const love = lerp(t, T.tono + 0.32, T.tono + 0.48, 0, 1);
  const carrito = lerp(t, T.pagan + 0.05, T.pagan + 0.42, SW, 0, Easing.out(Easing.cubic));
  const pago = lerp(t, T.yAmi - 0.62, T.yAmi - 0.28, SW, 0, Easing.out(Easing.cubic));
  return (
    <>
      <PaginaLarga src="pantallas/alpacca-inicio.png" scroll={s} />
      {t > T.mis - 0.1 && t < T.yAmi + 0.2 && (
        <>
          <Captura src="pantallas/producto-hope.png" desde={0} hasta={128} opacidad={dim} />
          <Captura src="pantallas/producto-hope.png" desde={128} dy={yHoja} />
          <Captura src="pantallas/producto-love.png" desde={128} dy={yHoja} opacidad={love} />
          <MenuTonos t={t} />
          <Toque t={t} t0={T.eligen} x={195} y={633} />
          <Toque t={t} t0={T.tono + 0.28} x={90} y={611 - 12 - 2 * 44 + 22} />
          <Toque t={t} t0={T.pagan - 0.12} x={285} y={762} />
        </>
      )}
      {t > T.pagan && <Captura src="pantallas/carrito.png" dx={carrito} />}
      {t > T.yAmi - 0.65 && (
        <div style={{ position: "absolute", top: STATUS, left: 0, width: SW, height: PAGE_H, background: BLANCO, transform: `translateX(${pago}px)` }}>
          <Img src={staticFile("pantallas/pago.png")} style={{ width: SW }} />
        </div>
      )}
      <Toque t={t} t0={T.yAmi - 0.15} x={195} y={591} />
      <BarraEstado />
      <Notificacion t={t} />
    </>
  );
};

const Celular: React.FC<{ t: number }> = ({ t }) => {
  // giro para cambiar a la tienda de ejemplo
  const g1 = lerp(t, T.tuya - 0.1, T.tuya + 0.18, 0, 90, Easing.in(Easing.cubic));
  const g2 = lerp(t, T.tuya + 0.18, T.tuya + 0.5, -90, 0, Easing.out(Easing.back(1.2)));
  const mora = t >= T.tuya + 0.18;
  const giro = mora ? g2 : g1;
  const marco = 16;
  return (
    <div style={{ position: "relative", width: SW + 2 * marco, height: SH + 2 * marco, transform: `perspective(2200px) rotateY(${giro}deg)` }}>
      {/* botones laterales */}
      {[[-5, 230, 70], [-5, 330, 110], [-5, 460, 110], [SW + 2 * marco - 1, 360, 160]].map(([x, y, h], i) => (
        <div key={i} style={{ position: "absolute", left: x, top: y, width: 6, height: h, borderRadius: 3, background: "linear-gradient(90deg,#9c8f96,#d9d0d5)" }} />
      ))}
      <div style={{ position: "absolute", inset: 0, borderRadius: 86, background: "linear-gradient(135deg,#efe7eb 0%,#bdb1b8 45%,#e9e1e5 100%)",
        boxShadow: "0 60px 90px -30px rgba(122,74,94,0.55), 0 20px 40px rgba(122,74,94,0.18)" }} />
      <div style={{ position: "absolute", inset: 4, borderRadius: 82, background: "#0d0d0f" }} />
      <div style={{ position: "absolute", left: marco, top: marco, width: SW, height: SH, borderRadius: 66, overflow: "hidden", background: BLANCO }}>
        <PantallaContenido t={t} mora={mora} />
        {/* isla dinámica */}
        <div style={{ position: "absolute", left: SW / 2 - 64, top: 13, width: 128, height: 38, borderRadius: 19, background: "#000", zIndex: 50 }} />
        {/* barra de inicio */}
        <div style={{ position: "absolute", left: SW / 2 - 70, bottom: 9, width: 140, height: 6, borderRadius: 3, background: "rgba(0,0,0,0.75)", zIndex: 50 }} />
      </div>
    </div>
  );
};

// ---------- fondo ----------
const Destello: React.FC<{ x: number; y: number; s: number; t: number; c?: string; fase?: number }> = ({ x, y, s, t, c = BLANCO, fase = 0 }) => {
  const k = 0.75 + 0.25 * Math.sin(t * 2.2 + fase);
  return (
    <svg style={{ position: "absolute", left: x - s / 2, top: y - s / 2, transform: `rotate(${t * 18 + fase * 30}deg) scale(${k})` }} width={s} height={s} viewBox="0 0 100 100">
      <path d="M50 0 C54 36 64 46 100 50 C64 54 54 64 50 100 C46 64 36 54 0 50 C36 46 46 36 50 0Z" fill={c} />
    </svg>
  );
};
const Fondo: React.FC<{ t: number }> = ({ t }) => (
  <AbsoluteFill style={{ background: `linear-gradient(170deg, ${CLARO} 0%, #FFD3E4 48%, ${MEDIO} 100%)`, overflow: "hidden" }}>
    {[[160, 380, 520, 0], [930, 760, 600, 2], [260, 1500, 620, 4], [900, 1700, 480, 1]].map(([x, y, s, f], i) => (
      <div key={i} style={{ position: "absolute", left: x - s / 2 + 40 * Math.sin(t * 0.5 + f), top: y - s / 2 + 50 * Math.cos(t * 0.4 + f), width: s, height: s,
        borderRadius: "50%", background: i % 2 ? `radial-gradient(circle, ${ROSA}55 0%, ${ROSA}00 70%)` : `radial-gradient(circle, #FFFFFFcc 0%, #FFFFFF00 70%)` }} />
    ))}
    <Destello x={110} y={300} s={70} t={t} />
    <Destello x={980} y={420} s={54} t={t} fase={1} c={BLANCO} />
    <Destello x={90} y={1160} s={46} t={t} fase={2} c={ROSA} />
    <Destello x={1000} y={1260} s={64} t={t} fase={3} />
    <Destello x={150} y={1760} s={50} t={t} fase={4} />
    <Destello x={960} y={1820} s={40} t={t} fase={5} c={ROSA} />
  </AbsoluteFill>
);

// ---------- textos ----------
const Titulo: React.FC<{ t: number; t0: number; t1: number; children: React.ReactNode; y?: number; size?: number; color?: string }> = ({ t, t0, t1, children, y = 228, size = 92, color = VINO }) => {
  if (t < t0 - 0.05 || t > t1 + 0.3) return null;
  const e = resorte(t, t0); const s = lerp(t, t1, t1 + 0.25, 1, 0);
  return (
    <div style={{ position: "absolute", left: 0, width: 1080, top: y - size * 0.75, textAlign: "center", fontFamily: "RTP", fontSize: size, color,
      lineHeight: 1.05, opacity: Math.min(e, s), transform: `translateY(${(1 - e) * 50 + 4 * Math.sin(t * 2.1)}px) scale(${0.85 + 0.15 * e})`, textShadow: "0 4px 0 rgba(255,255,255,0.7)" }}>
      {children}
    </div>
  );
};
const Pastilla: React.FC<{ texto: React.ReactNode; bg?: string; fg?: string; size?: number; style?: React.CSSProperties }> = ({ texto, bg = BLANCO, fg = VINO, size = 40, style }) => (
  <div style={{ display: "inline-flex", alignItems: "center", gap: 14, background: bg, color: fg, fontFamily: "Inter", fontWeight: 800, fontSize: size,
    padding: `${size * 0.42}px ${size * 0.8}px`, borderRadius: 999, boxShadow: "0 10px 30px rgba(122,74,94,0.22)", whiteSpace: "nowrap", ...style }}>{texto}</div>
);

const Subtitulos: React.FC<{ t: number }> = ({ t }) => {
  let actual = -1;
  CHUNKS.forEach(([a, b], k) => {
    const ini = ta(a) - 0.08; const sig = k + 1 < CHUNKS.length ? ta(CHUNKS[k + 1][0]) - 0.08 : tz(b) + 0.9;
    if (t >= ini && t < Math.min(sig, tz(b) + 0.9)) actual = k;
  });
  if (actual < 0) return null;
  const [a, b] = CHUNKS[actual];
  const e = resorte(t, ta(a) - 0.08, { damping: 14, stiffness: 220, mass: 0.6 });
  const palabras = P.slice(a, b + 1);
  return (
    <div style={{ position: "absolute", left: 60, width: 960, top: 1440, display: "flex", justifyContent: "center", zIndex: 60 }}>
      <div style={{ background: "rgba(255,255,255,0.96)", borderRadius: 34, padding: "20px 34px", boxShadow: "0 14px 40px rgba(122,74,94,0.25)",
        fontFamily: "Inter", fontWeight: 800, fontSize: 60, lineHeight: 1.18, textAlign: "center", color: VINO,
        transform: `scale(${0.88 + 0.12 * e})`, opacity: e }}>
        {palabras.map((p, i) => {
          const activo = t >= p.a - 0.04;
          return <span key={i} style={{ color: activo ? (t < p.z + 0.12 ? ROSA : VINO) : "rgba(122,74,94,0.45)" }}>{p.w}{i < palabras.length - 1 ? " " : ""}</span>;
        })}
      </div>
    </div>
  );
};

// iconos de línea para lo que incluye
const Icono: React.FC<{ n: string }> = ({ n }) => {
  const st = { fill: "none", stroke: BLANCO, strokeWidth: 3.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const c: Record<string, React.ReactNode> = {
    tarjeta: <><rect x="8" y="14" width="40" height="28" rx="5" {...st} /><path d="M8 22h40M15 34h9" {...st} /></>,
    envio: <><path d="M6 16h26v20H6zM32 22h9l7 7v7H32z" {...st} /><circle cx="15" cy="39" r="4" {...st} /><circle cx="40" cy="39" r="4" {...st} /></>,
    tonos: <><circle cx="28" cy="28" r="19" {...st} /><circle cx="20" cy="21" r="3" fill={BLANCO} /><circle cx="31" cy="17" r="3" fill={BLANCO} /><circle cx="38" cy="27" r="3" fill={BLANCO} /><path d="M24 44c-4-4 3-8 6-5" {...st} /></>,
    inventario: <><path d="M28 7l19 10v22L28 49 9 39V17z M9 17l19 10 19-10M28 27v22" {...st} /></>,
    panel: <><rect x="11" y="9" width="34" height="40" rx="5" {...st} /><path d="M21 9v-2h14v2M18 22h20M18 30h20M18 38h12" {...st} /></>,
    cupon: <><path d="M7 18a4 4 0 0 0 0 8v8a4 4 0 0 0 0 8h42v-8a4 4 0 0 1 0-8v-8a4 4 0 0 1 0-8z" transform="translate(0 -4)" {...st} /><path d="M22 18l12 16M22 21h.1M34 31h.1" {...st} /></>,
    resena: <path d="M28 7l6.2 13.2 14.3 1.7-10.6 9.8 2.8 14.1L28 38.7l-12.7 7.1 2.8-14.1-10.6-9.8 14.3-1.7z" {...st} />,
    correo: <><rect x="7" y="13" width="42" height="30" rx="5" {...st} /><path d="M9 16l19 14 19-14" {...st} /></>,
  };
  return <svg width="62" height="62" viewBox="0 0 56 56">{c[n]}</svg>;
};

const Incluye: React.FC<{ t: number }> = ({ t }) => {
  if (t < T.incluye - 0.1 || t > T.yo + 0.6) return null;
  const sale = lerp(t, T.yo - 0.15, T.yo + 0.22, 0, 1, Easing.in(Easing.cubic));
  return (
    <>
      {ITEMS.map(([w, texto, ic], i) => {
        const e = resorte(t, ta(w) - 0.12, { damping: 12, stiffness: 160, mass: 0.6 });
        const col = i % 2, fila = Math.floor(i / 2);
        const x = 60 + col * 490, y = 345 + fila * 262;
        return (
          <div key={i} style={{ position: "absolute", left: x, top: y, width: 470, height: 238, borderRadius: 40, background: "rgba(255,255,255,0.97)",
            boxShadow: "0 16px 40px rgba(122,74,94,0.18)", display: "flex", flexDirection: "column", justifyContent: "center", gap: 16, padding: "0 34px", boxSizing: "border-box",
            opacity: e * (1 - sale), transform: `translateY(${(1 - e) * 80 - sale * 60 + 6 * Math.sin(t * 1.9 + i * 0.8)}px) scale(${0.8 + 0.2 * e}) rotate(${0.5 * Math.sin(t * 1.3 + i)}deg)` }}>
            <div style={{ width: 84, height: 84, borderRadius: 26, background: ROSA, display: "flex", alignItems: "center", justifyContent: "center" }}><Icono n={ic} /></div>
            <div style={{ fontFamily: "Inter", fontWeight: 800, fontSize: 37, lineHeight: 1.12, color: VINO }}>{texto}</div>
          </div>
        );
      })}
    </>
  );
};

const WhatsApp: React.FC<{ s: number }> = ({ s }) => (
  <svg width={s} height={s} viewBox="0 0 32 32"><path fill={BLANCO} d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3zm0 23.7a10.7 10.7 0 0 1-5.5-1.5l-.4-.2-3.9 1 1-3.8-.3-.4A10.7 10.7 0 1 1 16 26.7zm5.9-8c-.3-.2-1.9-.9-2.2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7.1a8.8 8.8 0 0 1-4.4-3.8c-.3-.6.3-.5 1-1.7.1-.2 0-.4 0-.5l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.9.4 3.6 3.6 0 0 0-1.1 2.7 6.3 6.3 0 0 0 1.3 3.3 14.4 14.4 0 0 0 5.5 4.9c2 .9 2.8 1 3.8.8a3.2 3.2 0 0 0 2.1-1.5 2.6 2.6 0 0 0 .2-1.5c-.1-.1-.3-.2-.6-.3z" /></svg>
);

// ---------- composición ----------
export const Promo: React.FC = () => {
  const t = useT();
  // celular: en la portada asoma inclinado; luego sube al centro; en «Incluye» sale por la izquierda
  const sube = lerp(t, T.mira - 0.3, T.mira + 0.55, 0, 1, Easing.inOut(Easing.cubic));
  let cy = 1440 - 580 * sube, rot = -7 * (1 - sube), esc = 0.94 + 0.06 * sube, cx = 540 + 70 * (1 - sube);
  const zoom = lerp(t, T.mis + 0.2, T.eligen - 0.2, 0, 1) * (1 - lerp(t, T.pagan + 0.3, T.yAmi, 0, 1));
  esc += 0.1 * zoom; cy += 40 * zoom;
  const sal = lerp(t, T.incluye - 0.05, T.incluye + 0.45, 0, 1, Easing.in(Easing.cubic));
  cx -= 1150 * sal; rot -= 12 * sal;
  const mostrarCel = t < T.incluye + 0.5;
  // flotado suave continuo para que nunca se vea quieto
  cy += 9 * Math.sin(t * 1.7); rot += 0.7 * Math.sin(t * 1.15 + 0.6); esc *= 1 + 0.008 * Math.sin(t * 0.9);

  // logo: grande en la portada, luego chico arriba
  const lg = lerp(t, T.mira - 0.2, T.mira + 0.35, 0, 1, Easing.inOut(Easing.cubic));
  const logoAncho = 860 - 560 * lg, logoY = 205 - 120 * lg;
  const logoVisible = t < T.yo;
  const tituloSale = lerp(t, T.mira - 0.25, T.mira + 0.1, 1, 0);

  // cierre
  const c0 = T.yo + 0.25;
  const eLogo = resorte(t, c0, { damping: 11, stiffness: 120, mass: 0.8 });
  const eMasc = resorte(t, c0 + 0.25);
  const eTexto = resorte(t, ta(77));
  const eBoton = resorte(t, ta(80) - 0.1, { damping: 9, stiffness: 140, mass: 0.7 });
  const pulso = t > ta(80) + 0.4 ? 1 + 0.035 * Math.sin((t - ta(80)) * 6.5) : 1;

  return (
    <AbsoluteFill style={{ background: CLARO }}>
      <Audio src={staticFile("audio/mezcla.wav")} />
      <Fondo t={t} />

      {/* mascota en la portada */}
      {t < T.mira + 0.6 && (
        <Img src={staticFile("marca/mascot.png")} style={{ position: "absolute", left: 700, top: 1360 + 600 * lerp(t, T.mira - 0.35, T.mira + 0.4, 0, 1, Easing.in(Easing.cubic)), width: 420,
          transform: `rotate(${8 + 3 * Math.sin(t * 5)}deg)`, filter: "drop-shadow(0 18px 24px rgba(122,74,94,0.35))", zIndex: 3 }} />
      )}

      {mostrarCel && (
        <div style={{ position: "absolute", left: cx, top: cy, transform: `translate(-50%,-50%) rotate(${rot}deg) scale(${esc})`, zIndex: 2 }}>
          <Celular t={t} />
        </div>
      )}

      {/* logo */}
      {logoVisible && (
        <Img src={staticFile("marca/logo-wordmark-2x.png")} style={{ position: "absolute", left: 540 - logoAncho / 2, top: logoY - logoAncho * 0.161, width: logoAncho, zIndex: 10,
          filter: "drop-shadow(0 6px 0 rgba(255,255,255,0.9)) drop-shadow(0 12px 22px rgba(122,74,94,0.25))", opacity: 1 - lerp(t, T.yo - 0.3, T.yo, 0, 1) }} />
      )}

      {/* portada: la pregunta, con las palabras que se iluminan cuando las dice */}
      {tituloSale > 0 && (
        <div style={{ position: "absolute", left: 40, width: 1000, top: 410, textAlign: "center", fontFamily: "RTP", fontSize: 124, lineHeight: 1.0, color: VINO, zIndex: 11,
          opacity: tituloSale, transform: `scale(${0.9 + 0.1 * tituloSale})`, textShadow: "0 5px 0 rgba(255,255,255,0.85)" }}>
          {P.slice(0, 6).map((p, i) => (
            <span key={i} style={{ color: t >= p.a ? ROSA : VINO }}>{p.w}{i === 2 ? <br /> : " "}</span>
          ))}
        </div>
      )}

      {/* títulos por escena */}
      <Titulo t={t} t0={T.mira} t1={T.mis - 0.15}>Así se ve la mía</Titulo>
      <Titulo t={t} t0={T.mis} t1={T.eligen - 0.1}>Compran desde el celular</Titulo>
      <Titulo t={t} t0={T.eligen} t1={T.pagan - 0.1}>Eligen su tono</Titulo>
      <Titulo t={t} t0={T.pagan} t1={T.yAmi - 0.1}>Pagan</Titulo>
      <Titulo t={t} t0={T.yAmi} t1={T.tuya - 0.3} color={ROSA}>¡Te llega el pedido!</Titulo>
      <Titulo t={t} t0={T.tuya - 0.2} t1={T.incluye - 0.15}>Con <span style={{ color: ROSA }}>TU</span> marca</Titulo>
      <Titulo t={t} t0={T.incluye} t1={T.yo - 0.1} size={100}>Todo incluido</Titulo>

      {/* «tu marca, tus colores, tu logo» alrededor del celular */}
      {t > T.marca - 0.2 && t < T.incluye + 0.3 && (() => {
        const sale = lerp(t, T.incluye - 0.1, T.incluye + 0.25, 1, 0);
        const e1 = resorte(t, T.marca - 0.1), e2 = resorte(t, T.colores - 0.1), e3 = resorte(t, T.logo - 0.1);
        return (
          <>
            <div style={{ position: "absolute", left: 30, top: 560, transform: `scale(${e1}) rotate(-4deg)`, opacity: sale, zIndex: 12 }}><Pastilla texto="Tu marca" bg={MORA[0]} fg={BLANCO} /></div>
            <div style={{ position: "absolute", right: 30, top: 820, transform: `scale(${e2}) rotate(3deg)`, opacity: sale, zIndex: 12, textAlign: "center" }}>
              <Pastilla texto="Tus colores" bg={MORA[1]} fg={BLANCO} />
              <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 16 }}>
                {MORA.map((c, i) => <div key={i} style={{ width: 54, height: 54, borderRadius: 27, background: c, border: "5px solid white", boxShadow: "0 6px 14px rgba(0,0,0,0.15)",
                  transform: `scale(${resorte(t, T.colores + 0.1 + i * 0.08)})` }} />)}
              </div>
            </div>
            <div style={{ position: "absolute", left: 30, top: 1120, transform: `scale(${e3}) rotate(-3deg)`, opacity: sale, zIndex: 12 }}>
              <Pastilla texto={<>Tu logo <div style={{ width: 152, height: 44, overflow: "hidden", position: "relative", marginLeft: 6 }}>
                <Img src={staticFile("pantallas/mora-inicio.png")} style={{ position: "absolute", width: 390 * 1.24, left: -62 * 1.24, top: -49 * 1.24 }} /></div></>} />
            </div>
          </>
        );
      })()}

      <Incluye t={t} />

      {/* cierre */}
      {t > c0 - 0.05 && (
        <>
          <Img src={staticFile("marca/logo-wordmark-2x.png")} style={{ position: "absolute", left: 90, top: 330, width: 900, zIndex: 20,
            transform: `scale(${(0.5 + 0.5 * eLogo) * (1 + 0.012 * Math.sin(t * 2.2))}) rotate(${0.8 * Math.sin(t * 1.4)}deg)`, opacity: Math.min(1, eLogo * 1.5), filter: "drop-shadow(0 7px 0 rgba(255,255,255,0.95)) drop-shadow(0 16px 28px rgba(122,74,94,0.28))" }} />
          <div style={{ position: "absolute", left: 0, width: 1080, top: 640, textAlign: "center", fontFamily: "Inter", fontWeight: 700, fontSize: 44, color: VINO, opacity: eLogo, zIndex: 20 }}>
            Tiendas en línea con tu marca
          </div>
          <Img src={staticFile("marca/mascot.png")} style={{ position: "absolute", left: 540 - 210, top: 720 + 30 * (1 - eMasc) + 10 * Math.sin(t * 4), width: 420, zIndex: 19,
            opacity: eMasc, transform: `scale(${0.6 + 0.4 * eMasc})`, filter: "drop-shadow(0 20px 26px rgba(122,74,94,0.3))" }} />
          <div style={{ position: "absolute", left: 0, width: 1080, top: 1170, display: "flex", justifyContent: "center", zIndex: 21,
            transform: `scale(${eBoton * pulso})`, opacity: Math.min(1, eBoton * 1.4) }}>
            <Pastilla texto={<><WhatsApp s={50} />Escríbeme por mensaje o WhatsApp</>} bg={ROSA} fg={BLANCO} size={42} />
          </div>
        </>
      )}

      <Subtitulos t={t} />
    </AbsoluteFill>
  );
};
