export type SafeAdapterEvent = {
  adapter: string;
  eventType: string;
  outcome: "DENIED" | "RECORDED_SYNTHETICALLY";
  reasonCode: string;
};

export type ExternalAdapterName =
  | "email"
  | "sms"
  | "push"
  | "video"
  | "dispensing"
  | "claims"
  | "payment"
  | "courier"
  | "calendar"
  | "fhir"
  | "storage"
  | "model"
  | "analytics";

const events: SafeAdapterEvent[] = [];

export function denyExternalEffect(
  adapter: ExternalAdapterName,
  eventType: string,
): never {
  if (!/^[a-z][a-z0-9-]{1,32}$/.test(eventType)) {
    throw new Error("SBX_EXTERNAL_EFFECT_DENIED:INVALID_EVENT_TYPE");
  }
  throw new Error(`SBX_EXTERNAL_EFFECT_DENIED:${adapter}:${eventType}`);
}

export function recordSyntheticEvent(
  adapter: ExternalAdapterName,
  eventType: string,
  reasonCode: string,
): SafeAdapterEvent {
  if (!/^[a-z][a-z0-9-]{1,32}$/.test(eventType)) {
    throw new Error("SBX_EXTERNAL_EFFECT_DENIED:INVALID_EVENT_TYPE");
  }
  const event: SafeAdapterEvent = {
    adapter,
    eventType,
    outcome: "RECORDED_SYNTHETICALLY",
    reasonCode,
  };
  events.push(event);
  return { ...event };
}

export function readSyntheticEvents(): ReadonlyArray<SafeAdapterEvent> {
  return events.map((event) => ({ ...event }));
}

export function resetSyntheticEvents(): void {
  events.length = 0;
}
