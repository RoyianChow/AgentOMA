# Task 07 — Webhook Security and Reconciliation Design

**Workstream:** G — inbound provider event processing, monotonic projection, and
the reconciliation workflow

**Prepared:** 2026-08-06

**Repository design baseline:** `fe384fdba70477b7ea0b06fd6f83321a152210dd`

**Migration/runtime effect:** none

**Production approval:** not granted

**Companions:** [`provider-adapter-contract.md`](provider-adapter-contract.md) ·
[`vendor-review-scorecard.md`](vendor-review-scorecard.md)

## Decision summary

This document defines how an inbound provider event is authenticated, bounded,
deduplicated, normalized, and applied — and what happens when the provider's
answer is uncertain, late, contradictory, or absent.

It adds no TypeScript, SQL, endpoint, route, worker, webhook secret, or network
effect. No webhook endpoint exists on `main` and none is created here.

Two framing rules:

1. **A webhook is untrusted input, not a command.** Until raw-body authentication
   succeeds, an inbound request is hostile bytes. Even after authentication, a
   provider event is *evidence about transport* — never an instruction, never an
   authority, never a clinical or billing fact.
2. **Uncertainty is a state, not a problem to clear.** `RECONCILED_UNRESOLVED` is
   a legitimate final answer. A queue cleared by guessing is worse than a queue
   that stays honest.

## Scope and limits

In scope: the receiver pipeline in order; the receipt state machine; replay and
ordering semantics; monotonic projection rules; what an event may never do; the
reconciliation workflow end to end; the response contract; and the logging
boundary.

Out of scope, by explicit deferral: adapter operations and payload minimization
(companion contract); vendor evaluation (the scorecard); outbox and dispatch
mechanics (Workstream E); suppression semantics (Workstream D companion), which
this document consumes rather than redefines.

# Part 1 — Receiver pipeline

Steps run in this order. Later steps never execute if an earlier one fails. The
ordering is itself a control: parsing before verifying would hand an attacker a
parser.

| # | Step | Requirement | On failure |
|---|---|---|---|
| 1 | Transport | HTTPS enforced in the production design. | Reject at the edge. |
| 2 | Bounds | Enforce maximum request size and an allowlisted content type before reading the body into memory. | Generic rejection; no receipt beyond a safe counter. |
| 3 | Raw capture | Read exact raw bytes without logging, echoing, or transforming them. | — |
| 4 | Verifier selection | Select the provider-account verifier from **server configuration**, never from a payload field claiming an account or tenant. | Quarantine. |
| 5 | Signature | Verify over the exact raw bytes. Only `VALID` proceeds. | Receipt recorded with `signature_outcome`; state `QUARANTINED`; never parsed. |
| 6 | Timestamp window | Enforce an allowed skew window. Bounds are `UNRESOLVED(T07-D34)`. | `REPLAY_DENIED`. |
| 7 | Deduplication | Unique on the authenticated event digest. | `replay_outcome = DUPLICATE`; nothing mutates. |
| 8 | Account/config binding | Validate the provider account and configuration version against the expected values for the referenced message. | Quarantine; no projection movement. |
| 9 | Reference resolution | Resolve the provider reference through the internal protected mapping (Contract 16). | Unmatched receipt; quarantine; never guess a match. |
| 10 | Scope recheck | Recheck custodian and logical-message scope for the resolved attempt. | Quarantine; possible security review. |
| 11 | Schema and type | Validate the event schema; map to an allowlisted event type. | Unknown/malformed stays quarantined. |
| 12 | Ordering and monotonicity | Apply §3 rules. | Recorded as stale or not-comparable; projection unchanged. |
| 13 | Apply | Advance the delivery projection and create suppression or review consequences where an approved deterministic policy exists. | — |
| 14 | Respond | Generic response exposing no internal state (§6). | — |

Steps 1–11 can only *reject*. Only step 13 changes anything, and what it may
change is bounded by Part 4.

# Part 2 — Receipt state machine

`ProviderWebhookReceipt.receipt_state` (Contract 17):

