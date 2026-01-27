import { BlockPos } from 'deepslate/core';
import { Instance } from '../../api/instance/Instance';
import { Instancer } from '../../api/instance/Instancer';

export abstract class AbstractInstance implements Instance {
  protected pos: BlockPos = BlockPos.ZERO;

  constructor (protected readonly instancer: Instancer<any>) {
  }

  setPosition (pos: BlockPos): Instance {
    this.pos = pos;
    this.setChanged();
    return this;
  }

  setChanged (): void {
    this.instancer.notifyDirty();
  }

  delete (): void {
    // Implementation note: concrete InstancerImpl needs to handle this
    // For now, we assume this method will be patched or InstancerImpl handles it map
    this.instancer.deleteInstance?.(this);
  }

  abstract write (buffer: Float32Array, offset: number): void;
}
