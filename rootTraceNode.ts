import { randomUUID } from 'crypto';
import type { TraceEntry } from './traceEntry';
import type { IPublicStoreTraceNode } from './traceNode';
import { TraceNode } from './traceNode';

export class RootTraceNode extends TraceNode {
  constructor(expectedAmountOfChildren: number | null = null) {
    super(expectedAmountOfChildren, null);
  }

  transactionUUID: string = randomUUID();

  override toJSON(): {
    traces: TraceEntry[];
    transactionUUID: string;
  } {
    return {
      transactionUUID: this.transactionUUID,
      // eslint-disable-next-line security/detect-object-injection
      traces: this.traces,
    };
  }
}

export interface IPublicStoreRootTraceNode extends IPublicStoreTraceNode {
  transactionUUID: string;
}
