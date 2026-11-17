import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { ROSA, CLARO, MEDIO, VINO, BLANCO, SW, SH, BarraEstado, PaginaLarga, Destello, WhatsApp, Pastilla } from "./Promo";

// celular quieto con una página
const Cel: React.FC<{ src: string; scroll?: number }> = ({ src, scroll = 0 }) => (
  <div style={{ position: "relative", width: SW + 32, height: SH + 32 }}>
    <div style={{ position: "absolute", inset: 0, borderRadius: 86, background: "linear-gradient(135deg,#ffffff 0%,#d9cdd3 45%,#f4eef1 100%)",
      boxShadow: "0 50px 80px -20px rgba(70,10,40,0.55), 0 0 0 6px rgba(255,255,255,0.35)" }} />
    <div style={{ position: "absolute", inset: 4, borderRadius: 82, background: "#0d0d0f" }} />
    <div style={{ position: "absolute", left: 16, top: 16, width: SW, height: SH, borderRadius: 66, overflow: "hidden", background: BLANCO }}>
      <PaginaLarga src={src} scroll={scroll} />
      <BarraEstado />
      <div style={{ position: "absolute", left: SW / 2 - 64, top: 13, width: 128, height: 38, borderRadius: 19, background: "#000", zIndex: 10 }} />
    </div>
  </div>
);

// sello de estrella con picos
const Sello: React.FC<{ s: number; children: React.ReactNode }> = ({ s, children }) => {
  const n = 18, pts: string[] = [];
  for (let i = 0; i < n * 2; i++) { const r = i % 2 ? 0.86 : 1, a = (Math.PI * i) / n; pts.push(`${50 + 50 * r * Math.sin(a)},${50 - 50 * r * Math.cos(a)}`); }
  return (
    <div style={{ position: "relative", width: s, height: s }}>
      <svg width={s} height={s} viewBox="0 0 100 100" style={{ position: "absolute", filter: "drop-shadow(0 12px 18px rgba(70,10,40,0.45))" }}>
        <polygon points={pts.join(" ")} fill={VINO} /><circle cx="50" cy="50" r="40" fill="none" stroke={MEDIO} strokeWidth="1.2" strokeDasharray="2 2" />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center",
        fontFamily: "RTP", color: BLANCO, lineHeight: 0.95 }}>{children}</div>
    </div>
  );
};

export const Portada: React.FC = () => (
  <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 42%, #F06AA6 0%, ${ROSA} 45%, #B8306F 100%)`, overflow: "hidden" }}>
    {/* rayos de luz */}
    <div style={{ position: "absolute", left: -500, top: -300, width: 2080, height: 2080,
      background: "repeating-conic-gradient(from 0deg at 50% 50%, rgba(255,255,255,0.10) 0deg 9deg, rgba(255,255,255,0) 9deg 20deg)",
      WebkitMaskImage: "radial-gradient(circle, black 20%, transparent 70%)" }} />
    {/* puntitos */}
    <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,0.18) 3px, transparent 3.5px)", backgroundSize: "44px 44px",
      WebkitMaskImage: "linear-gradient(180deg, black 0%, transparent 35%, transparent 70%, black 100%)" }} />

    {/* logo en etiqueta blanca */}
    <div style={{ position: "absolute", left: 540 - 320, top: 250, width: 640, height: 180, borderRadius: 90, background: BLANCO, transform: "rotate(-3deg)",
      boxShadow: "0 18px 40px rgba(70,10,40,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Img src={staticFile("marca/logo-wordmark-2x.png")} style={{ width: 490 }} />
    </div>

    {/* titular */}
    <div style={{ position: "absolute", left: 0, width: 1080, top: 468, textAlign: "center", fontFamily: "RTP", fontSize: 112, color: BLANCO, lineHeight: 1,
      textShadow: `0 6px 0 ${VINO}, 0 14px 30px rgba(70,10,40,0.35)` }}>¿Quieres tu propia</div>
    <div style={{ position: "absolute", left: 60, width: 960, top: 600, display: "flex", justifyContent: "center" }}>
      <div style={{ background: BLANCO, borderRadius: 26, padding: "6px 40px 18px", transform: "rotate(-2deg)", boxShadow: `0 10px 0 ${VINO}, 0 22px 40px rgba(70,10,40,0.35)`,
        fontFamily: "RTP", fontSize: 148, color: ROSA, lineHeight: 1.05, whiteSpace: "nowrap" }}>tienda en línea?</div>
    </div>

    {/* dos celulares: la mía y una de ejemplo con otra marca */}
    <div style={{ position: "absolute", left: 300, top: 1290, transform: "translate(-50%,-50%) rotate(-11deg) scale(0.74)" }}><Cel src="pantallas/mora-inicio.png" /></div>
    <div style={{ position: "absolute", left: 760, top: 1260, transform: "translate(-50%,-50%) rotate(8deg) scale(0.8)" }}><Cel src="pantallas/alpacca-inicio.png" /></div>

    {/* sello */}
    <div style={{ position: "absolute", left: 790, top: 840, transform: "rotate(12deg)" }}>
      <Sello s={270}><span style={{ fontSize: 46 }}>¡Con</span><span style={{ fontSize: 66, color: MEDIO }}>TU</span><span style={{ fontSize: 46 }}>marca!</span></Sello>
    </div>

    {/* mascota */}
    <Img src={staticFile("marca/mascot.png")} style={{ position: "absolute", left: -40, top: 1350, width: 430, transform: "rotate(-8deg)",
      filter: "drop-shadow(0 20px 26px rgba(70,10,40,0.45))" }} />

    {/* llamado */}
    <div style={{ position: "absolute", left: 0, width: 1080, top: 1700, display: "flex", justifyContent: "center" }}>
      <Pastilla texto={<><WhatsApp s={46} />¡Escríbeme y la hacemos juntas!</>} bg={VINO} fg={BLANCO} size={40} />
    </div>

    <Destello x={120} y={170} s={70} t={0} />
    <Destello x={960} y={150} s={90} t={0} fase={1} />
    <Destello x={90} y={820} s={56} t={0} fase={2} c={CLARO} />
    <Destello x={1010} y={1500} s={64} t={0} fase={3} />
    <Destello x={180} y={1260} s={44} t={0} fase={4} c={CLARO} />
  </AbsoluteFill>
);
