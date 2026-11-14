// Video del "Análisis posterior" de la entrevista a la Mtra. Laura (Psicología Educativa).
// Una diapositiva por sección (datos.json, generado por ../datos.py con los tiempos de la voz), subtítulos
// sincronizados palabra por palabra y la narración (public/narracion.wav). 1920x1080, 30 fps.
import React, { useEffect, useState } from "react";
import { AbsoluteFill, Audio, Sequence, continueRender, delayRender, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import datos from "./datos.json";

type Idea = { texto: string; f: number };
type Dia = { n: number; tipo: string; titulo: string; autor: string; frase: string; ideas: Idea[]; desde: number; dura: number };

const TINTA = "#2E2A3A";
const FONDO = "#FFF8EF";
// colores suaves tipo preescolar: [pastel, fuerte]
const PALETA: [string, string][] = [
  ["#FFD6E0", "#D9486F"], ["#C9F2E3", "#23896A"], ["#DDD8FF", "#6151CC"], ["#FFE9B8", "#B57A00"],
  ["#CDEBFF", "#2A74B8"], ["#FFDCC7", "#D25E25"],
];
const color = (n: number) => PALETA[(n - 1) % PALETA.length];

// ---------- letra Poppins (archivos locales) ----------
const PESOS: [string, number][] = [["Medium", 500], ["SemiBold", 600], ["Bold", 700], ["ExtraBold", 800]];
const useFuentes = () => {
  const [h] = useState(() => delayRender("fuentes"));
  useEffect(() => {
    Promise.all(PESOS.map(([n, w]) => new FontFace("Poppins", `url(${staticFile(`fonts/Poppins-${n}.ttf`)})`, { weight: String(w) }).load()))
      .then((fs) => { fs.forEach((f) => (document as any).fonts.add(f)); continueRender(h); });
  }, [h]);
};

const entra = (frame: number, desde: number, fps: number) =>
  spring({ frame: frame - desde, fps, config: { damping: 14, stiffness: 120, mass: 0.7 } });

// ---------- adornos: círculos suaves que flotan ----------
const Adornos: React.FC<{ n: number }> = ({ n }) => {
  const f = useCurrentFrame();
  const [pastel] = color(n); const [p2] = color(n + 2); const [p3] = color(n + 4);
  const bola = (x: number, y: number, r: number, c: string, fase: number) => (
    <div style={{ position: "absolute", left: x + Math.sin(f / 70 + fase) * 18, top: y + Math.cos(f / 85 + fase) * 14, width: r, height: r,
      borderRadius: "50%", background: c, opacity: 0.55 }} />
  );
  return (
    <>
      {bola(-120, -140, 420, pastel, 0)}{bola(1650, -90, 300, p2, 1)}{bola(1720, 760, 260, p3, 2)}
      {bola(-60, 820, 200, p2, 3)}{bola(880, -60, 90, p3, 4)}
    </>
  );
};

// ---------- encabezado: materia y avance ----------
const Avance: React.FC<{ n: number }> = ({ n }) => (
  <div style={{ position: "absolute", top: 44, right: 70, display: "flex", gap: 12 }}>
    {datos.dias.map((d: Dia) => (
      <div key={d.n} style={{ width: d.n === n ? 34 : 14, height: 14, borderRadius: 7,
        background: d.n <= n ? color(n)[1] : "#E6DFD6" }} />
    ))}
  </div>
);

const Etiqueta: React.FC = () => (
  <div style={{ position: "absolute", top: 36, left: 110, fontSize: 24, fontWeight: 600, color: "#8A8296", letterSpacing: 1 }}>
    PSICOLOGÍA EDUCATIVA · ANÁLISIS POSTERIOR DE LA ENTREVISTA
  </div>
);

// ---------- diapositiva de autor / enfoque ----------
const DiaAutor: React.FC<{ d: Dia }> = ({ d }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const [pastel, fuerte] = color(d.n);
  const t = entra(f, 0, fps), a = entra(f, 8, fps), q = entra(f, 18, fps), c = entra(f, 26, fps);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 110, top: 100, transform: `translateY(${(1 - t) * 30}px)`, opacity: t }}>
        <div style={{ fontSize: 30, fontWeight: 700, color: fuerte }}>Parte {d.n - 1} de {datos.dias.length - 2}</div>
        <div style={{ fontSize: 76, fontWeight: 800, color: TINTA, lineHeight: 1.05, marginTop: 6 }}>{d.titulo}</div>
      </div>
      <div style={{ position: "absolute", left: 110, top: 252, opacity: a, transform: `scale(${0.85 + 0.15 * a})`, transformOrigin: "left center",
        background: fuerte, color: "white", fontSize: 34, fontWeight: 700, padding: "12px 30px", borderRadius: 40 }}>{d.autor}</div>
      {/* frase clave de la teoría */}
      <div style={{ position: "absolute", left: 110, top: 360, width: 760, opacity: q, transform: `translateY(${(1 - q) * 40}px)`,
        background: pastel, borderRadius: 36, padding: "36px 44px 40px" }}>
        <div style={{ fontSize: 26, fontWeight: 700, color: fuerte, letterSpacing: 1 }}>FRASE CLAVE</div>
        <div style={{ fontSize: 120, lineHeight: 0.6, color: fuerte, fontWeight: 800, marginTop: 18 }}>“</div>
        <div style={{ fontSize: 42, fontWeight: 600, color: TINTA, lineHeight: 1.28 }}>{d.frase}</div>
      </div>
      {/* lo que hace la maestra */}
      <div style={{ position: "absolute", left: 960, top: 230, width: 850, opacity: c, transform: `translateY(${(1 - c) * 40}px)`,
        background: "white", borderRadius: 36, padding: "34px 40px 30px", boxShadow: "0 18px 50px rgba(80,60,90,0.12)" }}>
        <div style={{ fontSize: 26, fontWeight: 700, color: fuerte, letterSpacing: 1, marginBottom: 14 }}>LO QUE HACE LA MAESTRA LAURA</div>
        {d.ideas.map((i, k) => {
          const s = entra(f, i.f - 6, fps);
          return (
            <div key={k} style={{ display: "flex", gap: 20, alignItems: "flex-start", margin: "16px 0", opacity: s, transform: `translateX(${(1 - s) * 40}px)` }}>
              <div style={{ flex: "0 0 auto", width: 46, height: 46, borderRadius: 23, background: pastel, color: fuerte, fontWeight: 800,
                fontSize: 26, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2 }}>{k + 1}</div>
              <div style={{ fontSize: d.ideas.length > 3 ? 31 : 34, fontWeight: 500, color: TINTA, lineHeight: 1.3 }}>{i.texto}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---------- introducción ----------
const DiaIntro: React.FC<{ d: Dia }> = ({ d }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const [pastel, fuerte] = color(d.n);
  const t = entra(f, 0, fps), q = entra(f, 30, fps), c = entra(f, d.ideas[0].f - 20, fps);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 110, top: 120, width: 820, opacity: t, transform: `translateY(${(1 - t) * 30}px)` }}>
        <div style={{ display: "inline-block", background: fuerte, color: "white", fontSize: 30, fontWeight: 700, padding: "10px 26px", borderRadius: 36 }}>{d.autor}</div>
        <div style={{ fontSize: 84, fontWeight: 800, color: TINTA, lineHeight: 1.05, marginTop: 26 }}>{d.titulo}</div>
        <div style={{ fontSize: 36, fontWeight: 600, color: "#6E6678", marginTop: 18 }}>Entrevista a una directora de preescolar</div>
      </div>
      <div style={{ position: "absolute", left: 110, top: 600, width: 780, opacity: q, background: pastel, borderRadius: 32, padding: "28px 38px" }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: fuerte, letterSpacing: 1 }}>OBJETIVO</div>
        <div style={{ fontSize: 36, fontWeight: 600, color: TINTA, lineHeight: 1.3, marginTop: 6 }}>{d.frase.replace("Objetivo: ", "")}</div>
      </div>
      <div style={{ position: "absolute", left: 990, top: 190, width: 820, opacity: c, transform: `translateY(${(1 - c) * 40}px)`,
        background: "white", borderRadius: 36, padding: "36px 42px", boxShadow: "0 18px 50px rgba(80,60,90,0.12)" }}>
        <div style={{ fontSize: 26, fontWeight: 700, color: fuerte, letterSpacing: 1, marginBottom: 10 }}>LA ENTREVISTADA</div>
        {d.ideas.map((i, k) => {
          const s = entra(f, i.f - 6, fps);
          return <div key={k} style={{ fontSize: 34, fontWeight: k === 0 ? 700 : 500, color: TINTA, margin: "18px 0", lineHeight: 1.3,
            opacity: s, transform: `translateX(${(1 - s) * 40}px)`, borderLeft: `8px solid ${pastel}`, paddingLeft: 22 }}>{i.texto}</div>;
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---------- propuestas: cuatro tarjetas ----------
const DiaPropuestas: React.FC<{ d: Dia }> = ({ d }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const t = entra(f, 0, fps);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 110, top: 100, opacity: t }}>
        <div style={{ fontSize: 30, fontWeight: 700, color: color(d.n)[1] }}>{d.autor}</div>
        <div style={{ fontSize: 76, fontWeight: 800, color: TINTA }}>{d.titulo}</div>
      </div>
      <div style={{ position: "absolute", left: 110, top: 290, width: 1700, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 34 }}>
        {d.ideas.map((i, k) => {
          const s = entra(f, i.f - 6, fps); const [pastel, fuerte] = PALETA[(k + 1) % PALETA.length];
          return (
            <div key={k} style={{ background: pastel, borderRadius: 32, padding: "30px 36px", minHeight: 230, opacity: s,
              transform: `scale(${0.9 + 0.1 * s})`, display: "flex", gap: 24 }}>
              <div style={{ flex: "0 0 auto", width: 70, height: 70, borderRadius: 35, background: fuerte, color: "white", fontSize: 38,
                fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{k + 1}</div>
              <div style={{ fontSize: 33, fontWeight: 600, color: TINTA, lineHeight: 1.3 }}>{i.texto}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---------- conclusión ----------
const DiaConclusion: React.FC<{ d: Dia }> = ({ d }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const t = entra(f, 0, fps); const ult = d.ideas[d.ideas.length - 1].f;
  const q = entra(f, ult + 40, fps); const g = entra(f, d.dura - 110, fps);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 110, top: 100, width: 1700, opacity: t }}>
        <div style={{ fontSize: 76, fontWeight: 800, color: TINTA }}>{d.titulo}</div>
        <div style={{ fontSize: 36, fontWeight: 600, color: "#6E6678", marginTop: 4 }}>{d.autor}</div>
      </div>
      <div style={{ position: "absolute", left: 110, top: 300, width: 1700, display: "flex", flexWrap: "wrap", gap: 22 }}>
        {d.ideas.map((i, k) => {
          const s = entra(f, i.f - 6, fps); const [pastel, fuerte] = PALETA[k % PALETA.length];
          return <div key={k} style={{ background: pastel, color: fuerte, fontSize: 38, fontWeight: 700, padding: "18px 34px", borderRadius: 44,
            opacity: s, transform: `scale(${0.8 + 0.2 * s})` }}>{i.texto}</div>;
        })}
      </div>
      <div style={{ position: "absolute", left: 110, top: 700, width: 1100, opacity: q, background: "white", borderRadius: 32, padding: "28px 38px",
        boxShadow: "0 18px 50px rgba(80,60,90,0.12)", fontSize: 38, fontWeight: 600, color: TINTA }}>{d.frase}</div>
      <div style={{ position: "absolute", right: 120, top: 700, opacity: g, transform: `scale(${0.8 + 0.2 * g}) rotate(-4deg)`,
        background: color(d.n)[1], color: "white", fontSize: 54, fontWeight: 800, padding: "22px 44px", borderRadius: 40 }}>¡Gracias!</div>
    </AbsoluteFill>
  );
};

// ---------- subtítulos sincronizados (la palabra que se dice va resaltada) ----------
const Subtitulos: React.FC = () => {
  const f = useCurrentFrame();
  const s = datos.subs.find((x: any) => f >= x.a && f < x.b);
  if (!s) return null;
  const d = datos.dias.find((x: Dia) => f >= x.desde && f < x.desde + x.dura) || datos.dias[0];
  const fuerte = color(d.n)[1];
  const o = interpolate(f, [s.a, s.a + 4], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 46, display: "flex", justifyContent: "center", opacity: o }}>
      <div style={{ maxWidth: 1500, background: "rgba(46,42,58,0.86)", borderRadius: 26, padding: "16px 34px", textAlign: "center",
        fontSize: 40, fontWeight: 600, color: "white", lineHeight: 1.3 }}>
        {s.palabras.map((p: any, k: number) => (
          <span key={k} style={{ color: f >= p.a && f < (s.palabras[k + 1]?.a ?? s.b) ? "#FFD36E" : "white" }}>{p.w} </span>
        ))}
      </div>
    </div>
  );
};

export const Analisis: React.FC = () => {
  useFuentes();
  return (
    <AbsoluteFill style={{ background: FONDO, fontFamily: "Poppins, sans-serif" }}>
      <Audio src={staticFile("narracion.wav")} />
      {datos.dias.map((d: Dia) => (
        <Sequence key={d.n} from={d.desde} durationInFrames={d.dura}>
          <Transicion dura={d.dura}>
            <Adornos n={d.n} />
            <Etiqueta />
            <Avance n={d.n} />
            {d.tipo === "intro" ? <DiaIntro d={d} /> : d.tipo === "propuestas" ? <DiaPropuestas d={d} /> :
              d.tipo === "conclusion" ? <DiaConclusion d={d} /> : <DiaAutor d={d} />}
          </Transicion>
        </Sequence>
      ))}
      <Subtitulos />
    </AbsoluteFill>
  );
};

// entra y sale suave entre diapositivas
const Transicion: React.FC<{ dura: number; children: React.ReactNode }> = ({ dura, children }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 10, dura - 10, dura], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};
