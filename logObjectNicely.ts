// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function logObjectNicely(item: Record<string, any> | any[]): void {
  console.dir(item, {
    colors: true,
    compact: false,
    depth: null,
  });
}
