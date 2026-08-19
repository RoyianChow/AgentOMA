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

export function PatientScene({
  scenario,
  initial,
  runSceneAction,
}: Readonly<{
  scenario: string;
  initial: VirtualCareSceneResult;
  runSceneAction: (scenario: unknown, request: unknown) => Promise<VirtualCareSceneResult>;
}>) {
  const [role, setRole] = useState<RoleValue>("patient");
  const [result, setResult] = useState<VirtualCareSceneResult>(initial);
  const [isPending, startTransition] = useTransition();

  function viewAs(nextRole: RoleValue): void {
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
  const showTerminalBanner = snapshot.workflowState === "unknown" || snapshot.joinDenialReason !== null;

  return (
    <div className="scene" aria-busy={isPending}>
      <header className="scene-header">
        <h2>{snapshot.label}</h2>
        <p className="scene-sub">
          Workflow: {humanize(snapshot.workflowState)} · Connection: {humanize(snapshot.connectionState)}
        </p>
      </header>

      <fieldset className="role-selector" disabled={isPending}>
        <legend>View as</legend>
        {VIRTUAL_CARE_ROLE_OPTIONS.map((option) => (
          <label key={option.value} className="role-option">
            <input
              type="radio"
              name="patient-role"
              value={option.value}
              checked={role === option.value}
              onChange={() => viewAs(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </fieldset>

      {showTerminalBanner ? (
        <DeniedBanner reason={snapshot.joinDenialReason ?? "unknown_state"} />
      ) : null}

      <GuardBadge name="Join this visit" result={guards.join} />

      <section aria-labelledby="preflight-heading" className="scene-section">
        <h3 id="preflight-heading">Synthetic patient preflight</h3>
        <ul className="tech-check-list">
          {snapshot.technologyReadiness.map((check) => (
            <li key={check.checkType} className={`tech-check tech-${check.safeResultCategory}`}>
              <span>{humanize(check.checkType)}</span>
              <span>
                {humanize(check.safeResultCategory)}
                {check.reasonCode ? ` — ${humanize(check.reasonCode)}` : ""}
              </span>
            </li>
          ))}
        </ul>
        <p>Requested modality: {humanize(snapshot.requestedModality)}</p>
      </section>

      <section aria-labelledby="privacy-consent-heading" className="scene-section">
        <h3 id="privacy-consent-heading">Synthetic privacy and consent</h3>
        <ul>
          <li>Privacy confirmation: {snapshot.privacyConfirmed ? "Confirmed" : "Not yet confirmed"}</li>
          <li>
            Consent: {humanize(snapshot.consentState)} for {humanize(snapshot.consentModality)}
            {snapshot.consentWithdrawn ? " (withdrawn)" : ""}
          </li>
          <li>Identity: {humanize(snapshot.identityOutcome)}</li>
          <li>
            Jurisdiction check:{" "}
            {snapshot.crossJurisdictionalBlocked ? "Blocked — outside approved jurisdiction" : "Not blocked"}
          </li>
        </ul>
        <GuardBadge name="Begin clinical interaction" result={guards.interactionStart} />
      </section>

      <section aria-labelledby="waiting-room-heading" className="scene-section">
        <h3 id="waiting-room-heading">Synthetic waiting room</h3>
        <p>
          {snapshot.participantCount} admitted participant(s):{" "}
          {snapshot.admittedParticipantRoles.map(humanize).join(", ") || "none yet"}
        </p>
        <p>Approved modality: {snapshot.approvedModality ? humanize(snapshot.approvedModality) : "Not yet approved"}</p>
      </section>

      <section aria-labelledby="reconnect-heading" className="scene-section">
        <h3 id="reconnect-heading">Synthetic reconnect and fallback</h3>
        <p>Technical failure: {snapshot.technicalFailureReasonCode ? humanize(snapshot.technicalFailureReasonCode) : "None recorded"}</p>
        <p>
          Fallback: {snapshot.fallbackToModality ? `${humanize(snapshot.fallbackToModality)} (${snapshot.fallbackApproved ? "approved" : "not approved"})` : "None offered"}
        </p>
        <GuardBadge name="Approve/rejoin via fallback" result={guards.fallbackApproval} />
      </section>

      <section aria-labelledby="messages-heading" className="scene-section">
        <h3 id="messages-heading">Synthetic secure-message thread</h3>
        <p>
          Thread: {snapshot.messageThreadState ? humanize(snapshot.messageThreadState) : "No thread"} ·{" "}
          {snapshot.messageCount} message(s)
        </p>
        <GuardBadge name="Send a secure message" result={guards.secureMessageSend} />
      </section>
    </div>
  );
}
