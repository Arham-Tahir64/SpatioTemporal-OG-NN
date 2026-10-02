# Phased implementation roadmap

Planning is on macOS; implementation is on Windows. The module paths below are future implementation tasks; create them only when their phase begins. Advance by evidence gates, not elapsed weeks. The original 8–10-week estimate may fit a narrow demo for an experienced developer; it is not a reliable estimate for all extensions.

## At a glance

**You are here: Phase 0, learning and planning.** Begin with [LEARNING.md](LEARNING.md). On Mac, focus on reading, hand-worked exercises and documenting decisions; Windows setup and executable checks happen when implementation starts.

| Phase | Milestone |
|---|---|
| [0 — Foundations](#phase-0--foundations-and-contract-freeze) | Understand the task; validate environment and geometry |
| [1 — Data](#phase-1--synchronized-data-and-visualization) | Trust the synchronized inputs and labels |
| [2 — Baselines](#phase-2--evaluation-harness-and-classical-baselines) | Establish honest comparisons |
| [3 — Single frame](#phase-3--single-frame-current-occupancy-and-forecast-controls) | Get the simplest learned model working |
| [4 — Temporal model](#phase-4--temporal-actor-occupancy-forecasting-v1) | Complete the first useful offline prototype |
| [5 — Extensions](#phase-5--targeted-dynamicadvanced-experiments) | Optional experiments addressing measured failures |
| [6 — Evaluation](#phase-6--frozen-evaluation-calibration-and-optimization) | Measure accuracy, calibration and speed |
| [7 — Demo](#phase-7--replay-demo-live-integration-and-handoff) | Reproduce and inspect predictions on Windows |

**Focus on one phase at a time.** Phase 4 is a sensible first finish line; Phase 5 is optional. The details below preserve the tasks, experiments, dependencies, failure modes and completion gates for later use.

## Phase 0 — Foundations and contract freeze

**Objective:** make the task and geometry unambiguous before collecting training data.

**Learn:** required geometry/probability/synchronization sections of the [prerequisite roadmap](docs/prerequisites.md), then MotionNet's representation and occupancy-flow task distinctions.

**Tasks:** choose Windows hardware and matched CARLA server/client release; confirm GPU backend; freeze eligible classes, coordinate/grid/label conventions and storage budget; build analytic geometry/ray/polygon fixtures; record environment and remaining decisions. No large dependency framework required.

**Modules/files:** `docs/environment-windows.md`, `configs/data/carla.yaml`, `src/stognn/geometry/frames.py`, `src/stognn/geometry/grid.py`, `tests/test_frames.py`, `tests/test_grid.py` (all planned).

**Experiments:** E00 known transforms, edges, offset boxes and high rays. Hand-compute expected cells.

**Expected outputs:** environment compatibility record, validated fixtures, configuration schema and initial ADR updates.

**Evaluation / done:** transform roundtrip <1e-5 m in analytic float64 examples; handedness and row/column examples exact; no dependency on hidden future state; user can explain target probability versus free space. Every unresolved hardware choice has a concrete verification step.

**Dependencies:** current research package. **Common failures:** installing mismatched CARLA wheel; mirroring axes; treating a body frame as gravity-aligned; assuming macOS is the simulator target.

**Effort estimate:** 12–24 engineering hours plus theory gaps.

## Phase 1 — Synchronized data and visualization

**Objective:** trustworthy episodes and temporal labels before any network.

**Learn:** sensor queues, fixed-time simulation, actor boxes, ground fitting, ray evidence and lifecycle handling.

**Tasks:** implement recorder with exact frame joins and cleanup; persist immutable raw episode/truth separately; generate six-frame windows and four-horizon labels; render raw point cloud, aligned histories, truth footprints and visibility; freeze grouped splits for the pilot. Build leakage checks and per-episode QA report. Select flat scenes first; test local-ground extension before adding slopes.

**Modules/files:** `src/stognn/data/carla_recorder.py`, `data/schema.py`, `data/windows.py`, `data/splits.py`, `geometry/ground.py`, `geometry/raycast.py`, `data/targets.py`, `visualization/bev.py`, `scripts/record.ps1`, `scripts/preprocess.ps1`, `tests/test_labels.py`, `tests/test_causality.py`, `datasets/manifests/pilot.json`.

**Experiments:** E00 plus short straight/turn/crossing/occlusion episodes; inject delayed/missing callbacks and artificial despawn to verify rejection.

**Expected outputs:** 8–12 pilot episodes, manifest, window index, QA plots, six-history/four-future contact sheet and replay.

**Evaluation / done:** all [dataset QA checks](docs/dataset-strategy.md) pass; inspect at least 20 diverse windows; stationary landmarks align; boxes retain correct motion; exact +0.5 s targets; zero split-group overlap. Document raw bytes/second before scaling.

**Dependencies:** Phase 0. **Common failures:** labels collected from the wrong world tick; ground deletion before ray processing; future data entering inputs; label generation ignores box offsets or actors entering ROI.

**Effort estimate:** 24–48 hours. Scale collection only after the gate.

## Phase 2 — Evaluation harness and classical baselines

**Objective:** establish what counts as useful forecasting before spending training compute.

**Learn:** CV kinematics, causal tracking, metric reductions, prevalence effects, calibration and grouped uncertainty.

**Tasks:** implement empty/prevalence/hit persistence; oracle persistence/CV; sensor-only clustering/tracking CV; common target/prediction interface; per-horizon and slice evaluator; bootstrap and metric unit fixtures; lock benchmark splits. Record which baseline has privileged inputs.

**Modules/files:** `src/stognn/baselines/persistence.py`, `baselines/constant_velocity.py`, `baselines/tracking.py`, `evaluation/metrics.py`, `evaluation/slices.py`, `evaluation/bootstrap.py`, `scripts/evaluate.ps1`, `tests/test_metrics.py`, `configs/evaluation/default.yaml`, `experiments/E01/README.md`.

**Experiments:** E01 across empty, stopped, straight-moving, turning and hidden actors.

**Expected outputs:** baseline table, hand-checked confusion counts, confidence intervals with support, and failure gallery.

**Evaluation / done:** analytic perfect/empty/false-positive metric cases exact; oracle CV predicts controlled constant motion up to rasterization error; never label oracle as sensor-only; all four horizons reported. Poor classical performance must be diagnosed, not silently accepted.

**Dependencies:** Phase 1. **Common failures:** global accuracy dominates; CV uses future-fitted velocity; speed units are wrong; bootstrap treats adjacent windows as independent.

**Effort estimate:** 16–32 hours.

## Phase 3 — Single-frame current occupancy and forecast controls

**Objective:** validate learned perception and training before temporal complexity.

**Learn:** CNN/U-Net, logits loss, gradients, normalization, optimizer/checkpoint discipline.

**Tasks:** implement package/model/config loading and masked BCE; train single-frame current actor occupancy; repeat output for learned persistence; train single-frame four-horizon forecaster; run tiny-set overfit and shuffled-label sanity checks; log model/data/environment hashes. Current actor segmentation is the first “static-time” baseline; static-world occupancy is a separate later target.

**Modules/files:** `src/stognn/models/unet.py`, `models/heads.py`, `training/losses.py`, `training/engine.py`, `data/dataset.py`, `scripts/train.ps1`, `configs/models/single_frame.yaml`, `configs/training/baseline.yaml`, `tests/test_losses.py`, `tests/test_model_contract.py`, `models/model-card-template.md`.

**Experiments:** E02 and single-frame arms of E03/E14. Use actual observations only.

**Expected outputs:** tiny-set diagnostic report, trained current model, learned-persistence results, single-frame forecast control and sample predictions.

**Evaluation / done:** suggested debug target >0.95 occupied IoU on a nontrivial 8–16-window overfit set; finite gradients and zero contribution from invalid labels; meaningful held-out current occupancy relative to raw-hit baseline. If overfit fails, diagnose labels/capacity/optimization before expanding data.

**Dependencies:** Phase 2 evaluator. **Common failures:** applying sigmoid twice; averaging masked loss over all cells; reporting training examples as generalization; learning only empty background.

**Effort estimate:** 20–40 hours plus training runtime.

## Phase 4 — Temporal actor occupancy forecasting v1

**Objective:** complete the six-frame system and quantify motion benefit.

**Learn:** temporal fusion, occlusion, effective temporal receptive fields and history controls.

**Tasks:** add stacked 24-channel U-Net and optional current auxiliary head; retain fixed output contract; compare single-frame/repeated/ordered history and no-alignment controls; grow data based on learning curves; train shared-encoder temporal convolution and ConvGRU challengers only after the stack works. Inspect stopped versus moving and visible versus hidden cases.

**Modules/files:** `src/stognn/models/stacked.py`, `models/temporal_conv.py`, `models/convgru.py`, `configs/models/stacked_v1.yaml`, `configs/models/convgru.yaml`, `experiments/E03/README.md` through selected E14 reports, `tests/test_temporal_state.py`.

**Experiments:** E03–E07, E13/E14; three-seed confirmation for final candidates.

**Expected outputs:** reproducible forecast checkpoint, per-horizon baseline comparisons, ablations, calibrated/raw reports and failure gallery.

**Evaluation / done:** complete evaluation protocol and promotion gate, or a documented negative result with a specific diagnosis and next experiment. A scientifically complete negative result does not imply the useful-motion performance goal was achieved. No hidden state crosses episodes. Inputs stop at the anchor time.

**Dependencies:** Phase 3 and benchmark data freeze. **Common failures:** motion trails collapse across time; skip features bypass temporal learning; state is not reset; more training compute is mistaken for architectural gain.

**Effort estimate:** 24–48 hours plus collection/training runtime. This completes the minimum research prototype when the performance gate passes.

## Phase 5 — Targeted dynamic/advanced experiments

**Objective:** address measured failure modes with one extension at a time.

**Learn:** flow conventions, multitask loss scales, semantic labels, attention or uncertainty only as required.

**Tasks:** choose a branch: semantic heads for small actors; backward flow for motion consistency; ConvLSTM/attention for temporal limitations; learned pillars for geometry; camera fusion for ambiguous appearance; uncertainty for calibration or multiple futures. Design valid labels before model changes. Defer full 3D/world-model work to a separate proposal with compute estimates.

**Modules/files:** as needed `src/stognn/data/flow_targets.py`, `models/flow_head.py`, `models/attention.py`, `models/pillars.py`, `data/cameras.py`, `models/camera_bev.py`, `evaluation/flow.py`, branch configs and ADRs.

**Experiments:** select from E08/E09/E12/E15–E22; do not run the entire matrix automatically.

**Expected outputs:** extension report with comparable baseline, changed-contract notes and latency cost.

**Evaluation / done:** all applicable occupancy metrics remain; additional metrics match head semantics; a justified accept/reject/inconclusive decision per extension. A failed extension is retained as evidence, not folded into default architecture.

**Dependencies:** stable Phase 4 baseline. **Common failures:** flow direction mismatch; supervising births with fabricated flow; camera depth leakage; uncertainty loss changes target meaning; 3D expansion hides actor forecast regressions.

**Effort estimate:** 16–40 hours per small extension; multimodal/3D branches require separate estimates.

## Phase 6 — Frozen evaluation, calibration and optimization

**Objective:** select a deployable candidate with honest held-out results.

**Learn:** profiler timing, precision/export tradeoffs, calibration and distribution shift.

**Tasks:** freeze candidates; repeat seeds; fit calibration on reserved split; run final in-domain/held-out-town tests; profile full Windows pipeline; optimize measured bottlenecks; compare FP32/FP16 and optional export; verify numerical/metric parity. Write model/dataset cards.

**Modules/files:** `src/stognn/evaluation/calibration.py`, `evaluation/benchmark.py`, `deployment/export.py`, `scripts/benchmark.ps1`, `configs/deployment/windows.yaml`, `evaluation/reports/v1/README.md`, `models/cards/v1.md`, `tests/test_export_parity.py` if exporting.

**Experiments:** E21–E23 with frozen criteria; fixed corruption suite.

**Expected outputs:** final results, reliability diagrams, p50/p95/p99 latency/memory, checkpoint manifest and limitations.

**Evaluation / done:** report all required slices/support and confidence intervals; no test-set tuning; optimization parity thresholds pass; 5 Hz target measured or explicitly missed with a bottleneck report. Published speed identifies hardware and includes pipeline age.

**Dependencies:** Phase 4; selected Phase 5 results optional. **Common failures:** asynchronous timings appear too fast; simulator and network timings mixed; quantization improves FPS while hurting pedestrians; calibration fits on test.

**Effort estimate:** 16–32 hours plus evaluation runtime.

## Phase 7 — Replay demo, live integration and handoff

**Objective:** make predictions inspectable and reproducible in a running Windows demo.

**Learn:** queue backpressure, freshness, reset semantics and time-indexed robot interfaces.

**Tasks:** implement four synchronized panels (camera, observed LiDAR evidence, predicted actor occupancy, later-revealed ground truth) with horizon slider and baseline toggle; separate prediction time from future-truth availability. Integrate causal ring buffer, input validation, timeout/stale-output status, episode reset and performance logging. Optionally add robotics message adapter and footprint-aware trajectory cost visualization after offline validation.

**Modules/files:** `src/stognn/visualization/replay.py`, `deployment/runner.py`, `deployment/buffer.py`, `deployment/messages.py`, `scripts/demo.ps1`, `docs/demo.md`, `tests/test_stream_reset.py`.

**Experiments:** replay/live output parity, missing sensor frame, queue delay, episode restart, intentional pose corruption. Optional planner cost checks use dense temporal collision verification.

**Expected outputs:** demo video, exact launch commands, model/data manifests, result links and integration schema.

**Evaluation / done:** a fresh Windows environment can reproduce recorded evaluation/demo; live throughput/freshness measured; no future ground truth consumed by inference; stale outputs are explicit; output legend says actor footprint occupancy, not guaranteed free space. Optional planning is labeled a demonstration rather than validated autonomous driving.

**Dependencies:** Phase 6; offline replay can begin in Phase 1. **Common failures:** future truth displayed as if available live; recurrent state survives teleport/reset; blocked queues accumulate old forecasts; model is judged only on attractive scenes.

**Effort estimate:** 12–24 hours for replay/live demo, excluding a full robotics stack.

## Milestone tracking

Record each gate's evidence in `experiments/` or `evaluation/reports/`, link it from the relevant ADR and update README status. Initial engineering range through Phase 7 excluding Phase 5 is roughly 124–248 hours, plus study gaps, collection, compute and setup delays. At 8–10 hours/week this can span several months. Reduce scope by stopping at the Phase 4 offline prototype; do not remove geometry or leakage checks to meet a date.
