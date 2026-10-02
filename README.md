# SpatioTemporal-OG-NN

Research-backed engineering plan for forecasting vehicle and pedestrian occupancy from one second of LiDAR history in CARLA.

**Status: research/specification complete; data collection, model implementation, training, and benchmarking have not started.** All dimensions, budgets, and acceptance thresholds below are proposed engineering defaults, not measured results. Research snapshot: 2026-10-01 (America/Edmonton). Planning is on macOS; implementation will be on Windows.

## Start here

1. [Expanded project specification and critique](docs/project-specification.md)
2. [Prerequisite learning roadmap](research/prerequisites.md)
3. [Literature review and existing-system comparison](research/literature-review.md)
4. [Concrete v1 architecture](docs/architecture.md)
5. [Phased implementation roadmap](docs/implementation-roadmap.md)
6. [Dataset and labeling strategy](docs/dataset-strategy.md)
7. [Evaluation strategy](docs/evaluation-strategy.md)
8. [Experiments and ablations](experiments/experiment-plan.md)
9. [Repository structure and artifact policy](docs/repository-structure.md)
10. [Curated references, code, lectures, and videos](research/references.md)

A [machine-readable proposed contract](configs/v1-proposed.json) captures the default settings; it is not executable training configuration.

Supporting records: [architecture decisions](docs/decisions/README.md), [research method and limitations](research/research-log.md), [open questions and risks](docs/open-questions.md), and [unchanged original proposal](docs/archive/original-project-plan.md).

## Proposed first system

Six LiDAR frames at `[-1.0,-0.8,-0.6,-0.4,-0.2,0]` seconds → alignment to a fixed current ego reference → four BEV evidence channels per frame → channel-stacked 2D U-Net → four binary actor-footprint probability maps at `[0.5,1,2,3]` seconds.

Coverage is 64 × 64 m at 0.5 m/cell. Input is `[B,6,4,128,128]`; forecast output is `[B,4,128,128]`. Vehicle and pedestrian footprints include stopped actors. A zero target means **no selected actor**, not safe/free space. Static obstacles and unknown sensor coverage are separate layers.

Begin with geometry and data validation, then non-neural baselines, a single-frame current-occupancy model, and temporal forecasting. ConvGRU, attention, cameras, flow, and 3D world models are gated experiments.

## Source of truth

This repository owns specifications, decisions, code, dataset definitions, references, experiments, results, and reproducibility records. Small authored artifacts and fixtures belong in Git. Large raw datasets and checkpoints live at the documented repository paths with Git LFS or a versioned artifact manifest; they must never exist only in an undocumented notebook or external dashboard. External datasets remain subject to their distribution terms. See the [storage policy](docs/repository-structure.md).

The initial local checkout and supplied GitHub repository had no commits. The proposal was imported from the supplied Markdown attachment without modification. Its embedded “first concrete task” is historical proposal text; this request authorizes research and planning, so no simulator or model has been implemented.

## Next milestone

Complete Phase 0's geometry/probability exercises and hardware/version selection, then record one short synchronized episode and render six aligned inputs and four future targets. Pass the dataset QA gate before scaling collection or training.
