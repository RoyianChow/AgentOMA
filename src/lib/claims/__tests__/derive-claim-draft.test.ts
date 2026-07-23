import { describe, it, expect } from "vitest";
import {
  deriveClaimDraft,
  type DeriveClaimDraftInput,
  type ResolvePin,
} from "../derive-claim-draft";
import { AILMENT_GROUPS, feeCentsForModality } from "@/lib/reference/minor-ailment-reference";

/**
 * Pure tests — no database. deriveClaimDraft takes resolvePin as an argument
 * precisely so this file never needs one.
 *
 * resolvePin here is backed by the SAME reference data the seed loads, so if the
 * reference file and these expectations ever disagree, that's a real signal.
 */
const resolvePin: ResolvePin = (code, modality, rxIssued) => {
  const g = AILMENT_GROUPS.find((x) => x.code === code);
  if (!g) return undefined;
  const pinCode =
    modality === "in_person"
      ? rxIssued
        ? g.pins.inPersonRxIssued
        : g.pins.inPersonNoRx
      : rxIssued
        ? g.pins.virtualRxIssued
        : g.pins.virtualNoRx;
  return { pinCode, feeCents: feeCentsForModality(modality) };
};

const base = (over: Partial<DeriveClaimDraftInput> = {}): DeriveClaimDraftInput => ({
  ailmentGroupCode: "RHINITIS",
  modality: "in_person",
  outcome: "rx_issued",
  resolvePin,
  prescriber: { ocpRegistrationNumber: "123456" },
  isOdbRecipient: true,
  remoteVirtualEligible: false,
  ...over,
});

/** Narrowing helper so failures read as assertion errors, not type errors. */
function draftOf(res: ReturnType<typeof deriveClaimDraft>) {
  if (!res.billable) throw new Error(`expected billable, got refusal: ${res.reason}`);
  return res.draft;
}

