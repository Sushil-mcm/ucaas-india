/* Telling "this server has not got that API yet" apart from "that call failed".
 *
 * Some screens are ahead of the backend: the code ships, the endpoint follows.
 * A screen in that position has to say so plainly rather than show the API
 * client's generic red toast, which reads as a fault the person could fix.
 *
 * 404 is the server saying the route does not exist. 501 is it saying the route
 * exists but is not implemented. Both mean the same thing to a screen: the
 * feature is not available here yet. Every other status is a real failure and
 * must be reported as one.
 *
 * Upstream keeps this predicate inside `lib/company-settings-api.ts`. It is on
 * its own here because it is a fact about HTTP, not about company settings, and
 * that file's other 260 lines are a store this build does not have. If company
 * settings are ever ported, import this rather than carrying a second copy.
 */
export const isEndpointAbsent = (error: any): boolean => {
  const status = Number(error?.response?.status ?? error?.status);
  return status === 404 || status === 501;
};
