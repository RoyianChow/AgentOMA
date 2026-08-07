Prescription Schema

Purpose

This schema defines the canonical prescription object used throughout the AgentRx platform.

All prescription-related workflows must use this schema as the system of record for prescription extraction, validation, review, auditing, routing, communication, and downstream pharmacy operations.

This schema does not authorize dispensing, clinical approval, or medication fulfillment. Human review remains mandatory where required by policy, workflow, regulation, or confidence thresholds.

---

Prescription Object

{
  "schema_version": "1.0.0",
  "prescription_id": "rx_01HZYX7T8K9P4M2Q6A1B3C5D7E",
  "status": "requires_human_review",
  "source": {
    "source_type": "uploaded_prescription",
    "source_id": "doc_123",
    "received_at": "2026-06-05T13:30:00Z"
  },
  "patient_id": "patient_123",
  "prescriber_id": "prescriber_456",
  "medication_id": "medication_789",
  "prescription_details": {
    "written_date": "2026-06-05",
    "expiration_date": null,
    "signature_present": true,
    "prescription_type": "new"
  },
  "verification": {
    "verification_status": "pending",
    "verified_by": null,
    "verified_at": null,
    "verification_notes": null
  },
  "confidence": {
    "overall_score": 0.84,
    "requires_human_review": true,
    "low_confidence_fields": [
      "prescriber.license_number"
    ]
  },
  "review": {
    "status": "pending",
    "reviewer_id": null,
    "reviewed_at": null,
    "review_notes": null
  },
  "warnings": [
    "Prescriber license number confidence below threshold."
  ],
  "audit": {
    "audit_required": true,
    "audit_reference": "audit_123"
  },
  "created_at": "2026-06-05T13:30:08Z",
  "updated_at": "2026-06-05T13:30:08Z"
}

---

Required Fields

Field| Required| Description
prescription_id| Yes| Unique prescription identifier
status| Yes| Current workflow status
source| Yes| Prescription source metadata
patient_id| Yes| Linked patient record
prescriber_id| Yes| Linked prescriber record
medication_id| Yes| Linked medication record
prescription_details| Yes| Core prescription metadata
verification| Yes| Verification workflow state
confidence| Yes| Confidence scoring metadata
review| Yes| Human review state
warnings| Yes| Validation and review warnings
audit| Yes| Audit tracking metadata
created_at| Yes| Record creation timestamp
updated_at| Yes| Record update timestamp

---

Valid Status Values

received
processing
extracted
requires_human_review
verified
rejected
cancelled
expired
completed

---

Valid Prescription Types

new
refill
renewal
transfer
controlled_substance
verbal
faxed
electronic
unknown

---

Verification Status Values

pending
verified
failed
requires_human_review
blocked

---

Prescription Details Object

{
  "written_date": "2026-06-05",
  "expiration_date": null,
  "signature_present": true,
  "prescription_type": "new"
}

---

Human Review Requirements

Human review is required when:

- Patient information is incomplete.
- Prescriber information is incomplete.
- Medication name is unclear.
- Medication strength is unclear.
- Quantity is unclear.
- Directions are unclear.
- Signature is missing.
- Written date is missing.
- Confidence score falls below threshold.
- OCR extraction confidence is low.
- Potential alteration is detected.
- Required fields are missing.
- Policy violations occur.
- Agent uncertainty exists.

---

Validation Rules

The following fields are required for a valid prescription workflow:

patient_id
prescriber_id
medication_id
written_date
medication_name
directions
quantity

Missing required data automatically triggers:

requires_human_review

---

Controlled Substance Rules

If a prescription is classified as:

controlled_substance

The following additional review controls apply:

- Mandatory human review.
- Mandatory prescriber verification.
- Mandatory audit event generation.
- No autonomous workflow progression.
- Escalation tracking required.

---

Safety Restrictions

AgentRx agents must never:

- Approve prescriptions.
- Dispense medication.
- Modify medication details.
- Alter prescriber information.
- Alter patient information.
- Override pharmacist decisions.
- Bypass human review requirements.
- Remove compliance warnings.

---

Audit Requirements

Every prescription lifecycle event must generate audit records:

prescription.received
prescription.extracted
prescription.review_requested
prescription.review_completed
prescription.rejected
prescription.verified

Audit records must reference:

prescription_id
run_id
agent_id
timestamp
reviewer_id

---

Relationships

Prescription
 ├── Patient
 ├── Prescriber
 ├── Medication
 ├── Confidence Score
 ├── Audit Event
 ├── Agent Run
 └── Error Records

---

Versioning

Current schema version:

1.0.0

Schema changes must follow semantic versioning:

- Patch → Documentation updates
- Minor → Optional fields added
- Major → Breaking schema changes

---

Ownership

Schema Owner: AgentRx Engineering

Reviewers:

- Compliance
- Security
- Pharmacy Operations

Last Updated: 2026-06-05