```text
QUARANTINED → ACCEPTED → RECONCILED
QUARANTINED → IGNORED
ACCEPTED   → IGNORED        (duplicate, stale, or not comparable)
```

| State | Meaning |
|---|---|
| `QUARANTINED` | Not authenticated, not parseable, unmapped, unmatched, or out of scope. Default for anything uncertain. Terminal unless an authorized process resolves it. |
| `ACCEPTED` | Authenticated, bound, and normalized; eligible to affect the projection. |
| `IGNORED` | Authenticated but deliberately without effect — duplicate, stale, regressive, or not comparable. |
| `RECONCILED` | Consumed by a reconciliation decision. |

Raw payload retention is **off by default**. Where a separately approved
quarantine payload exists, it is envelope-encrypted with a mandatory expiry and
deletion evidence, readable only by a named incident role.

# Part 3 — Ordering and monotonic projection

| Rule | Requirement |
|---|---|
| Provider time is not authority | `provider_event_at` is recorded but never trusted alone for ordering. Clock skew and vendor semantics make it advisory. |
| Conservative comparison | Where order cannot be established, `ordering_outcome = NOT_COMPARABLE` and the projection does not move. |
| No regression | The delivery projection advances only along approved transitions. A `PROVIDER_ACCEPTED` event arriving after `DELIVERED` is recorded and ignored — it never pulls the projection backward. |
| Terminal is terminal | `BOUNCED`, `UNDELIVERABLE`, and `COMPLAINT` are not overwritten by a later "delivered". Contradiction opens a reconciliation case rather than picking the friendlier value. |
| Events are immutable | Corrections are new receipts and new decisions. No receipt is edited. |
| Duplicates are free | Reprocessing the same authenticated event any number of times produces the same state — proven by property test, not by inspection. |

# Part 4 — What an inbound event may never do

| Prohibited | Because |
|---|---|
| Create a logical message or an intent | Creation authority belongs to the orchestrator, from an authoritative source event. |
| Revive a cancelled, expired, or superseded intent | Terminal states are terminal (Workstream E). |
| Restore consent or lift a suppression | One-way rule (Workstream D companion §3.3). |
| Schedule, retry, or resend anything | Scheduling authority is upstream and re-evaluated. |
| Mark a message read, or imply patient identity | Delivery is not readership; no provider event identifies a person. |
| Change appointment, follow-up, assessment, visit, secure-thread, or claim completion | Enforced by database role grants — the webhook role has no such capability. |
| Select a channel, destination, template, or provider | Not an authority. |
| Enter free text into a queue, audit event, or metric label | Payload-free evidence only. |

An event **may**: advance the delivery projection within §3; create suppression
under an approved deterministic mapping; open a review or reconciliation item;
and record payload-free evidence.

# Part 5 — Reconciliation

## 5.1 When it is required

| Trigger | Result |
|---|---|
| Any attempt in `UNCERTAIN` | `reconciliation_state = REQUIRED` |
| Authenticated event that cannot be matched to an attempt | Case opened for the unmatched receipt |
| Status conflict — provider evidence contradicts the current projection | Case opened; projection unchanged meanwhile |
| Provider outage affecting attempts with unknown outcomes | Cases opened; bounded lookups only |
| Terminal-state contradiction (§3) | Case opened |
| Attempt in `DISPATCHING` recovered after a crash or lease expiry | Becomes `UNCERTAIN`, then `REQUIRED` |

## 5.2 Who may initiate and decide

| Action | Authority |
|---|---|
| Open a case | The worker, reconciler, or webhook processor — automatic. |
| Assign | An authorized operations role; assignment and reassignment are audited. `UNRESOLVED(T07-D38)` for named ownership. |
| Perform a provider lookup | The reconciler only, using `fetch_status` with the protected reference, under bounded backoff and rate limits. |
| Record a resolution | The assigned authorized operator, with evidence bound to the protected provider mapping. |
| Correct a resolution | An authorized operator, by **superseding** decision; the prior decision is retained. |
| Close as unresolved | The assigned operator, with a safe reason. |

