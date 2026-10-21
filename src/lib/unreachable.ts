/** The exhaustiveness check every `switch` over a union ends with. */

/**
 * Marks a `switch` as exhaustive: the type checker rejects the call while any member of the union
 * is unhandled.
 * Error cases:
 * - reached at run time, which only a value outside its declared type can do
 */
export function unreachable(value: never, where: string): never {
  throw new Error(`${where}: unhandled value ${JSON.stringify(value)}`);
}
