import { ArgsWrapper, ResultWrapper } from './checkpoint';
import type { TraceNode } from './traceNode';

export async function trace<const NormalArgs extends any[], const TReturn>(
  currentTraceNode: TraceNode,
  functionToDecorate: (
    currentTraceNode: TraceNode,
    ...args: NormalArgs
  ) => Promise<TReturn>,
  args: NormalArgs,
): Promise<TReturn> {
  currentTraceNode.start(new ArgsWrapper(args));
  try {
    const result = await functionToDecorate(currentTraceNode, ...args);
    currentTraceNode.returnResolution(new ResultWrapper(result));
    return result;
  } catch (error) {
    currentTraceNode.maybeErrorResolution(error);
    throw error;
  } finally {
    currentTraceNode.finish();
  }
}