No one approves their own resolution where the case arose from their own
operational action. Software never resolves a case by inference.

## 5.3 Blocked from ordinary retry

While any attempt for a logical message is `UNCERTAIN`, the message cannot
produce another attempt. The retry path is not merely deprioritized — it is
unreachable. Resolution is the only exit:

| Resolution | Effect |
|---|---|
| `RECONCILED_SENT` | Attempt becomes `SENT`. No new attempt. |
| `RECONCILED_NOT_SENT` | The outbox row may return to `PENDING` **only if** the intent is still useful and the full dispatch-authority query still passes. A new attempt gets a new attempt number and a new provider idempotency value. |
| `RECONCILED_UNRESOLVED` | `FAILED_FINAL`. The uncertainty is recorded permanently. |

## 5.4 Mapping provider evidence to internal status

- Only allowlisted, documented vendor semantics map to internal status; anything
  else is `UNKNOWN`. Vendor semantics are `UNRESOLVED(T07-D35)` and must come
  from the contract and documentation, not from observed behaviour in testing.
- A mapping is versioned. Changing it does not retroactively rewrite past
  decisions.
- Evidence that cannot be bound to the protected provider reference is not
  evidence for that message, however plausible it looks.

## 5.5 Manual review, expiry, and authority changes

| Question | Answer |
|---|---|
| When does a case become manually reviewable? | On assignment, or immediately where automatic lookup is unavailable or exhausted. |
| How is a manual decision authorized and audited? | Authorized role plus bound evidence; append-only audit with actor, decision, evidence reference, policy version, and time. No free text. |
| How does unresolved state expire? | A case may close as `RECONCILED_UNRESOLVED` under an approved ageing rule (`UNRESOLVED(T07-D36/T07-D37)`). Expiry closes the *case*; it never converts uncertainty into a claim of delivery or non-delivery, and it never deletes the evidence. |
| What if consent is revoked or the contact suppressed mid-case? | Reconciliation **continues** — it establishes what already happened, and stopping would destroy the record of a possible disclosure. But no resolution may produce a new send: `RECONCILED_NOT_SENT` cannot requeue against a revoked consent or suppressed contact, because the dispatch-authority query denies. |
| Does an open case block anything else? | It blocks retry for that message only. It never blocks care, portal access, or another separately authorized message. |

# Part 6 — Response and logging boundary

**Response contract:** a generic acknowledgement that reveals no internal state.
The same shape for accepted, duplicate, ignored, quarantined, and unmatched
events. No internal identifier, no message state, no destination, no reason
detail, and no differential timing usable as an oracle. Provider HTTP success
means only "received and safely handled" — never that a clinical or payment
outcome occurred.

**Logging boundary:** no raw bodies, no signatures, no secrets, no destinations,
no provider references, no free text, and no full IPs in application logs,
traces, metrics, or evidence artifacts. Only safe event types, outcomes, and
reason codes. High-cardinality identifiers are excluded from metric labels.
Leakage tests plant synthetic canaries and must fail deterministically.

# Part 7 — Planned synthetic evidence — NOT RUN

