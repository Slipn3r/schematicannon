import { BlockPos } from 'deepslate/core';

export interface Instance {
  setPosition(pos: BlockPos): Instance;
  setChanged(): void;
  delete(): void;
}

export interface InstanceHandle {
  setChanged(): void;
  delete(): void;
}