describe("deriveClaimDraft", () => {
  describe("PIN + fee for every modality × rx-issued combination", () => {
    // Rhinitis, straight from the EO Notice Table 1 via the reference file.
    it("in_person + rx → in-person Rx PIN at $19", () => {
      const d = draftOf(deriveClaimDraft(base({ modality: "in_person", outcome: "rx_issued" })));
      expect(d.pinCode).toBe("9858181");
      expect(d.feeCents).toBe(1900);
      expect(d.billingModality).toBe("in_person");
      expect(d.rxIssued).toBe(true);
    });

    it("in_person + no rx → in-person No-Rx PIN at $19", () => {
      const d = draftOf(
        deriveClaimDraft(base({ modality: "in_person", outcome: "no_rx_otc_or_nonpharm" })),
      );
      expect(d.pinCode).toBe("9858182");
      expect(d.feeCents).toBe(1900);
      expect(d.rxIssued).toBe(false);
    });

    it("virtual_from_pharmacy + rx → virtual Rx PIN at $15", () => {
      const d = draftOf(
        deriveClaimDraft(base({ modality: "virtual_from_pharmacy", outcome: "rx_issued" })),
      );
      expect(d.pinCode).toBe("9858183");
      expect(d.feeCents).toBe(1500);
      expect(d.billingModality).toBe("virtual");
    });

    it("virtual_from_pharmacy + no rx → virtual No-Rx PIN at $15", () => {
      const d = draftOf(
        deriveClaimDraft(
          base({ modality: "virtual_from_pharmacy", outcome: "no_rx_otc_or_nonpharm" }),
        ),
      );
      expect(d.pinCode).toBe("9858184");
      expect(d.feeCents).toBe(1500);
    });

    it("virtual_remote bills on the virtual PIN column (eligible tier)", () => {
      const d = draftOf(
        deriveClaimDraft(
          base({
            modality: "virtual_remote",
            outcome: "rx_issued",
            remoteVirtualEligible: true,
            virtualLocation: "home office",
            remoteReason: "no on-site staff",
          }),
        ),
      );
      expect(d.pinCode).toBe("9858183");
      expect(d.feeCents).toBe(1500);
    });

    it("preserves Acne's non-sequential No-Rx PIN (9858250, not 9858249)", () => {
      const d = draftOf(
        deriveClaimDraft(base({ ailmentGroupCode: "ACNE", outcome: "no_rx_otc_or_nonpharm" })),
      );
      expect(d.pinCode).toBe("9858250");
    });
  });

  describe("Amendment 1 — an unknown lookup refuses; it never defaults", () => {
    // TOMBSTONE. The pre-Drizzle code had a pinMap covering 5 ailments that
    // silently fell back to Rhinitis for the other 18 — billing the wrong PIN
    // with nobody noticing. This test exists so that class of bug cannot return.
    it("unknown ailment group → UNKNOWN_PIN_LOOKUP (never falls back to Rhinitis)", () => {
      const res = deriveClaimDraft(base({ ailmentGroupCode: "NOT_A_REAL_AILMENT" }));
      expect(res.billable).toBe(false);
      if (!res.billable) expect(res.reason).toBe("UNKNOWN_PIN_LOOKUP");
      // The bug it replaces would have produced Rhinitis's PIN here.
      expect(JSON.stringify(res)).not.toContain("9858181");
    });

    it("a modality × rx combination with no row → UNKNOWN_PIN_LOOKUP", () => {
      const holey: ResolvePin = (_c, modality, rxIssued) =>
        modality === "virtual" && rxIssued === false ? undefined : { pinCode: "9858181", feeCents: 1900 };
      const res = deriveClaimDraft(
        base({
          resolvePin: holey,
          modality: "virtual_from_pharmacy",
          outcome: "no_rx_otc_or_nonpharm",
        }),
      );
      expect(res.billable).toBe(false);
      if (!res.billable) expect(res.reason).toBe("UNKNOWN_PIN_LOOKUP");
    });
  });

  describe("prescriber", () => {
    it("Prescriber ID Reference is always 09 (01/99 reject with code 60)", () => {
      expect(draftOf(deriveClaimDraft(base())).prescriberIdReference).toBe("09");
      expect(
        draftOf(deriveClaimDraft(base({ modality: "virtual_from_pharmacy" }))).prescriberIdReference,
      ).toBe("09");
    });

    it("uses the pharmacist's OCP registration number", () => {
      expect(
        draftOf(deriveClaimDraft(base({ prescriber: { ocpRegistrationNumber: "654321" } })))
          .prescriberId,
      ).toBe("654321");
    });

    it("As-of-Right without an Ontario licence → PHR888", () => {
      const d = draftOf(
        deriveClaimDraft(
          base({ prescriber: { isAsOfRightWithoutOntarioLicence: true } }),
        ),
      );
      expect(d.prescriberId).toBe("PHR888");
    });

    it("As-of-Right wins over a stale OCP number on file", () => {
      const d = draftOf(
        deriveClaimDraft(
          base({
            prescriber: { ocpRegistrationNumber: "123456", isAsOfRightWithoutOntarioLicence: true },
          }),
        ),
      );
      expect(d.prescriberId).toBe("PHR888");
    });

    it("no OCP number and not As-of-Right → refuses", () => {
      const res = deriveClaimDraft(base({ prescriber: {} }));
      expect(res.billable).toBe(false);
      if (!res.billable) expect(res.reason).toBe("MISSING_PRESCRIBER_ID");
    });
  });

  describe("intervention codes + carrier", () => {
    it("ODB recipient → PS only, no carrier", () => {
      const d = draftOf(deriveClaimDraft(base({ isOdbRecipient: true })));
      expect(d.interventionCodes).toEqual(["PS"]);
      expect(d.carrierId).toBeNull();
    });

    it("non-ODB recipient → adds ML with Carrier ID S", () => {
      const d = draftOf(deriveClaimDraft(base({ isOdbRecipient: false })));
      expect(d.interventionCodes).toEqual(["PS", "ML"]);
      expect(d.carrierId).toBe("S");
    });
  });

  describe("quantity", () => {
    it("is 2 only for remote virtual", () => {
      const remote = draftOf(
        deriveClaimDraft(
          base({
            modality: "virtual_remote",
            remoteVirtualEligible: true,
            virtualLocation: "home",
            remoteReason: "surge",
          }),
        ),
      );
      expect(remote.quantity).toBe(2);
    });

    it("is 1 for in-person and for virtual from the pharmacy", () => {
      expect(draftOf(deriveClaimDraft(base({ modality: "in_person" }))).quantity).toBe(1);
      expect(
        draftOf(deriveClaimDraft(base({ modality: "virtual_from_pharmacy" }))).quantity,
      ).toBe(1);
    });
  });

  describe("SSC", () => {
    it("is 4 for a COMPLETED assessment that ended in referral", () => {
      const d = draftOf(deriveClaimDraft(base({ outcome: "no_rx_referral" })));
      expect(d.ssc).toBe(4);
      // Still billable, on the No-Rx PIN — this is the case people confuse with
      // a red-flag exit, which is not billable at all.
      expect(d.pinCode).toBe("9858182");
    });

    it("is null for rx_issued and for OTC/non-pharm outcomes", () => {
      expect(draftOf(deriveClaimDraft(base({ outcome: "rx_issued" }))).ssc).toBeNull();
      expect(
        draftOf(deriveClaimDraft(base({ outcome: "no_rx_otc_or_nonpharm" }))).ssc,
      ).toBeNull();
    });

    it("a red-flag exit is refused outright — it never becomes an SSC=4 claim", () => {
      const res = deriveClaimDraft(base({ outcome: "no_rx_referral", redFlagFired: true }));
      expect(res.billable).toBe(false);
      if (!res.billable) expect(res.reason).toBe("RED_FLAG_EXIT");
    });
  });

  describe("LTC", () => {
    it.each([
      { isResident: true, providerRole: "primary" as const },
      {
        isResident: true,
        providerRole: "secondary" as const,
        isEmergency: true,
      },
      {
        isResident: true,
        providerRole: "secondary" as const,
        isEmergency: false,
      },
    ])("every LTC fact combination refuses pending clarification: %o", (ltc) => {
      const res = deriveClaimDraft(base({ ltc }));
      expect(res.billable).toBe(false);
      if (!res.billable) {
        expect(res.reason).toBe("LTC_PENDING_MINISTRY_CLARIFICATION");
      }
      expect(res).not.toHaveProperty("draft");
    });

    it("a non-LTC patient is unaffected", () => {
      const d = draftOf(deriveClaimDraft(base({ ltc: { isResident: false } })));
      expect(d.feeCents).toBe(1900);
    });
  });

  describe("remote-virtual eligibility", () => {
    it("an ineligible fee-tier row refuses", () => {
      const res = deriveClaimDraft(
        base({
          modality: "virtual_remote",
          remoteVirtualEligible: false,
          virtualLocation: "home",
          remoteReason: "surge",
        }),
      );
      expect(res.billable).toBe(false);
      if (!res.billable) expect(res.reason).toBe("REMOTE_VIRTUAL_REQUIRES_RURAL_FEE_TIER");
    });

    it("an eligible fee-tier row allows remote virtual", () => {
      const res = deriveClaimDraft(
        base({
          modality: "virtual_remote",
          remoteVirtualEligible: true,
          virtualLocation: "home",
          remoteReason: "surge",
        }),
      );
      expect(res.billable).toBe(true);
    });

    it("an eligible tier still requires location and reason", () => {
      const res = deriveClaimDraft(
        base({
          modality: "virtual_remote",
          remoteVirtualEligible: true,
          remoteReason: "surge",
        }),
      );
      expect(res.billable).toBe(false);
      if (!res.billable) {
        expect(res.reason).toBe("REMOTE_VIRTUAL_MISSING_LOCATION_OR_REASON");
      }
    });
  });

  describe("other refusals", () => {
    it("self or family member → never billable", () => {
      const res = deriveClaimDraft(base({ isSelfOrFamily: true }));
      expect(res.billable).toBe(false);
      if (!res.billable) expect(res.reason).toBe("SELF_OR_FAMILY");
    });

    it("claim maximum reached → refuses", () => {
      const res = deriveClaimDraft(base({ claimMaximumReached: true }));
      expect(res.billable).toBe(false);
      if (!res.billable) expect(res.reason).toBe("CLAIM_MAXIMUM_REACHED");
    });

    it("an existing prescription that blocks the claim → refuses", () => {
      const res = deriveClaimDraft(base({ existingRxBlocks: true }));
      expect(res.billable).toBe(false);
      if (!res.billable) expect(res.reason).toBe("EXISTING_RX_BLOCKS_CLAIM");
    });

    it("no refusal path ever emits a draft", () => {
      const refusals: Partial<DeriveClaimDraftInput>[] = [
        { redFlagFired: true },
        { isSelfOrFamily: true },
        { claimMaximumReached: true },
        { existingRxBlocks: true },
        { ailmentGroupCode: "NOPE" },
        { prescriber: {} },
        { ltc: { isResident: true, providerRole: "secondary", isEmergency: false } },
        { modality: "virtual_remote", remoteVirtualEligible: false },
      ];
      for (const over of refusals) {
        const res = deriveClaimDraft(base(over));
        expect(res.billable).toBe(false);
        expect(res).not.toHaveProperty("draft");
      }
    });
  });
});
