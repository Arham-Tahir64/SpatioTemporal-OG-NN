# ADR 003 — Data, platform and repository ownership

Status: Windows implementation confirmed by user; storage and exact versions pending Phase 0.

**Context:** empty repository, original proposal supplied as a Markdown attachment, planning on macOS. Project artifacts must remain organized under one repository.

**Decision:** preserve original proposal unchanged; implement CARLA collection/training on Windows in separate environments; use complete simulator actor labels with sensor-only model inputs; split whole scenario/replay groups before windows. Version all definitions/configs/metrics and artifact manifests in Git; keep large binary payloads at documented repository paths with an explicit LFS/backing-store policy.

**Evidence:** CARLA synchronization and sensor documentation support frame-indexed collection; nuScenes illustrates that sensor and annotation timestamps can differ. See R21/R37–R40 in the [catalog](../references.md).

**Alternatives:** randomly split windows creates overlap leakage; importing a full research framework before validating the data raises compatibility costs; ordinary Git for large sensor logs harms repository usability.

**Consequences:** collection and labels are repeatable and auditable. Hardware/runtime claims wait for actual Windows measurements. No simulator installation, data generation or model implementation is part of this research phase.

**Revisit:** choose exact GPU/backend, CARLA/Python versions and artifact budget before implementation-scale data collection. Any real-data adapter receives its own label/split contract.
