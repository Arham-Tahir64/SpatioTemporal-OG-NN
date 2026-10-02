# Project specification v1

Status: proposed baseline contract, 2026-10-01. This specification supersedes the [original proposal](archive/original-project-plan.md). Numerical settings are **recommendations** until tested; sourced findings are **established techniques**; optional research branches are **experimental ideas**.

## 1. Purpose and boundary

Build an offline-trainable, online-causal network that receives the last second of LiDAR observations and ego poses and predicts the probability that each ground-plane cell intersects a selected actor footprint at four future times. Demonstrate it on unseen CARLA episodes and compare it with persistence and constant-velocity baselines.

The first deliverable is a reproducible **2D BEV actor-occupancy forecaster**. It is not full 3D semantic scene completion, a complete probabilistic world simulator, a tracker, or an autonomous planner. This narrower target permits useful engineering evidence before adding those capabilities.

Let `G_ij` be a 0.5 m square in reference frame `E0`, and `A(t+h)` the union of supported non-ego actor footprints. Define:

`Y_h(i,j) = 1[area(G_ij ∩ A(t+h)) > epsilon]`.

Use a small, documented numerical tolerance for polygon intersection, not a semantic minimum area. The model estimates `P(Y_h(i,j)=1 | LiDAR[t-1:t], poses[t-1:t])`. These are marginal probabilities; they do not specify the joint distribution of coherent actor trajectories or collision events. This definition includes stopped/parked vehicles and pedestrians. “Dynamic” names the forecasting problem, not a speed filter.

## 2. Critique of the original proposal

| Original choice or omission | Assessment | Revised decision / reason |
|---|---|---|
| LiDAR + pose, 2D BEV, six frames, 0.5 m cells | Sensible compact starting point | Retain, document all indexing and timestamp conventions |
| Start with dynamic actors; static map separate | Good scope, but easy to misread “empty” | Name output actor occupancy; static obstacles/visibility remain independent |
| Three features, 18 stacked channels | “Observed-space mask” is underspecified | Four evidence features → 24 stacked channels; explicit return hit and ray traversal evidence |
| Empty LiDAR cells are unknown | Correct | Preserve distinction; even a traversing 3D ray does not certify an entire 2D column free |
| All clouds and targets in current frame | Correct and essential | Freeze current yaw-aligned ego frame for all horizons; define sensor origins and box-local offsets |
| Six frames 0.2 s apart; target at +0.5 s | Requires two time resolutions | Record simulator truth at 20 Hz; inputs every four ticks; targets at +10/+20/+40/+60 ticks |
| Future actor boxes available from CARLA | Useful privileged supervision | Store all supported actors, including occluded/out-of-input-ROI actors; prevent access from input loader |
| Box footprints represent occupied space | Approximation, not physical geometry | Conservative positive-area rasterization; quantify aliasing and pedestrian inflation |
| Single U-Net predicts four maps | Good first forecast model | Add single-frame current-head debugging model, then matched temporal comparisons |
| ConvGRU after U-Net | Sensible hypothesis, not assured improvement | Compare with factorized temporal convolutions and matched budgets |
| Persistence and oracle constant velocity | Necessary but insufficient | Add sensor-only persistence and sensor-derived constant velocity; report oracle baselines separately |
| Weighted BCE | May fix imbalance but alters probability optimum | Unweighted BCE default; weighting/focal/Dice are controlled ablations with recalibration |
| IoU, precision/recall, calibration | Good start | Add PR-AUC/AP, per-horizon NLL/Brier, scenario slices and episode bootstrap |
| Episode split and held-out town | Correct | Group replays/route families/seeds before windows; separate development, calibration and test |
| Desktop GPU presumed; 8–10 weeks | Hardware and experience unknown | Hardware compatibility gate; milestone estimates rather than calendar promise |
| Dataset retention, experiment traceability absent | Reproducibility gap | Version manifests, hashes, environment and per-run cards in repository |
| Planner integration suggested | Reasonable demonstration only | Defer until calibrated forecasting and footprint-aware time alignment work |

