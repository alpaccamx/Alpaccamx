import React from "react";
import { Composition } from "remotion";
import { Analisis } from "./Analisis";
import datos from "./datos.json";

export const RemotionRoot: React.FC = () => (
  <Composition id="Analisis" component={Analisis} durationInFrames={datos.total} fps={datos.fps} width={1920} height={1080} />
);
