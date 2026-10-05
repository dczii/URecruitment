/** A criterion reference never excuses an incorrect actual value. */
export function classify(before: number, expected: number, actual: number) {
  if (actual !== expected) return "unexpected difference";
  return actual === before ? "unchanged" : "approved difference";
}

/** Both original paths are compared; a corrected save is not labeled unchanged. */
export function classifyPaths(loadBefore: number, saveBefore: number, expected: number, actual: number) {
  if (actual !== expected) return "unexpected difference";
  return loadBefore === actual && saveBefore === actual ? "unchanged" : "approved difference";
}
