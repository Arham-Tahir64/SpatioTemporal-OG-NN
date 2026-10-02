# Evaluation strategy

This protocol is a proposal, not a results report. Freeze it with dataset v1 before architecture search. All metrics refer to binary selected-actor footprint occupancy unless explicitly labeled otherwise.

## Comparison tracks

| Baseline | Allowed information | Purpose |
|---|---|---|
| All-empty and training prevalence | Training-set statistics only | Detect class imbalance and misleading probability scores |
| Raw hit persistence | Current obstacle LiDAR hit cells repeated | Crude sensor lower baseline; different surface/footprint semantics must be labeled |
| Learned persistence | Frozen single-frame current actor-occupancy network | Main sensor-only no-motion baseline |
| Sensor-derived CV | Causal clusters/tracks from historical raw LiDAR; estimated footprints and velocities | Classical sensor-only motion baseline |
| Oracle persistence | Current ground-truth actor footprints | Perception-free diagnostic |
| Oracle CV | Current true boxes/velocities, fixed current heading, `center_h=center_0+v_0*h` | Stronger-input diagnostic; not a fair sensor-only competitor |
| Single-frame forecast | Current LiDAR only, same target heads | Separates motion history from learned scene priors |
| Temporal forecast | Six LiDAR frames + alignment | Main model |

Sensor-CV implementation proposal: ground-filtered clustering, causal association with gated center distance, constant-velocity Kalman state, minimum two observations for motion; new/unmatched tracks use zero velocity initially, explicit time-to-live, estimated oriented footprints. Never use simulator classes, IDs or velocities. It may fail on walls/merged clusters, which must appear in results. Record its tuneable association and geometry settings using validation. Forecast variance can be rasterized from a fitted motion covariance later; deterministic CV maps stay deterministic in the initial table.

## Primary metrics

Compute on the same validity mask and fixed ROI for every method, independently at 0.5/1/2/3 s. Also report the current auxiliary task separately.

- Occupied IoU = TP/(TP+FP+FN), precision = TP/(TP+FP), recall = TP/(TP+FN), F1. Aggregate counts across the split for primary micro metrics; also report per-episode macro metrics. Never average only nonempty scenes without saying so.
- PR-AUC / average precision from unthresholded scores. Choose and record one implementation/version and interpolation convention (default non-interpolated average precision). “AUC” alone is ambiguous; do not call this ROC-AUC.
- Brier = mean `(p-y)^2` and NLL = mean `-[y log p +(1-y) log(1-p)]`, evaluated on all valid cells at natural prevalence. For log evaluation clamp probabilities to `[1e-6,1-1e-6]`; report this convention for deterministic baselines too.
- Reliability diagrams with 15 equal-width bins, bin counts and ECE; include occupied/empty prevalence, positive-cell and negative-cell Brier components, and range-specific plots. ECE is bin-dependent and cannot substitute for proper scoring rules.
- Mean future IoU is the unweighted mean of the four per-horizon IoUs, not duration-weighted. Mean future NLL/Brier use the same horizon weighting.

Primary threshold is 0.5 for every model. Additionally fit per-horizon thresholds maximizing F1 on the calibration set, then freeze them for test reporting. Never pick thresholds on test. Binary predictions use `p>=threshold`.

If a denominator is zero, store metric as null with support count. A wholly empty ground truth/prediction episode must not get a hidden IoU=1. Report false-positive cells in empty scenes separately. AP is null if there are no positives. For macro aggregation state how many episodes had defined metrics; primary micro counts include all valid cells.

## Slices that prevent misleading success

Report positive recall by class (vehicle/pedestrian), motion state and LiDAR-hit visibility group. The union model cannot measure class-confusion precision; class-specific IoU/precision becomes appropriate only for semantic heads.

For spatially defined masks, report full IoU/precision/recall/AP and calibration with mask support. Default distance bins are `[0,10),[10,20),[20,32),[32,46)` m (the last covers square corners). Scenario-level slices: straight, turning, stopping/starting, crossing, occlusion, ROI entry/exit, empty scene, weather, town and ego-speed bin. Use truth velocity only for evaluation slices: initially “moving” speed >0.5 m/s; report boundary sensitivity and never expose that classification to the model.

