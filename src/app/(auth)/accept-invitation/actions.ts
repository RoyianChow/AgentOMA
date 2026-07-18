"use server";

import { acceptInvitation, type AcceptResult } from "@/lib/invitations";

/**
 * Public by design: the invitee has no session yet. The single-use expiring
 * token (issued by a pharmacy admin, stored only as a hash) IS the
 * authorization; all validation lives in acceptInvitation.
 */
export async function acceptInvitationAction(input: {
  token: string;
  name: string;
  password: string;
}): Promise<AcceptResult> {
  return acceptInvitation(input);
}
