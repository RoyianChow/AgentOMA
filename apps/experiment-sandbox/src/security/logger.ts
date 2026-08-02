export type SafeLogEvent = {
  eventType: string;
  source: string;
  outcome: "PASS" | "DENIED" | "FAIL";
  reasonCode: string;
  correlationRef?: string;
};

const SAFE_VALUE = /^[A-Z0-9_.:-]{1,80}$/;

export function safeLog(event: SafeLogEvent): void {
  if (
    !SAFE_VALUE.test(event.eventType) ||
    !SAFE_VALUE.test(event.source) ||
    !SAFE_VALUE.test(event.outcome) ||
    !SAFE_VALUE.test(event.reasonCode) ||
    (event.correlationRef !== undefined && !SAFE_VALUE.test(event.correlationRef))
  ) {
    throw new Error("SBX_LOG_DENIED:UNSAFE_FIELD");
  }
  // Structured fields are allowlisted above; no payload/error object is accepted.
  process.stdout.write(
    `${JSON.stringify({
      eventType: event.eventType,
      source: event.source,
      outcome: event.outcome,
      reasonCode: event.reasonCode,
      ...(event.correlationRef ? { correlationRef: event.correlationRef } : {}),
    })}\n`,
  );
}
