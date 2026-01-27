import { Instance } from '../instance/Instance';
import { Instancer } from '../instance/Instancer';
import { InstanceType } from '../instance/InstanceType';

export interface InstancerProvider {
  instancer<D extends Instance>(type: InstanceType<D>, model: unknown): Instancer<D>;
}

export interface VisualizationContext {
  instancerProvider(): InstancerProvider;
  partialTick(): number;
}
