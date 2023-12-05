import chalk from 'chalk';
import {
  PromiseAllMappedTraceNode,
  PromiseAllTraceNode,
} from './PromiseAllTraceNode';
import { Checkpoint } from './checkpoint';
import type { IPublicStoreRootTraceNode } from './rootTraceNode';
import { RootTraceNode } from './rootTraceNode';
import type {
  CheckpointWithStack,
  ExecutionCheckpoint,
  ExecutionTraceEntry,
  ResolutionCheckpoint,
  TraceEntry,
} from './traceEntry';
import type { IPublicStoreTraceNode } from './traceNode';
import { TraceNode } from './traceNode';

// start, resolution(unknown error as log|error|result), finish
const tabFiller = chalk.dim('|    ');

function tab(...texts: string[]): string {
  return texts
    .flatMap((text) => text.split('\n'))
    .map((e) => e.slice(0, 38) + tabFiller + e.slice(38))
    .join('\n');
}

type ResolvedTracesRecap =
  | { status: 'Not even started' }
  | {
      status: 'Started, but interrupted';
      start: Checkpoint<'executionStart'>;
      execution: ExecutionTraceEntry[];
    }
  | {
      status: 'Resolved';
      start: Checkpoint<'executionStart'>;
      resolution: ResolutionCheckpoint;
      finish: Checkpoint<'executionFinish'>;
      execution: ExecutionTraceEntry[];
    };

function getTracesRecap(traceEntries: TraceEntry[]): ResolvedTracesRecap {
  const maybeStartCheckpoint = traceEntries[0];
  const wasFunctionStarted =
    maybeStartCheckpoint instanceof Checkpoint &&
    maybeStartCheckpoint.status === 'executionStart';

  const maybeFinishCheckpoint = traceEntries[traceEntries.length - 1];
  const wasFunctionFinishedWithoutInterruption =
    maybeFinishCheckpoint instanceof Checkpoint &&
    maybeFinishCheckpoint.status === 'executionFinish';

  const maybeResolutionCheckpoint = traceEntries[traceEntries.length - 2];
  const doesFunctionHasResolution =
    wasFunctionFinishedWithoutInterruption &&
    maybeResolutionCheckpoint instanceof Checkpoint &&
    (maybeResolutionCheckpoint.status === 'wasResolvedWithReturn' ||
      maybeResolutionCheckpoint.status === 'wasResolvedWithError' ||
      maybeResolutionCheckpoint.status ===
        'wasResolvedWithErrorWithUnknownStructure');

  const start = wasFunctionStarted ? maybeStartCheckpoint : null;

  const resolution = doesFunctionHasResolution
    ? maybeResolutionCheckpoint
    : null;

  const finish = wasFunctionFinishedWithoutInterruption
    ? maybeFinishCheckpoint
    : null;

  if (!start)
    return {
      status: 'Not even started',
    };

  const howMuchTracesToNotIncludeInExecution =
    +wasFunctionFinishedWithoutInterruption + +doesFunctionHasResolution;

  const lastExecutionTraceIndex =
    -howMuchTracesToNotIncludeInExecution || traceEntries.length;

  const execution = traceEntries.slice(
    1,
    lastExecutionTraceIndex,
  ) as ExecutionTraceEntry[];

  if (!finish || !resolution)
    return {
      status: 'Started, but interrupted',
      start,
      execution,
    };

  return {
    status: 'Resolved',
    start,
    resolution,
    finish,
    execution,
  };
}

function renderFunctionName(checkpoint: CheckpointWithStack): string {
  return (
    checkpoint.stack[0]?.methodName ||
    checkpoint.stack[0]?.functionName ||
    'unknownFunction'
  );
}

function renderTypePrefix(checkpoint: CheckpointWithStack): string {
  const typeName = checkpoint.stack[0]?.typeName;
  return typeName ? `${chalk.cyan(typeName)}.` : '';
}

function renderArgs(start: Checkpoint<'executionStart'>): string {
  return start.payload.args.map((arg) => JSON.stringify(arg)).join(', ');
}

