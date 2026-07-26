# P0-A clinical approval record

**Status:** approved

**Approval confirmed:** 2026-07-26

**Approved artifact:** `src/config/triage.ts`

**Clinical scope:** the complete P0-A patient-routing content in the approved
artifact, including the narrowing tree, emergency signs, ailment-specific
prescreen escalation questions, and the tick-bite and UTI sections.

**Approved source revision:** commit `768fd9e011818bd13184a515f4dd03c183d58ad3`
(`update to triage`)

**Release-record SHA-256:**
`8a1eb0f22ad1b866e6a519449e1e266af0ef2ce9783fe75daeb98588837af279`

The SHA-256 is calculated after normalizing line endings to LF. The repository
test recomputes it so a clinical-content change cannot silently inherit this
approval. Approval was confirmed by the project lead after clinical review;
the pharmacy must retain reviewer identity and source-review evidence in its
controlled clinical-governance records.

## Release decision

The P0-A production gate is satisfied for this exact artifact. `/check` may be
served in production and both `/check` and `/assessment` may import this source.
The flow remains a self-reported routing aid, not a diagnosis, prescription,
funding decision, or replacement for the pharmacist's assessment.

## Change control

Any change to clinical questions, options, routing, emergency signs, red flags,
thresholds, or outcomes invalidates this approval. Such a change requires lead
authorization, pharmacist review, a new approval date, and an updated hash in
this file before release. Presentation-only changes that leave the approved
artifact untouched do not invalidate the record.
