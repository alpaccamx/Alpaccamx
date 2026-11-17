import React from "react";
import { Composition } from "remotion";
import { Panel } from "./Panel";
import datos from "./datos.json";

export const RemotionRoot: React.FC = () => (
  <Composition id="Panel" component={Panel} durationInFrames={Math.ceil(datos.total * 30)} fps={30} width={1080} height={1920} />
);
