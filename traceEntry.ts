import type { Checkpoint } from './checkpoint';
import type { IPublicStoreTraceNode } from './traceNode';

export type CheckpointWithStack =
  | Checkpoint<'executionStart'>
  | Checkpoint<'log'>
  | Checkpoint<'error'>
  | Checkpoint<'errorWithUnknownStructure'>
  | Checkpoint<'wasResolvedWithError'>
  | Checkpoint<'wasResolvedWithErrorWithUnknownStructure'>;

export type ResolutionCheckpoint =
  | Checkpoint<'wasResolvedWithError'>
  | Checkpoint<'wasResolvedWithErrorWithUnknownStructure'>
  | Checkpoint<'wasResolvedWithReturn'>;

export type ExecutionCheckpoint =
  | Checkpoint<'error'>
  | Checkpoint<'errorWithUnknownStructure'>
  | Checkpoint<'log'>;

export type ExecutionTraceEntry = ExecutionCheckpoint | IPublicStoreTraceNode;

export type TraceEntry =
  | Checkpoint<'executionStart'>
  | ExecutionTraceEntry
  | ResolutionCheckpoint
  | Checkpoint<'executionFinish'>;
