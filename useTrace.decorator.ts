import { trace } from './traceFunction';
import type { IPublicActionTraceNode } from './traceNode';
import { TraceNode } from './traceNode';

export function UseTrace<NormalArgs extends any[], TReturn>(
  functionToDecorate: (
    currentTraceNode: IPublicActionTraceNode,
    ...args: NormalArgs
  ) => Promise<TReturn>,
  expectedAmountOfChildren: number | null = null,
): (
  parentTraceNode: IPublicActionTraceNode,
  ...args: NormalArgs
) => Promise<TReturn> {
  return async function decoratedFunc(
    parentTraceNode: IPublicActionTraceNode,
    ...args: NormalArgs
  ) {
    const currentTraceNode = new TraceNode(
      expectedAmountOfChildren,
      parentTraceNode as TraceNode,
    );
    return await trace(currentTraceNode, functionToDecorate, args);
  };
}
