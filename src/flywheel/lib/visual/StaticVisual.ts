import { BlockPos } from 'deepslate/core';
import { VisualizationContext } from '../../api/visualization/VisualizationContext';
import { InstanceTypes } from '../instance/InstanceTypes';
import { TransformedInstance } from '../instance/TransformedInstance';
import { AbstractBlockEntityVisual } from './AbstractBlockEntityVisual';

export class StaticVisual extends AbstractBlockEntityVisual {
  private readonly instance: TransformedInstance;

  constructor (
    context: VisualizationContext,
    pos: BlockPos,
    model: unknown
  ) {
    super(context, pos);

    this.instance = context.instancerProvider()
      .instancer(InstanceTypes.TRANSFORMED, model)
      .createInstance();

    this.instance.setPosition(pos);
    this.instance.setIdentity();
    this.instance.translate(pos[0], pos[1], pos[2]);
  }

  update (_partialTick: number): void {
    // No-op
  }

  beginFrame (_context: unknown): void {
    // No-op for static visuals
  }

  updateLight (_partialTick: number): void {
    // TODO: Update light
  }

  delete (): void {
    this.instance.delete();
  }
}
