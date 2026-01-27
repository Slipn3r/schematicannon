import { Instance } from './Instance';
import { Instancer } from './Instancer';

export interface InstanceType<D extends Instance> {
  create(instancer: Instancer<D>, index: number): D;
  // Size in floats
  format(): number;
}
