import {
  PromiseAllMappedTraceNode,
  PromiseAllTraceNode,
} from './PromiseAllTraceNode';
import { trace } from './traceFunction';
import type { IPublicActionTraceNode } from './traceNode';
import type { TraceNode } from './traceNode';
import { UseTrace } from './useTrace.decorator';

export function UsePromiseAllTrace<T extends readonly Promise<any>[]>(
  arrGetter: (currentTraceNode: IPublicActionTraceNode) => T,
  TraceClass: new (
    expectedAmountOfChildren: number | null,
    parentTraceNode: TraceNode,
  ) => TraceNode = PromiseAllTraceNode,
): (parentTraceNode: IPublicActionTraceNode) => PromiseAllDone<T> {
  return {
    async 'Promise.all'(
      parentTraceNode: IPublicActionTraceNode,
    ): PromiseAllDone<T> {
      // this.name = 'Promise.all';
      const currentTraceNode = new TraceClass(
        null,
        parentTraceNode as TraceNode,
      );
      return await trace(
        currentTraceNode,
        (current: TraceNode): PromiseAllDone<T> => {
          const promiseArr = arrGetter(current);
          current.expectedAmountOfChildren = promiseArr.length;
          return Promise.all(promiseArr);
        },
        [],
      );
    },
  }['Promise.all']; // hack to give custom name to function
}

export function UsePromiseAllMappedTrace<
  TInputArrayElement,
  TReturnArrayElement,
>(
  arrayToMap: TInputArrayElement[],
  elementGetter: (
    currentTraceNode: IPublicActionTraceNode,
    arrayElement: TInputArrayElement,
    index: number,
  ) => Promise<TReturnArrayElement>,
): (parentTraceNode: IPublicActionTraceNode) => Promise<TReturnArrayElement[]> {
  const tracedElementGetter = UseTrace(elementGetter);
  return UsePromiseAllTrace(
    (current) =>
      arrayToMap.map((e, index) => tracedElementGetter(current, e, index)),
    PromiseAllMappedTraceNode,
  );
}

type PromiseAllDone<T extends readonly Promise<any>[]> = Promise<{
  -readonly [P in keyof T]: Awaited<T[P]>;
}>;
