import { BlockPos } from 'deepslate/core';
import { DynamicVisual } from '../../api/visual/Visual';
import { VisualizationContext } from '../../api/visualization/VisualizationContext';
import { InstanceTypes } from '../instance/InstanceTypes';
import { TransformedInstance } from '../instance/TransformedInstance';
import { AbstractBlockEntityVisual } from './AbstractBlockEntityVisual';
import { Vec3 } from 'src/api/viewer';

export class RotatingVisual extends AbstractBlockEntityVisual implements DynamicVisual {
  private readonly instance: TransformedInstance;
  private rotation: number = 0;
  private readonly speed: number; // Radians per tick

  constructor (
    context: VisualizationContext,
    pos: BlockPos,
    private model: unknown, // The mesh/model object
    private axis: 'x' | 'y' | 'z' = 'y',
    speed = 0.5
  ) {
    super(context, pos);
    this.speed = speed;

    this.instance = context.instancerProvider()
      .instancer(InstanceTypes.TRANSFORMED, model)
      .createInstance();

    this.instance.setPosition(pos);
    this.instance.translate(pos[0], pos[1], pos[2]);
    // Center for rotation
    this.instance.translate(0.5, 0.5, 0.5);
  }

  beginFrame (context: VisualizationContext): void {
    const pt = context.partialTick();
    const angle = this.rotation + (this.speed * pt);

    // Reset transform to base + rotation
    this.instance.setIdentity();
    this.instance.translate(this.pos[0] + 0.5, this.pos[1] + 0.5, this.pos[2] + 0.5);

    const axisVec = [0, 1, 0];
    if (this.axis === 'x') {
      axisVec[0] = 1;
      axisVec[1] = 0;
    }
    if (this.axis === 'z') {
      axisVec[2] = 1;
      axisVec[1] = 0;
    }

    this.instance.rotate(angle, axisVec as Vec3);
    this.instance.translate(-0.5, -0.5, -0.5); // Un-center
  }

  update (_partialTick: number): void {
    // Ticking update
    this.rotation += this.speed;
    this.rotation %= (Math.PI * 2);
  }

  updateLight (_partialTick: number): void {
    // TODO: Update light
  }

  delete (): void {
    this.instance.delete();
  }
}
