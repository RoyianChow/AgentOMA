/**
 * In-memory signal used immediately before navigation/sign-out so mounted PHI
 * forms can purge their state. It intentionally carries no payload.
 */
export const CLEAR_SENSITIVE_STATE_EVENT = "agentoma:clear-sensitive-state";

export function requestSensitiveStateClear(): void {
  window.dispatchEvent(new Event(CLEAR_SENSITIVE_STATE_EVENT));
}
