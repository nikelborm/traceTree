import { randomUUID } from 'crypto';
import type { StackEntry } from './stackEntry';

export class Checkpoint<
  const TStatus extends Status,
  TContent extends Content<TStatus> = Content<TStatus>,
  TStack extends Stack<TStatus> = Stack<TStatus>,
  TStoredPayload extends StoredPayload<TStatus> = StoredPayload<TStatus>,
  TDescription extends Description<TStatus> = Description<TStatus>,
> {
  readonly stack: TStack;

  readonly payload: TStoredPayload;

  readonly uuid = randomUUID();

  readonly time = Date.now();

  constructor(
    readonly status: TStatus,
    readonly description: TDescription,
    content: TContent,
  ) {
    this.payload = (
      content instanceof Error
        ? new ErrorWrapper({
            name: content.name,
            message: content.message,
            plainTextStack: content.stack,
          })
        : content
    ) as TStoredPayload;

    this.stack = (
      [
        'executionStart',
        'log',
        'error',
        'errorWithUnknownStructure',
        'wasResolvedWithError',
        'wasResolvedWithErrorWithUnknownStructure',
      ].includes(status)
        ? Checkpoint.captureStackTrace()
        : null
    ) as TStack;
  }

  private static captureStackTrace(): ReadonlyArray<StackEntry> {
    const _ = Error.prepareStackTrace;

    Error.prepareStackTrace = (
      err: Error,
      stackTraces: NodeJS.CallSite[],
    ): StackEntry[] => Checkpoint.prepareStackTrace(err, stackTraces);

    const { stack } = new Error() as unknown as {
      readonly stack: StackEntry[];
    };

    Error.prepareStackTrace = _;
    return stack;
  }

  private static prepareStackTrace(
    err: Error,
    callSites: NodeJS.CallSite[],
  ): StackEntry[] {
    return callSites
      .map((e) => {
        const fileName = e.getFileName();
        const lineNumber = e.getLineNumber();
        const columnNumber = e.getColumnNumber();

        return {
          typeName: e?.getTypeName?.(),
          functionName: e?.getFunctionName?.(),
          methodName: e?.getMethodName?.(),
          fullPath: this.parsePathFrom(fileName, lineNumber, columnNumber),
          fileName: fileName || null,
          lineNumber,
          columnNumber,
          // @ts-expect-error @types/node is lagging
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
          isAsync: e?.isAsync?.(),
        } satisfies StackEntry;
      })
      .filter((stackEntry) => {
        const { typeName, functionName, methodName, fileName } = stackEntry;

        return (
          !(
            typeName === null &&
            functionName === 'Checkpoint' &&
            methodName === null
          ) &&
          !(
            typeName === 'Function' &&
            functionName === 'captureStackTrace' &&
            methodName === 'captureStackTrace'
          ) &&
          !(
            typeName === 'Module' &&
            functionName === 'Module._compile' &&
            methodName === '_compile' &&
            fileName === 'node:internal/modules/cjs/loader'
          ) &&
          !(
            typeName === 'Object' &&
            functionName === 'Module._extensions..js' &&
            methodName === '.js' &&
            fileName === 'node:internal/modules/cjs/loader'
          ) &&
          !(
            typeName === 'Module' &&
            functionName === 'Module.load' &&
            methodName === 'load' &&
            fileName === 'node:internal/modules/cjs/loader'
          ) &&
          !(typeName === 'TraceNode') &&
          !(typeName === 'RootTraceNode') &&
          !(typeName === 'PromiseAllTraceNode') &&
          !(typeName === 'PromiseAllMappedTraceNode') &&
          !(
            typeName === null &&
            functionName === 'trace' &&
            methodName === null
          )
        );
      });
  }

  private static parsePathFrom(
    fileName: string | null | undefined,
    lineNumber: number | null,
    columnNumber: number | null,
  ): string | null {
    if (!fileName) return null;
    let path = `./${fileName
      .replace(/^(\/)?(app)?(\/)?(src)?(\/)/, '')

      .replace(/.(js|ts|jsx|tsx)$/, '')}`;

    if (lineNumber === null) return path;
    path += `:${lineNumber}`;

    if (columnNumber === null) return path;
    path += `:${columnNumber}`;

    return path;
  }
}

export class ArgsWrapper<T extends any[]> {
  constructor(public args: T) {}
}

export class ResultWrapper<T> {
  constructor(public result: T) {}
}

export class ErrorWrapper<T> {
  constructor(public error: T) {}
}

type StoredPayload<
  TStatus extends Status,
  TContent extends Content<TStatus> = Content<TStatus>,
> = TStatus extends 'error' | 'wasResolvedWithError'
  ? ErrorWrapper<{
      name: 'string';
      message: 'string';
      plainTextStack: 'string' | undefined;
    }>
  : TContent;

type Stack<TStatus extends Status> = TStatus extends
  | 'executionStart'
  | 'log'
  | 'error'
  | 'errorWithUnknownStructure'
  | 'wasResolvedWithError'
  | 'wasResolvedWithErrorWithUnknownStructure'
  ? ReadonlyArray<StackEntry>
  : null;

type Description<TStatus extends Status> = TStatus extends
  | 'log'
  | 'errorWithUnknownStructure'
  | 'wasResolvedWithErrorWithUnknownStructure'
  ? string
  : null;

type Content<TStatus extends Status> = TStatus extends 'executionStart'
  ? ArgsWrapper<any[]>
  : TStatus extends 'log'
  ? Record<string, any>
  : TStatus extends 'error' | 'wasResolvedWithError'
  ? Error
  : TStatus extends
      | 'errorWithUnknownStructure'
      | 'wasResolvedWithErrorWithUnknownStructure'
  ? ErrorWrapper<unknown>
  : TStatus extends 'wasResolvedWithReturn'
  ? ResultWrapper<any>
  : TStatus extends 'executionFinish'
  ? null
  : never;

type Status =
  | 'executionStart'
  | 'log'
  | 'error'
  | 'errorWithUnknownStructure'
  | 'wasResolvedWithError'
  | 'wasResolvedWithErrorWithUnknownStructure'
  | 'wasResolvedWithReturn'
  | 'executionFinish';
