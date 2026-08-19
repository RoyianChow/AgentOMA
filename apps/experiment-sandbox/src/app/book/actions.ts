"use server";

import {
  createTask04PublicBooking,
  searchTask04PublicBookAvailability,
} from "./book-server";
import type {
  Task04BookAvailabilityActionInput,
  Task04BookAvailabilityActionResult,
  Task04BookCreateActionInput,
  Task04BookCreateActionResult,
} from "./book-ui-model";

export async function runTask04PublicBookAvailabilityAction(
  input: Task04BookAvailabilityActionInput,
): Promise<Task04BookAvailabilityActionResult> {
  return searchTask04PublicBookAvailability(input);
}

export async function runTask04PublicBookingCreateAction(
  input: Task04BookCreateActionInput,
): Promise<Task04BookCreateActionResult> {
  return createTask04PublicBooking(input);
}
