import { Instance } from './Instance';

export interface Instancer<D extends Instance> {
  createInstance(): D;
  notifyDirty(): void;
}