| ID | Red run (must fail closed) | Green run |
|---|---|---|
| WG-B01 | Invalid, missing, and unknown signatures are never parsed; the body never reaches a parser or a log. | A valid signature over exact raw bytes proceeds to normalization. |
| WG-B02 | Oversized bodies and unsupported content types are rejected before being read into memory. | In-bounds requests process normally. |
| WG-B03 | A payload-declared account or tenant never selects the verifier or the scope. | Server configuration selects both. |
| WG-B04 | Duplicate, replayed, and out-of-window events mutate nothing. | A first-seen in-window event applies once; reprocessing is idempotent. |
| WG-B05 | An unmatched or cross-message provider reference never binds to an attempt by proximity or guess. | Exact protected-mapping resolution binds correctly. |
| WG-B06 | A regressive or contradictory event never moves the projection backward; terminal states survive. | Contradiction opens a case with the projection unchanged. |
| WG-B07 | A webhook cannot create an intent, revive a cancelled message, lift suppression, restore consent, or schedule anything. | It advances only the delivery projection and permitted consequences. |
| WG-B08 | The webhook role cannot write assessment, follow-up, booking, visit, or claim state — proven by attempted writes failing on grants. | Clinical and billing state is unchanged. |
| WG-B09 | Responses are byte-identical and timing-indistinguishable across accepted, duplicate, ignored, quarantined, and unmatched cases. | No oracle is derivable. |
| WG-B10 | Planted canaries — body, signature, destination, provider reference — never appear in logs, traces, metrics, audit, or artifacts. | Scans pass with canaries planted and failure paths exercised. |
| WG-B11 | An `UNCERTAIN` message cannot reach the retry path by any route. | Only a reconciliation resolution changes its state. |
| WG-B12 | `RECONCILED_NOT_SENT` cannot requeue against revoked consent, a superseded contact, or an active suppression. | A still-authorized message requeues once with a new attempt number. |
| WG-B13 | A case cannot be closed as sent or not-sent without evidence bound to the protected reference. | `RECONCILED_UNRESOLVED` records cleanly and survives correction as superseded history. |
| WG-B14 | Case ageing never converts uncertainty into a delivery claim, and never deletes evidence. | Expiry closes the case with a safe reason. |

# Part 8 — Unresolved decisions

| ID | Decision | Blocks |
|---|---|---|
| T07-D02 | Task 07 scope, owners, tier, expiry, kill-switch operator, Task 11 Checkpoint 1 | All runnable code |
| T07-D31/D32 | Vendor selection and contract | Every provider semantic below |
| T07-D34 | Signature algorithm, key rotation, raw-body handling, timestamp window, replay and ordering controls | Parts 1–3 |
| T07-D35 | Provider outcome semantics and status-lookup behaviour | §5.4 |
| T07-D36 | Outage, duplicate, and delayed-event runbooks | §5.5 ageing |
| T07-D37 | SLI/SLO, queue-age, and reconciliation targets | §5.5, metrics |
| T07-D38 | Named operations ownership and escalation | §5.2 |
| T07-D28 | Wrong-recipient and privacy-breach runbook | Suppression consequences of G-09 |

## Workstream G acceptance check — webhook and reconciliation

- The receiver pipeline is ordered so that nothing is parsed before it is
  authenticated, and steps 1–11 can only reject.
- HTTPS, size and content-type bounds, exact-raw-byte signature verification,
  timestamp windows, deduplication, replay prevention, account/configuration
  binding, protected-mapping resolution, scope recheck, and schema/type
  validation are all specified with failure behaviour.
- The receipt state machine defaults to quarantine and keeps raw payload
  retention off.
- Ordering is conservative, the projection is monotonic, terminal states survive
  contradiction, and duplicate processing is idempotent.
- The prohibitions list is explicit, and the clinical/billing prohibition is
  enforced by database grants rather than convention.
- Reconciliation defines when it is required, who may initiate and decide,
  bounded lookup behaviour, the block on ordinary retry, evidence-to-status
  mapping, manual review authorization and audit, unresolved expiry, and the
  effect of consent revocation or suppression.
- `RECONCILED_UNRESOLVED` is preserved as a legitimate final answer.
- Responses are generic and oracle-free; logs are payload-free.
- No webhook endpoint, secret, vendor semantic, or timing bound was invented.
- No schema, migration, runtime code, credential, recipient, PHI, or network
  effect was added.

## Current disposition

**Webhook security and reconciliation design: complete as design
documentation.**

- **Webhook security model:** PASS as documentation; BLOCKED on T07-D34 for
  every vendor-specific bound.
- **Reconciliation model:** PASS as documentation; BLOCKED on T07-D35, T07-D36,
  T07-D37, T07-D38.
- **Webhook endpoint:** does not exist and is not created here.
- **Synthetic evidence (WG-B01–WG-B14):** NOT RUN.
- **Real PHI, recipients, providers, credentials, or external delivery:** NO.
