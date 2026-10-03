import "server-only";
/** Authorize immediately before each privileged HTTP operation, including Storage. */
export function createGuardedFetch(authorize: () => Promise<unknown>, transport: typeof fetch): typeof fetch {
  return async (input, init) => {
    await authorize();
    return transport(input, { ...init, cache: "no-store" });
  };
}
