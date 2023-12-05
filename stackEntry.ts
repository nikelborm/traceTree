export interface StackEntry {
  fullPath: string | null;
  typeName: string | null;
  functionName: string | null;
  methodName: string | null;
  fileName: string | null;
  lineNumber: number | null;
  columnNumber: number | null;
  isAsync: boolean;
}