## 3. Requirements

| ID | Requirement | Verification |
|---|---|---|
| R01 | Inputs contain only sensors and ego state available at or before anchor time | Schema allowlist; future-mutation leakage test |
| R02 | All six inputs and all labels use one frozen frame | Analytic transforms; stationary landmark overlay |
| R03 | Labels have explicit target semantics and independent validity masks | Handcrafted actor polygons, boundary and missing-frame fixtures |
| R04 | Episodes/replays cannot leak across splits | Manifest audit and zero shared group IDs |
| R05 | Every prediction includes anchor time, frame transform, horizons and grid metadata | Saved prediction schema validation |
| R06 | Fair comparisons hold data, output domain, masks, training budget and evaluator fixed | Experiment card and config diff |
| R07 | Evaluation reports all horizons and rare-case slices | Metric JSON and support counts |
| R08 | Any reported run is recoverable from source/config/data/checkpoint identities | Reproduction command and artifact hashes |
| R09 | Model output excludes ego and covers all supported actor instances, including unseen-at-input instances | Birth/entry/occlusion fixtures |
| R10 | Training and simulator dependencies are isolated | Pinned environments and replayable processed data |

## 4. Nonfunctional requirements and success

Correctness precedes speed. Start on offline episodes with deterministic fixtures and CPU-compatible geometry. Select batch size by measured memory. The eventual demonstration target is 5 predictions/s, with p95 processing time below 200 ms after the newest input is available; report sensor age and transport separately. This is a target, not an existing capability.

A useful first forecast model improves over sensor-only persistence in mean future IoU and Brier score, with paired episode confidence intervals, and documents where constant velocity wins. Suggested promotion thresholds and regression tolerances are in the evaluation strategy. Failure to beat a baseline is a valid result and triggers diagnosis, not removal of the baseline.

A complete v1 includes data QA, causal dataset loader, baseline results, trained checkpoint, immutable split, calibrated and raw metric reports, error gallery, offline demo, and reproduction instructions. Live demo is a later gate. There are no measured results yet.

## 5. Why this scope follows the evidence

[MotionNet](https://arxiv.org/abs/2003.06754) supports aligned LiDAR BEV as a practical representation; our direct occupancy target is a different task. [Cam4DOcc](https://arxiv.org/abs/2311.17663) motivates distinguishing box-inflated actor occupancy from fine geometry. [Occupancy Flow Fields](https://arxiv.org/abs/2203.03875) motivates explicit treatment of agents absent from the observed history. These ideas support the scope; none establishes that our proposed U-Net, grid size or loss is optimal.

## 6. Deferred capabilities

Semantic vehicle/pedestrian heads, learned pillars, state estimation, backward flow, camera BEV fusion, 3D voxels, latent multimodal futures, map/traffic-light inputs, and ego-action conditioning each require separate data contracts and ablations. A 2D projection merges vertical levels; v1 excludes multilevel-road scenes until a layer-selection protocol exists. General obstacle avoidance also needs static geometry and unknown-space handling. The demo must label these limitations visibly.

## 7. Cross-document authority

This file owns scope and requirements. [Architecture](architecture.md) owns tensor/frame contracts; [dataset strategy](dataset-strategy.md) owns labels/splits; [evaluation](evaluation-strategy.md) owns metric and promotion rules; [experiment plan](experiment-plan.md) owns comparisons. Change a contract through an [ADR](decisions/README.md), update all affected documents, and increment its schema version. Archive results under the contract used; do not silently reinterpret them.

The [interactive companion](../companion.html) is the visual counterpart of these contracts. Update its embedded settings, diagrams and phase status in the same change as the owning documents. Synthetic teaching examples must stay explicitly labeled; measured predictions require artifact provenance.
