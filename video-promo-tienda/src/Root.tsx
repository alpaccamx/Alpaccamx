import React from "react";
import { Composition } from "remotion";
import { Promo } from "./Promo";
import { Portada } from "./Portada";
import datos from "./datos.json";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Promo" component={Promo} durationInFrames={Math.ceil(datos.total * 30)} fps={30} width={1080} height={1920} />
    <Composition id="Portada" component={Portada} durationInFrames={1} fps={30} width={1080} height={1920} />
  </>
);
