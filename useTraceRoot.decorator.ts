import { logObjectNicely } from './logObjectNicely';
import { renderRootTraceNode } from './renderTraceNode';
import { RootTraceNode } from './rootTraceNode';
import { trace } from './traceFunction';
import type { IPublicActionTraceNode } from './traceNode';

export function UseTraceRoot<const NormalArgs extends any[], const TReturn>(
  functionToDecorate: (
    currentTraceNode: IPublicActionTraceNode,
    ...args: NormalArgs
  ) => Promise<TReturn>,
  expectedAmountOfChildren: number | null = null,
): (...args: NormalArgs) => Promise<TReturn> {
  return async function decoratedFunc(...args: NormalArgs) {
    const currentTraceNode = new RootTraceNode(expectedAmountOfChildren);
    try {
      const execResult = await trace(
        currentTraceNode,
        functionToDecorate,
        args,
      );
      logObjectNicely({ execResult });
      return execResult;
    } catch (error) {
      logObjectNicely({ error });
      throw error;
    } finally {
      // logObjectNicely(currentTraceNode);
      console.log(renderRootTraceNode(currentTraceNode));
    }
  };
}