function renderStart(
  start: Checkpoint<'executionStart'>,
  checkbox: string,
  expectedAmountOfChildren: number | null,
  doneStepsAmount: number,
): string {
  const color =
    expectedAmountOfChildren === null
      ? chalk.yellow
      : doneStepsAmount === expectedAmountOfChildren
      ? chalk.green
      : chalk.red;

  return [
    `[${start.uuid}]`,
    tabFiller,
    checkbox,
    ' ',
    renderTypePrefix(start),
    chalk.yellowBright(renderFunctionName(start)),
    chalk.gray('('),
    renderArgs(start),
    chalk.gray(')'),
    ' { ',
    expectedAmountOfChildren === null
      ? color`<${doneStepsAmount} steps>`
      : color`<${doneStepsAmount} / ${expectedAmountOfChildren} steps>`,
  ].join('');
}

function renderPromiseAllStart(
  start: Checkpoint<'executionStart'>,
  checkbox: string,
  expectedAmountOfChildren: number | null,
  doneStepsAmount: number,
): string {
  const color =
    expectedAmountOfChildren === null
      ? chalk.yellow
      : doneStepsAmount === expectedAmountOfChildren
      ? chalk.green
      : chalk.red;

  return [
    `[${start.uuid}]`,
    tabFiller,
    checkbox,
    ' ',
    chalk.magenta('await'),
    ' ',
    chalk.cyan('Promise'),
    '.',
    chalk.yellowBright('all'),
    chalk.gray('([ '),
    expectedAmountOfChildren === null
      ? color`<${doneStepsAmount} parallel steps>`
      : color`<${doneStepsAmount} / ${expectedAmountOfChildren} parallel steps>`,
  ].join('');
}

function renderTime(ms: number): string {
  const tookTime =
    ms < MS_AMOUNT_IN_SECOND
      ? ms
      : ms < MS_AMOUNT_IN_MINUTE
      ? ms / MS_AMOUNT_IN_SECOND
      : ms < MS_AMOUNT_IN_HOUR
      ? ms / MS_AMOUNT_IN_MINUTE
      : ms / MS_AMOUNT_IN_HOUR;

  const units =
    ms < MS_AMOUNT_IN_SECOND
      ? 'ms'
      : ms < MS_AMOUNT_IN_MINUTE
      ? 'sec'
      : ms < MS_AMOUNT_IN_HOUR
      ? 'min'
      : 'hour';

  return `took ${chalk.yellow(tookTime.toFixed(1))} ${units}`;
}

function renderFinish(
  checkpoint: Checkpoint<'executionFinish'>,
  startTime: number,
): string {
  return `[${checkpoint.uuid}]${tabFiller}} ${renderTime(
    checkpoint.time - startTime,
  )}`;
}

function renderInterruptedFinish(isPromiseAll: boolean): string {
  return `[No finish trace entry means no uuid.]${tabFiller}${
    isPromiseAll ? '])' : '}'
  } -- ${chalk.red('Interrupted because upper Promise.all rejected')}`;
}

function renderPromiseAllFinish(
  checkpoint: Checkpoint<'executionFinish'>,
  startTime: number,
): string {
  return `[${checkpoint.uuid}]${tabFiller}${chalk.gray(']) ')} ${renderTime(
    checkpoint.time - startTime,
  )}`;
}

function renderResolution(checkpoint: ResolutionCheckpoint): string {
  let result = `[${checkpoint.uuid}]${tabFiller}`;
  if (checkpoint.status === 'wasResolvedWithErrorWithUnknownStructure') {
    result += `Not an error, but still thrown: ${JSON.stringify(
      checkpoint.payload['error'],
    )}`;
  }

  if (checkpoint.status === 'wasResolvedWithError') {
    result += `${chalk.red('Error')}: ${chalk.cyan(
      checkpoint.payload.error.name,
    )}('${checkpoint.payload.error.message}')`;
  }

  if (checkpoint.status === 'wasResolvedWithReturn') {
    result += `${chalk.magenta('return')}: ${JSON.stringify(
      checkpoint.payload.result,
    )}`;
  }

  return tab(result);
}

