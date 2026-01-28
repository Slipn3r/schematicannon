import { BlockPos } from 'deepslate/core';
import { Visual } from '../../api/visual/Visual';
import { VisualizationContext } from '../../api/visualization/VisualizationContext';

export abstract class AbstractBlockEntityVisual implements Visual {
  constructor (
    protected readonly context: VisualizationContext,
    protected readonly pos: BlockPos
  ) {
  }

  abstract update (partialTick: number): void;
  abstract updateLight (partialTick: number): void;
  abstract delete (): void;

  protected getVisualPosition (): [number, number, number] {
    return [this.pos[0], this.pos[1], this.pos[2]];
  }
}
