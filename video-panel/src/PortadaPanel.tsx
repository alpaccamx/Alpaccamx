import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { ROSA, MEDIO, VINO_OSC, BLANCO, SW, SH, STATUS, BarraEstado, Fondo, MENSAJES } from "./Panel";

export const PortadaPanel: React.FC = () => (
  <AbsoluteFill>
    <Fondo t={1.3} />
    {/* mensajes de clientas: dos filas completas, sin nada encima */}
    {[["¿Precio? 🙏", 60, 640, -3], ["¿Todavía lo tienes?", 1020, 650, 3], ["Ya te transferí, ¿lo viste?", 60, 790, 2], ["¿Precio??", 1020, 800, -3]].map(([m, x, y, g], i) => (
      <div key={i} style={{ position: "absolute", top: y as number, left: (x as number) < 540 ? (x as number) : undefined, right: (x as number) > 540 ? 1080 - (x as number) : undefined,
        transform: `rotate(${g}deg)`, zIndex: 5 }}>
        <div style={{ background: BLANCO, color: "#111", fontFamily: "Inter", fontWeight: 600, fontSize: 42, padding: "18px 30px", borderRadius: 30, whiteSpace: "nowrap",
          boxShadow: "0 10px 26px rgba(20,4,12,0.4)" }}>{m}</div>
      </div>
    ))}
    {/* celular con el panel */}
    <div style={{ position: "absolute", left: 540, top: 1440, transform: "translate(-50%,-50%) rotate(-3deg) scale(0.78)", zIndex: 6 }}>
      <div style={{ position: "relative", width: SW + 32, height: SH + 32 }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: 92, background: "linear-gradient(135deg,#f6eff2 0%,#c7bac1 45%,#efe7eb 100%)", boxShadow: "0 60px 100px -30px rgba(20,4,12,0.8)" }} />
        <div style={{ position: "absolute", inset: 4, borderRadius: 88, background: "#0d0d0f" }} />
        <div style={{ position: "absolute", left: 16, top: 16, width: SW, height: SH, borderRadius: 72, overflow: "hidden", background: BLANCO }}>
          <Img src={staticFile("inicio-panel.png")} style={{ position: "absolute", left: 0, top: STATUS, width: SW }} />
          <BarraEstado />
          <div style={{ position: "absolute", left: SW / 2 - 66, top: 12, width: 132, height: 38, borderRadius: 19, background: "#000", zIndex: 10 }} />
        </div>
      </div>
    </div>
    {/* etiqueta: encima de todo y sin nada que la tape */}
    <div style={{ position: "absolute", left: 0, width: 1080, top: 935, display: "flex", justifyContent: "center", zIndex: 9 }}>
      <div style={{ background: ROSA, color: BLANCO, fontFamily: "Inter", fontWeight: 800, fontSize: 36, padding: "14px 30px", borderRadius: 20, transform: "rotate(-3deg)",
        boxShadow: "0 10px 24px rgba(20,4,12,0.45)", letterSpacing: 1.5 }}>TIENDA DE EJEMPLO</div>
    </div>
    {/* titular */}
    <div style={{ position: "absolute", left: 0, width: 1080, top: 150, textAlign: "center", fontFamily: "RTP", color: BLANCO, lineHeight: 1.0, textShadow: `0 7px 0 ${VINO_OSC}` }}>
      <div style={{ fontSize: 104 }}>Adiós al</div>
      <div style={{ fontSize: 150, color: MEDIO }}>«¿precio?»</div>
    </div>
    <div style={{ position: "absolute", left: 0, width: 1080, top: 460, display: "flex", justifyContent: "center" }}>
      <div style={{ background: BLANCO, color: ROSA, fontFamily: "RTP", fontSize: 70, padding: "8px 38px 16px", borderRadius: 24, transform: "rotate(-2deg)",
        boxShadow: `0 9px 0 ${VINO_OSC}, 0 20px 40px rgba(20,4,12,0.4)` }}>Así se maneja tu tienda</div>
    </div>
  </AbsoluteFill>
);