function renderOneExecution(checkpoint: ExecutionCheckpoint): string {
  let result = `[${checkpoint.uuid}]${tabFiller}`;
  if (checkpoint.status === 'log') {
    result += `${chalk.blue('saveLog')}${chalk.gray('(')}${chalk.greenBright(
      `'${checkpoint.description}'`,
    )}, ${JSON.stringify(checkpoint.payload)}${chalk.gray(')')}`;
  }

  if (checkpoint.status === 'error') {
    result += `${chalk.red('saveError')}(${chalk.cyan(
      checkpoint.payload.error.name,
    )}('${checkpoint.payload.error.message}'))`;
  }

  return result;
}
function renderAllExecution(
  traceEntries: ExecutionTraceEntry[],
  isPromiseAll: boolean,
): string {
  return tab(
    ...traceEntries.map(
      (entry) =>
        (entry instanceof Checkpoint
          ? renderOneExecution(entry)
          : renderTraceNode(entry)) + (isPromiseAll ? ',' : ''),
    ),
  );
}

function renderTraceNode(currentTraceNode: IPublicStoreTraceNode): string {
  const isPromiseAll =
    currentTraceNode instanceof PromiseAllTraceNode ||
    currentTraceNode instanceof PromiseAllMappedTraceNode;
  const isRootTraceNode = currentTraceNode instanceof RootTraceNode;
  const isUsualTraceNode = currentTraceNode instanceof TraceNode;

  const tracesRecap = getTracesRecap(currentTraceNode.traces);

  if (isPromiseAll && isRootTraceNode && isUsualTraceNode)
    throw new Error(
      'currentTraceNode is non of these: [ PromiseAllTraceNode, RootTraceNode, TraceNode] ',
    );

  if (tracesRecap.status === 'Not even started') {
    console.log('currentTraceNode.traces: ', currentTraceNode.traces);
    return 'Trace node was not Even started';
  }

  const { execution, start } = tracesRecap;

  const checkbox =
    tracesRecap.status === 'Started, but interrupted' ||
    tracesRecap.resolution.status !== 'wasResolvedWithReturn'
      ? '❌'
      : '✅';

  const startAndExecutionLogs = [
    // eslint-disable-next-line camelcase
    (isPromiseAll ? renderPromiseAllStart : renderStart)(
      start,
      checkbox,
      currentTraceNode.expectedAmountOfChildren,
      isPromiseAll
        ? (execution as IPublicStoreTraceNode[])
            .map((e) => {
              const recap = getTracesRecap(e.traces);
              return +(recap.status === 'Resolved');
            })
            .reduce(
              (accumulator, currentValue) => accumulator + currentValue,
              0,
            )
        : execution.length,
    ),
    renderAllExecution(execution, isPromiseAll),
  ];

  if (tracesRecap.status === 'Started, but interrupted')
    return [
      ...startAndExecutionLogs,
      renderInterruptedFinish(isPromiseAll),
    ].join('\n');

  const { finish, resolution } = tracesRecap;

  return [
    ...startAndExecutionLogs,
    renderResolution(resolution),
    (isPromiseAll ? renderPromiseAllFinish : renderFinish)(finish, start.time),
  ].join('\n');
}

export function renderRootTraceNode(
  rootTraceNode: IPublicStoreRootTraceNode,
): string {
  return (
    `[${rootTraceNode.transactionUUID}]${tabFiller}RootTraceNode\n` +
    renderTraceNode(rootTraceNode)
  );
}

const MS_AMOUNT_IN_SECOND = 1000;
const MS_AMOUNT_IN_MINUTE = MS_AMOUNT_IN_SECOND * 60;
const MS_AMOUNT_IN_HOUR = MS_AMOUNT_IN_MINUTE * 60;
