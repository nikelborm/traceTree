import { ErrorWrapper } from './checkpoint';
import type { ResultWrapper, ArgsWrapper } from './checkpoint';
import { Checkpoint } from './checkpoint';
import type { TraceEntry } from './traceEntry';

export class TraceNode
  implements IPublicActionTraceNode, IPublicStoreTraceNode
{
  constructor(
    public expectedAmountOfChildren: number | null = null,
    parentOfNewTraceNode: TraceNode | null,
  ) {
    if (parentOfNewTraceNode) {
      this.parent = parentOfNewTraceNode;
      parentOfNewTraceNode.connectChild(this);
    }
  }

  readonly parent: TraceNode | null = null;

  readonly traces: TraceEntry[] = [];

  private connectChild(child: TraceNode): void {
    this.traces.push(child);
  }

  start(args: ArgsWrapper<any[]>): void {
    this.traces.push(new Checkpoint('executionStart', null, args));
  }

  saveLog(
    description: string,
    serializableToJsonContextPayload: Record<string, any>,
  ): void {
    this.traces.push(
      new Checkpoint('log', description, serializableToJsonContextPayload),
    );
  }

  saveError(error: Error): void {
    this.#saveError(false, error);
  }

  saveMaybeError(error: unknown): void {
    this.#saveMaybeError(false, error);
  }

  returnResolution(result: ResultWrapper<any>): void {
    this.traces.push(new Checkpoint('wasResolvedWithReturn', null, result));
  }

  errorResolution(error: Error): void {
    this.#saveError(true, error);
  }

  maybeErrorResolution(error: unknown): void {
    this.#saveMaybeError(true, error);
  }

  finish(): void {
    this.traces.push(new Checkpoint('executionFinish', null, null));
  }

  #saveMaybeError(isResolution: boolean, error: unknown): void {
    if (error instanceof Error) {
      this.#saveError(isResolution, error);
    } else {
      this.traces.push(
        new Checkpoint(
          isResolution
            ? 'wasResolvedWithErrorWithUnknownStructure'
            : 'errorWithUnknownStructure',

          NOT_AN_ERROR_HAS_BEEN_THROWN_DESCRIPTION,
          new ErrorWrapper(error),
        ),
      );
    }
  }

  #saveError(isResolution: boolean, error: Error): void {
    this.traces.push(
      new Checkpoint(
        isResolution ? 'wasResolvedWithError' : 'error',
        null,
        error,
      ),
    );
  }

  toJSON(): { traces: TraceEntry[] } {
    return {
      traces: this.traces,
    };
  }
}

export interface IPublicStoreTraceNode {
  readonly parent: TraceNode | null;

  readonly traces: TraceEntry[];

  expectedAmountOfChildren: number | null;
}

export interface IPublicActionTraceNode {
  saveLog(
    description: string,
    serializableToJsonContextPayload: Record<string, any>,
  ): void;

  saveError(error: Error): void;

  saveMaybeError(error: unknown): void;
}

export const NOT_AN_ERROR_HAS_BEEN_THROWN_DESCRIPTION =
  'Captured error which is not an instance of Error class';
