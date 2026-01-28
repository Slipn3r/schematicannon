import { VisualizationContext } from '../visualization/VisualizationContext';

export interface Visual {
  update(partialTick: number): void;
  updateLight(partialTick: number): void;
  delete(): void;
}

export interface DynamicVisual extends Visual {
  beginFrame(context: VisualizationContext): void;
}
