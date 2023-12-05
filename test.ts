import { setTimeout } from 'timers/promises';
import { UsePromiseAllMappedTrace } from './usePromiseAllTrace.decorator';
import { UseTrace } from './useTrace.decorator';
import { UseTraceRoot } from './useTraceRoot.decorator';
// import { RootTraceNode } from './rootTraceNode';
// import { logObjectNicely } from 'src/tools/shared';
// import { renderRootTraceNode } from './renderTraceNode';
import type { IPublicActionTraceNode } from './traceNode';

export async function testUsualCase(): Promise<void> {
  class LowLevelUseCase {
    #lowLevelMethod = async (
      currentTraceNode: IPublicActionTraceNode,
      lowLevelArg: string,
    ): Promise<number> => {
      currentTraceNode.saveLog('beforeTimeout', {});
      await setTimeout(Math.random() * 1000);
      currentTraceNode.saveLog('afterTimeout', {});
      console.log('LowLevelUseCase', 'lowLevelMethod', lowLevelArg);
      const num = parseInt(lowLevelArg, 10);
      if (num > 1000) throw new RangeError('message');
      return num;
    };

    lowLevelMethod = UseTrace(this.#lowLevelMethod, 2);

    lowLevelMethod2 = UseTraceRoot(this.#lowLevelMethod, 2);
  }

  class HighLevelUseCase {
    constructor(private readonly lowLevelUseCase: LowLevelUseCase) {}

    #highLevelMethod = async (
      currentTraceNode: IPublicActionTraceNode,
      highLevelArg: string[],
    ): Promise<number[]> => {
      const result = await UsePromiseAllMappedTrace(
        highLevelArg,
        async (currentTraceNode, e: string): Promise<number> => {
          await this.lowLevelUseCase.lowLevelMethod(currentTraceNode, e);
          return await this.lowLevelUseCase.lowLevelMethod(currentTraceNode, e);
        },
      )(currentTraceNode);
      console.log('HighLevelUseCase', 'highLevelMethod', result);
      return result;
    };

    highLevelMethod = UseTrace(this.#highLevelMethod, 1);

    highLevelMethodRoot = UseTraceRoot(this.#highLevelMethod, 1);
  }

  class Controller {
    constructor(private readonly highLevelUseCase: HighLevelUseCase) {}

    controllerLevelMethod = UseTraceRoot(
      async (currentTraceNode, firstArr: string[], secondArr: string[]) => {
        let result: number[] = [];
        try {
          result = await this.highLevelUseCase.highLevelMethod(
            currentTraceNode,
            firstArr.concat(secondArr),
          );
          console.log('Controller', 'controllerLevelMethod', result);
        } catch (error) {
          currentTraceNode.saveMaybeError(error);
        }

        try {
          const result2 = await this.highLevelUseCase.highLevelMethod(
            currentTraceNode,
            firstArr.concat(secondArr).reverse(),
          );
          console.log('Controller', 'controllerLevelMethod2', result2);
        } catch (error) {
          currentTraceNode.saveMaybeError(error);
        }

        return result;
      },
    );
  }

  const instanceOfLowLevelUseCase = new LowLevelUseCase();
  console.log('instanceOfLowLevelUseCase: ', instanceOfLowLevelUseCase);
  const instanceOfHighLevelUseCase = new HighLevelUseCase(
    instanceOfLowLevelUseCase,
  );

  console.log('instanceOfHighLevelUseCase: ', instanceOfHighLevelUseCase);
  try {
    const asd = await instanceOfHighLevelUseCase.highLevelMethodRoot([
      '12322',
      'asdd',
    ]);
    // console.log('traceNode: ', );
    console.log('asd: ', asd);
  } catch (error) {
    console.log('error: ', error);
  }

  const instanceOfController = new Controller(instanceOfHighLevelUseCase);
  try {
    const result1 = await instanceOfController.controllerLevelMethod(
      ['123', '23400'],
      ['12333', '234'],
    );
    console.log('result1: ', result1);
  } catch (error) {
    console.log('error: ', error);
  }
  // console.log('result1: ', result1);
}