Dynamic actor recall and error at 2/3 s must be visible; stationary vehicles and empty background can dominate global metrics. Also report false positives per 1000 empty valid cells and pedestrian misses. Save consistent random examples and the worst examples by a declared metric, not only attractive demos.

## Confidence and selection

Run three fixed training seeds for final comparisons. Report mean/std across seeds and paired 95% bootstrap intervals for model-minus-baseline differences by resampling entire independent scenario/replay groups (2000 resamples, fixed bootstrap seed). Overlapping windows and cells are not independent samples. For primary micro-IoU bootstrap, recompute summed TP/FP/FN within each sampled group; do not bootstrap precomputed window IoUs.

Select checkpoint by lowest mean future validation NLL, breaking ties with mean future IoU. Do not report whichever checkpoint wins each test metric. Calibrate the selected checkpoint on the reserved calibration split; temperature scaling per horizon is a simple first method, but weighted BCE may require an intercept or richer validation-fitted calibration. Report both raw and calibrated scores. [Guo et al.](https://proceedings.mlr.press/v70/guo17a.html).

Suggested advancement rule: temporal model gains >=2 absolute percentage points in mean future IoU over learned persistence, paired interval excludes zero, Brier does not worsen, and moving-actor/pedestrian recall does not decrease by more than 2 points. These are project policy thresholds, not established field benchmarks. They can be revised using the pilot **before final test**. Compare with sensor CV even if it remains stronger; do not require beating oracle CV. For more complex models, require a meaningful accuracy gain or a clear latency/memory improvement under the same protocol. Insufficient slice support means inconclusive, not passed.

## Latency and memory

Measure on the actual Windows implementation machine. Record OS, CPU/GPU/VRAM/driver, Python/PyTorch/CUDA or other backend, precision, tensor sizes and model/config/checkpoint hashes. Report batch-1 network latency, preprocessing, host-device transfer, output processing and total pipeline time separately. Include warmup policy (default 100 calls), at least 1000 timed calls, synchronization for asynchronous accelerators, p50/p95/p99, throughput, peak allocated/reserved accelerator memory and process RAM. Compilation/cold start is a separate number. Do not run training during inference benchmarks.

Five Hz live processing means p95 pipeline <200 ms; this does not erase sensor acquisition or queue age. Publish newest input age and anchor-to-publication lag. CARLA synchronous mode can wait indefinitely for a slow client: simulated frame rate is not proof of wall-clock real-time performance. Profile network and full pipeline with and without concurrent simulator load. [PyTorch profiler](https://docs.pytorch.org/tutorials/recipes/recipes/profiler_recipe.html), [TensorRT best practices](https://docs.nvidia.com/deeplearning/tensorrt/latest/performance/best-practices.html).

For export/FP16/INT8, compare logits/probabilities and thresholded maps against the frozen FP32 model. Proposed acceptance: <=0.5 point IoU drop, no >1 point pedestrian-recall drop, and no material calibration regression. Quantization calibration data come from training or reserved calibration, never test. TensorRT is NVIDIA-specific and is optional.

## Additional evaluation for extensions

Flow: endpoint error in meters over valid correspondences, moving/static splits, vector coverage, and occupancy-warp consistency; state whether vectors point backward or forward and over what interval. Avoid background-dominated averages. Semantic heads: per-class IoU, confusion matrix and macro mIoU excluding unknown labels. Multimodal futures: fixed sample-count coverage/diversity, proper distribution scores where feasible, and sample consistency; best-of-N alone rewards more samples and is not calibration. Planner demo: expected-overlap costs, collision checks at denser times, comfort/progress, and equal ego policies; observational forecasting accuracy does not establish closed-loop benefit.

## Mandatory run record

Dataset/split/label versions; code commit and dirty diff hash; resolved config; seed; hardware/environment; optimizer updates and training time; checkpoint hash and selection epoch; positive prevalence; thresholds/calibration parameters; all per-horizon and slice metrics with counts; confidence intervals; latency/memory; prediction artifact hash; failure gallery; baseline comparison; limitations. Empty fields remain explicitly `not measured`, never invented values.
