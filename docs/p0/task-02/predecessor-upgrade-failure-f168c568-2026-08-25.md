# Task 02 predecessor-upgrade failure — `f168c568…`

**Run date:** 2026-08-25  
**Candidate:** `f168c56884d2b6835aabdba79aa0d8ba7f3cccd5`  
**Result:** `FAIL — LOOPBACK_TCP_DENIED`  
**Production/Supabase access:** none

## Exact evidence

- Run record:
  [`evidence/runs/f168c56884d2b6835aabdba79aa0d8ba7f3cccd5/predecessor-upgrade-run.json`](evidence/runs/f168c56884d2b6835aabdba79aa0d8ba7f3cccd5/predecessor-upgrade-run.json)
- Evidence SHA-256:
  `30f2157362f7b6d3b4dd699823b24e3d72758cd5814a709b755eece264fdb6d4`
- External approval SHA-256:
  `fb53f61828f3c151bfdd33664593d5199608f2e9d02f07e84954af113c41f4a9`
- Migration head: `0018_clever_mister_fear`
- Migration SHA-256:
  `112944b4420fe78517b7de2055287af5bf070058172064f540ca9130d5a5cfc6`
- Migration-chain digest:
  `7f297547efbc424b79310574e2ba2e9ef6c90663111feae56ae2ae196ce2f202`
- Docker image:
  `sha256:57c72fd2a128e416c7fcc499958864df5301e940bca0a56f58fddf30ffc07777`
- Compose configuration hash:
  `28bc1c3bc5272eb2fd66ce2328126cca1adaabc5d29d2940e73a50e87086fa04`

## What the run proved

The exact approval and pre-start identity checks passed. Docker created the
synthetic PostgreSQL service and reported it healthy. The harness then denied
at its bounded IPv4 loopback TCP readiness probe for `127.0.0.1:5434`.
Because this probe runs before PostgreSQL client creation, migration replay,
or fixture insertion, no database protocol or migration write began.

The `finally` teardown completed with `PASS`. Follow-up inspection found no
remaining Task 02 container, network, or named volume. The evidence records no
PHI, Supabase access, external integration, `db:push`, migration edit, or
manual migration-history edit.

## Read-only diagnosis

- Docker Desktop engine `29.6.2` responded through the local Linux-engine
  named pipe.
- Windows TCP exclusion ranges did not include port `5434`.
- A local Node TCP server and client using IPv4 loopback port `5434` connected
  successfully, so the Node socket primitive and host port are functional.
- The failure is therefore isolated to the Docker Desktop published-port path
  for this Compose topology. The service uses a loopback-only published port
  and an `internal: true` network.

Docker documents that a port published to `127.0.0.1` should be reachable only
from the host, while `internal: true` makes a Compose network externally
isolated. The repository has not yet proved whether their combination on this
Docker Desktop version is the direct cause. Treat that as a hypothesis, not a
finding.

## Required next step

Do **not** rerun this candidate or reuse its consumed G1-D. The next action is
a separately authorized, synthetic-only diagnostic/remediation candidate that
proves the Windows Docker Desktop forwarding behavior without weakening
network denial. Any implementation change requires a new clean candidate and
fresh exact G1-D before another predecessor/restart run. Migration `0018`
remains unapplied live and production promotion remains blocked.
