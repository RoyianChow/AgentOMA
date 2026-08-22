"use client";

import { useState, useTransition } from "react";

import type { VirtualCareSceneResult } from "../../../../virtual-care/visit-server";
import {
  DeniedBanner,
  GuardBadge,
  NotFoundBanner,
  VIRTUAL_CARE_ROLE_OPTIONS,
  humanize,
} from "../../scene-components";

type RoleValue = (typeof VIRTUAL_CARE_ROLE_OPTIONS)[number]["value"];

const ACTOR_REFS: Record<RoleValue, string> = {
  patient: "SYNTH-PATIENT-006-0001",
  pharmacist: "SYNTH-PHARMACIST-006-0001",
  delegate: "SYNTH-DELEGATE-006-0001",
  support_person: "SYNTH-SUPPORT-006-0001",
  interpreter: "SYNTH-INTERPRETER-006-0001",
};

const FIXED_NOW_UTC = "2026-08-11T15:00:00.000Z";

export function PharmacistScene({
  scenario,
  initial,
  runSceneAction,
}: Readonly<{
  scenario: string;
  initial: VirtualCareSceneResult;
  runSceneAction: (scenario: unknown, request: unknown) => Promise<VirtualCareSceneResult>;
}>) {
  const [role, setRole] = useState<RoleValue>("pharmacist");
  const [result, setResult] = useState<VirtualCareSceneResult>(initial);
  const [isPending, startTransition] = useTransition();

  function actAs(nextRole: RoleValue): void {
    setRole(nextRole);
    startTransition(async () => {
      const next = await runSceneAction(scenario, {
        actorRef: ACTOR_REFS[nextRole],
        claimedRole: nextRole,
        trustedNowUtc: FIXED_NOW_UTC,
      });
      setResult(next);
    });
  }

  if (!result.found) return <NotFoundBanner />;
  const { snapshot, guards } = result;
  const serviceGaps = [
    !snapshot.serviceAvailability.task02Available ? "Task 02 (assessment/claim) unavailable" : null,
    !snapshot.serviceAvailability.task05Available ? "Task 05 (identity/delegation) unavailable" : null,
    !snapshot.serviceAvailability.task11ReleaseGateVerified ? "Task 11 release gate not verified" : null,
  ].filter((value): value is string => value !== null);

  return (
    <div className="scene" aria-busy={isPending}>
      <header className="scene-header">
        <h2>{snapshot.label}</h2>
        <p className="scene-sub">
          Workflow: {humanize(snapshot.workflowState)} · Connection: {humanize(snapshot.connectionState)}
        </p>
      </header>

      <fieldset className="role-selector" disabled={isPending}>
        <legend>Act as</legend>
        {VIRTUAL_CARE_ROLE_OPTIONS.map((option) => (
          <label key={option.value} className="role-option">
            <input
              type="radio"
              name="pharmacist-role"
              value={option.value}
              checked={role === option.value}
              onChange={() => actAs(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </fieldset>

      {serviceGaps.length > 0 ? <DeniedBanner reason={serviceGaps.join("; ")} /> : null}
      {snapshot.joinDenialReason !== null ? <DeniedBanner reason={snapshot.joinDenialReason} /> : null}

      <section aria-labelledby="participant-controls-heading" className="scene-section">
        <h3 id="participant-controls-heading">Synthetic pharmacist participant controls</h3>
        <p>
          {snapshot.participantCount} admitted participant(s):{" "}
          {snapshot.admittedParticipantRoles.map(humanize).join(", ") || "none yet"}
        </p>
        <GuardBadge name="Admit or remove a participant" result={guards.participantAdmission} />
      </section>

      <section aria-labelledby="checklist-heading" className="scene-section">
        <h3 id="checklist-heading">Synthetic identity, location, and consent checklist</h3>
        <ul>
          <li>Identity: {humanize(snapshot.identityOutcome)}</li>
          <li>
            Jurisdiction: {snapshot.crossJurisdictionalBlocked ? "Blocked — outside approved jurisdiction" : "Within approved jurisdiction"}
          </li>
          <li>
            Consent: {humanize(snapshot.consentState)}
            {snapshot.consentWithdrawn ? " (withdrawn)" : ""}
          </li>
          <li>Privacy confirmation: {snapshot.privacyConfirmed ? "Confirmed" : "Not yet confirmed"}</li>
        </ul>
        <GuardBadge name="Begin clinical interaction" result={guards.interactionStart} />
      </section>

      <section aria-labelledby="suitability-heading" className="scene-section">
        <h3 id="suitability-heading">Synthetic modality-suitability control</h3>
        <p>
          Current decision: {humanize(snapshot.suitabilityState)}
          {snapshot.suitabilityReasonCode ? ` — ${humanize(snapshot.suitabilityReasonCode)}` : ""}
        </p>
        <GuardBadge name="Record a suitability decision" result={guards.suitabilityDecision} />
      </section>

      <section aria-labelledby="technical-failure-heading" className="scene-section">
        <h3 id="technical-failure-heading">Synthetic technical-failure control</h3>
        <p>{snapshot.technicalFailureReasonCode ? humanize(snapshot.technicalFailureReasonCode) : "No technical failure recorded"}</p>
        <p className="footer-note">
          A technical failure or vendor event can never, by itself, mark this visit complete.
        </p>
      </section>

      <section aria-labelledby="fallback-heading" className="scene-section">
        <h3 id="fallback-heading">Synthetic fallback selection</h3>
        <p>
          {snapshot.fallbackToModality
            ? `${humanize(snapshot.fallbackToModality)} (${snapshot.fallbackApproved ? "approved" : "pending approval"})`
            : "No fallback offered"}
        </p>
        <GuardBadge name="Approve fallback" result={guards.fallbackApproval} />
      </section>

      <section aria-labelledby="pharmacist-messages-heading" className="scene-section">
        <h3 id="pharmacist-messages-heading">Synthetic secure-message thread</h3>
        <p>
          Thread: {snapshot.messageThreadState ? humanize(snapshot.messageThreadState) : "No thread"} ·{" "}
          {snapshot.messageCount} message(s)
        </p>
        <GuardBadge name="Send a secure message" result={guards.secureMessageSend} />
      </section>

      <section aria-labelledby="assessment-link-heading" className="scene-section">
        <h3 id="assessment-link-heading">Synthetic assessment-link guard</h3>
        <p>Pharmacist completion recorded: {snapshot.pharmacistCompletionRecorded ? "Yes" : "No"}</p>
        <GuardBadge name="Link this visit to an assessment" result={guards.assessmentLink} />
        <GuardBadge name="Proceed to claim action" result={guards.claimAction} />
      </section>
    </div>
  );
}
